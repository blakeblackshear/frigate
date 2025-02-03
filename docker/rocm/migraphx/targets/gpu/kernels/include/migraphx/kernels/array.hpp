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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_ARRAY_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_ARRAY_HPP

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/integral_constant.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/debug.hpp>

namespace migraphx {

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_ARRAY_OP(op, binary_op)                                              \
    template <class U>                                                                       \
    constexpr array& operator op(const array<U, N>& x)                                       \
    {                                                                                        \
        array_detail::array_for_each(*this, x)([](auto& sy, auto sx) { sy op sx; });         \
        return *this;                                                                        \
    }                                                                                        \
    template <class U, MIGRAPHX_REQUIRES(is_convertible<U, T>{})>                            \
    constexpr array& operator op(const U& x)                                                 \
    {                                                                                        \
        array_detail::array_for_each (*this)([&](auto& sy) { sy op x; });                    \
        return *this;                                                                        \
    }                                                                                        \
    template <class U>                                                                       \
    friend constexpr auto operator binary_op(const array& x, const array<U, N>& y)           \
    {                                                                                        \
        array<decltype(T {} binary_op U{}), N> z{};                                          \
        array_detail::array_for_each(z, x, y)(                                               \
            [&](auto& sz, auto sx, auto sy) { sz = sx binary_op sy; });                      \
        return z;                                                                            \
    }                                                                                        \
    template <class U, MIGRAPHX_REQUIRES(is_convertible<U, T>{})>                            \
    friend constexpr auto operator binary_op(const array& x, const U& y)                     \
    {                                                                                        \
        array<decltype(T {} binary_op U{}), N> z{};                                          \
        array_detail::array_for_each(z, x)([&](auto& sz, auto sx) { sz = sx binary_op y; }); \
        return z;                                                                            \
    }                                                                                        \
    template <class U, MIGRAPHX_REQUIRES(is_convertible<U, T>{})>                            \
    friend constexpr auto operator binary_op(const U& x, const array& y)                     \
    {                                                                                        \
        array<decltype(T {} binary_op U{}), N> z{};                                          \
        array_detail::array_for_each(z, y)([&](auto& sz, auto sy) { sz = x binary_op sy; }); \
        return z;                                                                            \
    }

namespace array_detail {
template <class T>
constexpr auto is_vectorizable()
{
    return not is_same<T, bool>{} and (is_fundamental<T>{} or is_same<T, half>{});
}

template <class T>
__device__ auto& array2vec(T& x)
{
    using value_type    = typename T::value_type;
    constexpr auto size = decltype(x.size()){};
    using type          = vec<value_type, size>;
    if constexpr(is_const<T>{})
        return reinterpret_cast<const type&>(x);
    else
        return reinterpret_cast<type&>(x);
}

template <class T, class... Ts>
constexpr auto array_for_each(T& x, Ts&... xs)
{
    MIGRAPHX_ASSERT(((x.size() == xs.size()) and ...));
    return [&](auto f) {
        constexpr auto size = decltype(x.size()){};
        if constexpr((is_vectorizable<typename T::value_type>() or
                      (is_vectorizable<typename Ts::value_type>() or ...)) and
                     size <= 8 and size > 1 and (size % 2 == 0))
        {
            if(__builtin_is_constant_evaluated())
            {
                for(index_int i = 0; i < size; i++)
                    f(x[i], xs[i]...);
            }
            else
            {
                using vec_type = remove_reference_t<decltype(array2vec(x))>;
                f(array2vec(x), __builtin_convertvector(array2vec(xs), vec_type)...);
            }
        }
        else
        {
            for(index_int i = 0; i < size; i++)
                f(x[i], xs[i]...);
        }
    };
}
} // namespace array_detail

template <class T, index_int N>
struct array
{
    using value_type = T;
    T d[N];

    constexpr array() = default;

    template <class... Ts,
              MIGRAPHX_REQUIRES(sizeof...(Ts) == N and (is_convertible<Ts, T>{} and ...))>
    constexpr array(Ts... xs) : d{xs...}
    {
    }

    template <class U, MIGRAPHX_REQUIRES(is_convertible<U, T>{} and (N > 1))>
    constexpr explicit array(U x)
    {
        for(index_int i = 0; i < N; i++)
            d[i] = x;
    }

    constexpr T& operator[](index_int i)
    {
        MIGRAPHX_ASSERT(i < N);
        return d[i];
    }
    constexpr const T& operator[](index_int i) const
    {
        MIGRAPHX_ASSERT(i < N);
        return d[i];
    }

    constexpr T& front() { return d[0]; }
    constexpr const T& front() const { return d[0]; }

    constexpr T& back() { return d[N - 1]; }
    constexpr const T& back() const { return d[N - 1]; }

    constexpr T* data() { return d; }
    constexpr const T* data() const { return d; }

    constexpr index_constant<N> size() const { return {}; }
    constexpr auto empty() const { return size() == _c<0>; }

    constexpr T* begin() { return d; }
    constexpr const T* begin() const { return d; }

    constexpr T* end() { return d + size(); }
    constexpr const T* end() const { return d + size(); }

    constexpr T dot(const array& x) const
    {
        auto r = x * (*this);
        return r.reduce([](auto a, auto b) { return a + b; }, 0);
    }

    constexpr T product() const
    {
        return reduce([](auto x, auto y) { return x * y; }, 1);
    }

    constexpr T single(index_int width = 100) const
    {
        T result = 0;
        T a      = 1;
        for(index_int i = 0; i < N; i++)
        {
            result += d[N - i - 1] * a;
            a *= width;
        }
        return result;
    }

