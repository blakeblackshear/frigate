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
#ifndef MIGRAPHX_GUARD_RTGLIB_AUTO_REGISTER_HPP
#define MIGRAPHX_GUARD_RTGLIB_AUTO_REGISTER_HPP

#include <migraphx/config.hpp>
#include <type_traits>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class Action, class T>
int auto_register_action()
{
    Action::template apply<T>();
    return 0;
}

template <class Action, class T>
struct auto_register
{
    const static int static_register;
    // This typedef ensures that the static member will be instantiated if
    // the class itself is instantiated
    using static_register_type =
        std::integral_constant<decltype(&static_register), &static_register>;
};

#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wglobal-constructors"
#endif

template <class Action, class T>
const int auto_register<Action, T>::static_register = auto_register_action<Action, T>(); // NOLINT

#ifdef __clang__
#pragma clang diagnostic pop
#endif

#define MIGRAPHX_AUTO_REGISTER_NAME_DETAIL(x) migraphx_auto_register_##x
#define MIGRAPHX_AUTO_REGISTER_NAME(x) MIGRAPHX_AUTO_REGISTER_NAME_DETAIL(x)
// NOLINTNEXTLINE
#define MIGRAPHX_AUTO_REGISTER(...)                              \
    [[maybe_unused]] void MIGRAPHX_AUTO_REGISTER_NAME(__LINE__)( \
        migraphx::auto_register<__VA_ARGS__> x = migraphx::auto_register<__VA_ARGS__>{});

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
