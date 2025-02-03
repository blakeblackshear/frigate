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

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_arg_op : op_parser<parse_arg_op>
{
    std::vector<op_desc> operators() const { return {{"ArgMax", "argmax"}, {"ArgMin", "argmin"}}; }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          const std::vector<instruction_ref>& args) const
    {
        int64_t axis = 0;
        if(contains(info.attributes, "axis"))
        {
            axis = static_cast<int64_t>(parser.parse_value(info.attributes.at("axis")).at<int>());
        }

        int keep_dims = 1;
        if(contains(info.attributes, "keepdims"))
        {
            keep_dims = parser.parse_value(info.attributes.at("keepdims")).at<int>();
        }

        bool select_last_index = false;
        if(contains(info.attributes, "select_last_index"))
        {
            select_last_index = static_cast<bool>(
                parser.parse_value(info.attributes.at("select_last_index")).at<int>());
        }

        if(keep_dims == 0)
        {
            auto ins = info.add_instruction(
                make_op(opd.op_name, {{"axis", axis}, {"select_last_index", select_last_index}}),
                args);
            return info.add_instruction(make_op("squeeze", {{"axes", {axis}}}), ins);
        }
        else
        {
            return info.add_instruction(
                make_op(opd.op_name, {{"axis", axis}, {"select_last_index", select_last_index}}),
                args);
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
