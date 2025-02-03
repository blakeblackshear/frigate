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
#ifndef MIGRAPHX_GUARD_RTGLIB_TMP_DIR_HPP
#define MIGRAPHX_GUARD_RTGLIB_TMP_DIR_HPP

#include <migraphx/config.hpp>
#include <migraphx/filesystem.hpp>
#include <vector>
#include <string>
#include <string_view>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct MIGRAPHX_EXPORT tmp_dir
{
    fs::path path;
    tmp_dir(std::string_view prefix = "");
    tmp_dir(tmp_dir&&) = default;

    void execute(std::string_view cmd, const std::vector<std::string>& args = {}) const;
    void execute(const fs::path& cmd, const std::vector<std::string>& args = {}) const
    {
        execute(std::string_view{cmd.string()}, args);
    }

    tmp_dir(tmp_dir const&) = delete;
    tmp_dir& operator=(tmp_dir const&) = delete;

    ~tmp_dir();
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
