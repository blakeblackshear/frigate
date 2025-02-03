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
#include <migraphx/gpu/compile_hip.hpp>
#include <migraphx/serialize.hpp>
#include <migraphx/value.hpp>
#include <migraphx/msgpack.hpp>
#include <migraphx/file_buffer.hpp>
#include <migraphx/ranges.hpp>
#include <array>
#include <iostream>
#include <cstring>

#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif

std::vector<char> read_stdin()
{
#ifdef _WIN32
    // Set stream translation mode to BINARY to suppress translations.
    // https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/setmode?view=msvc-170
    auto old_mode = _setmode(_fileno(stdin), _O_BINARY);
    if(old_mode == -1)
        MIGRAPHX_THROW(std::strerror(errno));
#endif
    std::vector<char> result;
    std::array<char, 1024> buffer{};
    std::size_t len = 0;
    while((len = std::fread(buffer.data(), 1, buffer.size(), stdin)) > 0)
    {
        if(std::ferror(stdin) != 0 and std::feof(stdin) == 0)
            MIGRAPHX_THROW(std::strerror(errno));

        result.insert(result.end(), buffer.data(), buffer.data() + len);
    }
#ifdef _WIN32
    // Reset to the previously set translation mode.
    _setmode(_fileno(stdin), old_mode);
#endif
    return result;
}

int main(int argc, char const* argv[])
{
    if(argc < 2 or migraphx::contains({"-h", "--help", "-v", "--version"}, std::string(argv[1])))
    {
        std::cout << "USAGE:" << std::endl;
        std::cout << "    ";
        std::cout << "Used internally by migraphx to compile hip programs out-of-process."
                  << std::endl;
        std::exit(0);
    }
    std::string output_name = argv[1];
    try
    {
        auto v = migraphx::from_msgpack(read_stdin());
        std::vector<migraphx::gpu::hiprtc_src_file> srcs;
        migraphx::from_value(v.at("srcs"), srcs);
        auto out =
            migraphx::gpu::compile_hip_src_with_hiprtc(std::move(srcs),
                                                       v.at("params").to_vector<std::string>(),
                                                       v.at("arch").to<std::string>());
        if(not out.empty())
            migraphx::write_buffer(output_name, out.front());
    }
    catch(const std::exception& err)
    {
        std::cout << err.what() << std::endl;
    }
}
