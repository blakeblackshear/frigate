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
#ifndef MIGRAPHX_GUARD_KERNELS_GROUP_QUERY_ATTENTION_HPP
#define MIGRAPHX_GUARD_KERNELS_GROUP_QUERY_ATTENTION_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/algorithm.hpp>
#include <migraphx/kernels/integral_constant.hpp>
#include <migraphx/kernels/tensor_view.hpp>
#include <migraphx/kernels/type_traits.hpp>

namespace migraphx {

template <class T1,
          class T2,
          class T3,
          class T4,
          class T5,
          class T6,
          class T7,
          class T8,
          class T9,
          class T10,
          class T11,
          class T12,
          class T13,
          class T14,
          class T15,
          class T16,
          class T17,
          class T18>
struct gqa_parameters
{
    T1 scale;
    T2 batch_size;               // Batch size used by input
    T3 sequence_length;          // Sequence length used by input
    T4 hidden_size;              // Hidden size used by input
    T5 head_size;                // Head size
    T6 rotary_embedding_dim;     // Rotary embedding dimension.
    T7 num_heads;                // num_heads = hidden_size / head_size
    T8 max_sequence_length;      // Sequence length used by cos/sin cache
    T9 head_stride;              // Head stride
    T10 seq_stride;              // Sequence stride
    T11 batch_stride;            // Batch stride
    T12 position_ids_format;     // Format of position ids - 0 is (1), 1 is (batch_size,
                                 // sequence_length)
    T13 seqlen_present_kv_cache; // Sequence length of present kv-cache (4096 when using
                                 // shared buffer)
    T14 do_rotary;               // Whether to use rotary position embedding. Default value is 0.
    T15 kv_num_heads;            // Number of attention heads for k and v
    T16 local_window_size;  // left_window_size for local attention. Default value is -1 meaning
                            // unused.
    T17 rotary_interleaved; // Rotate using interleaved pattern. Default value is 0 (False).
    T18 past_present_share_buffer; // Whether to use same buffer for KV-cache inputs and outputs
};

template <class... Ts>
__device__ gqa_parameters<Ts...> make_gqa_parameters(Ts... ts)
{
    return {ts...};
}

struct naive_gemm
{
    index_int max_m;
    index_int max_n;
    index_int max_k;
    index_int lda;
    index_int ldb;
    index_int ldc;
    bool b_transpose;
    float alpha;
    float beta;

    template <class C, class A, class B>
    __device__ void compute(C cmat, const A amat, const B bmat, const index_int idx)
    {
        auto m     = idx / max_n;
        auto n     = idx % max_n;
        auto index = [&](auto x, auto y, auto z) { return y + (x * z); };

        if(m < max_m)
        {
            if(n < max_n)
            {
                double s = 0.0;
                for(int k = 0; k < max_k; ++k)
                {
                    auto a_i = index(m, k, lda);
                    auto b_i = b_transpose ? index(n, k, ldb) : index(k, n, ldb);
                    s += static_cast<double>(amat[a_i]) * static_cast<double>(bmat[b_i]);
                }
                auto c_i  = index(m, n, ldc);
                cmat[c_i] = static_cast<double>(alpha) * s + cmat[c_i] * static_cast<double>(beta);
            }
        }
    }
};

} // namespace migraphx
#endif
