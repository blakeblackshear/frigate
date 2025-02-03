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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_imagescalar : op_parser<parse_imagescalar>
{
    std::vector<op_desc> operators() const { return {{"ImageScaler"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        float scale = 1.0;
        std::vector<float> bias{};
        if(contains(info.attributes, "scale"))
        {
            scale = parser.parse_value(info.attributes.at("scale")).at<float>();
        }

        if(contains(info.attributes, "bias"))
        {
            auto&& bias_floats = info.attributes["bias"].floats();
            bias               = std::vector<float>(bias_floats.begin(), bias_floats.end());
        }
        auto input_shape       = args.front()->get_shape();
        auto const& input_lens = input_shape.lens();
        auto input_type        = input_shape.type();

        auto scale_val = info.add_literal(literal{shape{input_type}, {scale}});
        auto bias_vals = info.add_literal(literal{shape{input_type, {bias.size()}}, bias});

        auto scale_tensor = info.add_instruction(
            migraphx::make_op("scalar", {{"scalar_bcst_dims", input_lens}}), scale_val);
        auto img_scaled =
            info.add_instruction(migraphx::make_op("mul"), args.front(), scale_tensor);
        auto bias_bcast = info.add_instruction(
            migraphx::make_op("broadcast", {{"axis", 1}, {"out_lens", input_lens}}), bias_vals);
        return info.add_instruction(migraphx::make_op("add"), img_scaled, bias_bcast);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
