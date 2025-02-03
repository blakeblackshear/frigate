/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/op/resize.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <vector>
#include <map>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

/*
 * Algorithm of calc_neighbor_points():
 * Input: vvv_ind, a collection of neighbors per resized dimension as:
 *               layer-1: (# resized dimensions, vector)
 *               layer-2: (A vector of 2 of: hi/low)
 *               layer-3: Neighor index of every pixel in that output dimension (vector)
 *        in_s,  the original input tensor shape (vector)
 *        out_s, the output tensor shape (vector)
 *    resized_m, lens indices that have to resized (map)
 *
 * Output: per resized pixel, its neighboring hi/lo indexes (vector): all permutations.
 * This api stitches all the neighbors (for every dimension) for a resized pixel,
 * to yield its neighbor index w.r.t to the input shape, in_s.
 */

static std::vector<int>
calc_neighbor_points(const std::vector<std::vector<std::vector<std::size_t>>>& vvv_ind,
                     const shape& in_s,
                     const shape& out_s,
                     const std::map<size_t, size_t>& resized_m)
{
    std::size_t ndims       = out_s.ndim();
    const auto& strides     = out_s.strides();
    std::size_t elements_ct = vvv_ind[0][0].size();

    // This function computes for each element, all permutations of its neighbor indices into an
    // Perm block in one go. (Instead of computing each permutation in isolation per element)
    size_t permutations = 1u << resized_m.size();
    std::vector<std::vector<std::size_t>> perm_blk(permutations, std::vector<size_t>(strides));

    // final outputted vector: permutations of neighbors.
    std::vector<int> out_idx_vec(permutations * elements_ct);

    for(size_t e_idx = 0; e_idx < elements_ct; ++e_idx)
    {
        size_t t_idx = e_idx;
        for(size_t l_idx = 0; l_idx != ndims; ++l_idx)
        {
            auto entry = resized_m.find(l_idx);
            if(entry != resized_m.end())
            {
                size_t hi_cmp_bit = 1u << entry->second;
                auto lo           = vvv_ind[entry->second][0][e_idx];
                auto hi           = vvv_ind[entry->second][1][e_idx];
                for(size_t i = 0; i < permutations; i++)
                    perm_blk[i][l_idx] = ((i & hi_cmp_bit) != 0) ? hi : lo;
            }
            else
            {
                size_t idx = t_idx / strides[l_idx];
                // no permutations in an unmodified lens index, so idx is copied over:
                for(size_t i = 0; i < permutations; i++)
                    perm_blk[i][l_idx] = idx;
            }
            t_idx %= strides[l_idx];
        }
        // write out the permuted indices, calculated off the perm_blk:
        for(size_t i = 0; i < permutations; i++)
            out_idx_vec[e_idx + elements_ct * i] = in_s.index(perm_blk[i]);
    }
    return out_idx_vec;
}

static std::string get_coord_trans_mode(const onnx_parser::attribute_map& attr)
{
    std::string coord_trans_mode = "half_pixel";
    if(contains(attr, "coordinate_transformation_mode"))
    {
        coord_trans_mode = attr.at("coordinate_transformation_mode").s();
        // does not support transformation mode "tf_crop_and_resize"
        if(coord_trans_mode == "tf_crop_and_resize")
        {
            MIGRAPHX_THROW("PARSE_RESIZE: \"tf_crop_and_resize\" mode is not supported!");
        }
    }

    return coord_trans_mode;
}

static std::string get_mode(const onnx_parser::attribute_map& attr)
{
    std::string mode = "nearest";
    if(contains(attr, "mode"))
    {
        mode = attr.at("mode").s();
        if(mode != "nearest" and mode != "linear")
        {
            MIGRAPHX_THROW("PARSE_RESIZE: only nearest and linear modes are supported!");
        }
    }

    return mode;
}

static std::string get_nearest_mode(const onnx_parser::attribute_map& attr)
{
    std::string nearest_mode = "round_prefer_floor";
    if(contains(attr, "nearest_mode"))
    {
        nearest_mode = attr.at("nearest_mode").s();
    }

    return nearest_mode;
}

