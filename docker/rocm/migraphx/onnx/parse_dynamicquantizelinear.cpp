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
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/tune_axis.hpp>
#include <migraphx/common.hpp>
#include <migraphx/onnx/broadcast_qdq.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

/*
 *********************************************************************************
 *  Reference: see DynamicQuantizeLinear in                                      *
 *  https://github.com/onnx/onnx/blob/main/docs/Operators.md                     *
 *********************************************************************************
DynamicQuantizeLinear
A Function to fuse calculation for Scale, Zero Point and FP32->8Bit conversion of FP32 Input data.
Outputs Scale, ZeroPoint and Quantized Input for a given FP32 Input. Scale is calculated as:
y_scale = (maximum(0, max(x)) - minimum(0, min(x))) / (qmax - qmin)
* where qmax and qmin are max and min values for quantization range i.e. [0, 255] in case of uint8
* data range is adjusted to include 0.

Zero point is calculated as:
intermediate_zero_point = qmin - min(x)/y_scale
y_zero_point = cast(round(saturate(itermediate_zero_point)))
* where qmax and qmin are max and min values for quantization range .i.e [0, 255] in case of uint8
* for saturation, it saturates to [0, 255] if it's uint8, or [-127, 127] if it's int8. Right now
only uint8 is supported.
* rounding to nearest ties to even. Data quantization formula is:

y = saturate (round (x / y_scale) + y_zero_point)
* for saturation, it saturates to [0, 255] if it's uint8, or [-127, 127] if it's int8.Right now only
uint8 is supported.
* rounding to nearest ties to even.

Version
This version of the operator has been available since version 11 of the default ONNX operator set.

Inputs
x : T1
Input tensor

Outputs
y : T2
Quantized output tensor

y_scale : tensor(float)
Output scale. It's a scalar, which means a per-tensor/layer quantization.

y_zero_point : T2
Output zero point. It's a scalar, which means a per-tensor/layer quantization.

Type Constraints
T1 : tensor(float)
Constrain 'x' to float tensor.

T2 : tensor(uint8)
Constrain 'y_zero_point' and 'y' to 8-bit unsigned integer tensor.
*/

struct parse_dynamicquantizelinear : op_parser<parse_dynamicquantizelinear>
{
    std::vector<op_desc> operators() const { return {{"DynamicQuantizeLinear"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       const onnx_parser& /*parser*/,
                                       const onnx_parser::node_info& info,
                                       const std::vector<instruction_ref>& args) const
    {
        auto x       = args[0];
        auto x_shape = x->get_shape();
        auto x_type  = x_shape.type();
        if(x_shape.dynamic())
            MIGRAPHX_THROW("DYNAMICQUANTIZELINEAR: dynamic shapes are not supported");

        auto lit_0 = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {0}});

        // 1. Computing y_scale
        // Note: currently, DynamicQuantizeLinear only has uint8 quantization:
        const auto type_max = std::numeric_limits<uint8_t>::max();
        const auto type_min = std::numeric_limits<uint8_t>::min();
        std::vector<size_t> axes(x_shape.lens().size());
        std::iota(axes.begin(), axes.end(), 0);

        // maximum(0, max(x))
        auto reduce_max_x =
            info.add_instruction(migraphx::make_op("reduce_max", {{"axes", axes}}), x);
        auto max_x = info.add_common_op("max", lit_0, reduce_max_x);

        // minimum(0, min(x))
        auto reduce_min_x =
            info.add_instruction(migraphx::make_op("reduce_min", {{"axes", axes}}), x);
        auto min_x = info.add_common_op("min", lit_0, reduce_min_x);

        auto q_range = info.add_literal(migraphx::literal{
            migraphx::shape{x_type, max_x->get_shape().lens()}, {type_max - type_min}});
        auto q_min   = info.add_literal(
            migraphx::literal{migraphx::shape{x_type, max_x->get_shape().lens()}, {type_min}});
        auto q_max = info.add_literal(
            migraphx::literal{migraphx::shape{x_type, max_x->get_shape().lens()}, {type_max}});

        // y_scale = (maximum(0, max(x)) - minimum(0, min(x))) / (qmax - qmin)
        auto sub0    = info.add_common_op("sub", max_x, min_x);
        auto y_scale = info.add_common_op("div", sub0, q_range);

        // 2. Computing y_zero_point
        // intermediate_zero_point = qmin - min(x) / y_scale
        auto div1      = info.add_common_op("div", min_x, y_scale);
        auto interm_zp = info.add_common_op("sub", q_min, div1);

        // y_zero_point = cast(round(saturate(itermediate_zero_point)))
        auto saturate = info.add_instruction(migraphx::make_op("clip"), interm_zp, q_min, q_max);
        auto round    = info.add_instruction(migraphx::make_op("nearbyint"), saturate);
        auto y_zero_point = info.add_instruction(
            migraphx::make_op("convert", {{"target_type", migraphx::shape::uint8_type}}), round);

        // 3. quantize x with y_scale and y_zero_point
        auto quant = bcast_qdq_instr("quantizelinear", x, y_scale, y_zero_point, info);

        return {quant, y_scale, y_zero_point};
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
