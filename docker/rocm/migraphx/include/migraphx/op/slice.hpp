/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_OPERATORS_SLICE_HPP
#define MIGRAPHX_GUARD_OPERATORS_SLICE_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <migraphx/normalize_attributes.hpp>
#include <array>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Slice operator that accepts variable axes, starts and ends.
 * All of `starts`, `ends`, and `axes` must be supplied by either
 * their attribute or an input (but not both).
 *
 * Valid calls:
 * slice(input); axes, starts, ends set
 * slice(input, starts); axes, ends set
 * slice(input, ends); starts, axes set
 * slice(input, axes); starts, ends set
 * slice(input, starts, ends); axes set
 * slice(input, starts, axes); ends set
 * slice(input, ends, axes); starts set
 * slice(input, start, ends, axes); none set
 *
 * Attributes:
 * axes: constant axes to slice over (optional)
 * starts: constant slice starting indices (optional)
 * ends: constant slice ending indices (optional)
 *
 * Parameters:
 * data: the input tensor to slice (dynamic or static shape)
 * input_starts: starting indices of slice (optional, static shape)
 * input_ends: ending indices of slice (optional, static shape)
 * input_axes: axes to slice over (optional, static shape)
 */
struct slice
{
    std::vector<int64_t> axes{};
    std::vector<int64_t> starts{};
    std::vector<int64_t> ends{};

