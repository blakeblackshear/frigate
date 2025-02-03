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
#include <migraphx/make_op.hpp>
#include <migraphx/register_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

operation make_op(const std::string& name) { return load_op(name); }

template <class F>
operation make_op_generic(const std::string& name, F for_each)
{
    auto op = load_op(name);
    // Merge values
    value w = op.to_value();
    for_each([&](const auto& key, const auto& x) {
        if(not w.contains(key))
            // NOLINTNEXTLINE(performance-inefficient-string-concatenation)
            MIGRAPHX_THROW("No key '" + key + "' in " + name);
        w.at(key) = x;
    });
    op.from_value(w);
    return op;
}

operation make_op(const std::string& name,
                  const std::initializer_list<std::pair<std::string, value>>& v)
{
    return make_op_generic(name, [&](auto f) {
        for(auto&& [key, x] : v)
            f(key, x);
    });
}

operation make_op_from_value(const std::string& name, const value& v)
{
    if(not(v.is_object() or (v.empty() and v.is_array())))
        MIGRAPHX_THROW("Value is not an object for make_op: " + name);
    return make_op_generic(name, [&](auto f) {
        for(auto&& x : v)
            f(x.get_key(), x.without_key());
    });
}

operation make_json_op(const std::string& name, const std::string& s)
{
    return make_op(name, from_json_string(convert_to_json(s)));
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
