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
#include <migraphx/base64.hpp>
#include <vector>
#include <array>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace {
using byte = unsigned char;

std::array<char, 64> constexpr b64_chars{
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
    'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
    'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'};

/// base64 encoder snippet altered from https://stackoverflow.com/a/37109258
std::string encode(const std::vector<byte>& buf)
{
    std::size_t len = buf.size();
    std::vector<byte> res_vec((len + 2) / 3 * 4, '=');
    std::size_t j         = 0;
    std::size_t remaining = len % 3;
    const size_t last     = len - remaining;

    for(size_t i = 0; i < last; i += 3)
    {
        std::size_t n = static_cast<std::size_t>(buf.at(i)) << 16u |
                        static_cast<std::size_t>(buf.at(i + 1)) << 8u |
                        static_cast<std::size_t>(buf.at(i + 2));
        res_vec.at(j++) = b64_chars.at(n >> 18u);
        res_vec.at(j++) = b64_chars.at(n >> 12u & 0x3Fu);
        res_vec.at(j++) = b64_chars.at(n >> 6u & 0x3Fu);
        res_vec.at(j++) = b64_chars.at(n & 0x3Fu);
    }
    // Set padding
    if(remaining != 0)
    {
        std::size_t n   = --remaining == 0 ? static_cast<std::size_t>(buf.at(last))
                                           : static_cast<std::size_t>(buf.at(last)) << 8u |
                                               static_cast<std::size_t>(buf.at(last + 1));
        res_vec.at(j++) = b64_chars.at(remaining == 0 ? n >> 2u : n >> 10u & 0x3Fu);
        res_vec.at(j++) = b64_chars.at(remaining == 0 ? n << 4u & 0x3Fu : n >> 4u & 0x03Fu);
        res_vec.at(j++) = remaining == 0 ? '=' : b64_chars.at(n << 2u & 0x3Fu);
    }
    return {res_vec.begin(), res_vec.end()};
}

} // namespace

std::string base64_encode(const std::string& str)
{
    return encode(std::vector<byte>(str.begin(), str.end()));
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
