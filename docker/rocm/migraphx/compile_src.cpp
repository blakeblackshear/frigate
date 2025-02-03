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
#include <migraphx/compile_src.hpp>
#include <migraphx/file_buffer.hpp>
#include <migraphx/tmp_dir.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/fileutils.hpp>
#include <vector>
#include <cassert>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

std::vector<char> src_compiler::compile(const std::vector<src_file>& srcs) const
{
    assert(not srcs.empty());
    tmp_dir td{"compile"};
    std::vector<std::string> params{flags};

    params.emplace_back("-I.");

    auto out = output;

    for(const auto& src : srcs)
    {
        fs::path full_path   = td.path / src.path;
        fs::path parent_path = full_path.parent_path();
        fs::create_directories(parent_path);
        write_buffer(full_path, src.content.data(), src.content.size());
        if(src.path.extension().string() == ".cpp")
        {
            params.emplace_back(src.path.filename().string());
            if(out.empty())
                out = src.path.stem().string() + out_ext;
        }
    }

    params.emplace_back("-o " + out);

    std::vector<std::string> args;
    if(not launcher.empty())
        args.push_back(compiler.string());
    args.insert(args.end(), params.begin(), params.end());
    td.execute(launcher.empty() ? compiler : launcher, args);

    auto out_path = td.path / out;
    if(not fs::exists(out_path))
        MIGRAPHX_THROW("Output file missing: " + out);

    return read_buffer(out_path);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
