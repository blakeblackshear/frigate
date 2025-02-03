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
#include <migraphx/eliminate_data_type.hpp>
#include <migraphx/module.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void insert_convert_to_supported_type(module& m,
                                      instruction_ref ins,
                                      migraphx::shape::type_t target_type,
                                      std::set<migraphx::shape::type_t> unsupported_types)
{
    migraphx::shape::type_t orig_type   = ins->get_shape().type();
    std::vector<instruction_ref> inputs = ins->inputs();
    std::transform(inputs.begin(), inputs.end(), inputs.begin(), [&](const auto& i) {
        if(contains(unsupported_types, i->get_shape().type()))
        {
            return m.insert_instruction(
                ins,
                migraphx::make_op("convert", {{"target_type", migraphx::to_value(target_type)}}),
                i);
        }
        else
        {
            return i;
        }
    });
    // if no change
    if(inputs == ins->inputs())
        return;
    auto op         = ins->get_operator();
    auto attributes = op.attributes();
    if(attributes.contains("general_data_type"))
    {
        op = make_op(attributes["general_data_type"].to<std::string>(), op.to_value());
    }
    auto new_ins = m.insert_instruction(ins, op, inputs);
    if(orig_type == shape::tuple_type)
    {
        auto orig_outs = ins->outputs();
        if(not std::all_of(orig_outs.begin(), orig_outs.end(), [&](const auto out_ins) {
               return out_ins->name() == "get_tuple_elem";
           }))
            MIGRAPHX_THROW(
                "eliminate_data_type: Instruction with tuple output doesn't have all its "
                "usages as get_tuple_elem instruction");

        std::transform(
            orig_outs.begin(), orig_outs.end(), orig_outs.begin(), [&](const auto out_ins) {
                auto gte_ins       = m.insert_instruction(ins, out_ins->get_operator(), new_ins);
                auto orig_out_type = out_ins->get_shape().type();
                if(contains(unsupported_types, orig_out_type))
                {
                    auto gte_convert = m.insert_instruction(
                        ins, make_op("convert", {{"target_type", orig_out_type}}), gte_ins);
                    return m.replace_instruction(out_ins, gte_convert);
                }
                else
                {
                    return m.replace_instruction(out_ins, gte_ins);
                }
            });
    }
    else
    {
        auto convert_back_ins = m.insert_instruction(
            ins,
            migraphx::make_op("convert", {{"target_type", migraphx::to_value(orig_type)}}),
            new_ins);
        m.replace_instruction(ins, convert_back_ins);
    }
}

void eliminate_data_type::apply(module& m) const
{
    static const std::vector<std::string> skip_op_names = {"convert",
                                                           "get_tuple_elem",
                                                           "if",
                                                           "loop",
                                                           "roialign",
                                                           "nonmaxsuppression",
                                                           "scatternd_add",
                                                           "scatternd_mul",
                                                           "scatternd_none",
                                                           "select_module"};
    if(unsupported_types.empty())
        return;

    for(auto ins : iterator_for(m))
    {
        if(ins->name()[0] == '@')
            continue;
        if(contains(skip_op_names, ins->name()) and not contains(unsupported_ops, ins->name()))
            continue;
        if(contains(unsupported_ops, "all") or contains(unsupported_ops, ins->name()))
            insert_convert_to_supported_type(m, ins, target_type, unsupported_types);
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
