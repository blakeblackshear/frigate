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

#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/onnx/broadcast_qdq.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

/*
 *********************************************************************************
 *  Reference: see QLinearMatMul in                                              *
 *  https://onnx.ai/onnx/operators/onnx__QLinearMatMul.html                      *
 *********************************************************************************

Matrix product that behaves like numpy.matmul:

https://docs.scipy.org/doc/numpy-1.13.0/reference/generated/numpy.matmul.html. It consumes two
quantized input tensors, their scales and zero points, scale and zero point of output, and computes
the quantized output. The quantization formula is y = saturate((x / y_scale) + y_zero_point). For (x
/ y_scale), it is rounding to nearest ties to even. Refer to https://en.wikipedia.org/wiki/Rounding
for details. Scale and zero point must have same shape. They must be either scalar (per tensor) or
N-D tensor (per row for ‘a’ and per column for ‘b’). Scalar refers to per tensor quantization
whereas N-D refers to per row or per column quantization. If the input is 2D of shape [M, K] then
zero point and scale tensor may be an M element vector [v_1, v_2, …, v_M] for per row quantization
and K element vector of shape [v_1, v_2, …, v_K] for per column quantization. If the input is N-D
tensor with shape [D1, D2, M, K] then zero point and scale tensor may have shape [D1, D2, M, 1] for
per row quantization and shape [D1, D2, 1, K] for per column quantization. Production must never
overflow, and accumulation may overflow if and only if in 32 bits.

Inputs
a (heterogeneous) - T1: N-dimensional quantized matrix a

a_scale (heterogeneous) - tensor(float): scale of quantized input a

a_zero_point (heterogeneous) - T1: zero point of quantized input a

b (heterogeneous) - T2: N-dimensional quantized matrix b

b_scale (heterogeneous) - tensor(float): scale of quantized input b

b_zero_point (heterogeneous) - T2: zero point of quantized input b

y_scale (heterogeneous) - tensor(float): scale of quantized output y

y_zero_point (heterogeneous) - T3: zero point of quantized output y

Outputs
y (heterogeneous) - T3: Quantized matrix multiply results from a * b

Type Constraints
T1 in ( tensor(int8), tensor(uint8) ): Constrain input a and its zero point data type to 8-bit
integer tensor.

T2 in ( tensor(int8), tensor(uint8) ): Constrain input b and its zero point data type to 8-bit
integer tensor.

T3 in ( tensor(int8), tensor(uint8) ): Constrain output y and its zero point data type to 8-bit
integer tensor.

*/

struct parse_qlinearmatmul : op_parser<parse_qlinearmatmul>
{
    std::vector<op_desc> operators() const { return {{"QLinearMatMul"}}; }

    // basic type checking for QLinearMatMul Operator

    void check_inputs(const std::vector<instruction_ref>& args) const
    {
        if(args.size() < 8)
            MIGRAPHX_THROW("QLINEARMATMUL: missing inputs");

        const auto& in_a = args[0];
        const auto& in_b = args[3];

        auto sh_a = in_a->get_shape();
        auto sh_b = in_b->get_shape();

        auto type_a = sh_a.type();
        auto type_b = sh_b.type();
        if(type_a != migraphx::shape::int8_type and type_a != migraphx::shape::uint8_type)
            MIGRAPHX_THROW("QLINEARMATMUL: unsupported input type");
        if(type_b != migraphx::shape::int8_type and type_b != migraphx::shape::uint8_type)
            MIGRAPHX_THROW("QLINEARMATMUL: unsupported input type");

        auto lens_a = sh_a.lens();
        auto lens_b = sh_b.lens();

        size_t dim_a = lens_a.size();
        size_t dim_b = lens_b.size();

        if(dim_a == 0 or dim_b == 0)
            MIGRAPHX_THROW("QLINEARMATMUL: empty input");

        // broadcast supported if either is 1-D -- the other can be a 2-D tensor.
        // if it is 1-D, just prepend/append that lens and check further constraints..
        if(dim_a == 1)
        {
            lens_a.insert(lens_a.begin(), 1);
            dim_a++;
        }
        if(dim_b == 1)
        {
            lens_b.push_back(1);
            dim_b++;
        }

        // 2-D or higher-order mat mul
        if(dim_a != dim_b or *lens_a.rbegin() != *(lens_b.rbegin() + 1) or
           not std::equal(lens_a.rbegin() + 2, lens_a.rend(), lens_b.rbegin() + 2, lens_b.rend()))
            MIGRAPHX_THROW("QLINEARMATMUL: mismatched input dimensions");

        if(migraphx::any_of({args[1], args[2], args[4], args[5]},
                            [](auto arg) { return not arg->get_shape().scalar(); }))
            MIGRAPHX_THROW("QLINEARMATMUL: unsupported row/column quantization");
    }

    instruction_ref parse(const op_desc& /* opd */,
                          const onnx_parser& /*parser*/,
                          const onnx_parser::node_info& info,
                          const std::vector<instruction_ref>& args) const
    {
        check_inputs(args);

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

        bool is_a_prepended = false;
        bool is_b_appended  = false;

        // un-squeeze either tensor if 1-D.
        if(in_a->get_shape().ndim() == 1)
        {
            is_a_prepended = true;
            dquant_a       = info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), dquant_a);
        }
        if(in_b->get_shape().ndim() == 1)
        {
            is_b_appended = true;
            dquant_b      = info.add_instruction(make_op("unsqueeze", {{"axes", {1}}}), dquant_b);
        }

        // Y = A * B
        auto out_y = info.add_instruction(migraphx::make_op("dot"), dquant_a, dquant_b);

        // squeeze just once if necessary.. not twice.
        if(is_a_prepended)
            out_y = info.add_instruction(make_op("squeeze", {{"axes", {0}}}), out_y);
        else if(is_b_appended)
            out_y = info.add_instruction(make_op("squeeze", {{"axes", {1}}}), out_y);

        const auto& scale_y   = args[6];
        const auto& zero_pt_y = args[7];

        return bcast_qdq_instr("quantizelinear", out_y, scale_y, zero_pt_y, info);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
