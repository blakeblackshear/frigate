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

#include <migraphx/lexing.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

std::function<const char*(const char*, const char*)> lex_equal(const std::string& s)
{
    return [=](const char* start, const char* end) {
        auto n = end - start;
        if(n < s.size())
            return start;
        if(std::equal(start, start + s.size(), s.data()))
            return start + s.size();
        return start;
    };
}

std::vector<std::string_view>
tokenize(const char* start, const char* end, const std::vector<lexer>& lexers)
{
    std::vector<std::string_view> result;
    while(start != end)
    {
        bool error = true;
        for(const auto& l : lexers)
        {
            const auto* next = l(start, end);
            if(next != start)
            {
                result.emplace_back(start, next - start);
                start = next;
                error = false;
                break;
            }
        }

        if(error)
        {
            MIGRAPHX_THROW("TOKENIZE: no token found!");
        }
    }

    return result;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
