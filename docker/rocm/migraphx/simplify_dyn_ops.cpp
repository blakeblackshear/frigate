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
#include <migraphx/simplify_dyn_ops.hpp>
#include <migraphx/op/slice.hpp>
#include <migraphx/op/onehot.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/op/resize.hpp>
#include <migraphx/common.hpp>
#include <migraphx/tensor_view.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/**
 *    Convert broadcast_with_dims operators with a static input tensor and a constant `dims` input
 *    into multibroadcast op with a static output shape attribute.
 *
 */
struct find_broadcast_with_dims_static
{
    auto matcher() const
    {
        return match::name("broadcast_with_dims")(match::nargs(2),
                                                  match::arg(0)(match::static_shape()),
                                                  match::arg(1)(match::is_constant()));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins    = mr.result;
        auto inputs = ins->inputs();

        // read the values of arg(1) to create input to multibroadcast
        std::vector<size_t> sizes_vec;
        inputs.at(1)->eval().visit(
            [&](auto output) { sizes_vec.assign(output.begin(), output.end()); });

        m.replace_instruction(
            ins, make_op("multibroadcast", {{"out_lens", sizes_vec}}), inputs.at(0));
    }
};

/**
 * Convert a Resize op. with Nearest mode to an implementation using Gather op.
 * From:  resize[scales={...}/sizes={...},](static, constant)
 * To:
 * 0 = literal{ ... } computed_indices
 * ...
 * 2 = reshape[dims={45}](X) 1-dimensional
 * 3 = gather[axis=0](2,0)
 *
 * At the time of writing, this conversion is required for GPU targets because there
 * is not direct a GPU implementation of the Resize operation.
 * This matcher depends on a split_single_dyn_dim pass being run before it, which
 * will convert any dynamic-batch input to static inputs and make this conversion possible.
 *
 *   At time of writing, Resize allows either 1 or 2 inputs
 * but the 1-input case is never created by Onnx parsing.
 */
struct find_resize_static
{

    auto matcher() const
    {
        return match::name("resize")(match::nargs(2),
                                     match::arg(0)(match::static_shape()),
                                     match::arg(1)(match::is_constant()));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins       = mr.result;
        auto inputs    = ins->inputs();
        auto resize_op = any_cast<op::resize>(ins->get_operator());

        auto in_lens = inputs.at(0)->get_shape().lens();
        std::vector<size_t> sizes_vec(inputs.at(0)->get_shape().ndim());
        std::vector<float> scales_vec(inputs.at(0)->get_shape().ndim());
        //  populate both scales and sizes for the benefit of the algorithm.
        inputs.at(1)->eval().visit([&](auto input) {
            using type = typename decltype(input)::value_type;
            if constexpr(std::is_integral<type>{})
            {
                // read output sizes and use them to compute scales
                sizes_vec.assign(input.begin(), input.end());
                std::transform(
                    input.begin(),
                    input.end(),
                    in_lens.begin(),
                    scales_vec.begin(),
                    [](auto sz, size_t in_len) { return static_cast<float>(sz) / in_len; });
            }
            else
            {
                // read scales and use them to compute output sizes
                scales_vec.assign(input.begin(), input.end());
                std::transform(
                    input.begin(),
                    input.end(),
                    in_lens.begin(),
                    sizes_vec.begin(),
                    [](auto sz, size_t in_len) { return static_cast<size_t>(sz * in_len); });
            }
        });

        auto in_s = inputs.at(0)->get_shape();
        shape out_s{in_s.type(), sizes_vec};

        std::vector<int> ind(out_s.elements());

        // map out_idx to in_idx
        auto nearest_op = op::resize::get_nearest_op(resize_op.nearest_mode);
        auto idx_op     = op::resize::get_original_idx_op(resize_op.coordinate_transformation_mode);

        shape_for_each(out_s, [&](const auto& out_idx_v, size_t out_idx) {
            std::vector<size_t> in_idx(out_idx_v.size());
            for(auto ii = 0; ii < in_lens.size(); ++ii)
            {
                auto idx_val = idx_op(in_lens[ii], sizes_vec[ii], out_idx_v[ii], scales_vec[ii]);
                in_idx[ii]   = nearest_op(in_lens[ii], idx_val);
            }

            ind[out_idx] = static_cast<int64_t>(in_s.index(in_idx));
        });

        // reshape input to one-dimension
        std::vector<int64_t> rsp_lens = {static_cast<int64_t>(in_s.elements())};
        auto reshape_op               = make_op("reshape", {{"dims", rsp_lens}});
        auto rsp                      = m.insert_instruction(ins, reshape_op, ins->inputs().at(0));

        // Add our computed indices as a literal.
        // ins_ind is a multi dimensional index that will restore original rank
        shape ind_s{shape::int32_type, sizes_vec};
        auto ins_ind = m.add_literal(literal(ind_s, ind));
        m.replace_instruction(ins, make_op("gather", {{"axis", 0}}), rsp, ins_ind);
    }
};

