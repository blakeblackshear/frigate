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

#include <migraphx/fpga/subgraph.hpp>

#include <migraphx/instruction.hpp>
#include "migraphx/iterator.hpp"
#include <migraphx/iterator_for.hpp>
#include "migraphx/make_op.hpp"
#include "migraphx/module.hpp"
#include "migraphx/ranges.hpp"
#include <migraphx/register_op.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/pass_manager.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace fpga {

struct fpga_placeholder_op
{
    fpga_placeholder_op() = default;

    int dummy = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.dummy, "dummy"));
    }

    std::string name() const { return "fpga::vitis_placeholder"; }

    shape compute_shape(const std::vector<shape>& inputs, std::vector<module_ref> mods) const
    {
        (void)inputs;
        if(mods.size() != 1)
        {
            MIGRAPHX_THROW("should have one submodule.");
        }
        module_ref sm = mods.front();
        if(sm->get_output_shapes().size() != 1)
            MIGRAPHX_THROW("Only one return");
        return sm->get_output_shapes().front();
    }
};
MIGRAPHX_REGISTER_OP(fpga_placeholder_op)

bool is_fpga_instr(migraphx::instruction_ref it)
{
    // assuming all instructions that aren't @param, @literal, or input data are fpga instrs
    if(migraphx::starts_with(it->name(), "@"))
    {
        return false;
    }
    // no inputs to the instr means it's input data
    if(it->inputs().empty())
    {
        return false;
    }
    return true;
}

void subgraph::apply(module_pass_manager& mpm) const
{
    auto& mod = mpm.get_module();
    auto* pm  = mpm.create_module(mod.name() + ":fpga");
    pm->set_bypass();

    migraphx::instruction_ref first = mod.end();
    migraphx::instruction_ref last;
    std::vector<migraphx::instruction_ref> literal_inputs;
    for(auto it : iterator_for(mod))
    {
        // assuming we want all the params/literals as inputs to the FPGA submodule
        if(migraphx::starts_with(it->name(), "@param") or
           migraphx::starts_with(it->name(), "@literal"))
        {
            literal_inputs.push_back(it);
        }
        if(is_fpga_instr(it))
        {
            if(first == mod.end())
            {
                first = it;
            }
            last = it;
        }
    }

    // TODO(varunsh): this code may be replaceable by code in the fuse_pointwise pass

    // assuming all FPGA instructions are in one contiguous range
    pm->insert_instructions(pm->end(), first, std::next(last), {});
    migraphx::instruction_ref placeholder_ins;
    for(auto it : iterator_for(mod))
    {
        if(migraphx::starts_with(it->name(), "@return"))
        {
            placeholder_ins = mod.insert_instruction(
                it, migraphx::make_op("fpga::vitis_placeholder"), literal_inputs, {pm});
            break;
        }
    }

    mod.replace_return({placeholder_ins});
}

} // namespace fpga
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
