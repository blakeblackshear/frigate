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
#ifndef MIGRAPHX_GUARD_KERNELS_OPS_HPP
#define MIGRAPHX_GUARD_KERNELS_OPS_HPP

#include <migraphx/kernels/math.hpp>

namespace migraphx {
namespace op {

struct sum
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(T x, U y) const
    {
        return x + y;
    }
};

struct product
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(T x, U y) const
    {
        return x * y;
    }
};

struct id
{
    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(T x) const
    {
        return x;
    }
};

template <class T>
struct convert_to
{
    template <class U>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(U x) const
    {
        return convert<T>(x);
    }
};

template <index_int N>
struct mean
{
    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR T operator()(T x) const
    {
        using type = vec_type<T>;
        if constexpr(is_floating_point<type>{})
        {
            constexpr type d = 1.0 / N;
            return x * d;
        }
        else
        {
            return x / static_cast<type>(N);
        }
    }
};

struct max
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(T x, U y) const
    {
        return migraphx::max(x, y);
    }
};

struct min
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(T x, U y) const
    {
        return migraphx::min(x, y);
    }
};

struct logical_and
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(T x, U y) const
    {
        if(static_cast<bool>(x) and static_cast<bool>(y))
            return static_cast<T>(1);
        return static_cast<T>(0);
    }
};

struct logical_or
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR auto operator()(T x, U y) const
    {
        if(static_cast<bool>(x) or static_cast<bool>(y))
            return static_cast<T>(1);
        return static_cast<T>(0);
    }
};
} // namespace op

// NOLINTNEXTLINE
#define MIGRAPHX_OPS_DEFINE_COMMON_TYPE(T) \
    template <class U>                     \
    struct common_type<T, U>               \
    {                                      \
        using type = U;                    \
    };                                     \
    template <class U>                     \
    struct common_type<U, T>               \
    {                                      \
        using type = U;                    \
    };

struct lowest
{
    template <class T>
    constexpr operator T() const
    {
        return numeric_lowest<vec_type<T>>();
    }
};
MIGRAPHX_OPS_DEFINE_COMMON_TYPE(lowest)

struct highest
{
    template <class T>
    constexpr operator T() const
    {
        return numeric_max<vec_type<T>>();
    }
};

MIGRAPHX_OPS_DEFINE_COMMON_TYPE(highest)

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_OPS_HPP