    /**
     * Named arrays for the set attribute possibilities.
     */
    static constexpr std::array<bool, 3> all_set     = {true, true, true};
    static constexpr std::array<bool, 3> ends_axes   = {false, true, true};
    static constexpr std::array<bool, 3> starts_axes = {true, false, true};
    static constexpr std::array<bool, 3> starts_ends = {true, true, false};
    static constexpr std::array<bool, 3> axes_only   = {false, false, true};
    static constexpr std::array<bool, 3> ends_only   = {false, true, false};
    static constexpr std::array<bool, 3> starts_only = {true, false, false};
    static constexpr std::array<bool, 3> none_set    = {false, false, false};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axes, "axes"), f(self.starts, "starts"), f(self.ends, "ends"));
    }

    /**
     * Ensure that attribute axes is within limits.
     * Will attempt to normalize starts and ends; but will use the dynamic_dimension.max
     * values for dynamic shapes. This makes it so you have to renormalize for
     * non-fixed dynamic_dimensions.
     */
    value attributes() const
    {
        value normalize_axes     = value::object{};
        normalize_axes["axes"]   = value::array{normalize_attribute::include_min};
        normalize_axes["starts"] = value::array{normalize_attribute::clip_max,
                                                normalize_attribute::clip_min,
                                                normalize_attribute::include_max,
                                                normalize_attribute::use_len,
                                                normalize_attribute::include_min};
        normalize_axes["ends"]   = value::array{normalize_attribute::clip_max,
                                              normalize_attribute::clip_min,
                                              normalize_attribute::include_max,
                                              normalize_attribute::use_len,
                                              normalize_attribute::include_min};
        return {{"normalize_axes", normalize_axes}};
    }

    std::string name() const { return "slice"; }

    /**
     * Computes the slice output shape dimensions for given starts, ends,and axes.
     * Templated to also handle tensor views.
     * Possibly different type between [in_starts, in_ends] and [in_axes] if in_axes is this
     * object's axes attribute. Assumes in_starts and in_ends are normalized; in_axes are valid.
     */
    template <class A, class B>
    std::vector<std::size_t>
    lens_calc(const std::vector<std::size_t>& lengths, A in_starts, A in_ends, B in_axes) const
    {
        auto new_lens = lengths;
        for(std::size_t i = 0; i < in_axes.size(); ++i)
        {
            auto axis      = in_axes[i];
            new_lens[axis] = in_ends[i] - in_starts[i];
        }
        return new_lens;
    }

    /// Get the attributes that are non-empty
    std::array<bool, 3> get_set_attributes() const
    {
        std::array<std::vector<int64_t>, 3> attrs = {this->starts, this->ends, this->axes};
        std::array<bool, 3> bool_vec;
        std::transform(
            attrs.cbegin(), attrs.cend(), bool_vec.begin(), [](auto a) { return not a.empty(); });
        return bool_vec;
    }

    /// Helper function for normalize_compute_shape()
    shape compute_two_or_more(std::vector<shape> inputs) const
    {
        auto input_shape    = inputs[0];
        auto set_attributes = get_set_attributes();
        // check that inputs [1, end) are all 1D, have the same
        // dimension, and are static
        check_shapes{inputs.begin() + 1,
                     inputs.end(),
                     std::string("SLICE: inputs (starts, ends, and input_axes)"),
                     false}
            .only_dims(1)
            .same_dims();
        auto dds = input_shape.to_dynamic().dyn_dims();
        if(inputs.size() == 2)
        {
            if(set_attributes == ends_axes)
            {
                // attr ends and axes set; inputs are (data, input_starts)
                if(inputs[1].lens().at(0) != axes.size())
                {
                    MIGRAPHX_THROW("SLICE: 2 input and attributes mismatch");
                }
                std::for_each(axes.cbegin(), axes.cend(), [&](const auto& axis) {
                    dds.at(axis) = {0, dds.at(axis).max};
                });
            }
            else if(set_attributes == starts_axes)
            {
                // attr starts and axes set; inputs are (data, input_ends)
                if(inputs[1].lens().at(0) != axes.size())
                {
                    MIGRAPHX_THROW("SLICE: 2 input and attributes mismatch");
                }
                std::for_each(axes.cbegin(), axes.cend(), [&](const auto& axis) {
                    dds.at(axis) = {0, dds.at(axis).max};
                });
            }
            else if(set_attributes == starts_ends)
            {
                // attr starts and ends set; inputs are (data, input_axes)
                if(inputs[1].lens().at(0) != starts.size())
                {
                    MIGRAPHX_THROW("SLICE: 2 input and attributes mismatch");
                }
                std::transform(dds.begin(), dds.end(), dds.begin(), [](auto dd) {
                    return shape::dynamic_dimension{0, dd.max};
                });
            }
            else
            {
                MIGRAPHX_THROW("SLICE: Invalid 2 input and attributes configuration");
            }
        }
        else if(inputs.size() == 3)
        {
            if(set_attributes == axes_only)
            {
                // attr axes set; inputs are (data, input_starts, input_ends)
                if(inputs[1].lens().at(0) != axes.size())
                {
                    MIGRAPHX_THROW("SLICE: 3 input and attributes mismatch");
                }
                std::for_each(axes.cbegin(), axes.cend(), [&](const auto& axis) {
                    dds.at(axis) = {0, dds.at(axis).max};
                });
            }
            else if(set_attributes == ends_only)
            {
                // attr ends set; inputs are (data, input_starts, input_axes)
                if(inputs[1].lens().at(0) != ends.size())
                {
                    MIGRAPHX_THROW("SLICE: 3 input and attributes mismatch");
                }
                std::transform(dds.begin(), dds.end(), dds.begin(), [](auto dd) {
                    return shape::dynamic_dimension{0, dd.max};
                });
            }
            else if(set_attributes == starts_only)

            {
                // attr starts set; inputs are (data, input_ends, input_axes)
                if(inputs[1].lens().at(0) != starts.size())
                {
                    MIGRAPHX_THROW("SLICE: 3 input and attributes mismatch");
                }
                std::transform(dds.begin(), dds.end(), dds.begin(), [](auto dd) {
                    return shape::dynamic_dimension{0, dd.max};
                });
            }
            else
            {
                MIGRAPHX_THROW("Invalid 3 input and attributes configuration");
            }
        }
        else
        {
            // all 4 inputs (data, inputs_starts, input_ends, input_axes)
            std::transform(dds.begin(), dds.end(), dds.begin(), [](auto dd) {
                return shape::dynamic_dimension{0, dd.max};
            });
        }
        return shape{input_shape.type(), dds};
    }

    // uses the normalize_axes flag to normalize axes, starts, and ends
    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1, 2, 3, 4);
        if(inputs.size() == 1)
        {
            auto input_shape    = inputs[0];
            auto set_attributes = get_set_attributes();
            if(set_attributes != all_set)
            {
                MIGRAPHX_THROW("SLICE 1_arg: Invalid 1 input and attributes configuration");
            }
            // NOTE: make sure to update how normalization works here if this type of slicing is
            // changed to be allowed
            if(input_shape.dynamic() and std::any_of(axes.begin(), axes.end(), [&](auto axis) {
                   return not input_shape.dyn_dims()[axis].is_fixed();
               }))
            {
                MIGRAPHX_THROW(
                    "SLICE 1_arg: slicing is not allowed on non-fixed dynamic input axis ");
            }
            if(input_shape.dynamic())
            {
                return shape{
                    input_shape.type(),
                    lens_calc(input_shape.min_lens(), this->starts, this->ends, this->axes),
                    lens_calc(input_shape.max_lens(), this->starts, this->ends, this->axes),
                    {}};
            }
            else
            {
                return shape{input_shape.type(),
                             lens_calc(input_shape.lens(), this->starts, this->ends, this->axes),
                             input_shape.strides()};
            }
        }
        else
        {
            return compute_two_or_more(inputs);
        }
    }

    /**
     * Calculates the starting offset for the sliced tensor.
     * Used in compute when only data input and all other information are in the attributes.
     *
     * \param s static input shape
     */
    auto compute_offset(const shape& s) const
    {
        const std::vector<std::size_t>& lens    = s.lens();
        const std::vector<std::size_t>& strides = s.strides();
        auto offset                             = 0;
        if(not axes.empty())
        {
            for(std::size_t i = 0; i < axes.size(); i++)
            {
                auto axis = axes[i];
                offset += starts[i] * strides[axis];
            }
        }
        else
        {
            for(std::size_t axis = 0; axis < lens.size(); axis++)
            {
                offset += starts[axis] * strides[axis];
            }
        }
        return offset * s.type_size();
    }

    /**
     * Calculates the starting offset for the sliced tensor (for aliasing).
     * Used for 2-4 inputs to `slice.
     *
     * \param s static input shape
     * \param input_starts starting indices of slice
     * \param ax_vec axes to slice on
     */
    template <class T>
    auto compute_offset(const shape& s, const T& input_starts, const T& ax_vec) const
    {
        auto ret = 0;
        for(std::size_t i = 0; i < ax_vec.size(); ++i)
        {
            auto axis = ax_vec[i];
            ret += input_starts[i] * s.strides().at(axis);
        }
        return ret * s.type_size();
    }

    /**
     * If given, normalize the inputs. Otherwise get from operator attributes.
     * Return the values in a map.
     *
     * Parameters
     * input_shape: static shape of the input
     * input_starts: optional
     * input_ends: optional
     * input_ends: optional
     */
    std::unordered_map<std::string, std::vector<int64_t>>
    normalize_starts_ends_axes(shape input_shape,
                               const optional<std::vector<int64_t>>& input_starts,
                               const optional<std::vector<int64_t>>& input_ends,
                               const optional<std::vector<int64_t>>& input_axes) const
    {
        auto axes_attrs = this->attributes().at("normalize_axes");
        std::vector<int64_t> norm_starts;
        std::vector<int64_t> norm_ends;
        std::vector<int64_t> norm_axes;
        if(input_axes)
        {
            norm_axes = normalize_axes(input_axes.value(),
                                       input_shape,
                                       axes_attrs.at("axes"),
                                       "Slice variable input_axes");
        }
        else
        {
            norm_axes = this->axes;
        }
        if(input_starts)
        {
            norm_starts = normalize_indices(input_starts.value(),
                                            norm_axes,
                                            input_shape,
                                            axes_attrs.at("starts"),
                                            "Slice variable input_starts");
        }
        else
        {
            norm_starts = this->starts;
        }
        if(input_ends)
        {
            norm_ends = normalize_indices(input_ends.value(),
                                          norm_axes,
                                          input_shape,
                                          axes_attrs.at("ends"),
                                          "Slice variable input ends");
        }
        else
        {
            norm_ends = this->ends;
        }
        return {{"norm_starts", norm_starts}, {"norm_ends", norm_ends}, {"norm_axes", norm_axes}};
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        auto input       = args[0];
        auto input_shape = input.get_shape();
        if(args.size() == 1)
        {
            std::size_t offset = compute_offset(input_shape);
            return {dyn_out.computed_shape, [=] { return input.data() + offset; }};
        }
        else
        {
            // Note that we re-normalize both the attributes and inputs because of the non-fixed
            // dynamic input shape case. It's possible to only re-normalize if slicing over
            // non-fixed dynamic_dimensions.
            auto set_attributes = get_set_attributes();
            std::unordered_map<std::string, std::vector<int64_t>> norm_inputs;
            if(set_attributes == ends_axes)
            {
                // attr ends and axes set; inputs are (data, input_starts)
                args[1].visit([&](auto input_starts) {
                    norm_inputs =
                        normalize_starts_ends_axes(input_shape,
                                                   input_starts.template to_vector<int64_t>(),
                                                   this->ends,
                                                   this->axes);
                });
            }
            else if(set_attributes == starts_axes)
            {
                // attr starts and axes set; inputs are (data, input_ends)
                args[1].visit([&](auto input_ends) {
                    norm_inputs =
                        normalize_starts_ends_axes(input_shape,
                                                   this->starts,
                                                   input_ends.template to_vector<int64_t>(),
                                                   this->axes);
                });
            }
            else if(set_attributes == starts_ends)
            {
                // attr starts and ends set; inputs are (data, input_axes)
                args[1].visit([&](auto input_axes) {
                    norm_inputs =
                        normalize_starts_ends_axes(input_shape,
                                                   this->starts,
                                                   this->ends,
                                                   input_axes.template to_vector<int64_t>());
                });
            }
            else if(set_attributes == axes_only)
            {
                // attr axes set; inputs are (data, input_starts, input_ends)
                visit_all(args[1], args[2])([&](auto input_starts, auto input_ends) {
                    norm_inputs =
                        normalize_starts_ends_axes(input_shape,
                                                   input_starts.template to_vector<int64_t>(),
                                                   input_ends.template to_vector<int64_t>(),
                                                   this->axes);
                });
            }
            else if(set_attributes == ends_only)
            {
                // attr ends set; inputs are (data, input_starts, input_axes)
                visit_all(args[1], args[2])([&](auto input_starts, auto input_axes) {
                    norm_inputs =
                        normalize_starts_ends_axes(input_shape,
                                                   input_starts.template to_vector<int64_t>(),
                                                   this->ends,
                                                   input_axes.template to_vector<int64_t>());
                });
            }
            else if(set_attributes == starts_only)
            {
                // attr starts set; inputs are (data, input_ends, input_axes)
                visit_all(args[1], args[2])([&](auto input_ends, auto input_axes) {
                    norm_inputs =
                        normalize_starts_ends_axes(input_shape,
                                                   this->starts,
                                                   input_ends.template to_vector<int64_t>(),
                                                   input_axes.template to_vector<int64_t>());
                });
            }
            else
            {
                // no attr set, all inputs
                visit_all(args[1], args[2], args[3])(
                    [&](auto input_starts, auto input_ends, auto input_axes) {
                        norm_inputs =
                            normalize_starts_ends_axes(input_shape,
                                                       input_starts.template to_vector<int64_t>(),
                                                       input_ends.template to_vector<int64_t>(),
                                                       input_axes.template to_vector<int64_t>());
                    });
            }
            auto offset = compute_offset(
                input_shape, norm_inputs.at("norm_starts"), norm_inputs.at("norm_axes"));
            shape calc_shape = shape{input_shape.type(),
                                     lens_calc(input_shape.lens(),
                                               norm_inputs.at("norm_starts"),
                                               norm_inputs.at("norm_ends"),
                                               norm_inputs.at("norm_axes")),
                                     input_shape.strides()};
            return {calc_shape, [=] { return input.data() + offset; }};
        }
    }

    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 0; }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
