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
#include <migraphx/float_equal.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/quantize_int4.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/target.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

static void int4_quantize_module(module& m)
{
    std::vector<std::string> int4_instrs{"dot", "convolution"};

    for(auto ins : iterator_for(m))
    {
        if(not(contains(int4_instrs, ins->name())))
            continue;

        if(ins->inputs().empty())
            continue;

        auto s = ins->get_shape();

        auto mod_inputs = ins->module_inputs();

        // Convert each of the inputs that are fp32 or fp16 to int4
        auto inputs = ins->inputs();
        std::transform(inputs.begin(), inputs.end(), inputs.begin(), [&](auto inp) {
            auto sh = inp->get_shape();
            if(sh.broadcasted())
                return inp;
            auto input_type = sh.type();
            if(input_type != shape::float_type and input_type != shape::half_type)
                return inp;
            auto lens = sh.lens();
            if(lens[lens.size() - 1] % 2)
                return inp; // even sized dimensions to pack

            if(not inp->can_eval())
                return inp;

            std::vector<float> val;
            inp->eval().visit([&](auto in_data) { val.assign(in_data.begin(), in_data.end()); });

            auto [min, max] = std::minmax_element(val.begin(), val.end());
            *min            = *min > 0 ? 0 : *min;
            *max            = *max < 0 ? 0 : *max;
            float fscale4   = (*max - *min) / 15; // INT4 range is [0-15]
            int zp4         = float_equal(fscale4, 0) ? 0 : std::round(-*min / fscale4);

            auto scale = m.add_literal(literal({s.type()}, {fscale4}));
            scale =
                m.insert_instruction(ins, make_op("multibroadcast", {{"out_lens", lens}}), scale);
            auto zp = m.add_literal(literal{{shape::uint8_type}, {zp4}});
            zp = m.insert_instruction(ins, make_op("multibroadcast", {{"out_lens", lens}}), zp);
            auto q_in = m.insert_instruction(ins, make_op("quantizelinear"), inp, scale, zp);

            auto pk   = m.insert_instruction(ins, make_op("pack_int4", {{"axis", -1}}), q_in);
            auto unpk = m.insert_instruction(ins, make_op("unpack_int4", {{"axis", -1}}), pk);

            auto dq_scale = m.add_literal(literal({s.type()}, {fscale4}));
            dq_scale      = m.insert_instruction(
                ins, make_op("multibroadcast", {{"out_lens", lens}}), dq_scale);

            auto dq_zp = m.add_literal(literal{{shape::uint8_type}, {zp4}});
            dq_zp =
                m.insert_instruction(ins, make_op("multibroadcast", {{"out_lens", lens}}), dq_zp);

            return m.insert_instruction(ins, make_op("dequantizelinear"), unpk, dq_scale, dq_zp);
        });

        auto converted_ins = m.insert_instruction(ins, ins->get_operator(), inputs, mod_inputs);
        m.replace_instruction(ins, converted_ins);
    }
}

void quantize_int4_pass::apply(module& m) const { int4_quantize_module(m); }

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
