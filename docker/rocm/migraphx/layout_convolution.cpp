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
#include <migraphx/layout_convolution.hpp>
#include <migraphx/module.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/permutation.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/eliminate_contiguous.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace {
std::vector<int64_t> get_permutation(instruction_ref ins, const layout_convolution& lc)
{
    if(lc.channels_last)
    {
        std::vector<int64_t> perm(ins->get_shape().ndim());
        std::iota(perm.begin() + 1, perm.end() - 1, 2);
        perm.back() = 1;
        return perm;
    }
    return find_permutation(ins->inputs().front()->get_shape());
}

bool skip_layout(const shape& s)
{
    return s.ndim() == 1 or s.dynamic() or s.type() == shape::tuple_type;
}

void preserve_output_layout(module& m)
{
    auto last = std::prev(m.end());
    if(last->name() == "@return")
    {
        std::vector<instruction_ref> outputs;
        std::transform(last->inputs().begin(),
                       last->inputs().end(),
                       std::back_inserter(outputs),
                       [&](instruction_ref ins) {
                           if(skip_layout(ins->get_shape()))
                               return ins;
                           auto permutation = find_permutation(ins->get_shape());
                           return m.insert_instruction(
                               last, make_op("layout", {{"permutation", permutation}}), ins);
                       });
        m.replace_return(outputs);
    }
    else if(not skip_layout(last->get_shape()))
    {
        auto permutation = find_permutation(last->get_shape());
        m.add_instruction(make_op("layout", {{"permutation", permutation}}), last);
    }
}

void transform_convolutions(module& m, const layout_convolution& lc)
{
    for(auto ins : iterator_for(m))
    {
        if(not contains({"convolution", "quant_convolution"}, ins->name()))
            continue;
        if(ins->get_shape().dynamic())
            continue;
        if(ins->get_shape().lens().size() != 4)
            continue;
        auto v = ins->get_operator().to_value();
        if(v.at("group").to<int>() > 1)
            continue;
        auto args = ins->inputs();
        auto perm = get_permutation(ins, lc);
        std::transform(args.begin(), args.end(), args.begin(), [&](const auto& i) {
            return m.insert_instruction(ins, make_op("layout", {{"permutation", perm}}), i);
        });
        auto conv = m.insert_instruction(ins, ins->get_operator(), args);
        auto c    = m.insert_instruction(ins, make_op("contiguous"), conv);
        m.replace_instruction(ins, c);
    }
}

void remove_layout(module& m)
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "layout")
            continue;
        if(ins->get_shape() != ins->inputs().front()->get_shape())
            continue;
        m.replace_instruction(ins, ins->inputs().front());
    }
}
} // namespace

void layout_convolution::apply(module_pass_manager& mpm) const
{
    preserve_output_layout(mpm.get_module());
    transform_convolutions(mpm.get_module(), *this);
    mpm.run_pass(dead_code_elimination{});
    mpm.run_pass(eliminate_contiguous{"contiguous"});
    mpm.run_pass(dead_code_elimination{});
    remove_layout(mpm.get_module());
    mpm.run_pass(dead_code_elimination{});
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
