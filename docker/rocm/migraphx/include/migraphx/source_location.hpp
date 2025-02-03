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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_SOURCE_LOCATION_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_SOURCE_LOCATION_HPP

#include <cstdint>
#include <migraphx/config.hpp>

#if defined(CPPCHECK)
#define MIGRAPHX_HAS_SOURCE_LOCATION 1
#define MIGRAPHX_HAS_SOURCE_LOCATION_TS 1
#elif defined(__has_include)
#if __has_include(<source_location>) && __cplusplus >= 202003L
#define MIGRAPHX_HAS_SOURCE_LOCATION 1
#else
#define MIGRAPHX_HAS_SOURCE_LOCATION 0
#endif
#if __has_include(<experimental/source_location>) && __cplusplus >= 201103L
#define MIGRAPHX_HAS_SOURCE_LOCATION_TS 1
#else
#define MIGRAPHX_HAS_SOURCE_LOCATION_TS 0
#endif
#else
#define MIGRAPHX_HAS_SOURCE_LOCATION 0
#define MIGRAPHX_HAS_SOURCE_LOCATION_TS 0
#endif

#if MIGRAPHX_HAS_SOURCE_LOCATION
#include <source_location>
#elif MIGRAPHX_HAS_SOURCE_LOCATION_TS
#include <experimental/source_location>
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
#if MIGRAPHX_HAS_SOURCE_LOCATION
using source_location = std::source_location;
#elif MIGRAPHX_HAS_SOURCE_LOCATION_TS
using source_location = std::experimental::source_location;
#else
struct source_location
{
    static constexpr source_location current() noexcept { return source_location{}; }
    constexpr std::uint_least32_t line() const noexcept { return 0; }
    constexpr std::uint_least32_t column() const noexcept { return 0; }
    constexpr const char* file_name() const noexcept { return ""; }
    constexpr const char* function_name() const noexcept { return ""; }
};
#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_SOURCE_LOCATION_HPP
