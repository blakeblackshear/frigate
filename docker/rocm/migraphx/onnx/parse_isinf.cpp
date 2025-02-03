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
#include <migraphx/make_op.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_isinf : op_parser<parse_isinf>
{
    std::vector<op_desc> operators() const { return {{"IsInf", "isinf"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          const std::vector<instruction_ref>& args) const
    {
        bool detect_negative = true;
        bool detect_positive = true;
        if(contains(info.attributes, "detect_negative"))
        {
            detect_negative = static_cast<bool>(
                parser.parse_value(info.attributes.at("detect_negative")).at<int>());
        }

        if(contains(info.attributes, "detect_positive"))
        {
            detect_positive = static_cast<bool>(
                parser.parse_value(info.attributes.at("detect_positive")).at<int>());
        }

        auto x_shape = args[0]->get_shape();
        if(not detect_negative and not detect_positive)
        {
            return info.add_instruction(
                make_op("multibroadcast", {{"out_lens", x_shape.lens()}}),
                info.add_literal(migraphx::literal{migraphx::shape{shape::bool_type}, {false}}));
        }

        auto is_inf = info.add_instruction(make_op("isinf"), args[0]);
        if(detect_negative and detect_positive)
        {
            return is_inf;
        }

        auto zero_l = info.add_literal(migraphx::literal{migraphx::shape{x_shape.type()}, {0}});
        auto mb_zero =
            info.add_instruction(make_op("multibroadcast", {{"out_lens", x_shape.lens()}}), zero_l);

        auto cond = info.add_broadcastable_binary_op(
            detect_negative ? "less" : "greater", args[0], mb_zero);
        if(cond->get_shape().type() != shape::bool_type)
        {
            cond =
                info.add_instruction(make_op("convert", {{"target_type", shape::bool_type}}), cond);
        }
        return info.add_instruction(make_op("logical_and"), is_inf, cond);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
