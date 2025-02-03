#ifndef MIGRAPHX_GUARD_OPERATORS_GROUP_QUERY_ATTENTION_HPP
#define MIGRAPHX_GUARD_OPERATORS_GROUP_QUERY_ATTENTION_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/gemm.hpp>
#include <migraphx/argument.hpp>
#include <fstream>
#include <iostream>
#include <iomanip>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct gqa_parameters
{
    std::size_t batch_size           = 0;     // Batch size used by input
    std::size_t sequence_length      = 0;     // Sequence length used by input
    std::size_t hidden_size          = 0;     // Hidden size used by input
    std::size_t head_size            = 0;     // Head size
    std::size_t rotary_embedding_dim = 0;     // Rotary embedding dimension.
    std::size_t num_heads            = 0;     // num_heads = hidden_size / head_size
    std::size_t max_sequence_length  = 0;     // Sequence length used by cos/sin cache
    std::size_t head_stride          = 0;     // Head stride
    std::size_t seq_stride           = 0;     // Sequence stride
    std::size_t batch_stride         = 0;     // Batch stride
    bool position_ids_use_batch      = false; // Format of position ids - false is (1), true is
                                              // (batch_size, sequence_length)
    std::size_t seqlen_present_kv_cache = 0;  // Sequence length of present kv-cache
                                              // (4096 when using shared buffer)
    bool past_present_share_buffer = false;   // Whether to use same buffer for KV-cache
                                              // inputs and outputs
};

