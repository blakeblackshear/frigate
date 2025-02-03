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
#ifndef MIGRAPHX_GUARD_KERNELS_SCATTER_ELEMENTS_HPP
#define MIGRAPHX_GUARD_KERNELS_SCATTER_ELEMENTS_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/algorithm.hpp>
#include <migraphx/kernels/scatter_reduction_modes.hpp>

namespace migraphx {

// Checks and skips out of bounds indices if SkipOutOfBounds is true.
// Otherwise does not check and underfined behavior if out of bounds.
template <uint64_t Axis, bool SkipOutOfBounds, class T, class U, class V, class F>
__device__ void scatter(const T& indices_t, const U& updates_t, const V& output_t, F f)
{
    auto gpu_index     = make_index();
    auto indices_shape = indices_t.get_shape();
    auto output_shape  = output_t.get_shape();
    auto axis_dim_size = output_shape.lens[Axis];

    gpu_index.global_stride(indices_shape.elements(), [&](auto i) {
        auto out_idx  = indices_shape.multi(i);
        auto index    = indices_t[i];
        index         = index < 0 ? index + axis_dim_size : index;
        if constexpr(SkipOutOfBounds)
        {
            if(index < 0)
            {
                return;
            }
        }
        out_idx[Axis] = index;
        if constexpr(SkipOutOfBounds)
        {
            if(not equal(
                   out_idx.begin(), out_idx.end(), output_shape.lens.begin(), [](auto x, auto y) {
                       return x < y;
                   }))
            {
                return;
            }
        }
        f(output_t[out_idx], updates_t[i]);
    });
}

} // namespace migraphx
#endif