/**
 * Convert 2 input static shape broadcast/multibroadcast into 1 input version.
 * Some compiler passes (ex. simplify_algebra) only support the 1 input versions
 * of the broadcasting operators.
 * From:
 * broadcast_op(argument_with_static_shape, argument_with_static_shape)
 * To:
 * broadcast_op(argument_with_static_shape); broadcast_op.out_lens = constant_output_dims
 */
struct find_static_2in_broadcasts
{
    auto matcher() const
    {
        return match::broadcast(match::nargs(2),
                                match::arg(0)(match::static_shape()),
                                match::arg(1)(match::static_shape()));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins          = mr.result;
        auto out_lens     = ins->get_shape().lens();
        auto broadcast_op = ins->get_operator();
        if(broadcast_op.name() == "broadcast")
        {
            broadcast_op.from_value({{"out_lens", out_lens}});
        }
        else
        {
            broadcast_op.from_value({{"out_lens", out_lens}, {"out_dyn_dims", {}}});
        }
        m.replace_instruction(ins, broadcast_op, ins->inputs().at(0));
    }
};

/**
 * Simplify slice with 2 inputs to the 1 input version if inputs[1] is constant.
 * From:
 * slice(data, constant_input); two attributes set
 * To:
 * slice(data); slice.starts, slice.ends. slice.axes set
 */
struct find_const_2in_slice
{
    auto matcher() const
    {
        return match::name("slice")(match::nargs(2), match::arg(1)(match::is_constant()));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins       = mr.result;
        auto inputs    = ins->inputs();
        auto slice_op  = any_cast<op::slice>(ins->get_operator());
        auto set_attrs = slice_op.get_set_attributes();
        std::vector<int64_t> starts_vec;
        std::vector<int64_t> ends_vec;
        std::vector<int64_t> axes_vec;
        if(set_attrs == op::slice::ends_axes)
        {
            // slice(data, starts)
            inputs.at(1)->eval().visit(
                [&](auto output) { starts_vec.assign(output.begin(), output.end()); });
            ends_vec = slice_op.ends;
            axes_vec = slice_op.axes;
        }
        else if(set_attrs == op::slice::starts_axes)
        {
            // slice(data, ends)
            inputs.at(1)->eval().visit(
                [&](auto output) { ends_vec.assign(output.begin(), output.end()); });
            starts_vec = slice_op.starts;
            axes_vec   = slice_op.axes;
        }
        else
        {
            // slice(data, axes)
            inputs.at(1)->eval().visit(
                [&](auto output) { axes_vec.assign(output.begin(), output.end()); });
            starts_vec = slice_op.starts;
            ends_vec   = slice_op.ends;
        }
        m.replace_instruction(
            ins,
            make_op("slice", {{"starts", starts_vec}, {"ends", ends_vec}, {"axes", axes_vec}}),
            inputs.at(0));
    }
};

/**
 * Simplify slice with 3 inputs to the 1 input version if inputs[1:2] are constant.
 * From:
 * slice(data, constant_input1, constant_input2); one attribute set
 * To:
 * slice(data); slice.starts, slice.ends. slice.axes set
 */
