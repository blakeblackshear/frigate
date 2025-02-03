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

#include <migraphx/rewrite_low_precision.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct find_pow2_div
{

    auto pow2() const
    {
        auto pow2 = match::name("pow")(match::arg(0)(match::any().bind("x")),
                                       match::arg(1)(match::has_value(2.0f)));
        auto x_square =
            match::name("mul")(match::same_inputs(), match::arg(0)(match::any().bind("x")));
        return match::any_of(pow2, x_square);
    }

    auto matcher() const
    {
        return match::name("div")(match::arg(0)(pow2()),
                                  match::arg(1)(match::is_constant().bind("n")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins = r.result;
        auto n   = r.instructions["n"];
        auto x   = r.instructions["x"];

        if(x->get_shape().type() != migraphx::shape::half_type)
            return;
        auto x_div_n = m.insert_instruction(ins, make_op("div"), {x, n});
        auto mul     = m.insert_instruction(ins, make_op("mul"), {x_div_n, x});
        m.replace_instruction(ins, mul);
    }
};

void rewrite_low_precision::apply(module& m) const { match::find_matches(m, find_pow2_div{}); }

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
