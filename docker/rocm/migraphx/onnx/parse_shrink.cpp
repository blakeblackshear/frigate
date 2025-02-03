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
#include <migraphx/onnx/checks.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_shrink : op_parser<parse_shrink>
{
    std::vector<op_desc> operators() const { return {{"Shrink"}}; }

    instruction_ref parse(const op_desc&,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        float bias = 0.0;
        if(contains(info.attributes, "bias"))
        {
            bias = parser.parse_value(info.attributes.at("bias")).at<float>();
        }
        float lambd = 0.5;
        if(contains(info.attributes, "lambd"))
        {
            lambd = parser.parse_value(info.attributes.at("lambd")).at<float>();
        }

        auto x             = args[0];
        auto x_shape       = x->get_shape();
        auto x_type        = x_shape.type();
        auto lit_bias      = info.add_literal(bias);
        auto lit_neg_lambd = info.add_literal(-lambd);
        auto lit_lambd     = info.add_literal(lambd);

        auto x_plus_bias = info.add_common_op("add", x, lit_bias);
        auto x_min_bias  = info.add_common_op("sub", x, lit_bias);

        auto cond1   = info.add_common_op("less", x, lit_neg_lambd);
        auto cond2_a = info.add_common_op("not", cond1);
        auto cond2_b = info.add_common_op("greater", x, lit_lambd);
        auto cond2   = info.add_common_op("logical_and", cond2_a, cond2_b);

        auto first  = info.add_common_op("mul", cond1, x_plus_bias);
        auto second = info.add_common_op("mul", cond2, x_min_bias);
        auto ret    = info.add_common_op("add", first, second);
        if(ret->get_shape().type() != x_type)
        {
            ret = info.add_instruction(make_op("convert", {{"target_type", x_type}}), ret);
        }
        return ret;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
