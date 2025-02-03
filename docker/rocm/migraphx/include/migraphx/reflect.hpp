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
#ifndef MIGRAPHX_GUARD_RTGLIB_REFLECT_HPP
#define MIGRAPHX_GUARD_RTGLIB_REFLECT_HPP

#include <migraphx/functional.hpp>
#include <migraphx/rank.hpp>
#include <migraphx/config.hpp>
#include <functional>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace detail {

struct reflect_placeholder
{
    template <class... Ts>
    int operator()(Ts&&...) const
    {
        return 0;
    }
};

template <class T, class Selector>
auto reflect_impl(rank<1>, T& x, Selector f) -> decltype(T::reflect(x, f))
{
    return T::reflect(x, std::move(f));
}

template <class T, class Selector>
auto reflect_impl(rank<0>, T&, Selector)
{
    return pack();
}

template <class T>
auto reflectable_impl(rank<1>, const T& x)
    -> decltype(T::reflect(x, reflect_placeholder{}), std::true_type{});

template <class T>
auto reflectable_impl(rank<0>, const T&) -> decltype(std::false_type{});

template <class T>
struct remove_rvalue_reference
{
    using type = T;
};

template <class T>
struct remove_rvalue_reference<T&&>
{
    using type = T;
};

template <class T>
struct wrapper
{
    using type = typename remove_rvalue_reference<T>::type;
    type data; // NOLINT
    type get() const { return data; }
};

template <class T>
wrapper<T> wrap(std::remove_reference_t<T>& x)
{
    return wrapper<T>{std::forward<T>(x)};
}

template <class... Ts>
using auto_tuple_t = std::tuple<typename remove_rvalue_reference<Ts>::type...>;

template <class... Ts>
auto_tuple_t<Ts...> auto_tuple(Ts&&... xs)
{
    return auto_tuple_t<Ts...>{std::forward<Ts>(xs)...};
}

} // namespace detail

template <class T>
using is_reflectable = decltype(detail::reflectable_impl(rank<1>{}, std::declval<T>()));

template <class T, class Selector>
auto reflect(T& x, Selector f)
{
    return detail::reflect_impl(rank<1>{}, x, std::move(f));
}

template <class T>
auto reflect_tie(T& x)
{
    return reflect(x, [](auto&& y, auto&&...) {
        // cppcheck-suppress UnnecessaryElseStatement
        if constexpr(is_reflectable<decltype(y)>{})
        {
            auto t = reflect_tie(y);
            return detail::wrap<decltype(t)>(t);
        }
        else
        {
            return detail::wrap<decltype(y)>(y);
        }
    })([](auto&&... xs) { return detail::auto_tuple(xs.get()...); });
}

template <class T, class F>
void reflect_each(T& x, F f)
{
    return reflect(x, [](auto&& y, auto... ys) {
        return pack(detail::wrap<decltype(y)>(y), ys...);
    })([&](auto&&... xs) {
        each_args([&](auto p) { p([&](auto&& y, auto... ys) { f(y.get(), ys...); }); }, xs...);
    });
}

template <class T>
struct reflect_equality
{
    friend bool operator==(const T& x, const T& y) { return reflect_tie(x) == reflect_tie(y); }
    friend bool operator!=(const T& x, const T& y) { return not(x == y); }
};

template <class T>
struct reflect_stream
{
    template <class Stream>
    friend Stream& operator<<(Stream& os, const T& x)
    {
        char d = '{';
        reflect_each(x, [&](const auto& y, const auto& name) {
            os << d << name << "=" << y;
            d = ',';
        });
        os << "}";
        return os;
    }
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
