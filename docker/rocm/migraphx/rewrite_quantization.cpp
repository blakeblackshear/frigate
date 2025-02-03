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
#include <migraphx/rewrite_quantization.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/tune_axis.hpp>
#include <migraphx/program.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_CK_WORKAROUNDS);

void apply_quantizelinear(module& m, instruction_ref ins)
{
    assert(ins->name() == "quantizelinear");
    auto x       = ins->inputs()[0];
    auto y_scale = ins->inputs()[1];

    if(x->get_shape().type() != y_scale->get_shape().type())
    {
        x = m.insert_instruction(
            ins, make_op("convert", {{"target_type", y_scale->get_shape().type()}}), x);
    }
    auto div            = m.insert_instruction(ins, make_op("div"), x, y_scale);
    auto add_zero_point = m.insert_instruction(ins, make_op("nearbyint"), div);

    if(ins->inputs().size() == 3)
    {
        auto zero_point =
            m.insert_instruction(ins,
                                 make_op("convert", {{"target_type", y_scale->get_shape().type()}}),
                                 ins->inputs()[2]);
        add_zero_point = m.insert_instruction(ins, make_op("add"), add_zero_point, zero_point);
    }

    double max_quant = 0;
    double min_quant = 0;
    ins->get_shape().visit_type([&](auto qt) {
        max_quant = qt.max();
        min_quant = qt.min();
    });
    auto s = add_zero_point->get_shape();
    instruction_ref min_arg;
    instruction_ref max_arg;

    if(enabled(MIGRAPHX_ENABLE_CK_WORKAROUNDS{}))
    {
        std::vector<double> min_data(s.elements(), min_quant);
        std::vector<double> max_data(s.elements(), max_quant);
        min_arg = m.add_literal(literal(s, min_data));
        max_arg = m.add_literal(literal(s, max_data));
    }
    else
    {
        min_arg = m.add_literal(literal{shape{s.type()}, {min_quant}});
        max_arg = m.add_literal(literal{shape{s.type()}, {max_quant}});
    }
    auto saturate = insert_common_op(m, ins, make_op("clip"), {add_zero_point, min_arg, max_arg});
    m.replace_instruction(
        ins, make_op("convert", {{"target_type", ins->get_shape().type()}}), saturate);
}

void apply_dequantizelinear(module& m, instruction_ref ins)
{
    assert(ins->name() == "dequantizelinear");
    auto x_scale = ins->inputs()[1];
    auto x       = m.insert_instruction(
        ins, make_op("convert", {{"target_type", x_scale->get_shape().type()}}), ins->inputs()[0]);

    if(ins->inputs().size() == 3)
    {
        auto x_zero_point =
            m.insert_instruction(ins,
                                 make_op("convert", {{"target_type", x_scale->get_shape().type()}}),
                                 ins->inputs()[2]);
        x = m.insert_instruction(ins, make_op("sub"), x, x_zero_point);
    }

    m.replace_instruction(ins, make_op("mul"), x, x_scale);
}

void rewrite_quantization::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() == "quantizelinear")
        {
            apply_quantizelinear(m, ins);
        }

        else if(ins->name() == "dequantizelinear")
        {
            apply_dequantizelinear(m, ins);
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
