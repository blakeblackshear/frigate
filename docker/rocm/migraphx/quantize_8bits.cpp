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
#include <migraphx/operation.hpp>
#include <migraphx/float_equal.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/quantization.hpp>
#include <migraphx/quantize_8bits.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/op/capture.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/target.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/pass_manager.hpp>
#include <numeric>
#include <set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

static std::vector<shape::type_t>& get_quantizable_type()
{
    static std::vector<shape::type_t> quantable_types = {
        shape::float_type, shape::double_type, shape::half_type};
    return quantable_types;
}

void quantize_8bits_pass::apply(module& m) const // NOLINT
{
    const auto& quantizable_types = get_quantizable_type();
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "capture")
            continue;

        auto op_val = ins->get_operator().to_value();
        assert(op_val.contains("ins_index"));

        auto param_index = op_val.at("ins_index").to<std::size_t>();
        auto param       = quant_params[param_index];

        auto input = ins->inputs().front();
        auto s     = input->get_shape();
        if(contains(quantizable_types, s.type()) and s.type() != precision)
        {
            auto zero_point =
                m.add_literal(migraphx::literal{migraphx::shape{precision}, {param.second}});
            auto scale       = m.add_literal(literal({s.type()}, {1.0f / param.first}));
            const auto& lens = s.lens();
            scale =
                m.insert_instruction(ins, make_op("multibroadcast", {{"out_lens", lens}}), scale);
            zero_point = m.insert_instruction(
                ins, make_op("multibroadcast", {{"out_lens", lens}}), zero_point);
            auto q_in =
                m.insert_instruction(ins, make_op("quantizelinear"), input, scale, zero_point);
            auto dq_in =
                m.insert_instruction(ins, make_op("dequantizelinear"), q_in, scale, zero_point);
            m.replace_instruction(ins, dq_in);
        }
    }
}

void capture_arguments_pass::apply(module& m) const // NOLINT
{
    assert(param_index != nullptr);
    const auto& quantizable_types = get_quantizable_type();

    for(auto ins : iterator_for(m))
    {
        if((not contains(ins_names, ins->name())) or (ins->name() == "convert"))
        {
            continue;
        }

        auto inputs = ins->inputs();
        std::vector<instruction_ref> new_args;
        for(auto input : inputs)
        {
            if(contains(quantizable_types, input->get_shape().type()))
            {
                auto new_in = m.insert_instruction(ins, op::capture{(*param_index)++, f}, input);
                new_args.push_back(new_in);
            }
            else
            {
                new_args.push_back(input);
            }
        }
        m.replace_instruction(ins, ins->get_operator(), new_args);
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