    template <class F>
    constexpr auto apply(F f) const
    {
        array<decltype(f(d[0])), N> result;
        for(index_int i = 0; i < N; i++)
            result[i] = f(d[i]);
        return result;
    }

    template <class F>
    constexpr auto reduce(F f, T init) const
    {
        T result = init;
        for(index_int i = 0; i < N; i++)
            result = f(result, d[i]);
        return result;
    }

    MIGRAPHX_DEVICE_ARRAY_OP(+=, +)
    MIGRAPHX_DEVICE_ARRAY_OP(-=, -)
    MIGRAPHX_DEVICE_ARRAY_OP(*=, *)
    MIGRAPHX_DEVICE_ARRAY_OP(/=, /)
    MIGRAPHX_DEVICE_ARRAY_OP(%=, %)
    MIGRAPHX_DEVICE_ARRAY_OP(&=, &)
    MIGRAPHX_DEVICE_ARRAY_OP(|=, |)
    MIGRAPHX_DEVICE_ARRAY_OP(^=, ^)

    friend constexpr bool operator==(const array& x, const array& y)
    {
        for(index_int i = 0; i < N; i++)
        {
            if(x[i] != y[i])
                return false;
        }
        return true;
    }

    template <class U, MIGRAPHX_REQUIRES(is_convertible<U, T>{})>
    friend constexpr bool operator==(const array& x, const U& y)
    {
        for(index_int i = 0; i < N; i++)
        {
            if(x[i] != y)
                return false;
        }
        return true;
    }

    template <class U, MIGRAPHX_REQUIRES(is_convertible<U, T>{})>
    friend constexpr bool operator==(const U& x, const array& y)
    {
        return y == x;
    }

    template <class U>
    friend constexpr bool operator!=(const U& x, const array& y)
    {
        return not(x == y);
    }
    template <class U>
    friend constexpr bool operator!=(const array& x, const U& y)
    {
        return not(x == y);
    }
    // This uses the product order rather than lexical order
    friend constexpr bool operator<(const array& x, const array& y)
    {
        for(index_int i = 0; i < N; i++)
        {
            if(not(x[i] < y[i]))
                return false;
        }
        return true;
    }
    friend constexpr bool operator>(const array& x, const array& y) { return y < x; }
    friend constexpr bool operator<=(const array& x, const array& y) { return (x < y) or (x == y); }
    friend constexpr bool operator>=(const array& x, const array& y) { return (y < x) or (x == y); }

    constexpr array carry(array result) const
    {
        index_int overflow = 0;
        for(diff_int i = result.size() - 1; i > 0; i--)
        {
            auto z = result[i] + overflow;
            // Reset overflow
            overflow = 0;
            // Compute overflow using while loop instead of mod
            while(z >= d[i])
            {
                z -= d[i];
                overflow += 1;
            }
            result[i] = z;
        }
        result[0] += overflow;
        return result;
    }

    /// Get the multi-dimensional index from the given 1D index.
    constexpr array multi(T idx) const
    {
        array result;
        index_int tidx = idx;
        for(diff_int is = result.size() - 1; is > 0; is--)
        {
            result[is] = tidx % d[is];
            tidx       = tidx / d[is];
        }
        result[0] = tidx;
        return result;
    }

    template <class Stream>
    friend constexpr const Stream& operator<<(const Stream& ss, const array& a)
    {
        for(index_int i = 0; i < N; i++)
        {
            if(i > 0)
                ss << ", ";
            ss << a[i];
        }
        return ss;
    }
};

template <class F>
constexpr auto array_apply(F f)
{
    return [=](auto&& x) { return x.apply(f); };
}

template <class T, class... Ts>
constexpr array<T, sizeof...(Ts) + 1> make_array(T x, Ts... xs)
{
    return {x, static_cast<T>(xs)...};
}
template <class T, T... Xs>
struct integral_const_array : array<T, sizeof...(Xs)>
{
    using base_array = array<T, sizeof...(Xs)>;
    MIGRAPHX_DEVICE_CONSTEXPR integral_const_array() : base_array({Xs...}) {}

    constexpr const base_array& base() const { return *this; }
};

template <class T, class... Ts>
constexpr auto make_const_array(T x, Ts... xs)
{
    return integral_const_array<typename T::value_type, x, xs...>{};
}

template <class T, class N, class F>
constexpr auto generate_array(N n, F f)
{
    return sequence_c<n>([=](auto... is) { return array<T, n>{f(is)...}; });
}

template <class T, T... Xs, class F>
constexpr auto unpack(integral_const_array<T, Xs...>, F f)
{
    return f(_c<Xs>...);
}

template <class T, T... Xs, class F>
constexpr auto transform(integral_const_array<T, Xs...>, F f)
{
    return integral_const_array<T, f(Xs)...>{};
}

template <class T, T... Xs, class F>
constexpr auto transform_i(integral_const_array<T, Xs...>, F f)
{
    return sequence_c<sizeof...(Xs)>(
        [=](auto... is) { return integral_const_array<T, f(Xs, is)...>{}; });
}

template <class T, T... Xs, class U, U... Ys, class F>
constexpr auto transform(integral_const_array<T, Xs...>, integral_const_array<U, Ys...>, F f)
{
    return integral_const_array<T, f(Xs, Ys)...>{};
}

template <class F>
constexpr auto return_array_c(F f)
{
    constexpr auto r = f();
    return sequence(r.size(), [&](auto... is) { return make_const_array(_c<r[is]>...); });
}

template <index_int... Ns>
using index_ints = integral_const_array<index_int, Ns...>;

} // namespace migraphx

#endif
