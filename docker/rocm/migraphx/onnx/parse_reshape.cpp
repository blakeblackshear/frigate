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
#include <migraphx/onnx/checks.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_reshape : op_parser<parse_reshape>
{
    std::vector<op_desc> operators() const { return {{"Reshape"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        std::vector<int64_t> dims;
        if(args.size() == 1)
        {
            literal s = parser.parse_value(info.attributes.at("shape"));
            s.visit([&](auto v) { copy(v, std::back_inserter(dims)); });
            return info.add_instruction(make_op("reshape", {{"dims", dims}}), args[0]);
        }
        else
        {
            // 2 inputs
            auto s = args[1]->eval();
            if(s.empty())
            {
                // arg[1] not eval-able
                auto alloc_ins = info.add_instruction(
                    make_op("allocate", {{"buf_type", args[0]->get_shape().type()}}), args[1]);
                return info.add_instruction(make_op("reshape"), args[0], alloc_ins);
            }
            else
            {
                s.visit([&](auto v) { copy(v, std::back_inserter(dims)); });
                return info.add_instruction(make_op("reshape", {{"dims", dims}}), args[0]);
            }
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
