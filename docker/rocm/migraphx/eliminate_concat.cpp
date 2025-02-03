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
#include <iterator>
#include <migraphx/eliminate_concat.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/op/load.hpp>
#include <migraphx/op/identity.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>

#include <migraphx/dfor.hpp>
#include <migraphx/tune_axis.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
void eliminate_concat::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        auto concat_op = concat_opt.get_concat(ins->get_operator());
        // Look for the concat operator
        if(not concat_op.has_value())
            continue;
        // If any inputs are builtin or context free then abort
        // If any inputs are used more than once, then abort since there could
        // be errors due to aliasing
        if(std::any_of(ins->inputs().begin(), ins->inputs().end(), [](auto arg) {
               return arg->name().front() == '@' or
                      (arg->get_operator().is_context_free() and
                       not contains({"concat", "identity"}, arg->name())) or
                      arg->outputs().size() > 1;
           }))
            continue;
        // We can only do this optimization when concat axis is either the leftmost
        // axis OR the sizes to the left of this axis are all equal to 1
        // Since we've already checked that the non-axis dimensions are identical
        // we only need to check the first input
        auto lens              = ins->inputs().front()->get_shape().lens();
        std::size_t axis_index = tune_axis(lens.size(), concat_op->axis, concat_op->name());
        if(axis_index == 0 or
           std::all_of(lens.begin(), lens.begin() + axis_index, [](auto x) { return x == 1; }))
        {
            // Last input should be an allocation
            auto last = ins->inputs().back();
            if(last->name() != concat_opt.allocate())
                continue;
            // Where are the allocations for the tensors to be concatenated?
            std::vector<instruction_ref> allocations;

            std::transform(
                ins->inputs().begin(),
                std::prev(ins->inputs().end()),
                std::back_inserter(allocations),
                [&](instruction_ref x) { return instruction::get_output_alias(x, true); });

            if(std::any_of(allocations.begin(), allocations.end(), [&](auto x) {
                   return x->name() != concat_opt.allocate();
               }))
                continue;

            // Need to sort the allocations, so that we know where to
            // insert the "super"-allocation
            auto sorted_allocations = allocations;
            std::sort(sorted_allocations.begin(),
                      sorted_allocations.end(),
                      [&](instruction_ref x, instruction_ref y) {
                          return std::distance(m.begin(), x) < std::distance(m.begin(), y);
                      });
            // Move "super" allocation to the front
            auto first = sorted_allocations.front();
            auto super = m.move_instruction(last, first);
            // Replace each allocation with a load
            std::size_t offset = 0;
            for(auto alloc : allocations)
            {
                op::load op{alloc->get_shape(), offset};
                m.replace_instruction(alloc, op, {super});
                offset += alloc->get_shape().bytes();
            }
            std::vector<instruction_ref> args = {super};
            std::copy(ins->inputs().begin(), ins->inputs().end() - 1, std::back_inserter(args));
            m.replace_instruction(ins, migraphx::make_op("identity"), args);
        }
    }
}
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
