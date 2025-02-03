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

* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

#ifndef MIGRAPHX_GUARD_RTGLIB_TYPE_TRAITS_HPP
#define MIGRAPHX_GUARD_RTGLIB_TYPE_TRAITS_HPP

#include <type_traits>
#include <migraphx/half.hpp>
#include <migraphx/bf16.hpp>
#include <migraphx/config.hpp>
#include <migraphx/float8.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

#define MIGRAPHX_DETAIL_DEFINE_TRAIT(trait) \
    template <class X>                      \
    struct trait : std::trait<X>            \
    {                                       \
    };

#define MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(trait, T) \
    template <>                                    \
    struct trait<T> : std::true_type               \
    {                                              \
    };

MIGRAPHX_DETAIL_DEFINE_TRAIT(is_floating_point);
MIGRAPHX_DETAIL_DEFINE_TRAIT(is_arithmetic);
MIGRAPHX_DETAIL_DEFINE_TRAIT(is_signed);

MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_floating_point, half)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_signed, half)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_arithmetic, half)

MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_floating_point, bf16)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_signed, bf16)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_arithmetic, bf16)

MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_floating_point, migraphx::fp8::fp8e4m3fnuz)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_signed, migraphx::fp8::fp8e4m3fnuz)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_arithmetic, migraphx::fp8::fp8e4m3fnuz)

MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_floating_point, migraphx::fp8::fp8e5m2fnuz)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_signed, migraphx::fp8::fp8e5m2fnuz)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_arithmetic, migraphx::fp8::fp8e5m2fnuz)

MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_floating_point, migraphx::fp8::fp8e4m3fn)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_signed, migraphx::fp8::fp8e4m3fn)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_arithmetic, migraphx::fp8::fp8e4m3fn)

MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_floating_point, migraphx::fp8::fp8e5m2)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_signed, migraphx::fp8::fp8e5m2)
MIGRAPHX_DETAIL_EXTEND_TRAIT_FOR(is_arithmetic, migraphx::fp8::fp8e5m2)

template <class T>
using accumulator_type =
    std::conditional_t<is_floating_point<T>{},
                       double,
                       std::conditional_t<is_signed<T>{}, std::int64_t, std::uint64_t>>;

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
