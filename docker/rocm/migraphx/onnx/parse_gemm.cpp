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
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_gemm : op_parser<parse_gemm>
{
    std::vector<op_desc> operators() const { return {{"Gemm"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        auto a_arg = args[0];
        auto b_arg = args[1];
        if(a_arg->get_shape().ndim() != 2 or b_arg->get_shape().ndim() != 2)
        {
            MIGRAPHX_THROW("PARSE_GEMM: A and B should be rank 2, A is rank " +
                           std::to_string(a_arg->get_shape().ndim()) + ", B is rank " +
                           std::to_string(b_arg->get_shape().ndim()));
        }

        float alpha  = 1.0f;
        float beta   = 1.0f;
        bool trans_a = false;
        bool trans_b = false;
        if(contains(info.attributes, "alpha"))
        {
            alpha = parser.parse_value(info.attributes.at("alpha")).at<float>();
        }
        if(contains(info.attributes, "beta"))
        {
            beta = parser.parse_value(info.attributes.at("beta")).at<float>();
        }
        if(contains(info.attributes, "transA"))
        {
            trans_a = parser.parse_value(info.attributes.at("transA")).at<bool>();
        }
        if(contains(info.attributes, "transB"))
        {
            trans_b = parser.parse_value(info.attributes.at("transB")).at<bool>();
        }

        std::vector<int64_t> perm = {1, 0};
        auto dot_type             = a_arg->get_shape().type();
        if(alpha != 1.0f)
        {
            auto alpha_literal = info.add_literal(alpha);
            a_arg              = info.add_broadcastable_binary_op("mul", alpha_literal, a_arg);

            if(a_arg->get_shape().type() != dot_type)
            {
                a_arg =
                    info.add_instruction(make_op("convert", {{"target_type", dot_type}}), a_arg);
            }
        }

        a_arg = (trans_a)
                    ? info.add_instruction(make_op("transpose", {{"permutation", perm}}), a_arg)
                    : a_arg;
        b_arg = (trans_b)
                    ? info.add_instruction(make_op("transpose", {{"permutation", perm}}), args[1])
                    : args[1];

        auto dot_ins = info.add_instruction(make_op("dot"), a_arg, b_arg);

        if(args.size() == 3)
        {
            if(not float_equal(beta, 0.0f))
            {
                auto c_arg = args[2];
                if(dot_ins->get_shape().dynamic())
                {
                    c_arg = info.add_instruction(make_op("multibroadcast"), args[2], dot_ins);
                }
                else
                {
                    auto out_lens   = a_arg->get_shape().lens();
                    out_lens.back() = b_arg->get_shape().lens().back();
                    auto c_lens     = c_arg->get_shape().lens();
                    if(not std::equal(
                           out_lens.begin(), out_lens.end(), c_lens.begin(), c_lens.end()))
                    {
                        c_arg = info.add_instruction(
                            make_op("multibroadcast", {{"out_lens", out_lens}}), args[2]);
                    }
                }

                if(not float_equal(beta, 1.0f))
                {
                    auto beta_literal = info.add_literal(beta);
                    c_arg = info.add_broadcastable_binary_op("mul", c_arg, beta_literal);
                    if(c_arg->get_shape().type() != dot_type)
                    {
                        c_arg = info.add_instruction(
                            make_op("convert", {{"target_type", dot_type}}), c_arg);
                    }
                }

                return info.add_instruction(make_op("add"), dot_ins, c_arg);
            }
        }
        return dot_ins;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
