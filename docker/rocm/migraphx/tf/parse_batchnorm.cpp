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
#include <migraphx/tf/op_parser.hpp>
#include <migraphx/tf/tf_parser.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace tf {

struct parse_batchnorm : op_parser<parse_batchnorm>
{
    bool transpose() const { return true; }
    std::vector<op_desc> operators() const { return {{"FusedBatchNorm"}, {"FusedBatchNormV3"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const tf_parser& /*parser*/,
                          tf_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        // different default epsilon than from ONNX
        float epsilon = 1e-4f;
        if(contains(info.attributes, "epsilon"))
        {
            epsilon = info.attributes.at("epsilon").f();
        }

        auto x_lens = args[0]->get_shape().lens();
        auto x_type = args[0]->get_shape().type();

        // unsqueeze tensors of shape (C) to broadcast correctly
        auto eps = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {epsilon}});

        auto scale_unsqueeze =
            info.add_instruction(migraphx::make_op("unsqueeze", {{"axes", {1, 2}}}), args[1]);
        auto bias_unsqueeze =
            info.add_instruction(migraphx::make_op("unsqueeze", {{"axes", {1, 2}}}), args[2]);
        auto mean_unsqueeze =
            info.add_instruction(migraphx::make_op("unsqueeze", {{"axes", {1, 2}}}), args[3]);
        auto var_unsqueeze =
            info.add_instruction(migraphx::make_op("unsqueeze", {{"axes", {1, 2}}}), args[4]);

        auto x_sub_mean = info.add_broadcastable_binary_op("sub", args[0], mean_unsqueeze);
        auto var_eps    = info.add_broadcastable_binary_op("add", var_unsqueeze, eps);
        auto rsqrt      = info.add_instruction(make_op("rsqrt"), var_eps);
        auto mul0       = info.add_broadcastable_binary_op("mul", scale_unsqueeze, rsqrt);
        auto r0         = info.add_broadcastable_binary_op("mul", x_sub_mean, mul0);
        return info.add_broadcastable_binary_op("add", r0, bias_unsqueeze);
    }
};

} // namespace tf
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
