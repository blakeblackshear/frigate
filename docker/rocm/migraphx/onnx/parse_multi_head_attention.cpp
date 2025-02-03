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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/ranges.hpp>
#include <string>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

enum class qkv_fomat_t
{
    q_k_v       = 0,
    q_k_v_cross = 1,
    kv_packed   = 2,
    qkv_packed  = 3
};

struct multi_head_attention_parameters
{
    int64_t batch_size;
    int64_t q_sequence_length;
    int64_t kv_sequence_length;
    int64_t hidden_size;
    int64_t hidden_size_v;
    int64_t head_size;
    int64_t head_size_v;
    qkv_fomat_t qkv_fomat;
};

struct parse_multi_head_attention : op_parser<parse_multi_head_attention>
{

    std::vector<op_desc> operators() const { return {{"MultiHeadAttention"}}; }

    void unpack_qkv(const onnx_parser::node_info& info,
                    instruction_ref& query,
                    instruction_ref& key,
                    instruction_ref& value) const
    {
        // (batch_size, q_sequence_length, num_heads, 3, head_size) ->
        // (3, batch_size, q_sequence_length, num_heads, head_size)
        auto qkv_packed =
            info.add_instruction(make_op("transpose", {{"permutation", {3, 0, 1, 2, 4}}}), query);
        query = info.add_instruction(
            make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), qkv_packed);
        query = info.add_instruction(make_op("squeeze", {{"axes", {0}}}), query);
        key   = info.add_instruction(
            make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), qkv_packed);
        key   = info.add_instruction(make_op("squeeze", {{"axes", {0}}}), key);
        value = info.add_instruction(
            make_op("slice", {{"axes", {0}}, {"starts", {2}}, {"ends", {3}}}), qkv_packed);
        value = info.add_instruction(make_op("squeeze", {{"axes", {0}}}), value);
    }

    void unpack_kv(const onnx_parser::node_info& info,
                   instruction_ref& key,
                   instruction_ref& value) const
    {
        // (batch_size, kv_sequence_length, num_heads, 2, head_size) ->
        // (2, batch_size, kv_sequence_length, num_heads, head_size)
        auto kv_packed =
            info.add_instruction(make_op("transpose", {{"permutation", {3, 0, 1, 2, 4}}}), key);
        key = info.add_instruction(
            make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), kv_packed);
        key   = info.add_instruction(make_op("squeeze", {{"axes", {0}}}), key);
        value = info.add_instruction(
            make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), kv_packed);
        value = info.add_instruction(make_op("squeeze", {{"axes", {0}}}), value);
    }

    void check_inputs(const std::vector<instruction_ref>& args,
                      const int64_t num_heads,
                      multi_head_attention_parameters& params) const
    {
        if(args.empty() or args.size() > 3)
            MIGRAPHX_THROW("MultiHeadAttention: Wrong number of inputs. Only 'query', 'key' and "
                           "'value' inputs are supported.");

        auto query_dim  = args[0]->get_shape().ndim();
        auto query_lens = args[0]->get_shape().lens();

        params.batch_size        = query_lens[0];
        params.q_sequence_length = query_lens[1];

        if(query_dim != 3 and query_dim != 5)
            MIGRAPHX_THROW("MultiHeadAttention: Input 'query' rank needs to be 3 or 5, current: " +
                           std::to_string(query_dim));

        if(query_dim == 5)
        {
            if(query_lens[2] != num_heads or query_lens[3] != 3)
                MIGRAPHX_THROW("MultiHeadAttention: Input 'query' shape needs to be (batch_size, "
                               "q_sequence_length, num_heads, 3, head_size) for packed input.");

            params.kv_sequence_length = query_lens[1];
            params.head_size          = query_lens[4];
            params.head_size_v        = query_lens[4];
            params.hidden_size        = num_heads * query_lens[4];
            params.hidden_size_v      = num_heads * query_lens[4];
            params.qkv_fomat          = qkv_fomat_t::qkv_packed;
        }
        else // query_dim == 3
        {
            if(args.size() < 2)
                MIGRAPHX_THROW("MultiHeadAttention: Wrong number of inputs, 'key' is missing.");

            params.hidden_size = query_lens[2];
            params.head_size   = query_lens[2] / num_heads;

            auto key_dim  = args[1]->get_shape().ndim();
            auto key_lens = args[1]->get_shape().lens();

            if(key_dim < 3 or key_dim > 5)
                MIGRAPHX_THROW(
                    "MultiHeadAttention: Input 'key' rank needs to be 3, 4 or 5, current: " +
                    std::to_string(key_dim));

            if(key_dim == 5)
            {
                if(key_lens[0] != params.batch_size or key_lens[2] != num_heads or
                   key_lens[3] != 2 or key_lens[4] != params.head_size)
                    MIGRAPHX_THROW("MultiHeadAttention: Input 'key' shape needs to be (batch_size, "
                                   "kv_sequence_length, num_heads, 2, head_size)");

                params.kv_sequence_length = key_lens[1];
                params.hidden_size_v      = params.hidden_size;
                params.head_size_v        = key_lens[4];
                params.qkv_fomat          = qkv_fomat_t::kv_packed;
            }
            else
            {
                if(args.size() < 3)
                    MIGRAPHX_THROW(
                        "MultiHeadAttention: Wrong number of inputs, 'value' is missing.");

                auto value_dim  = args[2]->get_shape().ndim();
                auto value_lens = args[2]->get_shape().lens();

                if(key_dim != value_dim)
                    MIGRAPHX_THROW(
                        "MultiHeadAttention: Input 'key' and 'value' rank needs to be equal.");

                if(key_dim == 3)
                {
                    if(key_lens[0] != params.batch_size or key_lens[2] != params.hidden_size)
                        MIGRAPHX_THROW("MultiHeadAttention: Input 'key' shape needs to be "
                                       "(batch_size, kv_sequence_length, hidden_size)");

                    if(value_lens[0] != params.batch_size or value_lens[1] != key_lens[1])
                        MIGRAPHX_THROW("MultiHeadAttention: Input 'value' shape needs to be "
                                       "(batch_size, kv_sequence_length, hidden_size_v)");

                    params.kv_sequence_length = key_lens[1];
                    params.hidden_size_v      = value_lens[2];
                    params.head_size_v        = value_lens[2] / num_heads;
                    params.qkv_fomat          = qkv_fomat_t::q_k_v;
                }
                else // key_dim == 4
                {
                    if(key_lens[0] != params.batch_size or key_lens[1] != num_heads or
                       key_lens[3] != params.head_size)
                        MIGRAPHX_THROW("MultiHeadAttention: Input 'key' shape needs to be "
                                       "(batch_size, num_heads, kv_sequence_length, head_size)");

                    if(value_lens[0] != params.batch_size or value_lens[1] != num_heads or
                       value_lens[2] != key_lens[2])
                        MIGRAPHX_THROW("MultiHeadAttention: Input 'value' shape needs to be "
                                       "(batch_size, num_heads, kv_sequence_length, head_size_v)");

                    params.kv_sequence_length = key_lens[2];
                    params.hidden_size_v      = value_lens[3] * num_heads;
                    params.head_size_v        = value_lens[3];
                    params.qkv_fomat          = qkv_fomat_t::q_k_v_cross;
                }
            }
        }
    }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          const std::vector<instruction_ref>& args) const
    {
        if(not contains(info.attributes, "num_heads"))
            MIGRAPHX_THROW("MultiHeadAttention: num_heads attribute is required");

        int64_t num_heads = parser.parse_value(info.attributes.at("num_heads")).at<int>();

        multi_head_attention_parameters params;
        check_inputs(args, num_heads, params);

        auto query = args[0];
        instruction_ref key;
        instruction_ref value;

        if(params.qkv_fomat == qkv_fomat_t::qkv_packed)
        {
            // Packed QKV: (batch_size, q_sequence_length, num_heads, 3, head_size)
            unpack_qkv(info, query, key, value);
        }
        else
        {
            // Query: (batch_size, q_sequence_length, hidden_size)
            std::vector<int64_t> q_dims{
                params.batch_size, params.q_sequence_length, num_heads, params.head_size};
            query = info.add_instruction(make_op("reshape", {{"dims", q_dims}}), query);

            key = args[1];

            if(params.qkv_fomat == qkv_fomat_t::kv_packed)
            {
                // Packed KV: (batch_size, kv_sequence_length, num_heads, 2, head_size)
                unpack_kv(info, key, value);
            }
            else
            {
                value = args[2];
                if(params.qkv_fomat == qkv_fomat_t::q_k_v)
                {
                    // Key: (batch_size, kv_sequence_length, hidden_size)
                    // Value: (batch_size, kv_sequence_length, hidden_size_v)
                    std::vector<int64_t> k_dims{
                        params.batch_size, params.kv_sequence_length, num_heads, params.head_size};
                    std::vector<int64_t> v_dims{params.batch_size,
                                                params.kv_sequence_length,
                                                num_heads,
                                                params.head_size_v};
                    key   = info.add_instruction(make_op("reshape", {{"dims", k_dims}}), key);
                    value = info.add_instruction(make_op("reshape", {{"dims", v_dims}}), value);
                }
            }
        }

        // Target shape: (batch_size, num_heads, sequence_length, head_size)
        std::vector<int64_t> perm{0, 2, 1, 3};
        query = info.add_instruction(make_op("transpose", {{"permutation", perm}}), query);
        if(params.qkv_fomat != qkv_fomat_t::q_k_v_cross)
        {
            key   = info.add_instruction(make_op("transpose", {{"permutation", perm}}), key);
            value = info.add_instruction(make_op("transpose", {{"permutation", perm}}), value);
        }

        float scale = 1 / std::sqrt(params.head_size);
        if(contains(info.attributes, "scale"))
            scale = parser.parse_value(info.attributes.at("scale")).at<float>();

        auto scale_literal = info.add_literal(
            migraphx::literal{migraphx::shape{query->get_shape().type()}, {scale}});

        auto key_transposed =
            info.add_instruction(make_op("transpose", {{"permutation", {0, 1, 3, 2}}}), key);

        auto result = info.add_instruction(make_op("dot"), query, key_transposed);
        result      = info.add_common_op("mul", result, scale_literal);
        result      = info.add_instruction(make_op("softmax", {{"axis", -1}}), result);
        result      = info.add_instruction(make_op("dot"), result, value);
        result      = info.add_instruction(make_op("transpose", {{"permutation", perm}}), result);
        result      = info.add_instruction(
            make_op(
                "reshape",
                {{"dims", {params.batch_size, params.q_sequence_length, params.hidden_size_v}}}),
            result);

        return result;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
