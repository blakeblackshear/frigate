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
#include <algorithm>
#include <string>
#include <sstream>
#include <migraphx/errors.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/convert_to_json.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/lexing.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

std::vector<std::string_view> json_tokenize(const std::string& s)
{
    std::vector<lexer> lexers;

    // Quote
    lexers.push_back([](const char* start, const char* end) {
        if(*start != '\"')
            return start;
        ++start;
        while((start != end) and (*start != '\"'))
        {
            if(*start == '\\')
                start++;
            start++;
        }

        return ++start;
    });

    // Line comments
    lexers.push_back([](const char* start, const char* end) {
        if(*start == '#')
            start++;
        else if((start + 1) < end and start[0] == '/' and start[1] == '/')
            start += 2;
        else
            return start;
        return std::find_if(start, end, [&](char c) { return c == '\n'; });
    });

    // Whitespace
    lexers.push_back(lex_while(&isspace));

    // Punctation
    lexers.push_back(lex_if(&ispunct));

    // Identifier/number
    lexers.push_back(lex_while([](char c) {
        return (isalnum(c) != 0 or contains({'_', '.', '+'}, c));
    }));

    return tokenize(s.data(), s.data() + s.length(), lexers);
}

std::string convert_to_json(const std::string& str)
{
    auto tokens = json_tokenize(str);
    std::stringstream ss;

    for(auto& token : tokens)
    {
        std::string s(token);
        if(starts_with(s, "#") or starts_with(s, "//"))
            continue;
        if(std::isalpha(s.front()) != 0 and
           not contains({"null", "nan", "true", "false", "inf"}, s))
        {
            ss << "\"" << s << "\"";
        }
        else
        {
            ss << s;
        }
    }

    return ss.str();
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