struct find_const_3in_slice
{
    auto matcher() const
    {
        return match::name("slice")(match::nargs(3),
                                    match::arg(1)(match::is_constant()),
                                    match::arg(2)(match::is_constant()));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins            = mr.result;
        auto inputs         = ins->inputs();
        auto slice_op       = any_cast<op::slice>(ins->get_operator());
        auto set_attrs      = slice_op.get_set_attributes();
        std::vector<int64_t> starts_vec;
        std::vector<int64_t> ends_vec;
        std::vector<int64_t> axes_vec;
        if(set_attrs == op::slice::axes_only)
        {
            // slice(data, starts, ends)
            inputs.at(1)->eval().visit(
                [&](auto output) { starts_vec.assign(output.begin(), output.end()); });
            inputs.at(2)->eval().visit(
                [&](auto output) { ends_vec.assign(output.begin(), output.end()); });
            axes_vec = slice_op.axes;
        }
        else if(set_attrs == op::slice::ends_only)
        {
            // slice(data, starts, axes)
            inputs.at(1)->eval().visit(
                [&](auto output) { starts_vec.assign(output.begin(), output.end()); });
            inputs.at(2)->eval().visit(
                [&](auto output) { axes_vec.assign(output.begin(), output.end()); });
            ends_vec = slice_op.ends;
        }
        else
        {
            // slice(data, ends, axes)
            inputs.at(1)->eval().visit(
                [&](auto output) { ends_vec.assign(output.begin(), output.end()); });
            inputs.at(2)->eval().visit(
                [&](auto output) { axes_vec.assign(output.begin(), output.end()); });
            starts_vec = slice_op.starts;
        }
        m.replace_instruction(
            ins,
            make_op("slice", {{"starts", starts_vec}, {"ends", ends_vec}, {"axes", axes_vec}}),
            inputs.at(0));
    }
};

/**
 * Simplify slice with 4 inputs to the 1 input version if inputs[1:3] are constant.
 * From:
 * slice(data, constant_starts, constant_ends, constant_axes)
 * To:
 * slice(data); slice.starts, slice.ends. slice.axes set
 */
struct find_const_4in_slice
{
    auto matcher() const
    {
        return match::name("slice")(match::nargs(4),
                                    match::arg(1)(match::is_constant()),
                                    match::arg(2)(match::is_constant()),
                                    match::arg(3)(match::is_constant()));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins            = mr.result;
        auto inputs         = ins->inputs();
        argument starts_arg = inputs.at(1)->eval(false);
        argument ends_arg   = inputs.at(2)->eval(false);
        argument axes_arg   = inputs.at(3)->eval(false);
        if(not starts_arg.empty() and not ends_arg.empty() and not axes_arg.empty())
        {
            std::vector<int64_t> starts_vec;
            std::vector<int64_t> ends_vec;
            std::vector<int64_t> axes_vec;
            starts_arg.visit([&](auto output) { starts_vec.assign(output.begin(), output.end()); });
            ends_arg.visit([&](auto output) { ends_vec.assign(output.begin(), output.end()); });
            axes_arg.visit([&](auto output) { axes_vec.assign(output.begin(), output.end()); });
            m.replace_instruction(
                ins,
                make_op("slice", {{"starts", starts_vec}, {"ends", ends_vec}, {"axes", axes_vec}}),
                inputs.at(0));
        }
    }
};

/**
 * Simplify dimensions_of to a literal when the input arugment has a static shape
 * or the dynamic dimensions from `start` to `end` are fixed.
 */
struct find_static_dimensions_of
{
    auto matcher() const { return match::name("dimensions_of")(); }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins                 = mr.result;
        auto input               = ins->inputs().at(0);
        auto dimensions_of_value = ins->get_operator().to_value();
        auto start               = dimensions_of_value.at("start").to<std::size_t>();
        auto end                 = dimensions_of_value.at("end").to<std::size_t>();
        if(input->get_shape().dynamic())
        {
            // check if dynamic dimensions from start to end are fixed
            auto dds = input->get_shape().dyn_dims();
            if(std::any_of(dds.begin() + start, dds.begin() + end, [](auto dd) {
                   return not dd.is_fixed();
               }))
            {
                return;
            }
        }
        std::size_t output_ndim = end - start;
        std::vector<int64_t> vec_shape(output_ndim);
        migraphx::shape s(migraphx::shape::int64_type, {output_ndim});
        std::vector<std::size_t> input_lens = input->get_shape().to_static(1).lens();
        std::transform(input_lens.begin() + start,
                       input_lens.begin() + end,
                       vec_shape.begin(),
                       [](auto i) { return int64_t(i); });
        migraphx::shape output_shape{migraphx::shape::int64_type, {end - start}};
        auto lit_ins = m.add_literal(migraphx::literal{output_shape, vec_shape});
        m.replace_instruction(ins, lit_ins);
    }
};

/**
 * Simplify allocate into 2 argument reshape that has constant output dimensions into a static 1
 * argument reshape. Intended to simplify what ONNX parse_reshape creates for dynamic reshapes.
 * This matcher can be generalized to matching reshape(data, static_shape_output_tensor).
 * From:
 * x = allocate(constant_output_dims) -> reshape(data, x)
 * To:
 * reshape(data); reshape.dims = constant_output_dims
 */
