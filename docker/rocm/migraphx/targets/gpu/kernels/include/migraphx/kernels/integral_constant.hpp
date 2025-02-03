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
#ifndef MIGRAPHX_GUARD_KERNELS_INTEGRAL_CONSTANT_HPP
#define MIGRAPHX_GUARD_KERNELS_INTEGRAL_CONSTANT_HPP

#include <migraphx/kernels/types.hpp>

namespace migraphx {

template <class T, T V>
struct integral_constant
{
    static constexpr T value = V;
    using value_type         = T;
    using type               = integral_constant;
    constexpr operator value_type() const noexcept { return value; }
    constexpr value_type operator()() const noexcept { return value; }
    static constexpr type to() { return {}; }
};

// NOLINTNEXTLINE
#define MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(op)                                \
    template <class T, T V, class U, U w>                                       \
    constexpr inline integral_constant<decltype(V op w), (V op w)> operator op( \
        integral_constant<T, V>, integral_constant<U, w>) noexcept              \
    {                                                                           \
        return {};                                                              \
    }

// NOLINTNEXTLINE
#define MIGRAPHX_INTEGRAL_CONSTANT_UNARY_OP(op)                             \
    template <class T, T V>                                                 \
    constexpr inline integral_constant<decltype(op V), (op V)> operator op( \
        integral_constant<T, V>) noexcept                                   \
    {                                                                       \
        return {};                                                          \
    }

MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(+)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(-)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(*)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(/)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(%)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(>>)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(<<)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(>)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(<)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(<=)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(>=)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(==)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(!=)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(&)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(^)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(|)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(and)
MIGRAPHX_INTEGRAL_CONSTANT_BINARY_OP(or)

MIGRAPHX_INTEGRAL_CONSTANT_UNARY_OP(not )
MIGRAPHX_INTEGRAL_CONSTANT_UNARY_OP(~)
MIGRAPHX_INTEGRAL_CONSTANT_UNARY_OP(+)
MIGRAPHX_INTEGRAL_CONSTANT_UNARY_OP(-)

template <bool B>
using bool_constant = integral_constant<bool, B>;

using true_type  = bool_constant<true>;
using false_type = bool_constant<false>;

template <index_int N>
using index_constant = integral_constant<index_int, N>;

template <auto V>
static constexpr auto _c = integral_constant<decltype(V), V>{}; // NOLINT

template <class F>
constexpr auto return_c(F f)
{
    return _c<f()>;
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_INTEGRAL_CONSTANT_HPP
