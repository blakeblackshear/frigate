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
 *
 */
#ifndef MIGRAPHX_GUARD_KERNELS_TUPLE_HPP
#define MIGRAPHX_GUARD_KERNELS_TUPLE_HPP

#include <migraphx/kernels/array.hpp>

namespace migraphx {

namespace tuple_detail {

template <class T, index_int N>
struct element_storage
{
    [[no_unique_address]] T element;
};

template <index_int N, class T>
constexpr const auto& get_element(const element_storage<T, N>& x)
{
    return x.element;
}

template <index_int N, class T>
constexpr auto& get_element(element_storage<T, N>& x)
{
    return x.element;
}

struct unpack_t
{
};

template <class... Ts>
struct tuple_storage;

template <index_int... Ns, class... Ts>
struct tuple_storage<detail::seq<Ns...>, Ts...> : element_storage<Ts, Ns>...
{
    template <class... Us, MIGRAPHX_REQUIRES(sizeof...(Us) == sizeof...(Ts))>
    constexpr tuple_storage(Us... ys) : element_storage<Ts, Ns>{static_cast<Ts>(ys)}...
    {
    }

    template <class U>
    constexpr tuple_storage(unpack_t, U y) : element_storage<Ts, Ns>{static_cast<Ts>(y[_c<Ns>])}...
    {
    }

    template <class F>
    constexpr auto operator()(F f) const
    {
        return f(static_cast<const element_storage<Ts, Ns>&>(*this).element...);
    }

    template <class F>
    constexpr auto operator()(F f)
    {
        return f(static_cast<element_storage<Ts, Ns>&>(*this).element...);
    }

    template <class IntegralConstant>
    constexpr auto& operator[](IntegralConstant i)
    {
        static_assert(i < sizeof...(Ts), "Out of bounds tuple access");
        return get_element<i>(*this);
    }

    template <class IntegralConstant>
    constexpr auto& operator[](IntegralConstant i) const
    {
        static_assert(i < sizeof...(Ts), "Out of bounds tuple access");
        return get_element<i>(*this);
    }

    constexpr index_constant<sizeof...(Ts)> size() const { return {}; }
    constexpr auto empty() const { return size() == _c<0>; }
};

template <class... Ts>
using tuple_base = tuple_detail::tuple_storage<typename detail::gens<sizeof...(Ts)>::type, Ts...>;

} // namespace tuple_detail

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_TUPLE_OP(op, binary_op)                                                  \
    template <class... Us>                                                                       \
    constexpr tuple& operator op(const tuple<Us...>& rhs)                                        \
    {                                                                                            \
        (*this)(                                                                                 \
            [&](auto&... xs) { rhs([&](const auto&... ys) { swallow{((xs op ys), 0)...}; }); }); \
        return *this;                                                                            \
    }                                                                                            \
    template <class... Us>                                                                       \
    friend constexpr auto operator binary_op(const tuple& lhs, const tuple<Us...>& rhs)          \
    {                                                                                            \
        using result = tuple<decltype(declval<Ts>() binary_op declval<Us>())...>;                \
        return lhs([&](auto&... xs) {                                                            \
            return rhs([&](const auto&... ys) { return result{xs binary_op ys...}; });           \
        });                                                                                      \
    }

template <class... Ts>
struct tuple : tuple_detail::tuple_base<Ts...>
{
    using base = tuple_detail::tuple_base<Ts...>;

    constexpr tuple() : base(Ts{}...) {}

    template <class... Us,
              MIGRAPHX_REQUIRES(sizeof...(Us) == sizeof...(Ts) and
                                (is_convertible<Us, Ts>{} and ...))>
    constexpr tuple(Us... ys) : base(ys...)
    {
    }

    template <class... Us,
              MIGRAPHX_REQUIRES(sizeof...(Us) == sizeof...(Ts) and
                                (is_convertible<Us, Ts>{} and ...))>
    constexpr tuple(tuple<Us...> y) : base(tuple_detail::unpack_t{}, y)
    {
    }

    MIGRAPHX_DEVICE_TUPLE_OP(+=, +)
    MIGRAPHX_DEVICE_TUPLE_OP(-=, -)
    MIGRAPHX_DEVICE_TUPLE_OP(*=, *)
    MIGRAPHX_DEVICE_TUPLE_OP(/=, /)
    MIGRAPHX_DEVICE_TUPLE_OP(%=, %)
    MIGRAPHX_DEVICE_TUPLE_OP(&=, &)
    MIGRAPHX_DEVICE_TUPLE_OP(|=, |)
    MIGRAPHX_DEVICE_TUPLE_OP(^=, ^)

    friend constexpr bool operator==(const tuple& x, const tuple& y)
    {
        return x([&](const auto&... xs) {
            return y([&](const auto&... ys) { return ((xs == ys) and ...); });
        });
    }
    friend constexpr bool operator!=(const tuple& x, const tuple& y) { return not(x == y); }
    friend constexpr bool operator<(const tuple& x, const tuple& y)
    {
        return x([&](const auto&... xs) {
                   return y([&](const auto&... ys) {
                       return fold([&](auto a, auto b) { return a == 0 ? b() : a; })(0, [&] {
                           return (xs < ys) ? -1 : (ys < xs) ? 1 : 0;
                       }...);
                   });
               }) < 0;
    }
    friend constexpr bool operator>(const tuple& x, const tuple& y) { return y < x; }
    friend constexpr bool operator<=(const tuple& x, const tuple& y) { return not(x > y); }
    friend constexpr bool operator>=(const tuple& x, const tuple& y) { return not(x < y); }
};

template <class... Ts>
constexpr tuple<Ts...> make_tuple(Ts... xs)
{
    return {xs...};
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_TUPLE_HPP
