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

struct parse_binary_op : op_parser<parse_binary_op>
{
    std::vector<op_desc> operators() const
    {
        return {{"Add", "add"},
                {"Div", "div"},
                {"And", "logical_and"},
                {"Or", "logical_or"},
                {"Xor", "logical_xor"},
                {"BitwiseAnd", "bitwise_and"},
                {"Mul", "mul"},
                {"PRelu", "prelu"},
                {"Sub", "sub"}};
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        if(args.size() != 2)
            MIGRAPHX_THROW("binary operators should have 2 operands");
        if(contains(info.attributes, "broadcast") and contains(info.attributes, "axis"))
        {
            uint64_t broadcasted =
                parser.parse_value(info.attributes.at("broadcast")).at<uint64_t>();
            if(broadcasted != 0)
            {
                if(std::any_of(
                       args.cbegin(), args.cend(), [](auto a) { return a->get_shape().dynamic(); }))
                {
                    MIGRAPHX_THROW(
                        "Binary op broadcast attribute not supported for dynamic input shapes");
                }
                uint64_t axis = parser.parse_value(info.attributes.at("axis")).at<uint64_t>();
                auto l        = info.add_instruction(
                    make_op("broadcast",
                            {{"axis", axis}, {"out_lens", args[0]->get_shape().lens()}}),
                    args[1]);
                return info.add_instruction(make_op(opd.op_name), args[0], l);
            }
            return info.add_instruction(make_op(opd.op_name), args);
        }
        else
        {
            return info.add_broadcastable_binary_op(opd.op_name, args[0], args[1]);
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
