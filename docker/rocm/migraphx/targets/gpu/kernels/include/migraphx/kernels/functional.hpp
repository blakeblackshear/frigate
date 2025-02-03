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
#ifndef MIGRAPHX_GUARD_KERNELS_FUNCTIONAL_HPP
#define MIGRAPHX_GUARD_KERNELS_FUNCTIONAL_HPP

#include <migraphx/kernels/integral_constant.hpp>

// Similiar to decltype(auto) except it will propagate any substitution failures
// NOLINTNEXTLINE
#define MIGRAPHX_RETURNS(...) \
    ->decltype(__VA_ARGS__) { return __VA_ARGS__; }

// Lifts an expression into a function object so it can be passed to a higher-order function
// NOLINTNEXTLINE
#define MIGRAPHX_LIFT(...)                           \
    [](auto&&... private_lifts_xs) MIGRAPHX_RETURNS( \
        (__VA_ARGS__)(static_cast<decltype(private_lifts_xs)>(private_lifts_xs)...))

// NOLINTNEXTLINE
#define MIGRAPHX_LIFT_CLASS(name, ...)                                                         \
    struct name                                                                                \
    {                                                                                          \
        template <class... PrivateLiftTs>                                                      \
        constexpr auto operator()(PrivateLiftTs&&... private_lifts_xs) const MIGRAPHX_RETURNS( \
            (__VA_ARGS__)(static_cast<decltype(private_lifts_xs)>(private_lifts_xs)...))       \
    }

namespace migraphx {

struct swallow
{
    template <class... Ts>
    constexpr swallow(Ts&&...)
    {
    }
};

template <index_int>
using ignore = swallow;

template <class... Fs>
struct overloaded : Fs...
{
    using Fs::operator()...;
    constexpr overloaded(Fs... fs) : Fs(fs)... {}
};

template <class... Fs>
constexpr overloaded<Fs...> overload(Fs... fs)
{
    return {fs...};
}

namespace detail {

template <class R>
struct eval_helper
{
    R result;

