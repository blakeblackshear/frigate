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
#ifndef MIGRAPHX_GUARD_RTGLIB_TYPE_NAME_HPP
#define MIGRAPHX_GUARD_RTGLIB_TYPE_NAME_HPP

#include <string>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class PrivateMigraphTypeNameProbe>
std::string compute_type_name()
{
    const char parameter_name[] = "PrivateMigraphTypeNameProbe ="; // NOLINT

    std::string name = __PRETTY_FUNCTION__;

    auto begin  = name.find(parameter_name) + sizeof(parameter_name);
#if(defined(__GNUC__) && !defined(__clang__) && __GNUC__ == 4 && __GNUC_MINOR__ < 7)
    auto length = name.find_last_of(",") - begin;
#else
    auto length = name.find_first_of("];", begin) - begin;
#endif
    return name.substr(begin, length);
}

template <class T>
const std::string& get_type_name()
{
    static const std::string name = compute_type_name<T>();
    return name;
}

template <class T>
const std::string& get_type_name(const T&)
{
    return migraphx::get_type_name<T>();
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
