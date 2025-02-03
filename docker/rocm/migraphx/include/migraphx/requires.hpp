/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_REQUIRES_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_REQUIRES_HPP

#include <type_traits>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <bool... Bs>
struct and_ : std::is_same<and_<Bs...>, and_<(Bs or true)...>> // NOLINT
{
};

template <bool B>
using bool_c = std::integral_constant<bool, B>;

#define MIGRAPHX_REQUIRES_PRIMITIVE_CAT(x, y) x##y
#define MIGRAPHX_REQUIRES_CAT(x, y) MIGRAPHX_REQUIRES_PRIMITIVE_CAT(x, y)

#define MIGRAPHX_REQUIRES_VAR() MIGRAPHX_REQUIRES_CAT(PrivateRequires, __LINE__)

#ifdef CPPCHECK
#define MIGRAPHX_REQUIRES(...) class = void
#define MIGRAPHX_CLASS_REQUIRES(...) void
#else
#define MIGRAPHX_REQUIRES(...)                                            \
    long MIGRAPHX_REQUIRES_VAR()            = __LINE__,                   \
         typename std::enable_if<(MIGRAPHX_REQUIRES_VAR() == __LINE__ and \
                                  (migraphx::and_<__VA_ARGS__>{})),       \
                                 int>::type = 0
#define MIGRAPHX_CLASS_REQUIRES(...) typename std::enable_if<(migraphx::and_<__VA_ARGS__>{})>::type
#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
