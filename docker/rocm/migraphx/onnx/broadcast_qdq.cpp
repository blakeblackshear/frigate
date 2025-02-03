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

#include <migraphx/onnx/broadcast_qdq.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

// This method is to prep for quantizelinear or dequantizelinear operation for
// either the broadcasting of weight-scale or zero-points of qlinearadd operator
// outputs: operator op (inputs x, broadcasted: scale (float) & zero_pt (8-bit))
instruction_ref bcast_qdq_instr(const std::string& op_name,
                                instruction_ref x_in,
                                instruction_ref arg_fscale,
                                instruction_ref arg_z_pt,
                                const onnx_parser::node_info& info)
{
    auto in_lens = x_in->get_shape().lens();

    // prep 1: broadcast scale. it can come as a scalar or a 1-D tensor.
    instruction_ref bcast_scale;
    if(arg_fscale->get_shape().elements() > 1)
        bcast_scale = info.add_instruction(
            migraphx::make_op("broadcast", {{"axis", 0}, {"out_lens", in_lens}}), arg_fscale);
    else
        bcast_scale = info.add_instruction(
            migraphx::make_op("multibroadcast", {{"out_lens", in_lens}}), arg_fscale);

    // prep 2: broadcast zero point. it can come as a scalar or a 1-D tensor.
    instruction_ref bcast_zero_pt;
    if(arg_z_pt->get_shape().elements() > 1)
        bcast_zero_pt = info.add_instruction(
            migraphx::make_op("broadcast", {{"axis", 0}, {"out_lens", in_lens}}), arg_z_pt);
    else
        bcast_zero_pt = info.add_instruction(
            migraphx::make_op("multibroadcast", {{"out_lens", in_lens}}), arg_z_pt);

    // op_name is either quantizelinear or dequantizelinear:
    return info.add_instruction(migraphx::make_op(op_name), x_in, bcast_scale, bcast_zero_pt);
}

// Multibroadcast a scaler..
instruction_ref bcast_scalar_instr(const migraphx::shape& shape_out,
                                   instruction_ref arg_in,
                                   const onnx_parser::node_info& info)
{
    return info.add_instruction(
        migraphx::make_op("multibroadcast", {{"out_lens", shape_out.lens()}}), arg_in);
}

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
