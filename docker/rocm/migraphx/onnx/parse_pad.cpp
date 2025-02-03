/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2024 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

void calc_reflect_indices(std::vector<int>& indices, const int64_t num_dims)
{
    int k         = 0;
    bool reversed = false;
    // in reflect padding, if the num_pads > num_dims,
    // compute the extra pad indices periodically, ex. ( 1, 2, 3, 2, 1, 0)
    for(int& idx : indices)
    {
        if(k == num_dims - 1)
            reversed = true;
        if(k == 0)
            reversed = false;
        if(reversed)
            k--;
        else
            k++;
        idx = k;
    }
}

instruction_ref reflect_pad(const onnx_parser::node_info& info,
                            const std::vector<int64_t>& pads,
                            instruction_ref input)
{
    size_t num_dims = pads.size() / 2;
    std::vector<int> ldims(pads.begin(), pads.begin() + num_dims);
    std::vector<int> rdims(pads.begin() + num_dims, pads.end());
    assert(ldims.size() == rdims.size());

    std::vector<int64_t> axes(num_dims);
    std::iota(axes.begin(), axes.end(), int64_t{0});

    // iterate over dimensions, starting from lowest dimension
    for(int64_t i = num_dims - 1; i >= 0; i--)
    {
        auto axis   = i;
        auto lcount = ldims.at(i);
        auto rcount = rdims.at(i);
        if(lcount == 0 and rcount == 0) // no padding for current dim
            continue;

        // calculate starts and ends for each iteration since shape may change
        std::vector<size_t> dims = input->get_shape().lens();
        std::vector<int64_t> starts(axes.size(), 0);
        std::vector<int64_t> ends(dims.begin(), dims.end());
        std::vector<instruction_ref> slices;

        auto starts_it = starts.begin() + i;
        auto ends_it   = ends.begin() + i;
        auto dims_it   = dims.begin() + i;

        std::vector<int> l_indices(lcount);
        std::vector<int> r_indices(rcount);

        // compute slice indices in a periodic fashion
        calc_reflect_indices(l_indices, *dims_it);
        calc_reflect_indices(r_indices, *dims_it);

        for(int idx : l_indices)
        {
            *starts_it = idx;
            *ends_it   = *starts_it + 1;
            slices.push_back(info.add_instruction(
                make_op("slice", {{"axes", axes}, {"starts", starts}, {"ends", ends}}), input));
        }
        // when padding on the left side, the outermost pad should be at the beginning
        std::reverse(slices.begin(), slices.end());
        slices.push_back(input);
        for(int idx : r_indices)
        {
            *starts_it = *dims_it - idx - 1;
            *ends_it   = *starts_it + 1;
            slices.push_back(info.add_instruction(
                make_op("slice", {{"axes", axes}, {"starts", starts}, {"ends", ends}}), input));
        }
        input = info.add_instruction(make_op("concat", {{"axis", axis}}), slices);
    }
    return input;
}

struct parse_pad : op_parser<parse_pad>
{
    std::vector<op_desc> operators() const { return {{"Pad"}}; }

    std::string parse_mode(const onnx_parser::node_info& info,
                           const std::vector<instruction_ref>& args) const
    {
        if(contains(info.attributes, "mode"))
        {
            auto mode = info.attributes.at("mode").s();
            if(mode == "reflect")
            {
                if(args.front()->get_shape().dynamic())
                {
                    MIGRAPHX_THROW("PARSE_PAD: reflect padding with dynamic shape not supported");
                }
            }
            else if(mode != "constant")
            {
                MIGRAPHX_THROW(
                    "PARSE_PAD: migraphx currently only supports constant and reflect padding");
            }
            return mode;
        }
        else
        {
            // default mode
            return "constant";
        }
    }

