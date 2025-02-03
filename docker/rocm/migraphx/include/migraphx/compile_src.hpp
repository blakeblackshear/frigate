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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_COMPILE_SRC_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_COMPILE_SRC_HPP

#include <migraphx/config.hpp>
#include <migraphx/filesystem.hpp>
#include <functional>
#include <string>
#include <utility>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct src_file
{
    fs::path path;
    std::string_view content;

    src_file() = default;
    src_file(fs::path file_path, std::string_view file_content)
        : path{std::move(file_path)}, content{file_content}
    {
    }

    explicit src_file(const std::pair<std::string_view, std::string_view>& pair)
        : path{pair.first}, content{pair.second}
    {
    }
};

struct MIGRAPHX_EXPORT src_compiler
{
#ifdef _WIN32
    fs::path compiler                         = MIGRAPHX_CXX_COMPILER;
#else
    fs::path compiler = "c++";
#endif
    std::vector<std::string> flags            = {};
    fs::path output                           = {};
    fs::path launcher                         = {};
    std::string out_ext                       = ".o";
    std::function<fs::path(fs::path)> process = nullptr;
    std::vector<char> compile(const std::vector<src_file>& srcs) const;
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_COMPILE_SRC_HPP
