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
#include <migraphx/eliminate_pad.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/im2col.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/op/pad.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

static void update_op(const instruction_ref& input, const instruction_ref& ins, module& m)
{
    auto pad_op = any_cast<op::pad>(input->get_operator());

    auto kdims    = input->get_shape().lens().size() - 2;
    auto kdims_it = pad_op.pads.begin() + 2;

    std::vector<size_t> pads_l(kdims_it, kdims_it + kdims);
    std::vector<size_t> pads_r(kdims_it + kdims + 2, pad_op.pads.end());

    auto op = ins->get_operator();
    std::vector<size_t> padding(kdims * 2, 0);

    std::transform(
        pads_l.begin(), pads_l.end(), padding.begin(), padding.begin(), std::plus<size_t>());
    std::transform(pads_r.begin(),
                   pads_r.end(),
                   padding.begin() + kdims,
                   padding.begin() + kdims,
                   std::plus<size_t>());

    op.from_value({{"padding", padding}});

    std::vector<instruction_ref> new_inputs{ins->inputs()};
    new_inputs.front() = input->inputs().front();

    m.replace_instruction(ins, op, new_inputs);
}

static void update_pooling(const instruction_ref& input, const instruction_ref& ins, module& m)
{
    auto op = any_cast<op::pooling>(ins->get_operator());
    if(op.mode == op::pooling_mode::average)
    {
        return;
    }
    auto pad_op = any_cast<op::pad>(input->get_operator());

    auto kdims    = input->get_shape().lens().size() - 2;
    auto kdims_it = pad_op.pads.begin() + 2;

    std::vector<size_t> pads_l(kdims_it, kdims_it + kdims);
    std::vector<size_t> pads_r(kdims_it + kdims + 2, pad_op.pads.end());

    std::transform(
        pads_l.begin(), pads_l.end(), op.padding.begin(), op.padding.begin(), std::plus<size_t>());
    std::transform(pads_r.begin(),
                   pads_r.end(),
                   op.padding.begin() + kdims,
                   op.padding.begin() + kdims,
                   std::plus<size_t>());

    std::vector<instruction_ref> new_inputs{ins->inputs()};
    new_inputs.front() = input->inputs().front();

    m.replace_instruction(ins, op, new_inputs);
}

void eliminate_pad::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        const std::string& op_name = ins->name();
        if(op_name != "convolution" and op_name != "im2col" and op_name != "pooling")
            continue;
        auto input = ins->inputs().front();
        if(input->name() != "pad")
            continue;
        if(op_name == "convolution" or op_name == "im2col")
            update_op(input, ins, m);
        else if(op_name == "pooling")
            update_pooling(input, ins, m);
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
