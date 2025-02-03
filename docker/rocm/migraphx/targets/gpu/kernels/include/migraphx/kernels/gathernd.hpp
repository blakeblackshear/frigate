/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_KERNELS_GATHERND_HPP
#define MIGRAPHX_GUARD_KERNELS_GATHERND_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/algorithm.hpp>
#include <migraphx/kernels/ops.hpp>
namespace migraphx {

template <class T>
struct gathernd_settings
{
    T batch_dims{};
};

template <class... Ts>
constexpr gathernd_settings<Ts...> make_gathernd_settings(Ts... xs)
{
    return {xs...};
}

template <class T, class U, class V, class Settings>
__device__ void gathernd(const T& data_t, const U& indices_t, const V& output_t, Settings s)
{
    auto ind           = make_index();
    auto batch_dims    = s.batch_dims;
    auto output_shape  = output_t.get_shape();
    auto indices_shape = indices_t.get_shape();
    auto data_shape    = data_t.get_shape();

    auto indices_shape_lens = indices_shape.lens;
    auto data_shape_lens    = data_shape.lens;
    auto num_slice_dims     = indices_shape_lens.back();
    size_t num_slices =
        accumulate(indices_shape_lens.begin(), indices_shape_lens.end() - 1, 1, op::product{});
    size_t slice_size = accumulate(data_shape_lens.begin() + num_slice_dims + batch_dims,
                                   data_shape_lens.end(),
                                   1,
                                   op::product{});
    const size_t num_batches =
        accumulate(data_shape_lens.begin(), data_shape_lens.begin() + batch_dims, 1, op::product{});
    const size_t data_batch_stride =
        accumulate(data_shape_lens.begin() + batch_dims, data_shape_lens.end(), 1, op::product{});
    const auto num_slices_per_batch = num_slices / num_batches;

    ind.global_stride(output_shape.elements(), [&](auto i) {
        const auto* indices_ptr     = indices_t.data();
        const size_t j              = i / slice_size;
        const size_t batch_idx      = j / num_slices_per_batch;

        auto* slice_indices               = indices_ptr + (j * num_slice_dims);
        size_t relative_slice_offset      = 0;
        for(size_t idx = 0; idx < num_slice_dims; ++idx)
        {
            int64_t index                   = slice_indices[idx];
            const size_t input_dim_idx      = batch_dims + idx;
            const auto input_dim            = data_shape_lens[input_dim_idx];
            MIGRAPHX_ASSERT(index >= -static_cast<int64_t>(input_dim) and
                            index < static_cast<int64_t>(input_dim));
            if(index < 0)
                index += input_dim;
            size_t size_from_slice_dims =
                accumulate(data_shape_lens.begin() + batch_dims + idx + 1,
                           data_shape_lens.begin() + batch_dims + num_slice_dims,
                           slice_size,
                           op::product{});
            relative_slice_offset += index * size_from_slice_dims;
        }

        auto slice_offset = (batch_idx * data_batch_stride) + relative_slice_offset;
        output_t[i]       = data_t[slice_offset + i % slice_size];
    });
}

} // namespace migraphx
#endif
