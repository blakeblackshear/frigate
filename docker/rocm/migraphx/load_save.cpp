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
#include <migraphx/instruction.hpp>
#include <migraphx/load_save.hpp>
#include <migraphx/file_buffer.hpp>
#include <migraphx/json.hpp>
#include <migraphx/msgpack.hpp>
#include <fstream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

program load(const std::string& filename, const file_options& options)
{
    return load_buffer(read_buffer(filename), options);
}
program load_buffer(const std::vector<char>& buffer, const file_options& options)
{
    return load_buffer(buffer.data(), buffer.size(), options);
}
program load_buffer(const char* buffer, std::size_t size, const file_options& options)
{
    program p;
    if(options.format == "msgpack")
    {
        p.from_value(from_msgpack(buffer, size));
    }
    else if(options.format == "json")
    {
        p.from_value(from_json_string(buffer, size));
    }
    else
    {
        MIGRAPHX_THROW("Unknown format: " + options.format);
    }
    return p;
}

void save(const program& p, const std::string& filename, const file_options& options)
{
    write_buffer(filename, save_buffer(p, options));
}

// MIOpen doesn't support serializing fusion plans with Find-2.0 APIs
void print_miopen_warning(const program& p)
{
    auto mods = p.get_modules();
    if(std::any_of(mods.begin(), mods.end(), [](const auto* m) {
           return std::any_of(m->begin(), m->end(), [](const instruction& i) {
               return i.name() == "gpu::miopen_fusion";
           });
       }))
    {
        std::cout << "[WARNING]: Program has miopen_fusion instructions for which tuned solutions "
                     "are not stored inside serialized MIGraphX program. Consider serializing with "
                     "MIGRAPHX_DISABLE_MIOPEN_FUSION=1 flag set."
                  << std::endl;
        ;
    }
}

std::vector<char> save_buffer(const program& p, const file_options& options)
{
    value v = p.to_value();
    print_miopen_warning(p);
    std::vector<char> buffer;
    if(options.format == "msgpack")
    {
        buffer = to_msgpack(v);
    }
    else if(options.format == "json")
    {
        std::string s = to_json_string(v);
        buffer        = std::vector<char>(s.begin(), s.end());
    }
    else
    {
        MIGRAPHX_THROW("Unknown format: " + options.format);
    }
    return buffer;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
