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
#ifndef MIGRAPHX_GUARD_KERNELS_ROTARY_EMBEDDING_HPP
#define MIGRAPHX_GUARD_KERNELS_ROTARY_EMBEDDING_HPP

#include <migraphx/kernels/group_query_attention.hpp>
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/tensor_view.hpp>

namespace migraphx {

template <class Input, class CosCache, class SinCache, class Output, class PosIDs, class Params>
__device__ void run_rotary_embedding(Input input,
                                     CosCache cos_cache,
                                     SinCache sin_cache,
                                     Output output,
                                     PosIDs pos_ids,
                                     Params params,
                                     index_int idx,
                                     bool is_query = false)
{
    const index_int batch_size          = params.batch_size;
    const index_int sequence_length     = params.sequence_length;
    const index_int n_heads             = is_query ? params.num_heads : params.kv_num_heads;
    const index_int head_size           = params.head_size;
    const index_int head_stride         = params.head_stride;
    const index_int seq_stride          = params.seq_stride;
    const index_int batch_stride        = params.batch_stride;
    const int position_ids_format       = params.position_ids_format;
    const index_int rotary_emb_dim      = params.rotary_embedding_dim;
    const index_int half_rotary_emb_dim = rotary_emb_dim / 2;

    const index_int loop_len = batch_size * sequence_length * n_heads;
    const index_int i        = idx / head_size;
    const index_int ii       = idx % head_size;
    if(i < loop_len)
    {
        const index_int b            = (i / n_heads) / sequence_length;
        const index_int s            = (i / n_heads) % sequence_length;
        const index_int n            = i % n_heads;
        const index_int block_offset = b * batch_stride + s * seq_stride + n * head_stride;
        auto input_data              = input + block_offset;
        auto output_data             = output + block_offset;

        // Cache is (M, H/2) or (M, rotary_embedding_dim/2)
        int position_id = (position_ids_format == 0)
                              ? static_cast<int>(pos_ids[0]) + s
                              : static_cast<int>(pos_ids[b * sequence_length + s]);
        position_id     = (sequence_length == 1) ? position_id : s;

        const index_int cache_offset = position_id * half_rotary_emb_dim;
        auto cos_data                = cos_cache + cache_offset;
        auto sin_data                = sin_cache + cache_offset;

        int cache_idx = 0;
        double sign   = 0.0;
        int j         = 0;
        if(ii < rotary_emb_dim)
        {
            if(params.rotary_interleaved)
            {
                cache_idx = (ii / 2) % half_rotary_emb_dim;
                sign      = (ii % 2 == 0) ? -1.0 : 1.0;
                j         = (ii % 2 == 0) ? ii + 1 : ii - 1; // i - sign
            }
            else
            {
                cache_idx = ii % half_rotary_emb_dim;
                sign      = (ii < half_rotary_emb_dim) ? -1.0 : 1.0;
                j         = (ii + half_rotary_emb_dim) % rotary_emb_dim;
            }
            double out_data =
                static_cast<double>(input_data[ii]) * static_cast<double>(cos_data[cache_idx]) +
                sign * static_cast<double>(input_data[j]) *
                    static_cast<double>(sin_data[cache_idx]);
            output_data[ii] = out_data;
        }
        else if(ii < head_size)
        {
            output_data[ii] = input_data[ii];
        }
    }
}

template <class Params, class Input, class Output>
__device__ void
pack_v_into_rotary_qkv(Params params, const Input input, Output output, index_int idx)
{
    const index_int loop_len = params.batch_size * params.sequence_length * params.kv_num_heads;
    auto i                   = idx / params.head_size;
    auto ii                  = idx % params.head_size;
    if(i < loop_len)
    {
        const index_int b = (i / params.kv_num_heads) / params.sequence_length;
        const index_int s = (i / params.kv_num_heads) % params.sequence_length;
        const index_int n = i % params.kv_num_heads;
        const index_int block_offset =
            b * params.batch_stride + s * params.seq_stride + n * params.head_stride;
        const Input input_data = input + block_offset;
        Output output_data     = output + block_offset;
        if(ii < params.head_size)
        {
            output_data[ii] = input_data[ii];
        }
    }
}

template <class Output, class Query, class SeqLensK, class CosCache, class SinCache, class Params>
__device__ void gqa_rotary_embedding(Output output,
                                     Query query,
                                     SeqLensK seqlens_k,
                                     CosCache cos_cache,
                                     SinCache sin_cache,
                                     Params params)
{
    auto ind = make_index();
    ind.global_stride(output.get_shape().elements(), [&](auto idx) {
        auto q_input  = query.begin();
        auto q_rotary = output.begin();
        auto k_input  = q_input + params.num_heads * params.sequence_length * params.head_size;
        auto k_rotary = q_rotary + params.num_heads * params.sequence_length * params.head_size;
        auto v_input  = k_input + params.kv_num_heads * params.sequence_length * params.head_size;
        auto v_rotary = k_rotary + params.kv_num_heads * params.sequence_length * params.head_size;
        auto q_chunk_size =
            params.batch_size * params.num_heads * params.sequence_length * params.head_size;
        auto kv_chunk_size =
            params.batch_size * params.kv_num_heads * params.sequence_length * params.head_size;
        if(idx < q_chunk_size)
        {
            run_rotary_embedding(q_input,
                                 cos_cache.begin(),
                                 sin_cache.begin(),
                                 q_rotary,
                                 seqlens_k.begin(),
                                 params,
                                 idx,
                                 true);
        }
        else if(idx < q_chunk_size + kv_chunk_size)
        {
            run_rotary_embedding(k_input,
                                 cos_cache.begin(),
                                 sin_cache.begin(),
                                 k_rotary,
                                 seqlens_k.begin(),
                                 params,
                                 idx - q_chunk_size);
        }
        else if(idx < output.get_shape().elements())
        {
            pack_v_into_rotary_qkv(params, v_input, v_rotary, idx - (q_chunk_size + kv_chunk_size));
        }
    });
}

} // namespace migraphx
#endif
