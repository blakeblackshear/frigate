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
#ifndef MIGRAPHX_GUARD_KERNELS_PRELOAD_HPP
#define MIGRAPHX_GUARD_KERNELS_PRELOAD_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/tensor_view.hpp>
#include <migraphx/kernels/vec.hpp>

namespace migraphx {

template <class T>
struct remove_vec_impl
{
    using type = T;
};

template <class T, index_int N>
struct remove_vec_impl<vec<T, N>>
{
    using type = T;
};

template <class T>
using remove_vec = typename remove_vec_impl<T>::type;

template <class T, class... Shapes>
constexpr auto traverse_preload(Shapes... ss)
{
    return [=](auto f, auto... g) {
        index_int offset = 0;
        auto each        = [&](auto x) {
            using type          = remove_vec<typename decltype(x)::type>;
            constexpr auto s    = decltype(x.get_shape()){};
            constexpr auto size = s.element_space();
            if constexpr(not s.broadcasted() or (s.elements() - size) < 64 or
                         not is_same<T, type>{})
                return f(x, offset, false_type{});
            else
            {
                auto pre_offset = offset;
                offset += size;
                offset += offset % 4;
                return f(x, pre_offset, true_type{});
            }
        };
        return by(each, g...)(ss...);
    };
}

template <class T, class... Shapes>
constexpr index_int compute_preload_size_c(Shapes...)
{
    index_int size = 0;
    traverse_preload<T>(Shapes{}...)(
        [&](auto s, auto offset, auto) { size = offset + s.element_space(); });
    return size;
}

template <class T, class... Shapes>
constexpr auto compute_preload_size(Shapes...)
{
    return _c<compute_preload_size_c<T>(Shapes{}...)>;
}

template <class F, class T, class... Ts>
__device__ auto preload_copy(index idx, F f, __shared__ T* buffer, Ts... xs)
{
    auto invoke = [&](auto... ys) {
        __syncthreads();
        f(ys...);
    };
    traverse_preload<T>(xs...)(
        [&](auto x, auto offset, auto copy) {
            if constexpr(copy)
            {
                if constexpr(decltype(tensor_vec_size(x)){} == 0)
                {
                    auto v = auto_vectorize(x);
                    auto b = as_vec(tensor_vec_size(v), buffer + offset);
                    idx.local_stride(v.get_shape().element_space(),
                                     [&](auto i) { b[i] = v.data()[i]; });
                    return x.with(buffer + offset);
                }
                else
                {
                    auto b = as_vec(tensor_vec_size(x), buffer + offset);
                    idx.local_stride(x.get_shape().element_space(),
                                     [&](auto i) { b[i] = x.data()[i]; });
                    return x.with(b);
                }
            }
            else
            {
                return x;
            }
        },
        invoke);
}

template <class T, class Shape>
struct shape_type : Shape
{
    using type = T;
};

template <class T>
constexpr auto make_shape_type(T)
{
    return shape_type<typename T::type, typename T::shape_type>{};
}

template <class T, class... Ts>
__device__ auto preload(index idx, Ts... xs)
{
    using type               = remove_vec<T>;
    constexpr auto size      = decltype(compute_preload_size<type>(make_shape_type(xs)...)){};
    const index_int max_size = 512 * sizeof(type);
    return [=](auto f) {
        if constexpr(size > 0 and size < max_size)
        {
            __shared__ type buffer[size];
            preload_copy(idx, f, buffer, xs...);
        }
        else
        {
            f(xs...);
        }
    };
}

inline __device__ auto auto_preload(index idx)
{
    return make_transform([=](auto f, auto out, auto... xs) {
        preload<typename decltype(out)::type>(idx, xs...)([&](auto... ys) { f(out, ys...); });
    });
}

template <bool B, class T>
__device__ auto preload_copy(index idx, T x)
{
    return [=](auto f) {
        if constexpr(B)
        {
            using type          = typename T::type;
            constexpr auto size = get_shape_c<T>{}.element_space();
            __shared__ type buffer[size];
            // TODO: Always vecotrize when size > 4, and then use a second loop for remainder
            constexpr auto n = find_vectorize_size([&](auto i) { return (size % i) == 0; });
            auto input       = as_vec<n>(remove_bool(x.data()));
            auto b           = as_vec<n>(remove_bool(buffer));
            idx.local_stride(size / n, [&](auto i) { b[i] = input[i]; });
            return f(x.with(buffer));
        }
        else
        {
            return f(x);
        }
    };
}

template <bool... Bs>
__device__ auto auto_preload(index idx)
{
    return make_transform([=](auto f, auto... xs) {
        auto invoke = [=](auto... ys) {
            if constexpr((Bs or ...))
                __syncthreads();
            f(ys...);
        };
        join(invoke, preload_copy<Bs>(idx, xs)...);
    });
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_PRELOAD_HPP
