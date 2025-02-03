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
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_hardmax : op_parser<parse_hardmax>
{
    std::vector<op_desc> operators() const { return {{"Hardmax", "hardmax"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        auto input      = args[0];
        auto input_lens = input->get_shape().lens();

        // default axis value is -1 for opset 13
        int64_t axis = -1;

        // axis value is 1 for previous opset versions
        if(parser.opset_version < 13)
        {
            axis = 1;
        }

        if(contains(info.attributes, "axis"))
        {
            axis = parser.parse_value(info.attributes.at("axis")).at<int>();
        }

        if(parser.opset_version < 13)
        {
            // input is coerced into a 2D matrix of size NxD
            axis     = axis < 0 ? axis + input_lens.size() : axis;
            size_t n = 1;
            for(int i = 0; i < axis; i++)
            {
                n *= input_lens[i];
            }
            size_t d = input->get_shape().elements() / n;

            input = info.add_instruction(make_op("reshape", {{"dims", {n, d}}}), input);
            axis  = 1;
        }

        auto input_type = input->get_shape().type();
        auto indices    = info.add_instruction(make_op("argmax", {{"axis", axis}}), input);
        auto data       = info.add_instruction(
            make_op("multibroadcast", {{"out_lens", input->get_shape().lens()}}),
            info.add_literal(migraphx::literal{migraphx::shape{input_type}, {0}}));
        auto updates = info.add_instruction(
            make_op("multibroadcast", {{"out_lens", indices->get_shape().lens()}}),
            info.add_literal(migraphx::literal{migraphx::shape{input_type}, {1}}));
        auto output =
            info.add_instruction(make_op("scatter_none", {{"axis", axis}}), data, indices, updates);

        if(parser.opset_version < 13)
        {
            output = info.add_instruction(make_op("reshape", {{"dims", input_lens}}), output);
        }

        return output;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
