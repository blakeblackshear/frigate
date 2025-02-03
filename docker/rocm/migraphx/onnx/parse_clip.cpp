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
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_clip : op_parser<parse_clip>
{
    std::vector<op_desc> operators() const { return {{"Clip"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        instruction_ref min_arg;
        instruction_ref max_arg;
        bool min_used = false;
        bool max_used = false;

        if(args.size() == 3 and args[2]->name() != "undefined")
        {
            max_arg  = args[2];
            max_used = true;
        }

        if(args.size() >= 2 and args[1]->name() != "undefined")
        {
            min_arg  = args[1];
            min_used = true;
        }
        // if using previous opset for attributes
        else if(contains(info.attributes, "min") and contains(info.attributes, "max"))
        {

            float min_val = parser.parse_value(info.attributes.at("min")).at<float>();
            float max_val = parser.parse_value(info.attributes.at("max")).at<float>();
            min_arg       = info.add_literal(min_val);
            max_arg       = info.add_literal(max_val);
            min_used      = true;
            max_used      = true;
        }

        if(min_used and max_used)
        {
            return info.add_common_op("clip", args[0], min_arg, max_arg);
        }
        else if(max_used)
        {
            return info.add_broadcastable_binary_op("min", args[0], max_arg);
        }
        else if(min_used)
        {
            return info.add_broadcastable_binary_op("max", args[0], min_arg);
        }
        else
        {
            return info.add_instruction(make_op("identity"), args[0]);
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
