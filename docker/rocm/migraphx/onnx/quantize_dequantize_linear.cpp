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

#include <migraphx/onnx/quantize_dequantize_linear.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/tune_axis.hpp>
#include <migraphx/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

std::vector<instruction_ref>
transform_quantize_dequantize_linear_inputs(const onnx_parser::node_info& info,
                                            const std::string& onnx_name,
                                            int block_size,
                                            int axis,
                                            std::vector<instruction_ref> args)
{
    const auto x      = args.at(0);
    const auto x_lens = x->get_shape().lens();
    const auto x_rank = x_lens.size();

    instruction_ref y_scale = args.at(1);
    const auto y_scale_lens = y_scale->get_shape().lens();
    const auto y_scale_rank = y_scale_lens.size();

    // Per-tensor (per-layer) granularity
    if(y_scale->get_shape().elements() == 1)
    {
        std::transform(args.begin() + 1, args.end(), args.begin() + 1, [&](auto ins) {
            return info.add_instruction(make_op("multibroadcast", {{"out_lens", x_lens}}), ins);
        });
    }
    // Per-axis granularity
    else if(y_scale_rank == 1)
    {
        axis = tune_axis(x_rank, axis, onnx_name);
        if(x_lens[axis] != y_scale_lens[0])
        {
            MIGRAPHX_THROW(onnx_name +
                           ": For per axis granularity the length of y_scale (actual: " +
                           to_string(y_scale_lens[0]) + ") must be equal to size of x on axis " +
                           to_string(axis) + "(actual: " + to_string(x_lens[axis]) + ")");
        }

        std::transform(args.begin() + 1, args.end(), args.begin() + 1, [&](auto ins) {
            return info.add_instruction(
                make_op("broadcast", {{"axis", axis}, {"out_lens", x_lens}}), ins);
        });
    }
    // Blocked granularity
    else
    {
        axis = tune_axis(x_rank, axis, onnx_name);

        if(x_rank != y_scale_rank)
        {
            MIGRAPHX_THROW(onnx_name + ": x(rank: " + to_string(x_rank) +
                           ") and y_scale(rank: " + to_string(y_scale_rank) +
                           ") must be of same rank for block granularity");
        }

        for(auto i = 0u; i < x_lens.size(); ++i)
        {
            if(x_lens[i] != y_scale_lens[i] and i != axis)
            {
                MIGRAPHX_THROW(onnx_name + ": x(shape: " + to_string_range(x_lens) +
                               ") and y_scale(shape: " + to_string_range(y_scale_lens) +
                               ") shapes may only differ along provided axis(" + to_string(axis) +
                               ")");
            }
        }

        // Given x shape (D0, ..., Di, ..., Dn), y_scale shape (S0, ... Si, ...Sn) and
        // axis=i, the accepted range is [ceil(Di/Si), ceil(Di/(Si-1))-1]
        float di           = x_lens[axis];
        float si           = y_scale_lens[axis];
        int block_size_min = std::ceil(di / si);
        int block_size_max = std::ceil(di / (si - 1)) - 1;
        // default block_size if not given is calculated (to support quark generated models):
        if(block_size == 0)
            block_size = block_size_min;
        if(block_size < block_size_min or block_size > block_size_max)
            MIGRAPHX_THROW(onnx_name + ": Block size(actual: " + to_string(block_size) +
                           ") must be within range [" + to_string(block_size_min) + ", " +
                           to_string(block_size_max) + "]");

        std::transform(args.begin() + 1, args.end(), args.begin() + 1, [&](auto ins) {
            if(block_size == 1)
                return ins;

            ins = info.add_instruction(make_op("unsqueeze", {{"axes", {axis + 1}}}), ins);

            auto bc_lens      = ins->get_shape().lens();
            bc_lens[axis + 1] = block_size;
            ins = info.add_instruction(make_op("multibroadcast", {{"out_lens", bc_lens}}), ins);

            auto reshape_lens  = x_lens;
            reshape_lens[axis] = ins->get_shape().lens()[axis] * block_size;
            ins = info.add_instruction(make_op("reshape", {{"dims", reshape_lens}}), ins);

            // Detect runt block
            if(x_lens[axis] < reshape_lens[axis])
            {
                ins = info.add_instruction(
                    make_op("slice", {{"axes", {axis}}, {"starts", {0}}, {"ends", {x_lens[axis]}}}),
                    ins);
            }

            return ins;
        });
    }

    return args;
}

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
