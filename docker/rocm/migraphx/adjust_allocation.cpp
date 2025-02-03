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
#include <migraphx/adjust_allocation.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/program.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void adjust_allocation::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        // skip instruction with no input
        if(ins->inputs().empty())
            continue;

        // Skip target-independent operators
        if(ins->get_operator().is_context_free())
            continue;

        auto alias_ins = instruction::get_output_alias(ins, true);
        if(alias_ins->name() != model.name() and alias_ins->name() != "@param")
            continue;
        // shape allocated is different from actual shape
        // of the instruction, reallocate and replace the previous one
        if(alias_ins->get_shape() == ins->get_shape())
            continue;
        auto alloc_ins = m.insert_instruction(ins, model.allocate(ins->get_shape()));
        m.replace_instruction(alias_ins, alloc_ins);
        // If the memory is an output parameter then copy the memory to the parameter
        if(alias_ins->name() == "@param")
        {
            auto copy = m.insert_instruction(std::next(ins), make_op(model.copy()), ins, alias_ins);
            auto tail = range(std::next(copy), m.end());
            for(auto i : iterator_for(tail))
            {
                if(contains(i->inputs(), ins))
                    instruction::replace_argument(i, ins, copy);
            }
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
