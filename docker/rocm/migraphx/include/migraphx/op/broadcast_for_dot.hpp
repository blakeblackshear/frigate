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
#ifndef MIGRAPHX_GUARD_OPERATORS_BROADCAST_FOR_DOT_HPP
#define MIGRAPHX_GUARD_OPERATORS_BROADCAST_FOR_DOT_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/common.hpp>
#include <migraphx/dyn_output.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Broadcast dimensions between two tensors for the `dot` operator.
 * Essentially broadcasts between two shapes for dimensions other than the last two.
 * This operator is only needed if one of the shapes are dynamic.
 * Example:
 * a = shape[{1, 4}, 3, 248, 248]
 * b = shape[248, 365]
 * broadcast_for_dot(a, b) => shape[{1, 4}, 3, 248, 248] (no change)
 * broadcast_for_dot(b, a) => shape[{1, 4}, 3, 248, 365]
 */
struct broadcast_for_dot
{
    std::string name() const { return "broadcast_for_dot"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(2);
        check_shapes{{inputs.at(0)}, *this, true}.min_ndims(2);
        check_shapes{{inputs.at(1)}, *this, true}.min_ndims(2);
        auto s0 = inputs.at(0);
        auto s1 = inputs.at(1);
        if(s0.dynamic() or s1.dynamic())
        {
            s0           = s0.to_dynamic();
            s1           = s1.to_dynamic();
            auto dds0_it = s0.dyn_dims().end() - 2;
            auto dds1_it = s1.dyn_dims().end() - 2;
            std::vector<shape::dynamic_dimension> sliced_dds0{s0.dyn_dims().begin(), dds0_it};
            std::vector<shape::dynamic_dimension> sliced_dds1{s1.dyn_dims().begin(), dds1_it};
            auto output_dyn_dims = compute_broadcasted_dyn_dims(sliced_dds0, sliced_dds1);
            output_dyn_dims.insert(output_dyn_dims.end(), dds0_it, s0.dyn_dims().end());
            return {s0.type(), output_dyn_dims};
        }
        else
        {
            auto l0_it = s0.lens().begin() + s0.ndim() - 2;
            std::vector<std::size_t> l0_broadcasted_lens(s0.lens().begin(), l0_it);
            auto l1_it = s1.lens().begin() + s1.ndim() - 2;
            std::vector<std::size_t> l1_broadcasted_lens(s1.lens().begin(), l1_it);
            auto output_lens = compute_broadcasted_lens(l0_broadcasted_lens, l1_broadcasted_lens);
            output_lens.insert(output_lens.end(), l0_it, s0.lens().end());
            return make_bcast_shape(s0, output_lens);
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
