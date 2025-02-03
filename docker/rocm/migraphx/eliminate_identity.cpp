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
#include <migraphx/eliminate_identity.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/stringutils.hpp>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void eliminate_identity::apply(module& m) const
{
    auto last = std::prev(m.end());
    for(auto ins : iterator_for(m))
    {
        // Skip the first instruction, since we always process the previous
        // instruction
        if(ins == m.begin())
            continue;
        const auto i = std::prev(ins);

        if(i->name() == "identity")
        {
            m.replace_instruction(i, i->inputs().front());
            m.move_instruction(i, m.end());
        }
        if(ins == last)
        {
            if(ins->name() == "identity")
            {
                const instruction_ref& identity_input = ins->inputs().front();
                if(identity_input->outputs().size() == 1)
                {
                    m.move_instruction(identity_input, last);
                    // since this is the last instruction, removing it only
                    // requires changing "last" and calling remove below
                    last = std::prev(last);
                }
            }
            break;
        }
    }
    m.remove_instructions(std::next(last), m.end());
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