// "scales" is an attribute of the deprecated Upsample op. ver7 only
static std::vector<double> get_scales(const onnx_parser::attribute_map& attr)
{
    std::vector<double> scales;
    if(contains(attr, "scales"))
    {
        copy(attr.at("scales").floats(), std::back_inserter(scales));
    }

    return scales;
}

// Hunts through the argument list to find either scales or sizes, and
// populates both scales and sizes vectors from it.
// r_arg: a reference to the argument that was found.
//
// return: true if argument is non-static (i.e. if eval() couldn't read it
// at compile time).  If true, we'll need to use Resize op.
static bool parse_args(const std::vector<instruction_ref>& args,
                       const std::vector<size_t>& in_lens,
                       const std::string& onnx_name,
                       std::vector<double>& vec_scale,
                       std::vector<std::size_t>& out_lens,
                       instruction_ref& r_arg)
{
    for(const auto& arg : args)
    {
        if(arg->name() == "undefined" or arg == args.front())
            continue;

        // skip any empty input (some of the Onnx args. are optional)
        auto lens = arg->get_shape().lens();
        if(lens.empty())
            continue;

        r_arg = arg;

        auto type = arg->get_shape().type();
        if(type == shape::int64_type)
        {
            // this argument is output sizes
            auto arg_out_s = arg->eval();
            if(arg_out_s.empty())
                return true;
            arg_out_s.visit([&](const auto& ol) { out_lens.assign(ol.begin(), ol.end()); });

            if(out_lens.size() != in_lens.size())
            {
                MIGRAPHX_THROW("PARSE_" + onnx_name +
                               ": specified output size's rank does not match input size");
            }

            // compute the scales
            vec_scale.resize(in_lens.size());
            std::transform(in_lens.begin(),
                           in_lens.end(),
                           out_lens.begin(),
                           vec_scale.begin(),
                           [](auto iss, auto oss) { return 1.0 * oss / iss; });
            return false;
        }
        else
        {
            // this argument is scale input
            if(lens[0] == in_lens.size())
            {
                auto arg_scale = arg->eval();
                if(arg_scale.empty())
                    return true;

                arg_scale.visit([&](const auto& v) { vec_scale.assign(v.begin(), v.end()); });
            }
            return false;
        }
    }
    MIGRAPHX_THROW("PARSE_" + onnx_name + ": no shapes or scales input provided");
}

struct parse_resize : op_parser<parse_resize>
{
    std::vector<op_desc> operators() const
    {
        return {{"Resize", "resize"}, {"Upsample", "upsample"}};
    }

