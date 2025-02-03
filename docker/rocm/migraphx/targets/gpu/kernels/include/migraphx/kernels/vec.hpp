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
#ifndef MIGRAPHX_GUARD_KERNELS_VEC_HPP
#define MIGRAPHX_GUARD_KERNELS_VEC_HPP

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/integral_constant.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/debug.hpp>

namespace migraphx {

template <class T, index_int N>
constexpr auto vec_size(vec<T, N>)
{
    return index_constant<N>{};
}

template <class T>
constexpr auto vec_size(T, ...) // NOLINT
{
    return index_constant<0>{};
}

template <class T>
constexpr auto vec_size()
{
    return decltype(vec_size(T{})){};
}

template <class... Ts>
constexpr auto is_any_vec()
{
    if constexpr(sizeof...(Ts) == 0)
        return false_type{};
    else
        return bool_constant<((vec_size<Ts>() + ...) > 0)>{};
}

template <class T, class I>
constexpr auto vec_at(T x, I i)
{
    if constexpr(vec_size<T>() == 0)
        return x;
    else
    {
        MIGRAPHX_ASSERT(i < vec_size<T>());
        return x[i];
    }
}

template <class T>
using vec_type = decltype(vec_at(T{}, 0));

template <class... Ts>
constexpr auto common_vec_size()
{
    return fold([](auto x, auto y) {
        if constexpr(x > y)
            return x;
        else
            return y;
    })(vec_size<Ts>()...);
}

// Bools can not be used as a vector type so convert it to uint8
template <class T>
__device__ __host__ T* remove_bool(T* x)
{
    return x;
}

inline __device__ __host__ uint8_t* remove_bool(bool* x) { return reinterpret_cast<uint8_t*>(x); }

template <index_int N, class T>
__device__ __host__ auto as_vec(T* x)
{
    if constexpr(N < 2)
        return x;
    else
        return reinterpret_cast<vec<T, N>*>(x);
}

template <class T, index_int N>
using safe_vec = vec<conditional_t<is_same<T, bool>{}, uint8_t, T>, N>;

template <class... Ts>
constexpr auto vec_transform(Ts... xs)
{
    return [=](auto f) {
        if constexpr(is_any_vec<Ts...>())
        {
            using type                  = decltype(f(vec_at(xs, 0)...));
            constexpr auto size         = common_vec_size<Ts...>();
            safe_vec<type, size> result = {0};
            for(int i = 0; i < size; i++)
                result[i] = f(vec_at(xs, i)...);
            return result;
        }
        else
        {
            return f(xs...);
        }
    };
}

// Return a vector type of N from index i in another larger vector
// N will be 2 for half2 packing
template <index_int N, class T, class I>
constexpr vec<vec_type<T>, N> vec_packed_at(T x, I i)
{
    if constexpr(vec_size<T>() == 0)
        return vec<T, N>{x};
    else
    {
        MIGRAPHX_ASSERT((i + N) <= vec_size<T>());
        vec<vec_type<T>, N> result = {0};
        for(int j = 0; j < N; j++)
        {
            result[j] = x[i + j];
        }
        return result;
    }
}

template <index_int N, class... Ts>
constexpr auto vec_packed_transform(Ts... xs)
{
    return [=](auto f) {
        if constexpr(is_any_vec<Ts...>())
        {
            using type                  = vec_type<decltype(f(vec_packed_at<N>(xs, 0)...))>;
            constexpr auto size         = common_vec_size<Ts...>();
            safe_vec<type, size> result = {0};
            for(int i = 0; i < size / N; i++)
            {
                // Call the function with packed vectors
                safe_vec<type, N> r = f(vec_packed_at<N>(xs, i * N)...);
                // Copy the packed vectors to the result
                for(int j = 0; j < N; j++)
                    result[i * N + j] = r[j];
            }
            return result;
        }
        else
        {
            return f(xs...);
        }
    };
}

template <class T, class Op>
constexpr auto vec_reduce(T x, Op op)
{
    if constexpr(vec_size<T>() < 2)
        return vec_type<T>{x};
    else
    {
        vec_type<T> result = x[0];
        for(int i = 1; i < vec_size<T>(); i++)
            result = op(result, x[i]);
        return result;
    }
}

template <index_int N, class F>
constexpr auto vec_generate(F f)
{
    using type = decltype(f(_c<0>));
    return sequence_c<N>([&](auto... is) { return safe_vec<type, N>{f(is)...}; });
}

template <class T>
struct implicit_conversion_op
{
    T x;

    template <index_int N, class U>
    constexpr operator vec<U, N>() const
    {
        if constexpr(vec_size<T>() == 0)
        {
            return x;
        }
        else
        {
            static_assert(vec_size<T>() == N, "Vector mismatch size");
            return __builtin_convertvector(x, vec<U, N>);
        }
    }

    template <class U>
    constexpr operator U() const
    {
        return static_cast<U>(x);
    }
};

template <class T>
constexpr implicit_conversion_op<T> implicit_conversion(T x)
{
    return {x};
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_VEC_HPP
