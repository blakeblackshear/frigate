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
#include <migraphx/eliminate_common_subexpression.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/functional.hpp>

#include <unordered_set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class Range>
void cse_range(module& m, Range&& r)
{
    std::unordered_multimap<std::string, instruction_ref> instructions;
    std::unordered_set<instruction_ref> processed_ins;
    for(auto ins : r)
    {
        // Skip dead instructions
        if(ins->outputs().empty())
            continue;

        // Find instruction with the same name
        auto found_instructions = range(instructions.equal_range(ins->name()));
        for(const auto& pp : found_instructions)
        {
            auto eq = pp.second;
            if(contains(processed_ins, eq))
                continue;
            if(*eq != *ins)
                continue;
            m.replace_instruction(ins, eq);
            processed_ins.emplace(ins);
            std::vector<instruction_ref> outputs;
            std::copy_if(eq->outputs().begin(),
                         eq->outputs().end(),
                         std::back_inserter(outputs),
                         [&](auto x) { return m.has_instruction(x); });

            std::sort(outputs.begin(), outputs.end(), [&](auto x, auto y) {
                return std::distance(eq, x) < std::distance(eq, y);
            });
            cse_range(m, outputs);
        }
        instructions.emplace(ins->name(), ins);
    }
}

void eliminate_common_subexpression::apply(module& m) const { cse_range(m, iterator_for(m)); }

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
