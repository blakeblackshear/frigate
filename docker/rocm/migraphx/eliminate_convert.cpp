/*
 * The MIT License (MIT)
 ,*
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
#include <migraphx/eliminate_convert.hpp>
#include <migraphx/module.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/matcher.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/**
 * Matches with some sequence of sequential convert instructions.
 * If input to the sequence of converts has the same shape as the last convert,
 * replace last convert with the input.
 * If input to the sequence is not the same shape as the last convert,
 * replace last convert with convert from the input to the last shape.
 */
struct find_nested_convert
{
    auto matcher() const { return match::name("convert")(match::arg(0)(match::name("convert"))); }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto matched_ins  = mr.result;
        auto prev_convert = matched_ins->inputs().front();
        auto input        = prev_convert->inputs().front();
        while(input->name() == "convert")
        {
            input = input->inputs().front();
        }
        if(matched_ins->get_shape() == input->get_shape())
        {
            m.replace_instruction(matched_ins, input);
        }
        else
        {
            m.replace_instruction(matched_ins, matched_ins->get_operator(), input);
        }
    }
};

struct find_nop_converts
{
    auto matcher() const { return match::name("convert")(match::same_shape(match::arg(0))); }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins = mr.result;
        m.replace_instruction(ins, ins->inputs().front());
    }
};

void eliminate_convert::apply(module& m) const
{
    match::find_matches(m, find_nested_convert{}, find_nop_converts{});
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
