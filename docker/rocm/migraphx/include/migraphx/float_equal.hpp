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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_FLOAT_EQUAL_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_FLOAT_EQUAL_HPP

#include <algorithm>
#include <cmath>
#include <numeric>

#include <migraphx/requires.hpp>
#include <migraphx/config.hpp>
#include <migraphx/type_traits.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class... Ts>
using common_type = typename std::common_type<Ts...>::type;

struct float_equal_fn
{
    template <class T, MIGRAPHX_REQUIRES(is_floating_point<T>{})>
    static bool apply(T x, T y)
    {
        return std::isfinite(x) and std::isfinite(y) and
               std::nextafter(x, std::numeric_limits<T>::lowest()) <= y and
               std::nextafter(x, std::numeric_limits<T>::max()) >= y;
    }

    template <class T, MIGRAPHX_REQUIRES(not is_floating_point<T>{})>
    static bool apply(T x, T y)
    {
        return x == y;
    }

    template <class T, class U>
    bool operator()(T x, U y) const
    {
        return float_equal_fn::apply<common_type<T, U>>(x, y);
    }
};

static constexpr float_equal_fn float_equal{};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
