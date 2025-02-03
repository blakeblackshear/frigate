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
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

// com.microsoft.SkipSimplifiedLayerNormalization
// Skip and Root Mean Square Layer Normalization

// Version
// This version of the operator has been available since version 1 of the 'com.microsoft' operator
// set.

// Type Constraints
// T : tensor(float), tensor(float16)
// Constrain input and output types to float or half tensors.
// U : tensor(float)
// Constrain mean and inv_std_var to float tensors.

struct parse_skip_simplified_layer_normalization
    : op_parser<parse_skip_simplified_layer_normalization>
{
    std::vector<op_desc> operators() const { return {{"SkipSimplifiedLayerNormalization"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       const onnx_parser& parser,
                                       const onnx_parser::node_info& info,
                                       std::vector<instruction_ref> args) const
    {
        // Attributes
        // epsilon : float
        // The epsilon value to use to avoid division by zero.
        float epsilon = 1e-5f;
        if(contains(info.attributes, "epsilon"))
        {
            epsilon = parser.parse_value(info.attributes.at("epsilon")).at<float>();
        }

        // Inputs (3 - 4)
        // input : T
        // 3D input tensor with shape (batch_size, sequence_length, hidden_size) Or 2D input tensor
        // with shape (token_count, hidden_size)
        // skip : T
        // 3D input tensor with shape (batch_size, sequence_length, hidden_size)
        // Or 2D input tensor with shape (token_count, hidden_size)
        // gamma : T
        // 1D input tensor with shape (hidden_size)
        // bias (optional) : T
        // 1D bias tensor with shape (hidden_size) - not used by ORT

        if(args.size() < 3 or args.size() > 4)
        {
            MIGRAPHX_THROW("PARSE_SKIPSIMPLIFIEDLAYERNORMALIZATION: invalid input count");
        }

        auto x     = args.at(0);
        auto skip  = args.at(1);
        auto gamma = args.at(2);
        instruction_ref bias;
        if(args.size() == 4)
        {
            bias = args.at(3);
        }

        auto x_shape       = x->get_shape();
        auto x_dtype       = x_shape.type();
        int64_t x_rank     = x_shape.ndim();
        int64_t skip_rank  = skip->get_shape().ndim();
        int64_t gamma_rank = gamma->get_shape().ndim();
        // axis = hidden_size dim
        int64_t axis = x_rank - 1;

        if(x_rank < 2 or x_rank > 3 or x_rank != skip_rank or gamma_rank != 1)
        {
            MIGRAPHX_THROW("PARSE_SKIPSIMPLIFIEDLAYERNORMALIZATION: invalid input shape");
        }

        x         = info.add_common_op("add", x, skip);
        // Convert to float before reduce_mean
        // Fp16 reduce_mean on GPU causes loss of accuracy
        auto float_x = info.add_instruction(
            make_op("convert", {{"target_type", migraphx::shape::float_type}}), x);
        auto x_sq = info.add_common_op("mul", float_x, float_x);
        auto rms  = info.add_instruction(make_op("reduce_mean", {{"axes", {axis}}}), x_sq);
        rms       = info.add_instruction(make_op("convert", {{"target_type", x_dtype}}), rms);
        auto mean = rms;
        epsilon =
            (x_dtype == migraphx::shape::half_type and std::abs(epsilon) < 1e-7) ? 1e-7 : epsilon;
        auto eps    = info.add_literal(migraphx::literal{migraphx::shape{x_dtype}, {epsilon}});
        rms         = info.add_common_op("add", rms, eps);
        auto rrms   = info.add_instruction(make_op("rsqrt"), rms);
        auto result = info.add_common_op("mul", x, rrms);
        result      = info.add_common_op("mul", result, gamma);
        if(args.size() == 4)
        {
            result = info.add_common_op("add", result, bias);
            x      = info.add_common_op("add", x, bias);
        }

        // Outputs (1 - 4)
        // output : T
        // 3D output tensor with shape (batch_size, sequence_length, hidden_size)Or 2D output tensor
        // with shape (token_count, hidden_size)
        // mean (optional) : U Saved mean used during training
        // to speed up gradient computation
        // inv_std_var (optional) : U Saved inverse standard
        // variance used during training to speed up gradient computation.
        // input_skip_bias_sum (optional) : T Sum of the input and skip inputs (and bias if it
        // exists)with shape (batch_size, sequence_length, hidden_size) or (token_count,
        // hidden_size).

        return {result, mean, rrms, x};
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