struct find_const_alloc_reshapes
{
    auto matcher() const
    {
        auto const_alloc = match::arg(1)(match::name("allocate")(match::is_constant()));
        return match::name("reshape")(match::nargs(2), const_alloc);
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto reshape_ins         = mr.result;
        auto reshape_inputs      = reshape_ins->inputs();
        auto alloc_ins           = reshape_inputs.at(1);
        argument output_dims_arg = alloc_ins->inputs().at(0)->eval(false);
        std::vector<int64_t> output_dims_vec;
        output_dims_arg.visit(
            [&](auto output) { output_dims_vec.assign(output.begin(), output.end()); });
        m.replace_instruction(
            reshape_ins, make_op("reshape", {{"dims", output_dims_vec}}), reshape_inputs.at(0));
        // have dead_code_elimination remove the previous allocate
    }
};

/**
 * Simplify allocate into fill operator that has constant output dimensions and constant value.
 * The allocate into fill instructions is what is produced when parsing the ONNX
 * ConstantOfShape operator. This replacement could be handled with propagate_constant, but
 * would rather have the simplification happen earlier during compiling.
 * This matcher can be generalized to matching fill(constant_value, static_shape_output_tensor).
 * From:
 * x = allocate(constant_ouptut_dims) -> fill(constant_value, x)
 * To:
 * literal
 */
struct find_const_alloc_fill
{
    auto matcher() const
    {
        auto const_alloc = match::arg(1)(match::name("allocate")(match::is_constant()));
        return match::name("fill")(match::arg(0)(match::is_constant()), const_alloc);
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto fill_ins = mr.result;
        auto fill_arg = fill_ins->eval(false);
        auto l        = m.add_literal(fill_arg.get_shape(), fill_arg.data());
        m.replace_instruction(fill_ins, l);
    }
};

/**
 * Simplify broadcast_for_dot instructions with two static shaped arguments
 * From:
 * broadcast_for_dot(static_shape_arg, static_shape_arg)
 * To:
 * multibroadcast(static_shape_arg); output_lens = static_broadcast_for_doted_shape
 */
struct find_static_broadcast_for_dot
{
    auto matcher() const
    {
        return match::name("broadcast_for_dot")(match::arg(0)(match::static_shape()),
                                                match::arg(1)(match::static_shape()));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto broadcast_for_dot_ins = mr.result;
        auto inputs                = broadcast_for_dot_ins->inputs();
        auto s0                    = inputs.at(0)->get_shape();
        auto s1                    = inputs.at(1)->get_shape();
        auto l0_it                 = s0.lens().end() - 2;
        std::vector<std::size_t> l0_broadcasted_lens(s0.lens().begin(), l0_it);
        auto l1_it = s1.lens().begin() + s1.ndim() - 2;
        std::vector<std::size_t> l1_broadcasted_lens(s1.lens().begin(), l1_it);
        auto output_lens = compute_broadcasted_lens(l0_broadcasted_lens, l1_broadcasted_lens);
        output_lens.insert(output_lens.end(), l0_it, s0.lens().end());
        m.replace_instruction(broadcast_for_dot_ins,
                              make_op("multibroadcast", {{"out_lens", output_lens}}),
                              inputs.at(0));
    }
};

/**
 * Simplify onehot instructions with static shape `indices` input and
 * a compile-time constant `depth` attribute or input.
 * From:
 * onehot(static_shape_arg, constant_arg, values) or
 * onehot(static_shape_arg, values)
 * To:
 * A = literal(shape = onehot_output_shape, value = 0)
 * B = unsqueeze(literal(lens = indices_lens, strides = broadcasted scalar, value = 1),
 * axis=onehot_axis) C = scatter(A, unsqueeze(indices, axis=onehot_axis), B) diff = on_value -
 * off_value D = mul(diff, C); return = add(D, off_value);
 *
 * NOTE: It might be cleaner to use some form of `fill` instead of
 * (on_value - off_value) * mask + off_value when we have `fill` working
 * on the GPU.
 */
