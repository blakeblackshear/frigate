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
#ifndef MIGRAPHX_GUARD_OPERATORS_CONVERT_HPP
#define MIGRAPHX_GUARD_OPERATORS_CONVERT_HPP

#include <migraphx/config.hpp>
#include <migraphx/op/unary.hpp>
#include <cmath>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct convert : unary<convert>
{
    shape::type_t target_type = shape::half_type;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.target_type, "target_type"));
    }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        auto input = inputs.at(0);
        if(input.dynamic())
        {
            return {target_type, input.dyn_dims()};
        }
        else
        {
            return {target_type, input.lens(), input.strides()};
        }
    }

    std::string point_op() const
    {
        return "${function:convert}<" + shape::cpp_type(target_type) + ">(${0})";
    }

    auto apply() const
    {
        auto type = target_type;
        return [type](auto x) {
            auto y = x;
            shape::visit(type, [&](auto as) {
                // clamping value between target_type's max and min doesn't work for NaNs,
                if(std::isnan(static_cast<double>(x)))
                {
                    y = as.nan();
                }
                else if(shape::is_integral(type) and std::is_floating_point_v<decltype(x)>)
                {
                    // for the floating point to integer conversion, clamp first and then convert to
                    // avoid undefined behaviour
                    y = as(std::min(std::max(static_cast<double>(x), static_cast<double>(as.min())),
                                    static_cast<double>(as.max())));
                }
                else
                {
                    // clamp overflowing/underflowing values to min()/max() instead of +/-infinity
                    // during downcasting
                    y = std::min(std::max(as(x), as.min()), as.max());
                }
            });
            return y;
        };
    }

    convert(shape::type_t t) : target_type{t} {}
    convert() {}
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
