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
#include <migraphx/pass_manager.hpp>
#include <migraphx/replace_allocate.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/program.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/op/allocate.hpp>
#include <map>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

std::unordered_map<instruction_ref, std::string> create_output_names(const module& mod)
{
    std::unordered_map<instruction_ref, std::string> mod_output_names{};
    auto last = std::prev(mod.end());
    if(last->name() == "@return")
    {
        const auto& prog_outputs = last->inputs();
        std::vector<instruction_ref> outputs_alias(prog_outputs.size());

        std::transform(prog_outputs.begin(),
                       prog_outputs.end(),
                       outputs_alias.begin(),
                       [](const auto& i) { return instruction::get_output_alias(i); });

        std::size_t index = 0;
        for(auto ins : outputs_alias)
        {
            mod_output_names[ins] = mod.name() + ":#output_" + std::to_string(index++);
        }
    }
    else
    {
        auto ins              = instruction::get_output_alias(last);
        mod_output_names[ins] = "output";
    }
    return mod_output_names;
}

void insert_submod_allocations(instruction_ref ins, module& mod, const allocation_model& model)
{
    std::vector<instruction_ref> inputs = ins->inputs();
    std::vector<module_ref> mod_args    = ins->module_inputs();

    std::map<std::string, shape> name_shapes;
    for(const auto& smod : mod_args)
    {
        auto ps = smod->get_parameter_shapes();
        name_shapes.insert(ps.begin(), ps.end());
    }

    for(const auto& pn : name_shapes)
    {
        const auto& s = pn.second;
        instruction_ref output{};
        output = mod.insert_instruction(ins, model.allocate(s));
        inputs.push_back(output);
    }

    mod.replace_instruction(ins, ins->get_operator(), inputs, mod_args);
}

void replace_allocate::apply(module_pass_manager& mpm) const
{
    module& m              = mpm.get_module();
    auto mod_output_names  = create_output_names(m);
    bool root_offload_copy = (*mpm.get_root_module() == m) ? this->offload_copy : false;
    for(auto ins : iterator_for(m))
    {
        auto op      = ins->get_operator();
        auto op_name = op.name();

        // check if allocations from submodules need to be inserted
        // for now, only the "if" operator is affected
        if(op_name == "if")
        {
            insert_submod_allocations(ins, m, model);
            continue;
        }
        if(op_name != "allocate")
            continue;

        auto s = ins->get_shape();
        if(not root_offload_copy and model.needs_out_params() and contains(mod_output_names, ins))
        {
            auto out_param = m.add_parameter(mod_output_names[ins], s);
            m.replace_instruction(ins, out_param);
        }
        else
        {
            m.replace_instruction(ins,
                                  make_op(model.name(), migraphx::value{{"shape", to_value(s)}}));
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
