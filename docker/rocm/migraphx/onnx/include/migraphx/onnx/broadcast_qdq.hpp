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

#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_BROADCAST_QDQ_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_BROADCAST_QDQ_HPP

#include <string>

#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/instruction.hpp>

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
                                const onnx_parser::node_info& info);

// Multibroadcast a scaler..
instruction_ref bcast_scalar_instr(const migraphx::shape& shape_out,
                                   instruction_ref arg_in,
                                   const onnx_parser::node_info& info);

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
