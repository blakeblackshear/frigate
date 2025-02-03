/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/common.hpp>
#include <migraphx/apply_alpha_beta.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

instruction_ref insert_apply_alpha_beta(module& m,
                                        instruction_ref pos,
                                        const std::vector<instruction_ref>& args,
                                        const operation& op,
                                        const literal& alpha,
                                        const literal& beta)
{
    auto a          = args[0];
    auto b          = args[1];
    auto input_type = a->get_shape().type();
    if(not float_equal(alpha.at<float>(0), 1.0))
    {
        auto alpha_literal = m.add_literal(alpha);
        a                  = insert_common_op(m, pos, migraphx::make_op("mul"), {alpha_literal, a});
        if(a->get_shape().type() != input_type)
        {
            a = m.insert_instruction(pos, make_op("convert", {{"target_type", input_type}}), a);
        }
    }
    auto op_res = m.insert_instruction(pos, op, a, b);
    if(args.size() == 3)
    {
        if(not float_equal(beta.at<float>(0), 0.0) and args[2]->get_shape().elements() > 0)
        {
            auto out_lens = op_res->get_shape().lens();
            auto c        = args[2];
            auto c_lens   = c->get_shape().lens();
            input_type    = c->get_shape().type();
            if(out_lens != c_lens)
            {
                c = m.insert_instruction(
                    pos, migraphx::make_op("multibroadcast", {{"out_lens", out_lens}}), args[2]);
            }
            auto beta_literal = m.add_literal(beta);
            auto beta_c = insert_common_op(m, pos, migraphx::make_op("mul"), {c, beta_literal});
            if(beta_c->get_shape().type() != input_type)
            {
                beta_c = m.insert_instruction(
                    pos, migraphx::make_op("convert", {{"target_type", input_type}}), beta_c);
            }
            return m.insert_instruction(pos, migraphx::make_op("add"), op_res, beta_c);
        }
    }
    return op_res;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