struct find_static_onehot
{
    auto matcher() const
    {
        auto match_2_args = match::nargs(2)(match::arg(0)(match::static_shape()),
                                            match::arg(1)(match::static_shape()));
        auto match_3_args = match::nargs(3)(match::arg(0)(match::static_shape()),
                                            match::arg(1)(match::is_constant()),
                                            match::arg(2)(match::static_shape()));
        return match::name("onehot")(match::any_of(match_2_args, match_3_args));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto onehot_ins     = mr.result;
        auto onehot_inputs  = onehot_ins->inputs();
        auto onehot_op      = any_cast<op::onehot>(onehot_ins->get_operator());
        auto indices_ins    = onehot_inputs[0];
        shape indices_shape = indices_ins->get_shape();
        std::size_t depth_val;
        migraphx::instruction_ref values_ins;
        if(onehot_op.depth.has_value())
        {
            assert(onehot_inputs.size() == 2);
            depth_val  = onehot_op.depth.value();
            values_ins = onehot_inputs[1];
        }
        else
        {
            assert(onehot_inputs.size() == 3);
            auto depth_ins = onehot_inputs[1];
            depth_ins->eval().visit([&](auto d) { depth_val = d[0]; });
            values_ins = onehot_inputs[2];
        }
        shape values_shape  = values_ins->get_shape();
        std::vector<std::size_t> static_output_lens = indices_shape.lens();
        auto normalized_axis =
            (onehot_op.axis < 0) ? onehot_op.axis + indices_shape.ndim() + 1 : onehot_op.axis;
        static_output_lens.insert(static_output_lens.begin() + normalized_axis, depth_val);
        shape output_shape{values_shape.type(), static_output_lens};
        std::vector<float> zeros(output_shape.elements(), 0);
        auto zeros_lit      = m.add_literal(literal(output_shape, zeros));
        auto unsqueeze_inds = m.insert_instruction(
            onehot_ins, migraphx::make_op("unsqueeze", {{"axes", {normalized_axis}}}), indices_ins);
        // broadcast the one scalar to the correct shape
        auto ones_lit = m.add_literal(literal(shape{values_shape.type(), {1}, {0}}, {1}));
        auto mb_ones  = m.insert_instruction(
            onehot_ins,
            migraphx::make_op("multibroadcast", {{"out_lens", unsqueeze_inds->get_shape().lens()}}),
            ones_lit);
        auto mask = m.insert_instruction(
            onehot_ins,
            make_op("scatter_none", {{"axis", normalized_axis}, {"skip_out_of_bounds", true}}),
            zeros_lit,
            unsqueeze_inds,
            mb_ones);
        auto off_val =
            m.insert_instruction(onehot_ins,
                                 make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}),
                                 values_ins);
        auto on_val =
            m.insert_instruction(onehot_ins,
                                 make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}),
                                 values_ins);
        auto diff_val      = m.insert_instruction(onehot_ins, make_op("sub"), on_val, off_val);
        auto mul_diff_mask = insert_common_op(m, onehot_ins, make_op("mul"), {diff_val, mask});
        auto mb_off_val    = m.insert_instruction(
            onehot_ins, make_op("multibroadcast", {{"out_lens", output_shape.lens()}}), off_val);
        m.replace_instruction(onehot_ins, make_op("add"), mb_off_val, mul_diff_mask);
    }
};

/**
 * Go through `select_module` instructions and update the `output_dyn_shapes` attribute.
 * Checks the submodule output shapes and determines an appropriate `output_dyn_shapes` attribute.
 * This version ignores dynamic_dimension opt values.
 * Intended to be run after the other simplify_dyn_ops passes.
 */
