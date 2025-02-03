/* ************************************************************************
 * Copyright (C) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell cop-
 * ies of the Software, and to permit persons to whom the Software is furnished
 * to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IM-
 * PLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNE-
 * CTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ************************************************************************ */
#ifndef MIGRAPHX_GUARD_RTGLIB_BITCAST_HPP
#define MIGRAPHX_GUARD_RTGLIB_BITCAST_HPP
#include <type_traits>
#if defined(__GNUC__) && !defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wstrict-aliasing"
#pragma GCC diagnostic ignored "-Wduplicated-branches"
#endif

#include <migraphx/requires.hpp>
#include <migraphx/config.hpp>

// NOLINTNEXTLINE(cppcoreguidelines-macro-usage)
#define MIGRAPHX_CONST_FOLD(x) (__builtin_constant_p(x) ? (x) : (x))

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
template <typename To,
          typename From,
          MIGRAPHX_REQUIRES(std::is_trivially_copyable<To>{} and
                            std::is_trivially_copyable<From>{})>
inline constexpr To bit_cast(From fr) noexcept
{
    static_assert(sizeof(To) == sizeof(From));
#if defined(__GNUC__) and !defined(__clang__)
    return MIGRAPHX_CONST_FOLD(*reinterpret_cast<To*>(&fr));
#else
    return __builtin_bit_cast(To, fr);
#endif
}
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#if defined(__GNUC__) && !defined(__clang__)
#pragma GCC diagnostic pop
#endif
#endif // MIGRAPHX_GUARD_RTGLIB_BITCAST_HPP