    template <class F, class... Ts>
    constexpr eval_helper(const F& f, Ts&&... xs) : result(f(static_cast<Ts>(xs)...))
    {
    }
};

template <>
struct eval_helper<void>
{
    int result;
    template <class F, class... Ts>
    constexpr eval_helper(const F& f, Ts&&... xs) : result((f(static_cast<Ts>(xs)...), 0))
    {
    }
};

template <index_int...>
struct seq
{
    using type = seq;
};

template <class, class>
struct merge_seq;

template <index_int... Xs, index_int... Ys>
struct merge_seq<seq<Xs...>, seq<Ys...>> : seq<Xs..., (sizeof...(Xs) + Ys)...>
{
};

template <index_int N>
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

template <class F, index_int... Ns>
constexpr auto sequence_c_impl(F&& f, seq<Ns...>)
{
    return f(index_constant<Ns>{}...);
}

template <index_int... N>
constexpr auto args_at(seq<N...>)
{
    return [](ignore<N>..., auto x, auto...) { return x; };
}

} // namespace detail

template <class T>
constexpr auto always(T x)
{
    return [=](auto&&...) { return x; };
}

template <index_int N, class F>
constexpr auto sequence_c(F&& f)
{
    return detail::sequence_c_impl(f, detail::gens<N>{});
}

template <class IntegerConstant, class F>
constexpr auto sequence(IntegerConstant ic, F&& f)
{
    return sequence_c<ic>(f);
}

template <class F, class G>
constexpr auto by(F f, G g)
{
    return [=](auto... xs) {
        return detail::eval_helper<decltype(g(f(xs)...))>{g, f(xs)...}.result;
    };
}

template <class F>
constexpr auto by(F f)
{
    return by([=](auto x) { return (f(x), 0); }, always(0));
}

template <class F, class... Ts>
constexpr void each_args(F f, Ts&&... xs)
{
    swallow{(f(static_cast<Ts&&>(xs)), 0)...};
}

template <class F>
constexpr void each_args(F)
{
}

template <class F, class Pack>
constexpr void unpack_each(F f)
{
    f();
}

template <class F, class Pack>
constexpr void unpack_each(F f, Pack p)
{
    p([&](auto&&... xs) { each_args(f, static_cast<decltype(xs)>(xs)...); });
}

template <class F, class Pack1, class Pack2>
constexpr void unpack_each(F f, Pack1 p1, Pack2 p2)
{
    p1([&](auto&&... xs) {
        p2([&](auto&&... ys) {
            each_args(
                [&](auto&& p) { p(f); },
                pack_forward(static_cast<decltype(xs)>(xs), static_cast<decltype(ys)>(ys))...);
        });
    });
}

template <class F, class Pack1, class Pack2, class... Packs>
constexpr void unpack_each(F f, Pack1 p1, Pack2 p2, Packs... packs)
{
    unpack_each(
        [&](auto&& x, auto&& y) {
            unpack_each(
                [&](auto&&... zs) {
                    f(static_cast<decltype(x)>(x),
                      static_cast<decltype(y)>(y),
                      static_cast<decltype(zs)>(zs)...);
                },
                packs...);
        },
        p1,
        p2);
}

template <index_int N, class F>
constexpr void repeat_c(F&& f)
{
    sequence_c<N>([&](auto... xs) { each_args(f, xs...); });
}

template <class IntegerConstant, class F>
constexpr auto repeat(IntegerConstant ic, F&& f)
{
    return repeat_c<ic>(f);
}

template <class F, class T>
constexpr auto fold_impl(F&&, T&& x)
{
    return static_cast<T&&>(x);
}

template <class F, class T, class U, class... Ts>
constexpr auto fold_impl(F&& f, T&& x, U&& y, Ts&&... xs)
{
    return fold_impl(f, f(static_cast<T&&>(x), static_cast<U&&>(y)), static_cast<Ts&&>(xs)...);
}

template <class F>
constexpr auto fold(F f)
{
    return [=](auto&&... xs) { return fold_impl(f, static_cast<decltype(xs)&&>(xs)...); };
}

template <class... Fs>
constexpr auto compose(Fs... fs)
{
    return fold([](auto f, auto g) {
        return [=](auto&&... xs) { return f(g(static_cast<decltype(xs)>(xs)...)); };
    })(fs...);
}

template <class F>
constexpr auto partial(F f)
{
    return [=](auto... xs) {
        return [=](auto&&... ys) { return f(xs..., static_cast<decltype(ys)>(ys)...); };
    };
}

template <class... Ts>
constexpr auto pack(Ts... xs)
{
    return [=](auto f) { return f(xs...); };
}

template <class... Ts>
constexpr auto pack_forward(Ts&&... xs)
{
    return [&](auto f) { return f(static_cast<Ts&&>(xs)...); };
}

template <class G, class F>
constexpr auto join(G g, F f)
{
    return f([=](auto... xs) { return g(xs...); });
}

template <class G, class F, class... Fs>
constexpr auto join(G g, F f, Fs... fs)
{
    // return f1([=](auto x) { return f2([=](auto y) { return g(x, y); }); });
    return f([=](auto... xs) { return join([=](auto... ys) { return g(xs..., ys...); }, fs...); });
}

template <class Compare, class P1, class P2>
constexpr auto pack_compare(Compare compare, P1 p1, P2 p2)
{
    return p1([&](auto... xs) {
        return p2([&](auto... ys) {
            auto c = [&](auto x, auto y) -> int {
                if(compare(x, y))
                    return 1;
                else if(compare(y, x))
                    return -1;
                else
                    return 0;
            };
            return fold([](auto x, auto y) { return x ? x : y; })(c(xs, ys)..., 0);
        });
    });
}

template <index_int N>
constexpr auto arg_c()
{
    return [](auto... xs) { return detail::args_at(detail::gens<N>{})(xs...); };
}

template <class IntegralConstant>
constexpr auto arg(IntegralConstant ic)
{
    return arg_c<ic>();
}

template <class F>
constexpr auto make_transform(F f)
{
    return [=](auto... xs) { return [=](auto g) { return f(g, xs...); }; };
}

// An arg transformation takes the arguments and then a function to take the new arguments:
//     transform(xs...)([](auto... ys) { ... })
// The transform_args function takes a list of transformations and continually applies them
template <class F>
constexpr auto transform_args(F f)
{
    return f;
}

template <class F, class... Fs>
constexpr auto transform_args(F f, Fs... fs)
{
    return make_transform([=](auto g, auto... xs) {
        return f(xs...)([=](auto... ys) { return transform_args(fs...)(ys...)(g); });
    });
}

// identity transform
inline constexpr auto transform_args()
{
    return make_transform([](auto f, auto... xs) { return f(xs...); });
}

// Rotate the last N arguments to the first N arguments
template <index_int N>
constexpr auto rotate_last()
{
    return make_transform([](auto f, auto... xs) {
        return sequence_c<sizeof...(xs)>([&](auto... is) {
            constexpr auto size = sizeof...(is);
            return f(arg_c<(is + size - N) % size>()(xs...)...);
        });
    });
}

inline constexpr auto rotate_last() { return rotate_last<1>(); }

// Pack the first N arguments
template <index_int N>
constexpr auto pack_first()
{
    return make_transform([](auto f, auto... xs) {
        return sequence_c<N>([&](auto... is) {
            return sequence_c<sizeof...(xs) - N>([&](auto... js) {
                return f(pack(arg_c<is>()(xs...)...), arg_c<js + N>()(xs...)...);
            });
        });
    });
}

// Rotate the last N arguments as the first argument packed
template <index_int N>
constexpr auto rotate_and_pack_last()
{
    return transform_args(rotate_last<N>(), pack_first<N>());
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_FUNCTIONAL_HPP
