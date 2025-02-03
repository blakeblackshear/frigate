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
#include <migraphx/gpu/driver/action.hpp>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace driver {

[[noreturn]] void error(const std::string& msg)
{
    std::cout << msg << std::endl;
    std::abort();
}

shape parser::parse_shape(const value& v) const
{
    auto lens    = get(v, "lens", std::vector<std::size_t>{});
    auto strides = get(v, "strides", std::vector<std::size_t>{});
    auto type    = shape::parse_type(get<std::string>(v, "type", "float"));
    if(strides.empty())
        return shape{type, lens};
    else
        return shape{type, lens, strides};
}

std::vector<shape> parser::parse_shapes(const value& v) const
{
    std::vector<shape> result;
    std::transform(
        v.begin(), v.end(), std::back_inserter(result), [&](auto&& x) { return parse_shape(x); });
    return result;
}

void parser::load_settings(const value& v)
{
    if(v.contains("settings"))
        settings = v.at("settings");
}

void parser::process(const value& v)
{
    if(not v.is_object())
        error("Input is not an object");
    parser p{};
    p.load_settings(v);
    for(auto&& pp : v)
    {
        if(pp.get_key() == "settings")
            continue;
        get_action(pp.get_key())(p, pp.without_key());
    }
}

} // namespace driver
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
