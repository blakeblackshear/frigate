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
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

instruction_ref parse_gelu_erf(const onnx_parser::node_info& info, instruction_ref x)
{
    auto x_type = x->get_shape().type();
    auto half   = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {0.5f}});
    auto one    = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {1.0f}});
    auto sqrt2 =
        info.add_literal(migraphx::literal{migraphx::shape{x_type}, {static_cast<float>(M_SQRT2)}});
    auto mul_half = info.add_common_op("mul", x, half);
    auto div      = info.add_common_op("div", x, sqrt2);
    auto erf      = info.add_instruction(migraphx::make_op("erf"), div);
    auto add_one  = info.add_common_op("add", erf, one);
    return info.add_common_op("mul", mul_half, add_one);
}

instruction_ref parse_gelu_tanh(const onnx_parser::node_info& info, instruction_ref x, bool fast)
{
    auto x_type        = x->get_shape().type();
    auto fit_const_val = fast ? 0.035677 : 0.044715;
    auto fit_const = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {fit_const_val}});
    auto sqrt_2_rpi_val = fast ? 0.797885 : sqrt(M_2_PI);
    auto sqrt_2_rpi =
        info.add_literal(migraphx::literal{migraphx::shape{x_type}, {sqrt_2_rpi_val}});
    auto one   = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {1.0f}});
    auto half  = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {0.5f}});
    auto three = info.add_literal(migraphx::literal{migraphx::shape{x_type}, {3.0f}});

    // [0.044715|0.035677] * x^3
    auto pow0 = info.add_common_op("pow", x, three);
    auto mul0 = info.add_common_op("mul", pow0, fit_const);
    instruction_ref tanh_in;
    if(fast)
    {
        // approx = 0.797885 * x + 0.035677 * x^3
        auto mul1 = info.add_common_op("mul", sqrt_2_rpi, x);
        tanh_in   = info.add_common_op("add", mul0, mul1);
    }
    else
    {
        // approx = sqrt(2/pi) * (x + 0.044715 * x^3
        auto add0 = info.add_common_op("add", mul0, x);
        tanh_in   = info.add_common_op("mul", add0, sqrt_2_rpi);
    }

    // 0.5 * x * (1 + Tanh(approx))
    auto tanh0 = info.add_instruction(migraphx::make_op("tanh"), tanh_in);
    auto add1  = info.add_common_op("add", tanh0, one);
    auto mul2  = info.add_common_op("mul", x, half);
    return info.add_common_op("mul", add1, mul2);
}

struct parse_gelu : op_parser<parse_gelu>
{
    std::vector<op_desc> operators() const { return {{"BiasGelu"}, {"FastGelu"}, {"Gelu"}}; }
    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& /*parser*/,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        std::string approximate = "none";
        auto x                  = args[0];
        auto x_type             = x->get_shape().type();
        auto fast               = false;
        if(not is_type_float(x_type))
        {
            MIGRAPHX_THROW("PARSE_GELU: input tensor is not a floating type");
        }

        if(contains(info.attributes, "approximate"))
        {
            approximate = info.attributes.at("approximate").s();
        }

        if(opd.onnx_name == "FastGelu")
        {
            if(x_type == migraphx::shape::double_type)
            {
                MIGRAPHX_THROW("PARSE_GELU: FastGelu can't accept input with double precision");
            }

            // FastGelu uses tanh approximation
            approximate = "tanh";
            fast        = true;
        }

        if(args.size() > 1 and args.at(1)->name() != "undefined")
        {
            auto y      = args[1];
            auto y_type = y->get_shape().type();
            if(y_type != x_type)
            {
                MIGRAPHX_THROW("PARSE_GELU: mismatching input tensor types");
            }
            x = info.add_common_op("add", x, y);
        }

        if(approximate == "tanh")
        {
            return parse_gelu_tanh(info, x, fast);
        }
        else
        {
            return parse_gelu_erf(info, x);
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
