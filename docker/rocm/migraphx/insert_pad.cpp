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
#include <migraphx/insert_pad.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/im2col.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/op/pad.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

static void update_op(const instruction_ref& input, const instruction_ref& ins, module& m)
{
    auto op         = ins->get_operator();
    auto val        = op.to_value();
    auto op_padding = val.at("padding").to_vector<size_t>();

    // skip if shape is dynamic
    if(input->get_shape().dynamic())
    {
        return;
    }

    auto kdims = input->get_shape().lens().size() - 2;
    if(std::equal(op_padding.begin(),
                  op_padding.begin() + kdims,
                  op_padding.begin() + kdims,
                  op_padding.end()))
        return;

    std::vector<int64_t> padding(input->get_shape().lens().size() * 2, 0);
    std::vector<size_t> pads_l(op_padding.begin(), op_padding.begin() + kdims);
    std::vector<size_t> pads_r(op_padding.begin() + kdims, op_padding.end());
    op_padding = std::vector<size_t>(kdims * 2, 0);
    op.from_value({{"padding", op_padding}});

    std::copy(pads_l.begin(), pads_l.end(), padding.begin() + 2);
    std::copy(pads_r.begin(), pads_r.end(), padding.begin() + kdims + 2 + 2);

    auto pad_op = m.insert_instruction(ins, op::pad{padding}, input);

    auto new_inputs    = ins->inputs();
    new_inputs.front() = pad_op;

    m.replace_instruction(ins, op, new_inputs);
}

static void update_pooling(const instruction_ref& input, const instruction_ref& ins, module& m)
{
    auto op = any_cast<op::pooling>(ins->get_operator());
    if(op.mode == op::pooling_mode::average)
    {
        return;
    }
    auto kdims = input->get_shape().ndim() - 2;
    if(std::equal(op.padding.begin(),
                  op.padding.begin() + kdims,
                  op.padding.begin() + kdims,
                  op.padding.end()))
        return;

    std::vector<int64_t> padding(input->get_shape().ndim() * 2, 0);
    std::vector<size_t> pads_l(op.padding.begin(), op.padding.begin() + kdims);
    std::vector<size_t> pads_r(op.padding.begin() + kdims, op.padding.end());
    op.padding = std::vector<size_t>(kdims * 2, 0);
    std::copy(pads_l.begin(), pads_l.end(), padding.begin() + 2);
    std::copy(pads_r.begin(), pads_r.end(), padding.begin() + kdims + 2 + 2);

    float pad_val = 0.0f; // for the lpnorm
    if(op.mode == op::pooling_mode::max)
    {
        // maxpool uses lowest value for padding
        pad_val = std::numeric_limits<float>::lowest();
    }
    auto pad_op   = m.insert_instruction(ins, op::pad{padding, pad_val}, input);

    auto new_inputs    = ins->inputs();
    new_inputs.front() = pad_op;

    m.replace_instruction(ins, op, new_inputs);
}

void insert_pad::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        const std::string& op_name = ins->name();
        if(not contains(ops, op_name))
            continue;
        auto input = ins->inputs().front();
        if(op_name == "convolution" or op_name == "im2col")
            update_op(input, ins, m);
        else if(op_name == "pooling")
            update_pooling(input, ins, m);
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
