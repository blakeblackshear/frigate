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
#ifndef MIGRAPHX_GUARD_OPERATORS_UNSQUEEZE_HPP
#define MIGRAPHX_GUARD_OPERATORS_UNSQUEEZE_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <migraphx/dyn_output.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Adds dimensions to a tensor based on the axes attribute.
 * `axes` are based on the number of output shape dimensions and should not contain duplicates.
 * `steps` are for modifying dimensions added to the middle of the original shape.
 * Each step must be a factor of the original dimension.
 * ex: unsqueeze(shape = [3, 4, 10], axes = [2, 4, 5], steps = [2]) -> shape = [3, 4, 2, 5, 1, 1]
 * Dynamic shape version does not handle `steps`.
 */
struct unsqueeze
{
    std::vector<int64_t> axes;
    std::vector<int64_t> steps;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axes, "axes"), f(self.steps, "steps"));
    }

    value attributes() const
    {
        value normalize;
        normalize["axes"] =
            value::array{normalize_attribute::include_min, normalize_attribute::use_output};
        return {{"normalize_axes", normalize}};
    }

    std::string name() const { return "unsqueeze"; }
    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        auto input_shape = inputs[0];

        if(input_shape.dynamic())
        {
            if(not steps.empty())
            {
                MIGRAPHX_THROW("UNSQUEEZE_dyn: nonempty steps attribute");
            }
            std::vector<shape::dynamic_dimension> dyn_dims = {};
            auto new_ndim                                  = input_shape.ndim() + axes.size();
            std::size_t k                                  = 0;
            for(auto i : range(new_ndim))
            {
                if(std::find(axes.begin(), axes.end(), i) != axes.end())
                {
                    dyn_dims.push_back({1, 1});
                }
                else
                {
                    dyn_dims.push_back(input_shape.dyn_dims().at(k++));
                }
            }
            return {input_shape.type(), dyn_dims};
        }
        else
        {
            auto type        = input_shape.type();
            auto old_lens    = input_shape.lens();
            auto old_strides = input_shape.strides();
            auto is_scalar   = input_shape.scalar();

            if(is_scalar and old_lens.size() == 1 and old_lens.front() == 1)
                return shape{type, old_lens};

            if(steps.size() > axes.size())
                MIGRAPHX_THROW("UNSQUEEZE: Steps provided with no axis");

            std::size_t new_size = old_lens.size() + axes.size();

            std::vector<std::size_t> new_lens(new_size);
            std::vector<std::size_t> new_strides(new_size);
            std::size_t p = 0;
            for(auto i : range(new_size))
            {
                auto axis_idx = std::find(axes.begin(), axes.end(), i) - axes.begin();
                if(axis_idx < axes.size())
                {
                    std::int64_t step = 1;
                    if(axis_idx < steps.size())
                        step = steps[axis_idx];
                    if(step == 0)
                        MIGRAPHX_THROW("UNSQUEEZE: step must be non-zero");
                    if(is_scalar and step != 1)
                        MIGRAPHX_THROW("UNSQUEEZE: step must be 1 when input is scalar");
                    new_lens[i] = step;
                    if(p < old_strides.size())
                    {
                        if((old_lens[p] % step) != 0)
                            MIGRAPHX_THROW("UNSQUEEZE: Axis dimension is not divisible by step");
                        old_lens[p] /= step;
                        new_strides[i] = is_scalar ? 1 : old_strides[p] * old_lens[p];
                    }
                    else
                    {
                        if(step != 1)
                            MIGRAPHX_THROW("UNSQUEEZE: Step must be 1 for extra axes");
                        new_strides[i] = 1;
                    }
                }
                else
                {
                    new_lens[i]    = old_lens[p];
                    new_strides[i] = old_strides[p++];
                }
            }
            return shape{type, new_lens, new_strides};
        }
    }
    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        return args[0].reshape(dyn_out.computed_shape);
    }
    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 0; }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
