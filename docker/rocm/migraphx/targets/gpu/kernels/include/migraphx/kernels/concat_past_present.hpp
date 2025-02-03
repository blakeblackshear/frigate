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
#ifndef MIGRAPHX_GUARD_KERNELS_CONCAT_PAST_PRESENT_HPP
#define MIGRAPHX_GUARD_KERNELS_CONCAT_PAST_PRESENT_HPP

#include <migraphx/kernels/group_query_attention.hpp>
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/tensor_view.hpp>

namespace migraphx {

template <class Dest, class Src>
__device__ void copy_data(Dest destination, const Src source, index_int n, index_int idx)
{
    if(idx < n)
    {
        destination[idx] = source[idx];
    }
}

struct concat_state_chunk
{
    index_int present_buff_chunk_length;
    index_int past_buff_chunk_length;
    index_int past_chunk_length;
    index_int new_chunk_length;
    bool is_prompt;
    bool past_present_share_buffer;
    std::ptrdiff_t i;

    template <class Past, class Chunk, class Present>
    __device__ Present compute(Past past, const Chunk chunk, Present present, index_int idx)
    {
        auto start = present + i * present_buff_chunk_length;

        auto p = start;
        if(not is_prompt)
        {
            if(not past_present_share_buffer)
            {
                const auto src_past = past + i * past_buff_chunk_length;
                copy_data(p, src_past, past_chunk_length, idx);
            }
            p += past_chunk_length;
        }
        copy_data(p, chunk, new_chunk_length, idx);
        return start;
    }
};

template <class Present, class SeqLensK, class Cache, class Params>
__device__ void
update_cache(const Present present, SeqLensK seqlens_k, Cache cache, Params params, index_int idx)
{
    const index_int batch_size                     = params.batch_size;
    const index_int sequence_length                = params.sequence_length;
    const index_int head_size                      = params.head_size;
    const index_int past_buffer_sequence_length    = params.seqlen_present_kv_cache;
    const index_int present_buffer_sequence_length = past_buffer_sequence_length;
    const index_int num_heads                      = params.num_heads;
    const index_int kv_num_heads                   = params.kv_num_heads;
    const bool is_prompt                           = sequence_length != 1;
    const index_int packed_batch_stride =
        (num_heads + 2 * kv_num_heads) * sequence_length * head_size;
    const index_int kv_num_heads_factor       = num_heads / kv_num_heads;
    const index_int kv_input_chunk_length     = sequence_length * head_size;                // L x H
    const index_int past_buff_chunk_length    = past_buffer_sequence_length * head_size;    // L x H
    const index_int present_buff_chunk_length = present_buffer_sequence_length * head_size; // T x H

    const index_int loop_len = batch_size * num_heads;
    const index_int i        = idx / (sequence_length * head_size);
    const index_int inner_i  = idx % (sequence_length * head_size);
    if(i < loop_len)
    {
        const index_int batch_index       = i / num_heads;
        const index_int head_index        = i % num_heads;
        const index_int past_seqlen       = sequence_length == 1
                                                ? static_cast<index_int>(seqlens_k[batch_index])
                                                : past_buffer_sequence_length;
        const index_int past_chunk_length = past_seqlen * head_size;

        auto current = present + packed_batch_stride * batch_index +
                       kv_input_chunk_length * (head_index / kv_num_heads_factor);

        concat_state_chunk concat{present_buff_chunk_length,
                                  past_buff_chunk_length,
                                  past_chunk_length,
                                  kv_input_chunk_length,
                                  is_prompt,
                                  params.past_present_share_buffer,
                                  i / kv_num_heads_factor};
        concat.compute(cache, current, cache, inner_i);
    }
}

template <class Query, class PastKey, class PastValue, class SeqLensK, class Params>
__device__ void concat_past_present(
    const Query query, PastKey past_key, PastValue past_value, SeqLensK seqlens_k, Params params)
{
    auto ind = make_index();
    auto elements =
        2 * params.batch_size * params.kv_num_heads * params.sequence_length * params.head_size;
    ind.global_stride(elements, [&](auto idx) {
        auto q = query.begin();
        auto k = q + params.num_heads * params.sequence_length * params.head_size;
        auto v = q + (params.num_heads + params.kv_num_heads) * params.sequence_length *
                         params.head_size;
        if(idx < elements / 2)
        {
            update_cache(k, seqlens_k, past_key.begin(), params, idx);
        }
        else if(idx < elements)
        {
            update_cache(v, seqlens_k, past_value.begin(), params, idx - (elements / 2));
        }
    });
}

} // namespace migraphx
#endif
