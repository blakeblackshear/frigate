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
#ifndef MIGRAPHX_GUARD_RTGLIB_FILESYSTEM_HPP
#define MIGRAPHX_GUARD_RTGLIB_FILESYSTEM_HPP

#include <migraphx/config.hpp>

#if defined(CPPCHECK)
#define MIGRAPHX_HAS_FILESYSTEM 1
#define MIGRAPHX_HAS_FILESYSTEM_TS 1
#elif defined(_WIN32)
#if _MSC_VER >= 1920
#define MIGRAPHX_HAS_FILESYSTEM 1
#define MIGRAPHX_HAS_FILESYSTEM_TS 0
#elif _MSC_VER >= 1900
#define MIGRAPHX_HAS_FILESYSTEM 0
#define MIGRAPHX_HAS_FILESYSTEM_TS 1
#else
#define MIGRAPHX_HAS_FILESYSTEM 0
#define MIGRAPHX_HAS_FILESYSTEM_TS 0
#endif
#elif defined(__has_include)
#if __has_include(<filesystem>) && __cplusplus >= 201703L
#define MIGRAPHX_HAS_FILESYSTEM 1
#else
#define MIGRAPHX_HAS_FILESYSTEM 0
#endif
#if __has_include(<experimental/filesystem>) && __cplusplus >= 201103L
#define MIGRAPHX_HAS_FILESYSTEM_TS 1
#else
#define MIGRAPHX_HAS_FILESYSTEM_TS 0
#endif
#else
#define MIGRAPHX_HAS_FILESYSTEM 0
#define MIGRAPHX_HAS_FILESYSTEM_TS 0
#endif

#if MIGRAPHX_HAS_FILESYSTEM
#include <filesystem>
#elif MIGRAPHX_HAS_FILESYSTEM_TS
#include <experimental/filesystem>
#else
#error "No filesystem include available"
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

#if MIGRAPHX_HAS_FILESYSTEM
namespace fs = ::std::filesystem;
#elif MIGRAPHX_HAS_FILESYSTEM_TS
namespace fs = ::std::experimental::filesystem;
#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