    // Helper to add a "reshape" and "gather" instruction.  These can implement
    // Nearest mode resizing if all sizes are known at compile time.
    instruction_ref make_gather_instruction(const onnx_parser::node_info& info,
                                            const std::size_t out_elements,
                                            const shape& in_s,
                                            shape& out_s,
                                            const std::vector<size_t>& in_lens,
                                            const std::vector<size_t>& out_lens,
                                            const std::vector<double>& vec_scale,
                                            instruction_ref args_0) const
    {
        std::string nearest_mode = get_nearest_mode(info.attributes);
        std::vector<int> ind(out_elements);

        // map out_idx to in_idx
        auto nearest_op              = op::resize::get_nearest_op(nearest_mode);
        std::string coord_trans_mode = get_coord_trans_mode(info.attributes);
        auto idx_op                  = op::resize::get_original_idx_op(coord_trans_mode);

        shape_for_each(out_s, [&](const auto& out_idx_v, size_t out_idx) {
            std::vector<size_t> in_idx(out_idx_v.size());
            for(auto ii = 0; ii < in_lens.size(); ++ii)
            {
                auto idx_val = idx_op(in_lens[ii], out_lens[ii], out_idx_v[ii], vec_scale[ii]);
                in_idx[ii]   = nearest_op(in_lens[ii], idx_val);
            }

            ind[out_idx] = static_cast<int64_t>(in_s.index(in_idx));
        });
        // reshape input to one-dimension
        std::vector<int64_t> rsp_lens = {static_cast<int64_t>(in_s.elements())};
        auto rsp = info.add_instruction(make_op("reshape", {{"dims", rsp_lens}}), args_0);

        // ins_ind should be a multi dimensional index that will restore original rank
        shape ind_s{shape::int32_type, out_lens};
        auto ins_ind = info.add_literal(literal(ind_s, ind));
        return info.add_instruction(make_op("gather", {{"axis", 0}}), rsp, ins_ind);
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser&,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        // coord transform mode
        std::string coord_trans_mode = get_coord_trans_mode(info.attributes);

        // mode: only nearest and linear modes are supported for now
        std::string mode = get_mode(info.attributes);

        // nearest mode
        std::string nearest_mode = get_nearest_mode(info.attributes);

        auto idx_op = op::resize::get_original_idx_op(coord_trans_mode);

        // check exclude_outside, only support 0
        if(contains(info.attributes, "exclude_outside") and
           info.attributes.at("exclude_outside").i() == 1)
        {
            MIGRAPHX_THROW("PARSE_" + opd.onnx_name + ": exclude_outside 1 is not supported!");
        }

        // input data shape info
        auto in_s    = args[0]->get_shape().to_static(1);
        auto in_lens = in_s.lens();

        // output shape is explicitly specified
        std::vector<std::size_t> out_lens(in_lens.size());

        // scale
        std::vector<double> vec_scale = get_scales(info.attributes);

        // If `scales` was not an attribute, it must be an input
        // bool is_scale_input{true};
        instruction_ref scales_sizes_arg(args[0]);

        // boolean indicates whether the size of the output can be determined
        // at compile time, i.e. its values come from literal input(s) and have
        // no dependencies anywhere in the graph on runtime inputs.
        bool is_constant_scale_input(not vec_scale.empty());
        if(not is_constant_scale_input)
        {
            // Depending on the args, it *must* populate the `vec_scale`, and might populate
            // `out_lens`
            is_constant_scale_input =
                not parse_args(args, in_lens, opd.onnx_name, vec_scale, out_lens, scales_sizes_arg);
        }

        if(is_constant_scale_input)
        {
            if(in_lens.size() != vec_scale.size())
            {
                MIGRAPHX_THROW("PARSE_" + opd.onnx_name +
                               ": ranks of input and scale are different!");
            }

            // if the output was not calculated yet, we update it based on the scales
            if(all_of(out_lens.cbegin(), out_lens.cend(), [](auto o) { return o == 0; }))
            {
                std::transform(
                    in_lens.begin(),
                    in_lens.end(),
                    vec_scale.begin(),
                    out_lens.begin(),
                    [&](auto idx, auto scale) { return static_cast<std::size_t>(idx * scale); });
            }
        }

        if(mode == "nearest")
        {
            if(args[0]->get_shape().dynamic() or not is_constant_scale_input)
            {
                // Resize's compute_shape() will read scales_sizes_arg as "scales" or "sizes"
                // depending on its data type
                return info.add_instruction(
                    make_op("resize",
                            {{"nearest_mode", nearest_mode},
                             {"coordinate_transformation_mode", coord_trans_mode}}),
                    args[0],
                    scales_sizes_arg);
            }
            else
            {
                // If there are no dynamic shapes and size/scale attributes are literals, then
                // all the indexes can be calculated now at compile time and
                // the Resize can be accomplished with Gather operation.  Preferred for
                // better performance.

                shape out_s{in_s.type(), out_lens};
                std::size_t out_elements = out_s.elements();

                return make_gather_instruction(
                    info, out_elements, in_s, out_s, in_lens, out_lens, vec_scale, args[0]);
            }
        }
        // linear mode
        else
        {
            // out_lens and other variables can't be populated if non-constant (runtime) size
            // inputs.
            if(not is_constant_scale_input)
                MIGRAPHX_THROW("PARSE_" + opd.onnx_name +
                               ": linear mode not supported for non-constant inputs");

            shape out_s{in_s.type(), out_lens};

            // reshape input to one-dimension
            std::vector<int64_t> rsp_lens = {static_cast<int64_t>(in_s.elements())};
            auto rsp = info.add_instruction(make_op("reshape", {{"dims", rsp_lens}}), args[0]);

            auto nearest_floor = op::resize::get_nearest_op("floor");
            auto nearest_ceil  = op::resize::get_nearest_op("ceil");

            std::vector<size_t> resized_axes; // vector of dimensions to be resized
            std::size_t out_elements = 1;     // total number of elements to be resized
            size_t resized_ct        = 0;
            std::map<size_t, size_t> resized_m; // modified indices --> vvv_ind index below
            for(std::size_t axis = 0; axis != out_lens.size(); ++axis)
            {
                out_elements *= out_lens[axis];
                if(in_lens[axis] == out_lens[axis])
                    continue;
                resized_axes.push_back(axis);
                resized_m[axis] = resized_ct++;
            }

            // Neighbor indices. For an axis. Two sets of max/min per element:
            std::vector<std::vector<std::size_t>> vv_ind(2, std::vector<std::size_t>(out_elements));
            // Neighbor indices. For all resized axes:
            std::vector<std::vector<std::vector<std::size_t>>> vvv_ind(resized_ct, vv_ind);
            // Delta list. For each resized axes - per element.
            std::vector<std::vector<float>> delta(resized_ct, std::vector<float>(out_elements));

            shape_for_each(out_s, [&](const auto& out_idx_v, std::size_t out_idx) {
                for(size_t ii = 0; ii != resized_ct; ++ii)
                {
                    auto idx = resized_axes[ii];
                    auto idx_val =
                        idx_op(in_lens[idx], out_lens[idx], out_idx_v[idx], vec_scale[idx]);
                    vvv_ind[ii][0][out_idx] = nearest_floor(in_lens[idx], idx_val);
                    vvv_ind[ii][1][out_idx] = nearest_ceil(in_lens[idx], idx_val);
                    delta[ii][out_idx]      = idx_val - vvv_ind[ii][0][out_idx];
                }
            });

            auto ind = calc_neighbor_points(vvv_ind, in_s, out_s, resized_m);

            auto dim_lens = out_lens;
            // indices matrix size grows 2x per resized-axis:
            dim_lens[0] *= (1u << resized_ct);
            shape ind_s{shape::int32_type, dim_lens};
            auto ins_ind = info.add_literal(literal(ind_s, ind));
            auto data    = info.add_instruction(make_op("gather", {{"axis", 0}}), rsp, ins_ind);

            for(auto idx = resized_ct; idx != 0u; --idx)
            {
                dim_lens[0] /= 2; // halved for 2 slices of data (hi & low below)
                shape dim_s{shape::float_type, dim_lens};
                const auto& dim_delta = delta[idx - 1];
                std::vector<float> delta_data;
                for(std::size_t j = 0; j < dim_lens[0] / out_lens[0]; ++j)
                    delta_data.insert(delta_data.begin(), dim_delta.begin(), dim_delta.end());
                auto ins_delta = info.add_literal(dim_s, delta_data);

                // slice the data
                int64_t slc_stride = dim_lens[0];
                auto low           = info.add_instruction(
                    make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {slc_stride}}}),
                    data);
                auto hi = info.add_instruction(
                    make_op("slice",
                            {{"axes", {0}}, {"starts", {slc_stride}}, {"ends", {2 * slc_stride}}}),
                    data);
                auto diff = info.add_instruction(make_op("sub"), hi, low);
                auto ddf  = info.add_instruction(make_op("mul"), diff, ins_delta);
                data      = info.add_instruction(make_op("add"), ddf, low);
            }
            return data;
        }
    }
};

} // namespace onnx

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
