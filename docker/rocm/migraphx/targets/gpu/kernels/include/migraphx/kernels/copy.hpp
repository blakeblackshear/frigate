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
#ifndef MIGRAPHX_GUARD_KERNELS_COPY_HPP
#define MIGRAPHX_GUARD_KERNELS_COPY_HPP

#include <migraphx/kernels/print.hpp>
#include <migraphx/kernels/vectorize.hpp>

namespace migraphx {

template <class Index, class T, class U, class Size>
__device__ void local_vector_copy(Index idx, T* src, U* dst, Size size)
{
    constexpr auto n = find_vectorize_size([&](auto i) { return (size % i) == 0; });
    auto vsrc        = as_vec<n>(remove_bool(src));
    auto vdst        = as_vec<n>(remove_bool(dst));
    index_int vsize  = size / n;
    idx.local_stride(vsize, [&](auto i) { vdst[i] = vsrc[i]; });
}

template <class Index, class T, class U>
__device__ void local_tensor_copy(Index idx, T src, U dst)
{
    constexpr auto src_shape = get_shape_c<T>{};
    constexpr auto dst_shape = get_shape_c<U>{};
    if constexpr(src_shape == dst_shape and (src_shape.packed() or src_shape.broadcasted()))
    {
        local_vector_copy(idx, src.data(), dst.data(), src_shape.element_space());
    }
    else
    {
        constexpr auto perm = find_permutation(src_shape, dst_shape);
        auto new_src        = reorder_tensor_view(src, perm);
        auto new_dst        = reorder_tensor_view(dst, perm);
        auto_vectorize()(new_src, new_dst)([&](auto vsrc, auto vdst) {
            index_int size = vsrc.get_shape().elements();
            idx.local_stride(size, [&](auto i) { vdst[i] = vsrc[i]; });
        });
    }
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_COPY_HPP
