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
#ifndef MIGRAPHX_GUARD_RTGLIB_MAKE_OP_HPP
#define MIGRAPHX_GUARD_RTGLIB_MAKE_OP_HPP

#include <migraphx/config.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/value.hpp>
#include <migraphx/json.hpp>
#include <migraphx/convert_to_json.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_EXPORT operation make_op(const std::string& name);
MIGRAPHX_EXPORT operation make_op(const std::string& name,
                                  const std::initializer_list<std::pair<std::string, value>>& v);
MIGRAPHX_EXPORT operation make_op_from_value(const std::string& name, const value& v);

// A template overload is added for migraphx::value so the initializer_list
// cannot be passed in directly. This is to enforce at compile-time that all
// initializer_list are key-value pairs, whereas migraphx::value allows other
// types of initializer_list such as for arrays.
template <class Value>
operation make_op(const std::string& name, const Value& v)
{
    return make_op_from_value(name, v);
}

MIGRAPHX_EXPORT operation make_json_op(const std::string& name, const std::string& s);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
