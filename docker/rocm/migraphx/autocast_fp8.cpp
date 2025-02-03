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
#include <migraphx/autocast_fp8.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/program.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/fp8_types.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void autocast_fp8_pass::apply(module& m) const
{
    std::vector<instruction_ref> remove_parameters;
    for(auto ins : iterator_for(m))
    {
        const auto& ins_name = ins->name();
        if(ins_name == "@param" and contains(fp8_types{}.get(), ins->get_shape().type()))
        {
            shape::type_t fp8_type    = ins->get_shape().type();
            migraphx::shape new_shape = ins->get_shape().with_type(target_type);
            std::string param_name = ins->get_operator().to_value()["parameter"].to<std::string>();
            m.rename_parameter(ins, param_name + "_old");
            auto new_param = m.add_parameter(param_name, new_shape);
            auto new_ins   = m.insert_instruction(
                ins,
                migraphx::make_op("convert", {{"target_type", migraphx::to_value(fp8_type)}}),
                new_param);
            m.replace_instruction(ins, new_ins);
            remove_parameters.push_back(ins);
        }

        if(ins_name == "@return")
        {
            std::vector<instruction_ref> inputs = ins->inputs();
            std::vector<instruction_ref> new_inputs;
            std::transform(
                inputs.begin(), inputs.end(), std::back_inserter(new_inputs), [&](auto i) {
                    if(contains(fp8_types{}.get(), i->get_shape().type()))
                    {
                        return m.insert_instruction(
                            ins,
                            migraphx::make_op("convert",
                                              {{"target_type", migraphx::to_value(target_type)}}),
                            i);
                    }
                    else
                        return i;
                });
            m.replace_return({new_inputs});
        }
    }
    // Remove unused parameters with fp8 type
    for(const auto& i : remove_parameters)
        m.remove_instruction(i);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
