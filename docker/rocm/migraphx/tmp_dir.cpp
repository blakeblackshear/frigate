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
#include <migraphx/tmp_dir.hpp>
#include <migraphx/env.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/process.hpp>
#include <migraphx/ranges.hpp>
#include <algorithm>
#include <random>
#include <thread>
#include <sstream>
#include <iostream>
#include <string>

#ifdef _WIN32
// cppcheck-suppress definePrefix
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#undef getpid
// cppcheck-suppress [definePrefix, defineUpperCase]
#define getpid _getpid
#else
#include <unistd.h>
#include <sys/types.h>
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_DEBUG_SAVE_TEMP_DIR)

std::string random_string(std::string::size_type length)
{
    static const std::string& chars = "0123456789"
                                      "abcdefghijklmnopqrstuvwxyz"
                                      "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    std::mt19937 rg{std::random_device{}()};
    std::uniform_int_distribution<std::string::size_type> pick(0, chars.length() - 1);

    std::string str(length, 0);
    std::generate(str.begin(), str.end(), [&] { return chars[pick(rg)]; });

    return str;
}

std::string unique_string(const std::string& prefix)
{
    auto pid = getpid();
    auto tid = std::this_thread::get_id();
    auto clk = std::chrono::steady_clock::now().time_since_epoch().count();
    std::stringstream ss;
    ss << std::hex << prefix << "-" << pid << "-" << tid << "-" << clk << "-" << random_string(16);
    return ss.str();
}

tmp_dir::tmp_dir(std::string_view prefix)
    : path(fs::temp_directory_path() /
           unique_string(prefix.empty() ? "migraphx" : "migraphx-" + std::string{prefix}))
{
    fs::create_directories(this->path);
}

void tmp_dir::execute(std::string_view cmd, const std::vector<std::string>& args) const
{
    process{cmd, args}.cwd(this->path).exec();
}

tmp_dir::~tmp_dir()
{
    if(not enabled(MIGRAPHX_DEBUG_SAVE_TEMP_DIR{}))
    {
        constexpr int max_retries_count = 5;
        for([[maybe_unused]] auto count : range(max_retries_count))
        {
            std::error_code ec;
            fs::remove_all(path, ec);
            if(not ec)
                break;
            std::cerr << "Failed to remove " << path << ": " << ec.message() << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(125));
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
