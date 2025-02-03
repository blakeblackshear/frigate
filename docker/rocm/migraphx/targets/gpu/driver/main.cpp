/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/gpu/driver/parser.hpp>
#include <migraphx/json.hpp>
#include <migraphx/convert_to_json.hpp>
#include <migraphx/file_buffer.hpp>
#include <iostream>

using namespace migraphx;              // NOLINT
using namespace migraphx::gpu;         // NOLINT
using namespace migraphx::gpu::driver; // NOLINT

int main(int argc, char const* argv[])
{
    std::vector<std::string> args(argv, argv + argc);
    if(args.size() < 2)
    {
        std::cout << "Usage: gpu-driver <input-file>" << std::endl;
        std::abort();
    }
    auto v = from_json_string(convert_to_json(read_string(args[1])));
    parser::process(v);
}
