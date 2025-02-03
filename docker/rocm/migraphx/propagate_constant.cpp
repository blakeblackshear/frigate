/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/propagate_constant.hpp>
#include <migraphx/program.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/simple_par_for.hpp>
#include <migraphx/env.hpp>
#include <thread>
#include <unordered_set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_PROPAGATE_CONSTANT)

bool skip_propagate(instruction_ref ins)
{
    if(contains({"contiguous", "dequantizelinear", "reshape"}, ins->name()))
        return skip_propagate(ins->inputs().front());
    if(ins->name() == "unpack_int4")
        return true;
    auto&& s = ins->get_shape();
    if(s.broadcasted() and s.element_space() < s.elements())
        return true;
    auto alias = instruction::get_output_alias(ins, true);
    if(alias != ins)
        return skip_propagate(alias);
    if(ins->is_undefined())
        return true;
    return false;
}

bool is_const_ins(instruction_ref ins, const std::unordered_set<std::string>& skip_ops)
{
    return ins->can_eval() and not skip_propagate(ins) and
           skip_ops.find(ins->name()) == skip_ops.end();
}

argument as_packed(const argument& c)
{
    if(c.get_shape().packed())
        return c;
    auto s = c.get_shape().with_lens(c.get_shape().lens());
    argument result;
    c.visit([&](auto x) { result = literal{s, x.begin(), x.end()}.get_argument(); });
    return result;
}

void propagate_constant::apply(module& m) const
{
    std::unordered_set<instruction_ref> const_instrs;
    auto last = std::prev(m.end());

    // Find instructions that can be evaluated to a literal
    for(auto i : iterator_for(m))
    {
        const bool is_const = is_const_ins(i, skip_ops);
        if(is_const and i != last)
            continue;

        if(i == last and is_const)
        {
            const_instrs.insert(i);
        }
        else
        {
            std::copy_if(i->inputs().begin(),
                         i->inputs().end(),
                         std::inserter(const_instrs, const_instrs.begin()),
                         [&](const instruction_ref ins) {
                             return is_const_ins(ins, skip_ops) and ins->name() != "@literal";
                         });
        }
    }

    // Compute literals in parallel
    std::vector<instruction_ref> const_instrs_vec{const_instrs.begin(), const_instrs.end()};
    std::vector<argument> literals(const_instrs_vec.size());
    std::size_t grainsize = 1;
#if !MIGRAPHX_HAS_EXECUTORS
    std::size_t n = std::max<std::size_t>(2048 / std::thread::hardware_concurrency(), 1);
    grainsize     = const_instrs_vec.size() / n;
#endif
    simple_par_for(const_instrs_vec.size(), grainsize, [&](const auto i) {
        literals[i] = as_packed(const_instrs_vec[i]->eval());
    });

    // Replace instructions in m
    for(size_t i = 0; i < const_instrs_vec.size(); i++)
    {
        if(not literals[i].empty())
        {
            if(enabled(MIGRAPHX_TRACE_PROPAGATE_CONSTANT{}))
            {
                std::cout << "Constant replace: " << std::endl;
                std::vector<instruction_ref> inss;
                fix([&](auto self, auto ins) {
                    if(contains(inss, ins))
                        return;
                    for(auto input : ins->inputs())
                        self(input);
                    inss.push_back(ins);
                })(const_instrs_vec[i]);
                m.debug_print(inss);
            }
            assert(literals[i].get_shape().lens() == const_instrs_vec[i]->get_shape().lens());
            assert(literals[i].get_shape().bytes() <= const_instrs_vec[i]->get_shape().bytes());
            auto l = m.add_literal(literals[i].get_shape(), literals[i].data());
            m.replace_instruction(const_instrs_vec[i], l);
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
