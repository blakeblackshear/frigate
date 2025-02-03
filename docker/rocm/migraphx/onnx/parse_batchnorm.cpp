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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_batchnorm : op_parser<parse_batchnorm>
{
    std::vector<op_desc> operators() const { return {{"BatchNormalization"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        float epsilon = 1e-5f;
        if(contains(info.attributes, "epsilon"))
        {
            epsilon = parser.parse_value(info.attributes.at("epsilon")).at<float>();
        }
        auto x_lens = args[0]->get_shape().max_lens();
        auto x_type = args[0]->get_shape().type();

        if(std::any_of(args.cbegin() + 1, args.cend(), [](auto a) {
               return a->get_shape().lens().size() != 1;
           }))
        {
            MIGRAPHX_THROW("PARSE_BATCHNORM: argument scale, bias, mean, or var rank != 1");
        }

        auto x_rank = x_lens.size();
        if(x_rank == 1 or x_rank == 2)
        {
            auto eps = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {epsilon}});
            auto x_sub_mean = info.add_broadcastable_binary_op("sub", args[0], args[3]);
            auto var_eps    = info.add_broadcastable_binary_op("add", args[4], eps);
            auto rsqrt      = info.add_instruction(make_op("rsqrt"), var_eps);
            auto mul0       = info.add_broadcastable_binary_op("mul", args[1], rsqrt);
            auto r0         = info.add_broadcastable_binary_op("mul", x_sub_mean, mul0);
            return info.add_broadcastable_binary_op("add", r0, args[2]);
        }
        else if(x_rank > 2)
        {
            // unsqueeze tensors of shape (C) to broadcast correctly
            std::vector<int64_t> unsqueeze_axes(x_lens.size() - 2);
            std::iota(unsqueeze_axes.begin(), unsqueeze_axes.end(), 1);
            auto eps = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {epsilon}});
            auto scale_unsqueeze = info.add_instruction(
                migraphx::make_op("unsqueeze", {{"axes", unsqueeze_axes}}), args[1]);
            auto bias_unsqueeze = info.add_instruction(
                migraphx::make_op("unsqueeze", {{"axes", unsqueeze_axes}}), args[2]);
            auto mean_unsqueeze = info.add_instruction(
                migraphx::make_op("unsqueeze", {{"axes", unsqueeze_axes}}), args[3]);
            auto var_unsqueeze = info.add_instruction(
                migraphx::make_op("unsqueeze", {{"axes", unsqueeze_axes}}), args[4]);
            auto x_sub_mean = info.add_broadcastable_binary_op("sub", args[0], mean_unsqueeze);
            auto var_eps    = info.add_broadcastable_binary_op("add", var_unsqueeze, eps);
            auto rsqrt      = info.add_instruction(make_op("rsqrt"), var_eps);
            auto mul0       = info.add_broadcastable_binary_op("mul", scale_unsqueeze, rsqrt);
            auto r0         = info.add_broadcastable_binary_op("mul", x_sub_mean, mul0);
            return info.add_broadcastable_binary_op("add", r0, bias_unsqueeze);
        }
        else
        {
            // rank == 0
            MIGRAPHX_THROW("PARSE_BATCHNORM: rank " + std::to_string(x_lens.size()) +
                           " input tensor, unhandled data format");
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
