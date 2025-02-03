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
#include <migraphx/file_buffer.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/fileutils.hpp>
#include <fstream>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class T>
T generic_read_file(const fs::path& filename, size_t offset = 0, size_t nbytes = 0)
{
    std::ifstream is(filename, std::ios::binary | std::ios::ate);
    if(not is.is_open())
        MIGRAPHX_THROW("Failure opening file: " + filename);
    if(nbytes == 0)
    {
        // if there is a non-zero offset and nbytes is not set,
        // calculate size of remaining bytes to read
        nbytes = is.tellg();
        if(offset > nbytes)
            MIGRAPHX_THROW("offset is larger than file size");
        nbytes -= offset;
    }
    if(nbytes < 1)
        MIGRAPHX_THROW("Invalid size for: " + filename);
    is.seekg(offset, std::ios::beg);

    T buffer(nbytes, 0);
    if(not is.read(&buffer[0], nbytes))
        MIGRAPHX_THROW("Error reading file: " + filename);
    return buffer;
}

std::vector<char> read_buffer(const fs::path& filename, size_t offset, size_t nbytes)
{
    return generic_read_file<std::vector<char>>(filename, offset, nbytes);
}

std::string read_string(const fs::path& filename)
{
    return generic_read_file<std::string>(filename);
}

void write_string(const fs::path& filename, const std::string& buffer)
{
    write_buffer(filename, buffer.data(), buffer.size());
}

void write_buffer(const fs::path& filename, const char* buffer, std::size_t size)
{
    std::ofstream os(filename, std::ios::out | std::ios::binary);
    os.write(buffer, size);
}

void write_buffer(const fs::path& filename, const std::vector<char>& buffer)
{
    write_buffer(filename, buffer.data(), buffer.size());
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
