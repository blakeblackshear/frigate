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
#ifndef MIGRAPHX_GUARD_KERNELS_SCATTERND_HPP
#define MIGRAPHX_GUARD_KERNELS_SCATTERND_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/algorithm.hpp>
#include <migraphx/kernels/scatter_reduction_modes.hpp>

namespace migraphx {

template <class T, class U, class V, class F>
__device__ void scatternd(const T& indices_t, const U& updates_t, const V& output_t, F f)
{
    auto index         = make_index();
    auto updates_shape = updates_t.get_shape();

    index.global_stride(updates_shape.elements(), [&](auto i) {
        auto output_shape = output_t.get_shape();

        auto indices_shape = indices_t.get_shape();
        auto k             = indices_shape.lens.back();
        auto q             = indices_shape.lens.size();

        auto updates_idx = updates_shape.multi(i);
        auto indices_idx = indices_shape.multi(0);
        copy(updates_idx.begin(), updates_idx.begin() + q - 1, indices_idx.begin());

        auto index_start = indices_t.begin() + indices_shape.index(indices_idx);
        auto index_end   = index_start + k;
        auto out_idx     = output_shape.multi(0);
        copy(index_start, index_end, out_idx.begin());
        copy(updates_idx.begin() + q - 1, updates_idx.end(), out_idx.begin() + k);

        f(output_t[out_idx], updates_t[i]);
    });
}

} // namespace migraphx
#endif
