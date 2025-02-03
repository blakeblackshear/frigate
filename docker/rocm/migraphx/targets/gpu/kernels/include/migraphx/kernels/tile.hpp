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
#ifndef MIGRAPHX_GUARD_KERNELS_TILE_HPP
#define MIGRAPHX_GUARD_KERNELS_TILE_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/tensor_view.hpp>
#include <migraphx/kernels/copy.hpp>

namespace migraphx {

struct tile
{
    template <class Shape>
    static constexpr auto pad_shape(Shape)
    {
        constexpr Shape s{};
        constexpr auto axis    = s.strides.size() - _c<1>;
        constexpr auto strides = transform_i(s.strides, [](auto stride, auto i) {
            if constexpr(i == decltype(axis){})
            {
                // Pad by 1 element extra to avoid memory bank conflicts
                return stride + 1;
            }
            else
            {
                return stride;
            }
        });
        return make_shape(s.lens, strides);
    }
    struct load
    {
        template <class T>
        static __device__ auto copy(index idx, T x)
        {
            return [=](auto f) {
                using type          = typename T::type;
                constexpr auto s    = pad_shape(make_packed_shape(get_shape_c<T>{}));
                constexpr auto size = s.element_space();
                __shared__ type buffer[size];
                auto b = make_tensor_view(buffer, s);
                local_tensor_copy(idx, x, b);
                f(b);
            };
        }
    };
    struct store
    {
        template <class T>
        static __device__ auto copy(index idx, T x)
        {
            return [=](auto f) {
                using type          = typename T::type;
                constexpr auto s    = pad_shape(make_packed_shape(get_shape_c<T>{}));
                constexpr auto size = s.element_space();
                __shared__ type buffer[size];
                auto b = make_tensor_view(buffer, s);
                f(b);
                local_tensor_copy(idx, b, x);
            };
        }
    };
    struct none
    {
        template <class T>
        static __device__ auto copy(index, T x)
        {
            return [=](auto f) { f(x); };
        }
    };

    template <class T, class InnerLens, class OuterLens>
    static constexpr auto slice(T x, index_int group, InnerLens, OuterLens)
    {
        constexpr auto outer_strides =
            transform(x.get_shape().strides, InnerLens{}, [](auto stride, auto inner_len) {
                return stride * inner_len;
            });
        constexpr auto is = make_shape(InnerLens{}, x.get_shape().strides);
        constexpr auto os = make_shape(OuterLens{}, outer_strides);
        auto offset       = os.index(group);
        MIGRAPHX_ASSERT((os.element_space() + is.element_space()) ==
                        (x.get_shape().element_space() + _c<1>));
        MIGRAPHX_ASSERT((is.elements() + group) <= x.get_shape().elements());
        MIGRAPHX_ASSERT((is.element_space() + offset) <= x.get_shape().element_space());
        return make_tensor_view(x.data() + offset, is);
    }

    template <class InnerLens, class OuterLens>
    static __device__ auto auto_slice(index idx)
    {
        return make_transform([=](auto f, auto... xs) {
            idx.group_stride(OuterLens{}.product(),
                             [=](auto group) { f(slice(xs, group, InnerLens{}, OuterLens{})...); });
        });
    }

    template <class... Modes>
    static __device__ auto auto_copy(index idx)
    {
        return make_transform([=](auto f, auto... xs) {
            static_assert(sizeof...(Modes) == sizeof...(xs));
            auto invoke = [=](auto... ys) {
                if constexpr((is_same<Modes, load>{} or ...))
                    __syncthreads();
                f(ys...);
                if constexpr((is_same<Modes, store>{} or ...))
                    __syncthreads();
            };
            join(invoke, Modes::copy(idx, xs)...);
        });
    }
};

template <bool Tiled>
__device__ auto tile_stride(index idx)
{
    if constexpr(Tiled)
    {
        return [=](auto... xs) { return idx.local_stride(xs...); };
    }
    else
    {
        return [=](auto... xs) { return idx.global_stride(xs...); };
    }
}

template <class... Modes, class InnerLens, class OuterLens>
__device__ auto auto_tile(InnerLens, OuterLens)
{
    if constexpr((is_same<Modes, tile::none>{} and ...))
    {
        return transform_args();
    }
    else
    {
        auto idx = make_index();
        return transform_args(tile::auto_slice<InnerLens, OuterLens>(idx),
                              tile::auto_copy<Modes...>(idx));
    }
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_TILE_HPP
