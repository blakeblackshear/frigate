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
#ifndef MIGRAPHX_GUARD_RTGLIB_DEVICE_FAST_DIV_HPP
#define MIGRAPHX_GUARD_RTGLIB_DEVICE_FAST_DIV_HPP

#include <migraphx/gpu/device/types.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

constexpr const uint64_t fast_div_shift = 42;
inline uint64_t encode_divisor(uint64_t divisor)
{
    if(divisor == 0)
        return 0;
    auto p = uint64_t{1} << fast_div_shift;
    return (p + divisor - 1) / divisor;
}

inline constexpr bool is_divisor_encodable(uint64_t i)
{
    return i < (uint64_t{1} << (fast_div_shift / 2));
}

MIGRAPHX_DEVICE_CONSTEXPR uint64_t fast_div(uint64_t dividend, uint64_t encoded_divisor)
{
    return (dividend * encoded_divisor) >> fast_div_shift;
}

MIGRAPHX_DEVICE_CONSTEXPR uint64_t remainder(uint64_t result, uint64_t dividend, uint64_t divisor)
{
    return dividend - divisor * result;
}

MIGRAPHX_DEVICE_CONSTEXPR uint64_t fast_mod(uint64_t dividend,
                                            uint64_t divisor,
                                            uint64_t encoded_divisor)
{
    return remainder(fast_div(dividend, encoded_divisor), dividend, divisor);
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
