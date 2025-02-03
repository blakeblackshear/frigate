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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_ASSERT_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_ASSERT_HPP

#include <migraphx/config.hpp>
#include <cstdlib>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class F>
auto abort_on_throw(F f) -> decltype(f())
{
    try
    {
        return f();
    }
    catch(const std::exception& e)
    {
        std::cerr << e.what() << std::endl;
        std::abort();
    }
    catch(...)
    {
        std::cerr << "Unknown exception" << std::endl;
        std::abort();
    }
}
#ifdef NDEBUG
#define MIGRAPHX_ASSERT_NO_THROW(...) __VA_ARGS__
#else
#define MIGRAPHX_ASSERT_NO_THROW(...) \
    migraphx::abort_on_throw([&]() -> decltype(__VA_ARGS__) { return __VA_ARGS__; })
#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_ASSERT_HPP
