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
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/stringutils.hpp>
#include <unordered_set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void dead_code_elimination::apply(program& p) const { p.remove_unused_modules(); }

void dead_code_elimination::apply(module& m) const
{
    auto last = std::prev(m.end());
    for(auto ins : iterator_for(m))
    {
        // Skip the first instruction, since we always process the previous
        // instruction
        if(ins == m.begin())
            continue;
        const auto i = std::prev(ins);
        // Skip the last instruction
        if(i == last)
            break;
        // Skip instruction with empty shape as output unless its [dynamic, builtin, undefined,
        // identity, allocate or tuple_type]
        if((not i->get_shape().dynamic() and
            (i->get_shape().elements() == 0 and
             i->get_shape().type() != migraphx::shape::tuple_type)) and
           not(i->name().front() == '@') and not contains({"identity", "allocate"}, i->name()) and
           not i->is_undefined())
            continue;
        assert(std::distance(m.begin(), i) <= std::distance(m.begin(), last));
        std::unordered_set<instruction_ref> visited;
        fix([&](auto self, auto leaf) {
            if(not m.has_instruction(leaf))
                return;

            if(leaf->outputs().empty())
            {
                // Dont visit inputs twice
                if(not visited.insert(leaf).second)
                    return;
                std::unordered_set<instruction_ref> args(leaf->inputs().begin(),
                                                         leaf->inputs().end());
                leaf->clear_arguments();
                assert(std::distance(m.begin(), leaf) < std::distance(m.begin(), last));
                assert(leaf != ins);
                if(leaf->name() != "@param")
                    m.move_instruction(leaf, m.end());
                for(auto arg : args)
                    self(arg);
            }
        })(i);
    }
    m.remove_instructions(std::next(last), m.end());
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
