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
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_selu : op_parser<parse_selu>
{
    std::vector<op_desc> operators() const { return {{"Selu"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& /*parser*/,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        auto type   = args[0]->get_shape().type();
        auto lens   = args[0]->get_shape().lens();
        float alpha = 1.67326f;
        if(contains(info.attributes, "alpha"))
        {
            alpha = info.attributes.at("alpha").f();
        }

        float gamma = 1.0507f;
        if(contains(info.attributes, "gamma"))
        {
            gamma = info.attributes.at("gamma").f();
        }

        auto l_alpha = info.add_literal({{type, {1}}, {alpha}});
        auto l_gamma = info.add_literal({{type, {1}}, {gamma / 2.0f}});
        if(lens != std::vector<std::size_t>{1})
        {
            l_alpha =
                info.add_instruction(make_op("multibroadcast", {{"out_lens", lens}}), l_alpha);
            l_gamma =
                info.add_instruction(make_op("multibroadcast", {{"out_lens", lens}}), l_gamma);
        }

        auto sign_x = info.add_instruction(make_op("sign"), args[0]);
        auto exp_x  = info.add_instruction(make_op("exp"), args[0]);

        auto alpha_ex  = info.add_instruction(make_op("mul"), l_alpha, exp_x);
        auto aex_alpha = info.add_instruction(make_op("sub"), alpha_ex, l_alpha);

        auto ins1 = info.add_instruction(make_op("add"), aex_alpha, args[0]);
        auto ins2 = info.add_instruction(make_op("sub"), aex_alpha, args[0]);

        auto sign2   = info.add_instruction(make_op("mul"), sign_x, ins2);
        auto ins_sub = info.add_instruction(make_op("sub"), ins1, sign2);

        return info.add_instruction(make_op("mul"), ins_sub, l_gamma);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
