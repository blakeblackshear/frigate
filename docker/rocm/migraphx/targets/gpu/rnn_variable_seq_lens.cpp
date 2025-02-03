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
#include <migraphx/gpu/rnn_variable_seq_lens.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/device/rnn_variable_seq_lens.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

shape hip_rnn_var_sl_shift_output::compute_shape(std::vector<shape> inputs) const
{
    inputs.pop_back();
    return op.compute_shape(inputs);
}

argument hip_rnn_var_sl_shift_output::compute(context& ctx,
                                              const shape&,
                                              const std::vector<argument>& args) const
{
    device::rnn_var_sl_shift_output(ctx.get_stream().get(),
                                    args.back(),
                                    args.at(0),
                                    args.at(1),
                                    (op.direction == op::rnn_direction::reverse));
    return args.back();
}

shape hip_rnn_var_sl_shift_sequence::compute_shape(std::vector<shape> inputs) const
{
    inputs.pop_back();
    return op.compute_shape(inputs);
}

argument hip_rnn_var_sl_shift_sequence::compute(context& ctx,
                                                const shape&,
                                                const std::vector<argument>& args) const
{
    device::rnn_var_sl_shift_sequence(ctx.get_stream().get(), args.back(), args.at(0), args.at(1));
    return args.back();
}

shape hip_rnn_var_sl_last_output::compute_shape(std::vector<shape> inputs) const
{
    inputs.pop_back();
    return op.compute_shape(inputs);
}

argument hip_rnn_var_sl_last_output::compute(context& ctx,
                                             const shape&,
                                             const std::vector<argument>& args) const
{
    device::rnn_var_sl_last_output(ctx.get_stream().get(),
                                   args.back(),
                                   args.at(0),
                                   args.at(1),
                                   (op.direction == op::rnn_direction::reverse));
    return args.back();
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
