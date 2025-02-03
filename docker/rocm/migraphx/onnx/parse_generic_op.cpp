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

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_generic_op : op_parser<parse_generic_op>
{
    std::vector<op_desc> operators() const
    {
        // clang-format off
        return {{"Abs", "abs"},
                {"Acos", "acos"},
                {"Acosh", "acosh"},
                {"Asin", "asin"},
                {"Asinh", "asinh"},
                {"Atan", "atan"},
                {"Atanh", "atanh"},
                {"Ceil", "ceil"},
                {"Concat", "concat"},
                {"Cos", "cos"},
                {"Cosh", "cosh"},
                {"Elu", "elu"},
                {"Erf", "erf"},
                {"Exp", "exp"},
                {"Flatten", "flatten"},
                {"Floor", "floor"},
                {"Gather", "gather"},
                {"GatherND", "gathernd"},
                {"Identity", "identity"},
                {"IsNaN", "isnan"},
                {"LeakyRelu", "leaky_relu"},
                {"Log", "log"},
                {"LRN", "lrn"},
                {"Neg", "neg"},
                {"Reciprocal", "recip"},
                {"Relu", "relu"},
                {"Round", "nearbyint"},
                {"Sigmoid", "sigmoid"},
                {"Sign", "sign"},
                {"Sin", "sin"},
                {"Sinh", "sinh"},
                {"Sqrt", "sqrt"},
                {"Tan", "tan"},
                {"Tanh", "tanh"},
                {"Not", "not"}};
        // clang-format on
    }

    bool needs_contiguous(const std::string& op_name) const
    {
        return contains({"flatten", "gather", "scatter"}, op_name);
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        auto op = parser.load(opd.op_name, info);
        if(needs_contiguous(opd.op_name))
        {
            std::transform(args.begin(), args.end(), args.begin(), [&](auto arg) {
                return info.make_contiguous(arg);
            });
        }
        return info.add_instruction(op, args);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