struct simplify_select_module_output_shape
{
    auto matcher() const { return match::name("select_module"); }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto sm_ins           = mr.result;
        auto sm_module_inputs = sm_ins->module_inputs();
        std::vector<std::vector<shape>> all_output_shapes(sm_module_inputs.size());
        std::transform(sm_module_inputs.begin(),
                       sm_module_inputs.end(),
                       all_output_shapes.begin(),
                       [](auto submod) { return submod->get_output_shapes(); });
        // check that all of the submodules have the same number of outputs and all respective
        // outputs have the same rank and type
        auto shapes_ndim  = get_shapes_ndim(all_output_shapes.front());
        auto shapes_types = get_shapes_types(all_output_shapes.front());
        if(std::any_of(
               all_output_shapes.begin() + 1, all_output_shapes.end(), [&](auto out_shapes) {
                   bool same_types = get_shapes_types(out_shapes) == shapes_types;
                   bool same_ndim  = get_shapes_ndim(out_shapes) == shapes_ndim;
                   return not same_types or not same_ndim;
               }))
        {
            return;
        }
        auto num_out_shapes = shapes_ndim.size();
        std::vector<shape> dyn_shapes(num_out_shapes);
        auto num_submod = sm_module_inputs.size();
        // compare respective output shapes from each submodule to get a range for the output shape
        for(int i : range(num_out_shapes))
        {
            std::vector<shape> shapes_at_index(num_submod);
            std::transform(all_output_shapes.begin(),
                           all_output_shapes.end(),
                           shapes_at_index.begin(),
                           [&](auto output_shapes) { return output_shapes.at(i); });
            dyn_shapes.at(i) = dyn_shape_from_shapes(shapes_at_index);
        }
        auto tuple_shape = shape{dyn_shapes};
        m.replace_instruction(
            sm_ins,
            make_op("select_module", {{"output_dyn_shapes", to_value(tuple_shape)}}),
            sm_ins->inputs(),
            sm_module_inputs);
    }

    std::vector<std::size_t> get_shapes_ndim(const std::vector<shape>& shapes) const
    {
        std::vector<std::size_t> ret(shapes.size());
        std::transform(
            shapes.cbegin(), shapes.cend(), ret.begin(), [](auto s) { return s.ndim(); });
        return ret;
    }

    std::vector<shape::type_t> get_shapes_types(const std::vector<shape>& shapes) const
    {
        std::vector<shape::type_t> ret(shapes.size());
        std::transform(
            shapes.cbegin(), shapes.cend(), ret.begin(), [](auto s) { return s.type(); });
        return ret;
    }

    /**
     * Calculating an appropriate shape that encompasses all of the given vector of shapes.
     * Equivalent to creating a 2D matrix of shape lengths and do a reduce over each axis.
     * The shapes can be dynamic or static.
     * Assuming all shapes have the same ndim.
     */
    shape dyn_shape_from_shapes(std::vector<shape> shape_vec) const
    {
        // making 2D matrices of min_lens and max_lens
        // specifically using uint64_t because we're going to put the values into a tensor_view
        // later
        std::vector<uint64_t> all_min_lens;
        std::vector<uint64_t> all_max_lens;
        for(const auto& s : shape_vec)
        {
            auto min_lens = s.min_lens();
            auto max_lens = s.max_lens();
            std::copy(min_lens.begin(), min_lens.end(), std::back_inserter(all_min_lens));
            std::copy(max_lens.begin(), max_lens.end(), std::back_inserter(all_max_lens));
        }
        assert(all_min_lens.size() == shape_vec.size() * shape_vec.front().ndim());
        assert(all_max_lens.size() == shape_vec.size() * shape_vec.front().ndim());
        auto num_rows = shape_vec.size();
        auto num_cols = shape_vec.front().ndim();
        shape tensor_shape{shape::uint64_type, {num_rows, num_cols}};
        auto min_lens_matrix = make_view(tensor_shape, all_min_lens.data());
        auto max_lens_matrix = make_view(tensor_shape, all_max_lens.data());

        std::vector<uint64_t> mins(num_cols);
        std::vector<uint64_t> maxes(num_cols);
        // rearranging data into column vectors to reduce over
        // i = row, j = column
        for(int j : range(num_cols))
        {
            std::vector<uint64_t> reduce_min_vals(num_rows);
            std::vector<uint64_t> reduce_max_vals(num_rows);
            for(int i : range(num_rows))
            {
                reduce_min_vals.at(i) = min_lens_matrix(i, j);
                reduce_max_vals.at(i) = max_lens_matrix(i, j);
            }
            uint64_t max_int = std::numeric_limits<uint64_t>::max();
            uint64_t min_val =
                std::accumulate(reduce_min_vals.begin(),
                                reduce_min_vals.end(),
                                max_int,
                                [](uint64_t x, uint64_t y) { return x < y ? x : y; });
            uint64_t max_val = std::accumulate(
                reduce_max_vals.begin(), reduce_max_vals.end(), 0, [](uint64_t x, uint64_t y) {
                    return x > y ? x : y;
                });
            mins.at(j)  = min_val;
            maxes.at(j) = max_val;
        }
        // fixed output shape case
        if(mins == maxes)
        {
            return shape{shape_vec.front().type(), mins};
        }
        // dynamic output shape case
        return shape{shape_vec.front().type(), mins, maxes, {}};
    }
};

void simplify_dyn_ops::apply(module& m) const
{
    match::find_matches(m,
                        find_broadcast_with_dims_static{},
                        find_resize_static{},
                        find_static_dimensions_of{},
                        find_const_alloc_reshapes{},
                        find_static_2in_broadcasts{},
                        find_const_2in_slice{},
                        find_const_3in_slice{},
                        find_const_4in_slice{},
                        find_const_alloc_fill{},
                        find_static_broadcast_for_dot{},
                        find_static_onehot{});
    match::find_matches(m, simplify_select_module_output_shape{});
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
