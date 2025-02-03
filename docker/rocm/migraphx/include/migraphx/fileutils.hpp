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

#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_FILEUTILS_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_FILEUTILS_HPP

#include <migraphx/filesystem.hpp>
#include <string_view>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_EXPORT fs::path make_executable_filename(std::string_view name);
MIGRAPHX_EXPORT fs::path make_shared_object_filename(std::string_view name);
MIGRAPHX_EXPORT fs::path make_object_file_filename(std::string_view name);
MIGRAPHX_EXPORT fs::path make_static_library_filename(std::string_view name);
MIGRAPHX_EXPORT fs::path append_extension(const fs::path& path, std::string_view ext);

inline std::string operator+(std::string l, const fs::path& r) { return std::move(l) + r.string(); }

inline std::string operator+(const fs::path& l, std::string r) { return l.string() + std::move(r); }

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif // MIGRAPHX_GUARD_MIGRAPHLIB_FILEUTILS_HPP
