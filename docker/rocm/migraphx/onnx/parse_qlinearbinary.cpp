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

#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/common.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/onnx/broadcast_qdq.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

/*
 *********************************************************************************
 *  Reference: see QLinearAdd, QLinearMul in                                     *
 *  https://github.com/microsoft/onnxruntime/blob/main/docs/ContribOperators.md  *
 *********************************************************************************

  com.microsoft.QLinearAdd
  Performs element-wise binary addition on 8 bit data types (with Numpy-style broadcasting support).

  C = (A_scale * (A - A_zero_point) + B_scale * (B - B_zero_point))/C_scale + C_zero_point

  Version
  This version of the operator has been available since version 1 of the 'com.microsoft' operator
  set.

  com.microsoft.QLinearMul
  Performs element-wise binary multiplication on 8 bit data types (with Numpy-style broadcasting
  support).

  C = ((A - A_zero_point) * (B - B_zero_point)) * (A_scale * B_scale)/C_scale + C_zero_point

  Version
  This version of the operator has been available since version 1 of the 'com.microsoft' operator
  set.

  General definition of binary QLinear* ops:
  Inputs (7 - 8)
  A : T
  First operand.

  A_scale : tensor(float)
  Input A's scale. It's a scalar, which means a per-tensor/layer quantization.

  A_zero_point (optional) : T
  Input A zero point. Default value is 0 if it's not specified. It's a scalar, which means a
  per-tensor/layer quantization.

  B : T
  Second operand.

  B_scale : tensor(float)
  Input B's scale. It's a scalar, which means a per-tensor/layer quantization.

  B_zero_point (optional) : T
  Input B zero point. Default value is 0 if it's not specified. It's a scalar, which means a
  per-tensor/layer quantization.

  C_scale : tensor(float)
  Output scale. It's a scalar, which means a per-tensor/layer quantization.

  C_zero_point (optional) : T

  Output zero point. Default value is 0 if it's not specified. It's a scalar, which means a
  per-tensor/layer quantization.

  Outputs
  C : T
  Result, has same element type as two inputs

  Type Constraints
  T : tensor(uint8), tensor(int8)
  Constrain input and output types to 8 bit signed and unsigned tensors.

*/

struct parse_qlinearbinary : op_parser<parse_qlinearbinary>
{
    std::vector<op_desc> operators() const
    {
        return {{"QLinearAdd", "add"}, {"QLinearMul", "mul"}};
    }

    // basic type checking for binary QLinear Operator
    void check_inputs(const std::vector<instruction_ref>& args, const std::string& onnx_name) const
    {
        if(args.size() < 7)
            MIGRAPHX_THROW(onnx_name + ": missing inputs");

        const auto& in_a = args[0];
        const auto& in_b = args[3];

        auto sh_a = in_a->get_shape();
        auto sh_b = in_b->get_shape();

        auto type_a = sh_a.type();
        auto type_b = sh_b.type();
        if(type_a != migraphx::shape::int8_type and type_a != migraphx::shape::uint8_type)
            MIGRAPHX_THROW(onnx_name + ": unsupported input type");
        if(type_b != migraphx::shape::int8_type and type_b != migraphx::shape::uint8_type)
            MIGRAPHX_THROW(onnx_name + ": unsupported input type");
        if(type_a != type_b)
            MIGRAPHX_THROW(onnx_name + ": mismatched input types");
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& /*parser*/,
                          const onnx_parser::node_info& info,
                          const std::vector<instruction_ref>& args) const
    {
        check_inputs(args, opd.onnx_name);

        // A
        const auto& in_a         = args[0];
        const auto& in_scale_a   = args[1];
        const auto& in_zero_pt_a = args[2];

        auto dquant_a = bcast_qdq_instr("dequantizelinear", in_a, in_scale_a, in_zero_pt_a, info);

        // B
        const auto& in_b         = args[3];
        const auto& in_scale_b   = args[4];
        const auto& in_zero_pt_b = args[5];
        auto dquant_b = bcast_qdq_instr("dequantizelinear", in_b, in_scale_b, in_zero_pt_b, info);

        // C = op(A, B)
        auto out_c = info.add_common_op(opd.op_name, dquant_a, dquant_b);

        const auto& in_scale_c = args[6];

        // zero_pt for C is supplied as the last optional argument..
        if(args.size() == 8)
            return (bcast_qdq_instr("quantizelinear", out_c, in_scale_c, args[7], info));

        // if no zero_pt: just broadcast the scale..
        auto bcast_scale_c = bcast_scalar_instr(out_c->get_shape(), in_scale_c, info);
        return (info.add_instruction(migraphx::make_op("quantizelinear"), out_c, bcast_scale_c));
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
