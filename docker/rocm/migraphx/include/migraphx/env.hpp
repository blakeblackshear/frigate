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
#ifndef MIGRAPHX_GUARD_RTGLIB_ENV_HPP
#define MIGRAPHX_GUARD_RTGLIB_ENV_HPP

#include <vector>
#include <string>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

// Declare a cached environment variable
#define MIGRAPHX_DECLARE_ENV_VAR(x)               \
    struct x                                      \
    {                                             \
        static const char* value() { return #x; } \
    }; // NOLINT

MIGRAPHX_EXPORT bool enabled(const char* name);
MIGRAPHX_EXPORT bool disabled(const char* name);
MIGRAPHX_EXPORT std::vector<std::string> env(const char* name);

MIGRAPHX_EXPORT std::size_t value_of(const char* name, std::size_t fallback = 0);

MIGRAPHX_EXPORT std::string string_value_of(const char* name, std::string fallback = "");

template <class T>
bool enabled(T)
{
    static const bool result = enabled(T::value());
    return result;
}

template <class T>
bool disabled(T)
{
    static const bool result = disabled(T::value());
    return result;
}

template <class T>
std::size_t value_of(T, std::size_t fallback = 0)
{
    static const std::size_t result = value_of(T::value(), fallback);
    return result;
}

template <class T>
std::string string_value_of(T, std::string fallback = "")
{
    static const std::string result = string_value_of(T::value(), fallback);
    return result;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
