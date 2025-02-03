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
#ifndef MIGRAPHX_GUARD_RTGLIB_FUNCTIONAL_HPP
#define MIGRAPHX_GUARD_RTGLIB_FUNCTIONAL_HPP

#include <utility>
#include <migraphx/config.hpp>

// Similiar to decltype(auto) except it will propagate any substitution failures
// NOLINTNEXTLINE
#define MIGRAPHX_RETURNS(...) \
    ->decltype(__VA_ARGS__) { return __VA_ARGS__; }

// Lifts an expression into a function object so it can be passed to a higher-order function
// NOLINTNEXTLINE
#define MIGRAPHX_LIFT(...)                           \
    [](auto&&... private_lifts_xs) MIGRAPHX_RETURNS( \
        (__VA_ARGS__)(static_cast<decltype(private_lifts_xs)>(private_lifts_xs)...))

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct swallow
{
    template <class... Ts>
    constexpr swallow(Ts&&...)
    {
    }
};

template <class T>
auto tuple_size(const T&)
{
    return typename std::tuple_size<T>::type{};
}

namespace detail {

template <class R, class F>
struct fix_f
{
    F f;

    template <class... Ts>
    R operator()(Ts&&... xs) const
    {
        return f(*this, std::forward<Ts>(xs)...);
    }
};

template <std::size_t...>
struct seq
{
    using type = seq;
};

template <class, class>
struct merge_seq;

template <std::size_t... Xs, std::size_t... Ys>
struct merge_seq<seq<Xs...>, seq<Ys...>> : seq<Xs..., (sizeof...(Xs) + Ys)...>
{
};

template <std::size_t N>
struct gens : merge_seq<typename gens<N / 2>::type, typename gens<N - N / 2>::type>
{
};

template <>
struct gens<0> : seq<>
{
};
template <>
struct gens<1> : seq<0>
{
};

template <class F, std::size_t... Ns>
constexpr void repeat_c_impl(F f, seq<Ns...>)
{
    swallow{(f(std::integral_constant<std::size_t, Ns>{}), 0)...};
}

template <class F, std::size_t... Ns>
constexpr auto sequence_c_impl(F&& f, seq<Ns...>)
{
    return f(std::integral_constant<std::size_t, Ns>{}...);
}

} // namespace detail

template <std::size_t N, class F>
constexpr void repeat_c(F f)
{
    detail::repeat_c_impl(f, detail::gens<N>{});
}

template <std::size_t N, class F>
constexpr auto sequence_c(F&& f)
{
    return detail::sequence_c_impl(f, detail::gens<N>{});
}

template <class IntegerConstant, class F>
constexpr auto sequence(IntegerConstant ic, F&& f)
{
    return sequence_c<ic>(f);
}

template <class F, class... Ts>
constexpr void each_args(F f, Ts&&... xs)
{
    swallow{(f(std::forward<Ts>(xs)), 0)...};
}

template <class F>
constexpr void each_args(F)
{
}

template <class F, class T>
auto unpack(F f, T&& x)
{
    return sequence(tuple_size(x), [&](auto... is) { f(std::get<is>(static_cast<T&&>(x))...); });
}

/// Implements a fix-point combinator
template <class R, class F>
detail::fix_f<R, F> fix(F f)
{
    return {f};
}

template <class F>
auto fix(F f)
{
    return fix<void>(f);
}

template <class F, class T>
auto fold_impl(F&&, T&& x)
{
    return std::forward<T>(x);
}

template <class F, class T, class U, class... Ts>
auto fold_impl(F&& f, T&& x, U&& y, Ts&&... xs)
{
    return fold_impl(f, f(std::forward<T>(x), std::forward<U>(y)), std::forward<Ts>(xs)...);
}

template <class F>
auto fold(F f)
{
    return [=](auto&&... xs) { return fold_impl(f, std::forward<decltype(xs)>(xs)...); };
}

template <class... Ts>
auto pack(Ts... xs)
{
    return [=](auto f) { return f(xs...); };
}

inline auto pack_join() { return pack(); }

template <class... Ps>
auto pack_join(Ps... ps)
{
    return fold([](auto p1, auto p2) {
        return p1([=](auto... xs) { return p2([=](auto... ys) { return pack(xs..., ys...); }); });
    })(ps...);
}

template <class F, class Proj>
auto by(F f, Proj proj)
{
    return [=](auto&&... xs) { return f(proj(std::forward<decltype(xs)>(xs))...); };
}

template <class T>
auto index_of(T& x)
{
    return [&](auto&& y) { return x[y]; };
}

template <class T, class... Ts>
decltype(auto) front_args(T&& x, Ts&&...)
{
    return static_cast<T&&>(x);
}

template <class... Ts>
decltype(auto) back_args(Ts&&... xs)
{
    return std::get<sizeof...(Ts) - 1>(std::tuple<Ts&&...>(static_cast<Ts&&>(xs)...));
}

template <class T, class... Ts>
auto pop_front_args(T&&, Ts&&... xs)
{
    return [&](auto f) { f(static_cast<Ts&&>(xs)...); };
}

template <class... Ts>
auto pop_back_args(Ts&&... xs)
{
    return [&](auto f) {
        using tuple_type = std::tuple<Ts&&...>;
        auto t           = tuple_type(static_cast<Ts&&>(xs)...);
        return sequence_c<sizeof...(Ts) - 1>(
            [&](auto... is) { return f(std::get<is>(static_cast<tuple_type&&>(t))...); });
    };
}

template <class T>
struct always_f
{
    T x;
    template <class... Ts>
    constexpr T operator()(Ts&&...) const
    {
        return x;
    }
};

template <class T>
auto always(T x)
{
    return always_f<T>{x};
}

struct id
{
    template <class T>
    constexpr T operator()(T&& x) const
    {
        return static_cast<T&&>(x);
    }
};

template <class... Ts>
void nop(Ts&&...)
{
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
