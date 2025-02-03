/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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

struct parse_celu : op_parser<parse_celu>
{
    std::vector<op_desc> operators() const { return {{"Celu"}}; }

    instruction_ref parse(const op_desc&,
                          const onnx_parser&,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        float alpha = 1.0;
        if(contains(info.attributes, "alpha"))
        {
            alpha = info.attributes.at("alpha").f();
        }
        if(float_equal(alpha, 0.0f))
        {
            MIGRAPHX_THROW("CELU: alpha is zero (division by zero)");
        }

        auto input_lens = args[0]->get_shape().lens();
        auto input_type = args[0]->get_shape().type();
        if(input_type != migraphx::shape::float_type)
        {
            MIGRAPHX_THROW("CELU: input tensor not float type");
        }
        auto zero_lit = info.add_instruction(
            migraphx::make_op("multibroadcast", {{"out_lens", input_lens}}),
            info.add_literal(migraphx::literal{migraphx::shape{input_type}, {0.}}));
        auto one_lit = info.add_instruction(
            migraphx::make_op("multibroadcast", {{"out_lens", input_lens}}),
            info.add_literal(migraphx::literal{migraphx::shape{input_type}, {1.}}));
        auto alpha_lit = info.add_instruction(
            migraphx::make_op("multibroadcast", {{"out_lens", input_lens}}),
            info.add_literal(migraphx::literal{migraphx::shape{input_type}, {alpha}}));
        auto linear_part = info.add_instruction(migraphx::make_op("max"), zero_lit, args[0]);
        auto divi        = info.add_instruction(migraphx::make_op("div"), args[0], alpha_lit);
        auto expo        = info.add_instruction(migraphx::make_op("exp"), divi);
        auto sub         = info.add_instruction(migraphx::make_op("sub"), expo, one_lit);
        auto mul         = info.add_instruction(migraphx::make_op("mul"), alpha_lit, sub);
        auto exp_part    = info.add_instruction(migraphx::make_op("min"), zero_lit, mul);
        return info.add_instruction(migraphx::make_op("add"), linear_part, exp_part);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
