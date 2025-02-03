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
#ifndef MIGRAPHX_GUARD_OPERATORS_BITWISE_AND_HPP
#define MIGRAPHX_GUARD_OPERATORS_BITWISE_AND_HPP

#include <migraphx/config.hpp>
#include <migraphx/op/binary.hpp>
#include <cmath>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct bitwise_and : binary<bitwise_and>
{
    value attributes() const
    {
        auto a           = base_attributes();
        a["commutative"] = true;
        return a;
    }

    std::string point_function() const { return "&"; }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        auto result = binary<bitwise_and>::compute_shape(inputs);
        if(not shape::is_integral(result.type()))
        {
            MIGRAPHX_THROW("BITWISE_AND: only supports integral types");
        }
        return result;
    }

    auto apply() const
    {
        return [](auto x, auto y) {
            if constexpr(std::is_integral<decltype(x)>{} and std::is_integral<decltype(y)>{})
            {
                // NOLINTNEXTLINE(hicpp-signed-bitwise)
                return x & y;
            }
            else
            {
                MIGRAPHX_THROW("BITWISE_AND: only supports integral types");
                // will never return the next line; needed for return template typing
                return x;
            }
        };
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