    std::vector<int64_t> parse_pads(const onnx_parser::node_info& info,
                                    const std::vector<instruction_ref>& args) const
    {
        std::vector<int64_t> pads{};
        if(args.size() >= 2)
        {
            auto pad_arg = args.at(1)->eval();
            check_arg_empty(pad_arg, "PARSE_PAD: `pads` input must be constant");
            pad_arg.visit([&](auto v) { pads.assign(v.begin(), v.end()); });
        }
        else if(contains(info.attributes, "pads"))
        {
            auto&& pad_vals = info.attributes.at("pads").ints();
            pads            = std::vector<int64_t>(pad_vals.begin(), pad_vals.end());
        }
        else
        {
            MIGRAPHX_THROW("PARSE_PAD: `pads` must be available");
        }
        return pads;
    }

    float parse_constant_value(const onnx_parser& parser,
                               const onnx_parser::node_info& info,
                               const std::vector<instruction_ref>& args) const
    {
        float value = 0.0f;
        if(args.size() >= 3 and args.at(2)->get_shape().elements() >= 1)
        {
            auto val_ins = args.at(2);
            if(not val_ins->can_eval())
            {
                MIGRAPHX_THROW("PARSE_PAD: input `value` must be constant");
            }
            auto val_arg = val_ins->eval();
            if(val_arg.get_shape().elements() != 1)
            {
                MIGRAPHX_THROW("PARSE_PAD: `value` should contain only one element");
            }
            value = val_arg.at<float>();
        }
        else if(contains(info.attributes, "value"))
        {
            value = parser.parse_value(info.attributes.at("value")).at<float>();
        }
        return value;
    }

    std::vector<int64_t> parse_axes(const std::vector<instruction_ref>& args,
                                    bool is_constant_mode) const
    {
        std::vector<int64_t> axes{};
        // axes is 3rd or 4th, depending on constant mode
        auto pos = is_constant_mode ? 4 : 3;
        if(args.size() >= pos)
        {
            auto axes_arg = args.at(pos - 1)->eval();
            check_arg_empty(axes_arg, "PARSE_PAD: variable `axes` input not supported");
            axes_arg.visit([&](auto v) { axes.assign(v.begin(), v.end()); });
        }
        return axes;
    }

    std::vector<int64_t> calculate_pads_with_axes(const std::vector<int64_t>& pads,
                                                  const std::vector<int64_t>& axes,
                                                  size_t input_rank) const
    {
        size_t num_axes = axes.size();
        if(num_axes * 2 != pads.size())
        {
            MIGRAPHX_THROW("PARSE_PAD: number of elements of pads should be equal to 2 * "
                           "number of elements of axes");
        }

        std::vector<int64_t> new_pads(input_rank * 2);
        for(size_t idx{0}; idx < num_axes; ++idx)
        {
            // axis can be negative
            int64_t axis = axes[idx] < 0 ? input_rank + axes[idx] : axes[idx];
            // pad format is x1_begin, x2_begin, ... , x3_end, x4_end
            new_pads[axis]              = pads[idx];
            new_pads[axis + input_rank] = pads[idx + num_axes];
        }
        return new_pads;
    }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          const std::vector<instruction_ref>& args) const
    {
        std::vector<int64_t> pads = parse_pads(info, args);

        // check if padding is actually being done (at least one value is nonzero)
        if(std::all_of(pads.begin(), pads.end(), [](const int& i) { return i == 0; }))
        {
            return info.add_instruction(make_op("identity"), args.front());
        }

        std::string mode      = parse_mode(info, args);
        bool is_constant_mode = mode == "constant";
        float value           = is_constant_mode ? parse_constant_value(parser, info, args) : 0.0f;
        std::vector<int64_t> axes = parse_axes(args, is_constant_mode);
        size_t input_rank         = args.front()->get_shape().ndim();

        if(not axes.empty())
        {
            pads = calculate_pads_with_axes(pads, axes, input_rank);
        }

        if(pads.size() != input_rank * 2)
        {
            MIGRAPHX_THROW("PARSE_PAD: number of elements of pads should be equal to 2 * "
                           "input rank");
        }

        if(mode == "reflect")
        {
            return reflect_pad(info, pads, args.front());
        }

        return info.add_instruction(migraphx::make_op("pad", {{"pads", pads}, {"value", value}}),
                                    args.front());
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
