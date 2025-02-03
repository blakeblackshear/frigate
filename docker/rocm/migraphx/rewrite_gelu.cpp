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

#include <migraphx/rewrite_gelu.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/match/gelu_erf.hpp>
#include <migraphx/match/gelu_tanh.hpp>
#include <migraphx/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/**
 * The replacement approximation is equivalent to:
 * GELU(x) ~= 0.5 * x * ( 1 + tanh( sqrt(2/M_PI) * (x + 0.044715 * x^3)))
 * You can rearrange to the form used in this by recognizing that
 * 1 + tanh(x) = (2) / (1 + exp(-2 * x)).
 * The fitting constant 0.044715 is from
 * A. Choudhury, ‘A simple approximation to the area under standard normal curve’, Mathematics and
 * Statistics, vol. 2, no. 3, pp. 147–149, 2014.
 */
void replace_with_tanh_exp_gelu(module& m, const match::matcher_result& r)
{
    auto ins      = r.result;
    auto x        = r.instructions["x"];
    double const0 = -2. * sqrt(M_2_PI);
    double const1 = 0.044715 * const0;
    auto lit0     = m.add_literal(literal{shape{x->get_shape().type()}, {const0}});
    auto lit1     = m.add_literal(literal{shape{x->get_shape().type()}, {const1}});
    auto one      = m.add_literal(literal{shape{x->get_shape().type()}, {1.0}});
    auto xb       = insert_common_op(m, ins, make_op("mul"), {x, lit1});
    auto a        = m.insert_instruction(ins, make_op("mul"), x, xb);
    auto b        = insert_common_op(m, ins, make_op("add"), {a, lit0});
    auto u        = m.insert_instruction(ins, make_op("mul"), x, b);
    auto emu      = m.insert_instruction(ins, make_op("exp"), u);
    auto c        = insert_common_op(m, ins, make_op("add"), {one, emu});
    auto y        = m.insert_instruction(ins, make_op("div"), x, c);
    m.replace_instruction(ins, y);
}

/**
 * Finds erfGELU blocks using the Gaussian distribution and replaces them with the tanh_exp
 * approximation if the data type is fp16. TODO consider also for fp8 datatype.
 */
struct find_gelu_erf
{
    auto matcher() const { return match::any_of(match::gelu_erf(), match::gelu_tanh()); }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto x                                          = r.instructions["x"];
        auto input_type                                 = x->get_shape().type();
        std::set<migraphx::shape::type_t> convert_types = {migraphx::shape::half_type};
        if(not contains(convert_types, input_type))
            return;

        replace_with_tanh_exp_gelu(m, r);
    }
};

/**
 * Find tanhGELU blocks and replace them with a rearranged version that is less likely to overflow
 * and is more performant.
 */
struct find_tanh_fast_gelu
{
    auto matcher() const { return match::gelu_tanh(); }

    void apply(module& m, const match::matcher_result& r) const
    {
        replace_with_tanh_exp_gelu(m, r);
    }
};

void rewrite_gelu::apply(module& m) const
{
    if(fast_math)
    {
        match::find_matches(m, find_gelu_erf{});
    }
    else
    {
        match::find_matches(m, find_tanh_fast_gelu{});
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
