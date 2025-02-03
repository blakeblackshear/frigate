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
#include <migraphx/common.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_thresholdedrelu : op_parser<parse_thresholdedrelu>
{
    std::vector<op_desc> operators() const { return {{"ThresholdedRelu"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        float alpha = 1.0;
        if(contains(info.attributes, "alpha"))
            alpha = parser.parse_value(info.attributes.at("alpha")).at<float>();

        auto x_shape = args[0]->get_shape();

        auto lit_zero = info.add_literal(migraphx::literal{migraphx::shape{x_shape.type()}, {0}});
        auto lit_alpha =
            info.add_literal(migraphx::literal{migraphx::shape{x_shape.type()}, {alpha}});
        auto mb_zero = info.add_instruction(
            migraphx::make_op("multibroadcast", {{"out_lens", x_shape.lens()}}), lit_zero);
        auto mb_alpha = info.add_instruction(
            migraphx::make_op("multibroadcast", {{"out_lens", x_shape.lens()}}), lit_alpha);
        auto condition = info.add_instruction(migraphx::make_op("greater"), args[0], mb_alpha);

        return info.add_instruction(migraphx::make_op("where"), condition, args[0], mb_zero);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
