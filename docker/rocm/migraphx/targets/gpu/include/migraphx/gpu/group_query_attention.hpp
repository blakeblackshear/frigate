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
#ifndef MIGRAPHX_GUARD_GPU_GROUP_QUERY_ATTENTION_HPP
#define MIGRAPHX_GUARD_GPU_GROUP_QUERY_ATTENTION_HPP

#include <migraphx/stringutils.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/value.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct gqa_parameters
{
    float scale;
    std::uint32_t batch_size;              // Batch size used by input
    std::uint32_t sequence_length;         // Sequence length used by input
    std::uint32_t hidden_size;             // Hidden size used by input
    std::uint32_t head_size;               // Head size
    std::uint32_t rotary_embedding_dim;    // Rotary embedding dimension.
    std::uint32_t num_heads;               // num_heads = hidden_size / head_size
    std::uint32_t max_sequence_length;     // Sequence length used by cos/sin cache
    std::uint32_t head_stride;             // Head stride
    std::uint32_t seq_stride;              // Sequence stride
    std::uint32_t batch_stride;            // Batch stride
    std::uint32_t position_ids_format;     // Format of position ids - 0 is (1), 1 is (batch_size,
                                           // sequence_length)
    std::uint32_t seqlen_present_kv_cache; // Sequence length of present kv-cache (4096 when using
                                           // shared buffer)
    bool do_rotary;             // Whether to use rotary position embedding. Default value is 0.
    std::uint32_t kv_num_heads; // Number of attention heads for k and v
    int local_window_size;      // left_window_size for local attention. Default value is -1 meaning
                                // unused.
    bool rotary_interleaved;    // Rotate using interleaved pattern. Default value is 0 (False).
    bool past_present_share_buffer; // Whether to use same buffer for KV-cache inputs and outputs

    std::string make_init_str() const
    {
        return "MIGRAPHX_MAKE_CONSTANT(float{" + std::to_string(scale) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(batch_size) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(sequence_length) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(hidden_size) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(head_size) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(rotary_embedding_dim) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(num_heads) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(max_sequence_length) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(head_stride) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(seq_stride) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(batch_stride) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(position_ids_format) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(seqlen_present_kv_cache) +
               "}), " + "MIGRAPHX_MAKE_CONSTANT(bool{" +
               std::to_string(static_cast<int>(do_rotary)) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(uint32_t{" + std::to_string(kv_num_heads) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(int32_t{" + std::to_string(local_window_size) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(bool{" +
               std::to_string(static_cast<int>(rotary_interleaved)) + "}), " +
               "MIGRAPHX_MAKE_CONSTANT(bool{" +
               std::to_string(static_cast<int>(past_present_share_buffer)) + "})";
    }
};

static inline gqa_parameters init_params(const std::vector<shape>& inputs, const value& v)
{
    auto num_heads          = v.at("num_heads").to<std::uint32_t>();
    auto kv_num_heads       = v.at("kv_num_heads").to<std::uint32_t>();
    auto do_rotary          = v.at("do_rotary").to<bool>();
    auto local_window_size  = v.at("local_window_size").to<std::uint32_t>();
    auto rotary_interleaved = v.at("rotary_interleaved").to<bool>();
    auto scale              = v.at("scale").to<float>();
    auto present_kv_seqlen  = inputs[1].lens().size() == 4 ? inputs[1].lens()[2] : 0;

    const auto& q_shape               = inputs[0];
    auto q_lens                       = q_shape.lens();
    const std::size_t batch_size      = q_lens[0];
    const std::size_t sequence_length = q_lens[2];
    std::size_t head_size             = q_lens[3];
    auto q_hidden_size                = kv_num_heads * head_size;

    std::size_t rotary_dim         = inputs[3].lens()[1] * 2;
    auto seq_stride                = head_size;
    auto head_stride               = sequence_length * seq_stride;
    auto batch_stride              = (num_heads + 2 * kv_num_heads) * head_stride;
    auto position_ids_format       = sequence_length == 1 ? 1 : 0;
    bool past_present_share_buffer = true;
    gqa_parameters gqa_params;
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
    gqa_params.position_ids_format       = position_ids_format;
    gqa_params.seqlen_present_kv_cache   = present_kv_seqlen;
    gqa_params.do_rotary                 = do_rotary;
    gqa_params.kv_num_heads              = kv_num_heads;
    gqa_params.local_window_size         = local_window_size;
    gqa_params.rotary_interleaved        = rotary_interleaved;
    gqa_params.scale                     = scale;
    gqa_params.past_present_share_buffer = past_present_share_buffer;

    return gqa_params;
}

} // namespace gpu

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_GPU_GROUP_QUERY_ATTENTION_HPP
