/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_RTGLIB_GPU_DEVICE_FLOAT_EQUAL_HPP
#define MIGRAPHX_GUARD_RTGLIB_GPU_DEVICE_FLOAT_EQUAL_HPP

#include <migraphx/requires.hpp>
#include <migraphx/config.hpp>
#include <migraphx/gpu/device/types.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

template <class... Ts>
using common_type = typename std::common_type<Ts...>::type;

template <class T, MIGRAPHX_REQUIRES(is_floating_point<T>{})>
__device__ bool float_equal_device(T x, T y)
{
    return std::isfinite(x) and std::isfinite(y) and
           std::nextafter(x, std::numeric_limits<T>::lowest()) <= y and
           std::nextafter(x, std::numeric_limits<T>::max()) >= y;
}

template <>
__device__ bool float_equal_device(__bf16 x, __bf16 y) // NOLINT(misc-definitions-in-headers)
{
    float xf = x;
    float yf = y;
    return std::isfinite(xf) and std::isfinite(yf) and
           std::nextafter(xf, std::numeric_limits<float>::lowest()) <= yf and
           std::nextafter(xf, std::numeric_limits<float>::max()) >= yf;
}

template <class T, MIGRAPHX_REQUIRES(not is_floating_point<T>{})>
__device__ bool float_equal_device(T x, T y)
{
    return x == y;
}

template <class T, class U>
__device__ bool float_equal(T x, U y)
{
    return float_equal_device<common_type<T, U>>(x, y);
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
