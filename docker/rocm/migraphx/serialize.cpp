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
#include <migraphx/serialize.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/context.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class RawData>
void raw_data_to_value(value& v, const RawData& rd)
{
    value result;
    result["shape"] = migraphx::to_value(rd.get_shape());
    if(rd.get_shape().type() == shape::tuple_type)
        result["sub"] = migraphx::to_value(rd.get_sub_objects());
    else if(not rd.empty())
        result["data"] = migraphx::value::binary(rd.data(), rd.get_shape().bytes());
    v = result;
}

void migraphx_to_value(value& v, const literal& l) { raw_data_to_value(v, l); }
void migraphx_from_value(const value& v, literal& l)
{
    auto s = migraphx::from_value<shape>(v.at("shape"));
    l      = literal(s, v.at("data").get_binary().data());
}

void migraphx_to_value(value& v, const argument& a) { raw_data_to_value(v, a); }
void migraphx_from_value(const value& v, argument& a)
{
    if(v.contains("data"))
    {
        literal l = migraphx::from_value<literal>(v);
        a         = l.get_argument();
    }
    else if(v.contains("sub"))
    {
        a = migraphx::from_value<std::vector<argument>>(v.at("sub"));
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
