/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/inline_module.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/iterator_for.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

static void inline_submodule(module& m, instruction_ref ins, bool cond)
{
    const auto& mod_inputs = ins->module_inputs();
    module_ref smod        = cond ? mod_inputs.at(0) : mod_inputs.at(1);
    auto mod_outputs       = m.insert_instructions(ins, smod);

    auto ins_outputs = ins->outputs();
    assert(mod_outputs.size() >= ins_outputs.size());
    for(const auto& out : ins_outputs)
    {
        auto val = out->get_operator().to_value();
        assert(val.contains("index"));
        auto index = val.at("index").to<std::size_t>();
        m.replace_instruction(out, mod_outputs.at(index));
    }
}

void inline_module::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "if")
            continue;

        auto arg_cond = ins->inputs().front()->eval();
        if(not arg_cond.empty())
        {
            bool cond = arg_cond.at<bool>();
            inline_submodule(m, ins, cond);
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