struct group_query_attention
{
    bool do_rotary                = false;
    std::size_t kv_num_heads      = 0;
    int local_window_size         = -1;
    std::size_t num_heads         = 1;
    bool rotary_interleaved       = false;
    float scale                   = 1.0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.do_rotary, "do_rotary"),
                    f(self.kv_num_heads, "kv_num_heads"),
                    f(self.local_window_size, "local_window_size"),
                    f(self.num_heads, "num_heads"),
                    f(self.rotary_interleaved, "rotary_interleaved"),
                    f(self.scale, "scale"));
    }

    std::string name() const { return "group_query_attention"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        auto query_lens           = inputs.front().lens();
        std::size_t q_hidden_size = (query_lens[2] * num_heads) / (num_heads + 2 * kv_num_heads);
        std::vector<std::size_t> output_lens{query_lens.at(0), query_lens.at(1), q_hidden_size};
        shape output_shape{inputs.front().type(), output_lens};
        return shape({output_shape, inputs[3], inputs[4]});
    }

    template <class T>
    void run_rotary_embedding(T input,
                              T cos_cache,
                              T sin_cache,
                              T output,
                              bool interleaved,
                              const std::size_t* pos_ids,
                              gqa_parameters parameters) const
    {
        const std::size_t batch_size             = parameters.batch_size;
        const std::size_t sequence_length        = parameters.sequence_length;
        const std::size_t n_heads                = parameters.num_heads;
        const std::size_t head_size              = parameters.head_size;
        const std::size_t head_stride            = parameters.head_stride;
        const std::size_t seq_stride             = parameters.seq_stride;
        const std::size_t batch_stride           = parameters.batch_stride;
        const std::size_t position_ids_use_batch = parameters.position_ids_use_batch;
        const std::size_t rotary_emb_dim         = parameters.rotary_embedding_dim;
        const std::size_t half_rotary_emb_dim    = rotary_emb_dim / 2;

        const std::size_t loop_len = batch_size * sequence_length * n_heads;
        par_for(loop_len, [&](const auto idx) {
            const std::size_t b            = (idx / n_heads) / sequence_length;
            const std::size_t s            = (idx / n_heads) % sequence_length;
            const std::size_t n            = idx % n_heads;
            const std::size_t block_offset = b * batch_stride + s * seq_stride + n * head_stride;
            auto input_data                = input + block_offset;
            auto output_data               = output + block_offset;

            // Cache is (M, H/2) or (M, rotary_embedding_dim/2)
            const std::size_t position_id =
                position_ids_use_batch ? pos_ids[b * sequence_length + s] : pos_ids[0] + s;
            const std::size_t cache_offset = position_id * half_rotary_emb_dim;
            auto cos_data                  = cos_cache + cache_offset;
            auto sin_data                  = sin_cache + cache_offset;

            std::size_t cache_idx = 0;
            float sign            = 0.0;
            std::size_t j         = 0;
            for(std::size_t i = 0; i < rotary_emb_dim; i++)
            {
                if(interleaved)
                {
                    cache_idx = (i / 2) % half_rotary_emb_dim;
                    sign      = (i % 2 == 0) ? -1.0 : 1.0;
                    j         = (i % 2 == 0) ? i + 1 : i - 1; // i - sign
                }
                else
                {
                    cache_idx = i % half_rotary_emb_dim;
                    sign      = (i < half_rotary_emb_dim) ? -1.0 : 1.0;
                    j         = (i + half_rotary_emb_dim) % rotary_emb_dim;
                }
                output_data[i] = input_data[i] * cos_data[cache_idx] +
                                 sign * input_data[j] * sin_data[cache_idx];
            }
            std::copy(
                input_data + rotary_emb_dim, input_data + head_size, output_data + rotary_emb_dim);
        });
    }

    template <class T>
    void pack_v_into_rotary_qkv(gqa_parameters parameters, const T input, T output) const
    {
        const std::size_t loop_len =
            parameters.batch_size * parameters.sequence_length * kv_num_heads;
        par_for(loop_len, [&](const auto idx) {
            const std::size_t b            = (idx / kv_num_heads) / parameters.sequence_length;
            const std::size_t s            = (idx / kv_num_heads) % parameters.sequence_length;
            const std::size_t n            = idx % kv_num_heads;
            const std::size_t block_offset = b * parameters.batch_stride +
                                             s * parameters.seq_stride + n * parameters.head_stride;
            const T input_data = input + block_offset;
            T output_data      = output + block_offset;
            for(std::size_t i = 0; i < parameters.head_size; i++)
            {
                output_data[i] = input_data[i];
            }
        });
    }

    template <class T>
    void copy_data(T destination, const T source, std::size_t n) const
    {
        par_for(n, [&](auto i) { destination[i] = source[i]; });
    }

    template <typename T>
    T concat_state_chunk(const T past,
                         const T chunk,
                         T present,
                         std::size_t present_buff_chunk_length,
                         std::size_t past_buff_chunk_length,
                         std::size_t past_chunk_length,
                         std::size_t new_chunk_length,
                         bool is_prompt,
                         bool past_present_share_buffer,
                         std::ptrdiff_t i) const
    {
        T start = present + i * present_buff_chunk_length;

        T p = start;
        if(not is_prompt)
        {
            if(not past_present_share_buffer)
            {
                const T src_past = past + i * past_buff_chunk_length;
                copy_data(p, src_past, past_chunk_length);
            }
            p += past_chunk_length;
        }
        copy_data(p, chunk, new_chunk_length);
        return start;
    }

    template <class T>
    void softmax_inplace(T score, std::size_t n, std::size_t d) const
    {
        par_for(n, [&](const auto j) {
            auto x = score + j * d;
            auto y = x;

            // e^x is represented as infinity if x is large enough, like 100.f.
            // Infinity divided by Infinity is a NAN. Thus, softmax gets a NAN if
            // one or more item are large enough. a math transform as below is
            // leveraged to get a stable softmax: e^xi/(e^x1 + ...e^xn) = e^(xi -
            // max) / (e^(x1 - max) + ... + e^(xn - max))
            float max = -std::numeric_limits<float>::infinity();
            for(std::size_t i = 0; i < d; i++)
            {
                if(max < x[i])
                    max = x[i];
            }
            for(std::size_t i = 0; i < d; i++)
            {
                y[i] = expf(x[i] - max);
            }

            double sum = 0.0;

            for(std::size_t i = 0; i < d; i++)
            {
                sum += x[i];
            }

            for(std::size_t i = 0; i < d; i++)
            {
                y[i] = x[i] / static_cast<float>(sum);
            }
        });
    }

    // Helper function to compute the attention probs. It does 2 things:
    //  attention_probs(B, N, S, T) = 1/sqrt(H) x Q(B, N, S, H) x K'(B, N, T, H -> B, N, H, T)
    //  attention_probs(B, N, S, T) = Softmax(attention_probs)
    template <class T, class U>
    void calculate_attention_probs(T attention_probs, // output buffer with size BxNxSxT
                                   T query,           // Q data. Its size is BxNxSxH
                                   T key,             // k data. Its size is BxNxLxH
                                   U seqlens_k,       // past sequence lengths tensor
                                   T past_key,        // past key only
                                   T present_key,     // present key only
                                   shape::type_t dtype,
                                   gqa_parameters params) const
    {
        const std::size_t batch_size                     = params.batch_size;
        const std::size_t sequence_length                = params.sequence_length;
        const std::size_t head_size                      = params.head_size;
        const std::size_t past_buffer_sequence_length    = params.seqlen_present_kv_cache;
        const std::size_t present_buffer_sequence_length = past_buffer_sequence_length;
        const bool past_present_share_buffer             = params.past_present_share_buffer;

        const bool is_prompt = sequence_length != 1;
        const std::size_t packed_batch_stride =
            (num_heads + 2 * kv_num_heads) * sequence_length * head_size;
        const std::size_t kv_num_heads_factor    = num_heads / kv_num_heads;
        const std::size_t q_input_chunk_length   = sequence_length * head_size;             // S x H
        const std::size_t kv_input_chunk_length  = sequence_length * head_size;             // L x H
        const std::size_t past_buff_chunk_length = past_buffer_sequence_length * head_size; // L x H
        const std::size_t present_buff_chunk_length =
            present_buffer_sequence_length * head_size; // T x H

        const std::size_t loop_len = batch_size * num_heads;
        const float alpha = scale == 0.0f ? 1.0f / std::sqrt(static_cast<float>(head_size)) : scale;

        par_for(loop_len, [&](const auto i) {
            const std::size_t batch_index = i / num_heads;
            const std::size_t head_index  = i % num_heads;
            const std::size_t past_seqlen =
                sequence_length == 1 ? seqlens_k[batch_index] : past_buffer_sequence_length;
            const std::size_t past_chunk_length = past_seqlen * head_size;
            const std::size_t total_seqlen      = seqlens_k[batch_index] + 1;

            const std::size_t output_offset = i * sequence_length * present_buffer_sequence_length;
            auto output                     = attention_probs + output_offset;

            auto k = key + packed_batch_stride * batch_index +
                     kv_input_chunk_length * (head_index / kv_num_heads_factor);
            k = concat_state_chunk(past_key,
                                   k,
                                   present_key,
                                   present_buff_chunk_length,
                                   past_buff_chunk_length,
                                   past_chunk_length,
                                   kv_input_chunk_length,
                                   is_prompt,
                                   past_present_share_buffer,
                                   i / kv_num_heads_factor);

            // Calculate Q*K' + AttentionMask
            //                     original                 transposed             each iteration
            // A: Q                (B x N x) S x H          (B x N x) S x H        S x H
            // B: K'               (B x N x) T x H          (B x N x) H x T        H x T
            // C: attention_probs  (B x N x) S x T          (B x N x) S x T        S x T
            auto q = query + packed_batch_stride * batch_index + q_input_chunk_length * head_index;

            auto output_shape =
                shape{dtype, {sequence_length, total_seqlen}, {present_buffer_sequence_length, 1}};
            auto q_shape = shape{dtype, {sequence_length, head_size}, {head_size, 1}};
            auto k_shape = shape{dtype, {head_size, total_seqlen}, {1, head_size}};
            auto cmat    = make_view(output_shape, &(*output));
            auto amat    = make_view(q_shape, &(*q));
            auto bmat    = make_view(k_shape, &(*k));

            gemm(cmat, amat, bmat, alpha, 0.0f);

            T output_softmax = output;
            for(std::size_t seq = 0; seq < sequence_length; seq++)
            {
                std::size_t seq_causal_length = sequence_length == 1 ? total_seqlen : seq + 1;
                if(local_window_size > 0 and seq_causal_length > local_window_size + 1)
                {
                    for(std::size_t total_seq_id = 0;
                        total_seq_id < seq_causal_length - local_window_size - 1;
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
                // set causal [seq_causal_length, total_seqlen) to 0.f
                for(std::size_t total_seq_id = seq_causal_length; total_seq_id < total_seqlen;
                    total_seq_id++)
                {
                    output_softmax[total_seq_id] = 0.f;
                }

                output_softmax += present_buffer_sequence_length;
            }
        });
    }

    template <class T, class U, class W>
    void calculate_attention_score(T output, // buffer for the result with size BxSxNxH
                                   const W attention_probs, // Attention probs with size BxNxSxT
                                   const T val,             // V value with size BxN_kvxSxH
                                   const U seqlens_k,       // past sequence lengths tensor
                                   const T past_value,      // past value only
                                   T present_value,         // present value only
                                   shape::type_t dtype,
                                   gqa_parameters params) const // whether Q, K, V are packed
    {
        const std::size_t batch_size                     = params.batch_size;
        const std::size_t sequence_length                = params.sequence_length;
        const std::size_t head_size                      = params.head_size;
        const std::size_t hidden_size                    = params.hidden_size;
        const std::size_t past_buffer_sequence_length    = params.seqlen_present_kv_cache;
        const std::size_t present_buffer_sequence_length = past_buffer_sequence_length;
        const bool past_present_share_buffer             = params.past_present_share_buffer;

        const bool is_prompt = sequence_length != 1;
        const std::size_t packed_batch_stride =
            (num_heads + 2 * kv_num_heads) * sequence_length * head_size;
        const std::size_t kv_num_heads_factor    = num_heads / kv_num_heads;
        const std::size_t kv_input_chunk_length  = sequence_length * head_size;             // L x H
        const std::size_t past_buff_chunk_length = past_buffer_sequence_length * head_size; // L x H
        const std::size_t present_buff_chunk_length =
            present_buffer_sequence_length * head_size; // T x H

        auto loop_len = batch_size * num_heads;
        par_for(loop_len, [&](const auto i) {
            const std::size_t batch_index = i / num_heads;
            const std::size_t head_index  = i % num_heads;
            const std::size_t past_seqlen =
                sequence_length == 1 ? seqlens_k[batch_index] : past_buffer_sequence_length;
            const std::size_t past_chunk_length = past_seqlen * head_size;
            const std::size_t total_seqlen      = seqlens_k[batch_index] + 1;

            auto v = val + packed_batch_stride * batch_index +
                     kv_input_chunk_length * (head_index / kv_num_heads_factor);

            v = concat_state_chunk(past_value,
                                   v,
                                   present_value,
                                   present_buff_chunk_length,
                                   past_buff_chunk_length,
                                   past_chunk_length,
                                   kv_input_chunk_length,
                                   is_prompt,
                                   past_present_share_buffer,
                                   i / kv_num_heads_factor);

            T output_current =
                output + (batch_index * sequence_length * num_heads + head_index) * head_size;
            ptrdiff_t attention_probs_offset = sequence_length * present_buffer_sequence_length * i;

            auto output_shape = shape{dtype, {sequence_length, head_size}, {hidden_size, 1}};
            auto probs_shape =
                shape{dtype, {sequence_length, total_seqlen}, {present_buffer_sequence_length, 1}};
            auto v_shape = shape{dtype, {total_seqlen, head_size}, {head_size, 1}};
            auto cmat    = make_view(output_shape, &(*output_current));
            auto amat    = make_view(probs_shape, &(*(attention_probs + attention_probs_offset)));
            auto bmat    = make_view(v_shape, &(*v));

            gemm(cmat, amat, bmat, 1.0f, 0.0f);
        });
    }

    template <class T, class U>
    void apply_attention(T qkv,
                         T past_key,
                         T past_value,
                         T output,
                         T present_key,
                         T present_value,
                         U seqlens_k,
                         T attention_probs,
                         gqa_parameters parameters,
                         shape::type_t dtype) const
    {
        const T k = qkv + num_heads * parameters.sequence_length * parameters.head_size;
        calculate_attention_probs(
            attention_probs, qkv, k, seqlens_k, past_key, present_key, dtype, parameters);

        const T v =
            qkv + (num_heads + kv_num_heads) * parameters.sequence_length * parameters.head_size;
        calculate_attention_score(
            output, attention_probs, v, seqlens_k, past_value, present_value, dtype, parameters);
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        auto q_shape                      = args[0].get_shape();
        auto q_lens                       = q_shape.lens();
        const std::size_t batch_size      = q_lens[0];
        const std::size_t sequence_length = q_lens[1];
        auto past_key_shape               = args[3].get_shape();
        auto past_key_lens                = past_key_shape.lens();
        auto past_sequence_length         = past_key_lens[2];
        std::size_t q_hidden_size         = q_lens[2];
        std::size_t head_size             = q_hidden_size / (num_heads + 2 * kv_num_heads);
        q_hidden_size                     = head_size * num_heads;
        std::size_t rotary_dim            = args[7].get_shape().lens()[1] * 2;

        auto output_shape_0 = output_shape.sub_shapes().front();
        argument result{output_shape_0};
        argument qkv_rotary{
            shape{output_shape_0.type(),
                  {batch_size, num_heads + 2 * kv_num_heads, sequence_length, head_size}}};

        shape kv_shape{output_shape_0.type(),
                       {batch_size, kv_num_heads, past_sequence_length, head_size}};
        argument present_k_out{kv_shape};
        argument present_v_out{kv_shape};
        argument attention_probs{shape{
            output_shape_0.type(), {batch_size, num_heads, sequence_length, past_sequence_length}}};

        args[0] = args[0].reshape(
            shape{output_shape_0.type(),
                  {batch_size, sequence_length, num_heads + 2 * kv_num_heads, head_size}});
        argument qkv{qkv_rotary.get_shape()};
        visit_all(qkv, args[0])([&](auto a, auto b) {
            auto in_shape  = args[0].get_shape();
            auto out_shape = qkv.get_shape();
            shape_for_each(in_shape, [&](const auto& idx) {
                std::vector<std::size_t> out_idx{idx[0], idx[2], idx[1], idx[3]};
                a(out_idx.begin(), out_idx.end()) = b(idx.begin(), idx.end());
            });
        });

        visit_all(result,
                  qkv,
                  args[3],
                  args[4],
                  args[7],
                  args[8],
                  qkv_rotary,
                  present_k_out,
                  present_v_out,
                  attention_probs)([&](auto output,
                                       auto query,
                                       auto past_key,
                                       auto past_value,
                                       auto cos_cache,
                                       auto sin_cache,
                                       auto rotary_qkv,
                                       auto present_k,
                                       auto present_v,
                                       auto attn_probs) {
            visit_all(args[5])([&](auto seqlens_k) {
                par_for(kv_shape.elements(), [&](auto i) {
                    present_k[i] = past_key[i];
                    present_v[i] = past_value[i];
                });
                auto seq_stride             = head_size;
                auto head_stride            = sequence_length * seq_stride;
                auto batch_stride           = num_heads + 2 * kv_num_heads;
                auto position_ids_use_batch = sequence_length == 1;
                std::vector<std::size_t> pos_ids(sequence_length == 1 ? batch_size : 1);
                if(sequence_length == 1)
                {
                    std::copy(seqlens_k.begin(), seqlens_k.begin() + batch_size, pos_ids.begin());
                }
                else
                {
                    pos_ids[0] = 0;
                }
                auto q_input  = query.begin();
                auto k_input  = q_input + num_heads * sequence_length * head_size;
                auto q_rotary = rotary_qkv.begin();
                auto k_rotary = q_rotary + num_heads * sequence_length * head_size;

                gqa_parameters gqa_params            = {};
                gqa_params.batch_size                = batch_size;
                gqa_params.sequence_length           = sequence_length;
                gqa_params.hidden_size               = q_hidden_size;
                gqa_params.head_size                 = head_size;
                gqa_params.rotary_embedding_dim      = rotary_dim;
                gqa_params.num_heads                 = num_heads;
                gqa_params.max_sequence_length       = sequence_length;
                gqa_params.seq_stride                = head_size;
                gqa_params.head_stride               = head_stride;
                gqa_params.batch_stride              = batch_stride;
                gqa_params.position_ids_use_batch    = position_ids_use_batch;
                gqa_params.seqlen_present_kv_cache   = past_sequence_length;
                gqa_params.past_present_share_buffer = false;

                if(do_rotary)
                {
                    run_rotary_embedding(q_input,
                                         cos_cache.begin(),
                                         sin_cache.begin(),
                                         q_rotary,
                                         rotary_interleaved,
                                         pos_ids.data(),
                                         gqa_params);
                }
                std::size_t kv_hidden_size = head_size * kv_num_heads;
                gqa_params.num_heads       = kv_num_heads;
                gqa_params.hidden_size     = kv_hidden_size;

                if(do_rotary)
                {
                    run_rotary_embedding(k_input,
                                         cos_cache.begin(),
                                         sin_cache.begin(),
                                         k_rotary,
                                         rotary_interleaved,
                                         pos_ids.data(),
                                         gqa_params);
                }
                auto v_input         = k_input + kv_num_heads * sequence_length * head_size;
                auto v_rotary        = k_rotary + kv_num_heads * sequence_length * head_size;
                gqa_params.num_heads = num_heads;

                if(do_rotary)
                {
                    pack_v_into_rotary_qkv(gqa_params, v_input, v_rotary);
                }
                else
                {
                    rotary_qkv = query;
                }
                apply_attention(rotary_qkv.begin(),
                                past_key.begin(),
                                past_value.begin(),
                                output.begin(),
                                present_k.begin(),
                                present_v.begin(),
                                seqlens_k.begin(),
                                attn_probs.begin(),
                                gqa_params,
                                output_shape_0.type());
            });
        });

        return {{result, present_k_out, present_v_out}};
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
