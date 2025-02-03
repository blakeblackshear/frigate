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
#ifndef MIGRAPHX_GUARD_OPERATORS_CONTIGUOUS_HPP
#define MIGRAPHX_GUARD_OPERATORS_CONTIGUOUS_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/config.hpp>
#include <migraphx/dyn_output.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/// The contiguous operator takes a non-standard input tensor and returns
/// the same tensor but in standard form. For example, if input tensor A which has lens = (4,5)
/// is first transposed, i.e. lens = (5,4), this tensor's data layout remained the same
/// during the transpose operation; only it's shape lengths and strides were changed.
/// This leaves the tensor in a non-standard form. The contiguous operator copies the
/// underlying data such that resulting tensor is returned to a standard form.
struct contiguous
{
    std::string name() const { return "contiguous"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        auto s0 = inputs.front();
        if(s0.dynamic())
        {
            return s0;
        }
        else
        {
            const auto& lens = s0.lens();
            auto t           = s0.type();
            return {t, lens};
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        assert(dyn_out.computed_shape.standard());
        argument result{dyn_out.computed_shape};
        visit_all(result, args[0])([&](auto output, auto input) {
            shape_for_each(output.get_shape(), [&](const auto& idx) {
                output(idx.begin(), idx.end()) = input(idx.begin(), idx.end());
            });
        });
        return result;
    }

    auto apply() const
    {
        return [](auto x) { return x; };
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
