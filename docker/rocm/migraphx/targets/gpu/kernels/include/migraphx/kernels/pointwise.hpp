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
#ifndef MIGRAPHX_GUARD_KERNELS_POINTWISE_HPP
#define MIGRAPHX_GUARD_KERNELS_POINTWISE_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/math.hpp>
#include <migraphx/kernels/preload.hpp>
#include <migraphx/kernels/vectorize.hpp>
#include <migraphx/kernels/args.hpp>
#include <migraphx/kernels/tile.hpp>
#include <migraphx/kernels/tuple.hpp>

namespace migraphx {

template <class Stride, class F, class Output, class T, class... Ts>
__device__ void pointwise_tensor(Stride stride, F f, Output out, T x, Ts... xs)
{
    stride(x.get_shape().elements(), [&](auto i) {
        auto r = f(x[i], xs[i]...);
        out([&](auto... outs) {
            r([&](auto... rs) {
                static_assert(sizeof...(outs) == sizeof...(rs));
                swallow{(outs[i] = implicit_conversion(rs))...};
            });
        });
    });
}

template <index_int N, bool Tiled, class... Transforms>
__device__ auto pointwise(index idx, Transforms... transforms)
{
    return [=](auto f, auto*... ps) {
        auto t = transform_args(make_tensors(), transforms..., rotate_and_pack_last<N>());
        t(ps...)([&](auto... xs) { pointwise_tensor(tile_stride<Tiled>(idx), f, xs...); });
    };
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_POINTWISE_HPP
