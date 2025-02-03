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
#include <migraphx/common.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/onnx/broadcast_qdq.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

/*
 *********************************************************************************
 *  Reference: see QLinearSigmoid, QLinearLeakyRelu in                           *
 *  https://github.com/microsoft/onnxruntime/blob/main/docs/ContribOperators.md  *
 *********************************************************************************

com.microsoft.QLinearSigmoid
QLinearSigmoid takes quantized input data (Tensor), and quantize parameter for output, and produces
one output data (Tensor) where the function f(x) = quantize(Sigmoid(dequantize(x))), is applied to
the data tensor elementwise. Where the function Sigmoid(x) = 1 / (1 + exp(-x))

Version
This version of the operator has been available since version 1 of the 'com.microsoft' operator
set.

*****************************************************************************************************

com.microsoft.QLinearLeakyRelu
QLinearLeakyRelu takes quantized input data (Tensor), an argument alpha, and quantize parameter for
output, and produces one output data (Tensor) where the function f(x) = quantize(alpha *
dequantize(x)) for dequantize(x) < 0, f(x) = quantize(dequantize(x)) for dequantize(x) >= 0, is
applied to the data tensor elementwise.

Version
This version of the operator has been available since version 1 of the 'com.microsoft' operator set.

Attributes
alpha : float
Coefficient of leakage.

******************************************************************************************************

Generic input layout of QLinear unary operators:

Inputs (4 - 5)
X : T
Input tensor

X_scale : tensor(float)
Input X's scale. It's a scalar, which means a per-tensor/layer quantization.

X_zero_point (optional) : T
Input X's zero point. Default value is 0 if it's not specified. It's a scalar, which means a
per-tensor/layer quantization.

Y_scale : tensor(float) Output Y's scale. It's a scalar, which means
a per-tensor/layer quantization.

Y_zero_point (optional) : T Output Y's zero point. Default value is
0 if it's not specified. It's a scalar, which means a per-tensor/layer quantization.

Outputs
Y : T
Output tensor

Type Constraints
T : tensor(uint8), tensor(int8)
Constrain input and output types to 8 bit tensors.

*/

struct parse_qlinearunary : op_parser<parse_qlinearunary>
{
    std::vector<op_desc> operators() const
    {
        return {{"QLinearSigmoid", "sigmoid"}, {"QLinearLeakyRelu", "leaky_relu"}};
    }

    void check_inputs(const op_desc& opd, const std::vector<instruction_ref>& args) const
    {
        if(args.size() < 4)
            MIGRAPHX_THROW(opd.op_name + ": missing inputs");

        const auto& in_x = args[0];

        auto sh_x   = in_x->get_shape();
        auto type_x = sh_x.type();
        if(type_x != migraphx::shape::int8_type and type_x != migraphx::shape::uint8_type)
            MIGRAPHX_THROW(opd.op_name + ": unsupported input type");
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          const std::vector<instruction_ref>& args) const
    {
        check_inputs(opd, args);

        // X
        const auto& in_x         = args[0];
        const auto& in_scale_x   = args[1];
        const auto& in_zero_pt_x = args[2];

        auto dquant_x = bcast_qdq_instr("dequantizelinear", in_x, in_scale_x, in_zero_pt_x, info);

        // Y = (op(dequantizelinear(x))
        auto op = parser.load(opd.op_name, info);
        auto y  = info.add_instruction(op, dquant_x);

        const auto& in_scale_y = args[3];

        // zero_pt for Y is supplied as the last optional argument..
        if(args.size() == 5)
            return (bcast_qdq_instr("quantizelinear", y, in_scale_y, args[4], info));

        // if no zero_pt: just broadcast the scale..
        auto bcast_scale_sigm = bcast_scalar_instr(y->get_shape(), in_scale_y, info);
        return (info.add_instruction(migraphx::make_op("quantizelinear"), y, bcast_scale_sigm));
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
