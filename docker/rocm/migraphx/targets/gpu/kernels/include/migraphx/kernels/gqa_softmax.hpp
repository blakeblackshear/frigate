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
#ifndef MIGRAPHX_GUARD_KERNELS_GQA_SOFTMAX_HPP
#define MIGRAPHX_GUARD_KERNELS_GQA_SOFTMAX_HPP

#include <migraphx/kernels/group_query_attention.hpp>
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/tensor_view.hpp>

namespace migraphx {

template <class T>
__device__ void softmax_inplace(T score, int n, int d)
{
    for(int j = 0; j < n; ++j)
    {
        auto x = score + j * d;
        auto y = x;

        // e^x is represented as infinity if x is large enough, like 100.f.
        // Infinity divided by Infinity is a NAN. Thus, softmax gets a NAN if
        // one or more item are large enough. a math transform as below is
        // leveraged to get a stable softmax: e^xi/(e^x1 + ...e^xn) = e^(xi -
        // max) / (e^(x1 - max) + ... + e^(xn - max))
        float max = -numeric_max<float>();
        for(int i = 0; i < d; i++)
        {
            if(max < x[i])
                max = x[i];
        }
        for(int i = 0; i < d; i++)
        {
            y[i] = expf(x[i] - max);
        }

        float sum = 0.0;
        for(int i = 0; i < d; i++)
        {
            sum += x[i];
        }

        for(int i = 0; i < d; i++)
        {
            y[i] = x[i] / static_cast<float>(sum);
        }
    }
}

template <class AttnProbs,
          class SeqLensK,
          class Params>
__device__ void calculate_softmax(AttnProbs attention_probs, // output buffer with size BxNxSxT
                                  SeqLensK seqlens_k,        // past sequence lengths tensor
                                  Params params,
                                  index_int idx)
{
    const index_int batch_size                     = params.batch_size;
    const index_int sequence_length                = params.sequence_length;
    const index_int num_heads                      = params.num_heads;
    const index_int present_buffer_sequence_length = params.seqlen_present_kv_cache;

    const index_int loop_len = batch_size * num_heads;
    const index_int i        = idx / sequence_length;
    const index_int inner_i  = idx % sequence_length;
    if(i < loop_len)
    {
        const index_int batch_index   = i / num_heads;
        const index_int total_seqlen  = seqlens_k[batch_index] + 1;
        const index_int output_offset = i * sequence_length * present_buffer_sequence_length;
        auto output                   = attention_probs + output_offset;

        const int local_window_size = params.local_window_size;
        auto output_softmax         = output;
        index_int seq               = inner_i;
        if(seq < sequence_length)
        {
            output_softmax += seq * present_buffer_sequence_length;
            auto consume = total_seqlen + local_window_size;
            seq += consume;
            seq -= consume;
            int seq_causal_length = sequence_length == 1 ? total_seqlen : seq + 1;
            if(local_window_size > 0 and seq_causal_length > local_window_size + 1)
            {
                for(int total_seq_id = 0; total_seq_id < seq_causal_length - local_window_size - 1;
                    total_seq_id++)
                {
                    output_softmax[total_seq_id] = 0.f;
                }
                softmax_inplace(output_softmax + seq_causal_length - local_window_size - 1,
                                1,
                                local_window_size + 1);
            }
            else
            {
                softmax_inplace(output_softmax, 1, seq_causal_length);
            }
            for(int total_seq_id = seq_causal_length; total_seq_id < total_seqlen; total_seq_id++)
            {
                output_softmax[total_seq_id] = 0.f;
            }
        }
    }
}

template <class Output, class Input, class PresentKey, class Probs, class SeqLensK, class Params>
__device__ void
gqa_softmax(Output output, Input, PresentKey, Probs, SeqLensK seqlens_k, Params params)
{
    const index_int elements = params.batch_size * params.num_heads * params.sequence_length;
    auto ind                 = make_index();
    ind.global_stride(elements, [&](auto idx) {
        calculate_softmax(output.begin(), seqlens_k.begin(), params, idx);
    });
}

} // namespace migraphx
#endif
