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
#include <migraphx/onnx/checks.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

// Use a literal instruction to replace the constantFill operator. In RNN, input shape
// and value are fixed, so no need to do the actual computation for the constantFill
// operator
struct parse_constant_fill : op_parser<parse_constant_fill>
{
    std::vector<op_desc> operators() const { return {{"ConstantFill"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        int input_as_shape = 0;
        int dtype          = 1;
        float value        = 0.0f;

        if(contains(info.attributes, "dtype"))
        {
            dtype = parser.parse_value(info.attributes.at("dtype")).at<int>();
        }
        shape::type_t type = get_type(dtype);

        if(contains(info.attributes, "input_as_shape"))
        {
            input_as_shape = parser.parse_value(info.attributes.at("input_as_shape")).at<int>();
        }

        if(contains(info.attributes, "value"))
        {
            value = parser.parse_value(info.attributes.at("value")).at<float>();
        }

        if(contains(info.attributes, "extra_shape"))
        {
            MIGRAPHX_THROW("ConstantFill: cannot handle extra shape attribute");
        }

        if(input_as_shape == 1)
        {
            if(args.size() != 1)
            {
                MIGRAPHX_THROW("ConstantFill: need an input argument as output shape");
            }

            if(contains(info.attributes, "shape"))
            {
                MIGRAPHX_THROW("ConstantFill: cannot set the shape argument and pass in an input "
                               "at the same time");
            }

            migraphx::argument in = args[0]->eval();
            check_arg_empty(in, "ConstantFill: dynamic shape is not supported");

            std::vector<std::size_t> dims;
            in.visit([&](auto input) { dims.assign(input.begin(), input.end()); });
            migraphx::shape s(type, dims);
            std::vector<float> values(s.elements(), value);
            return info.add_literal(migraphx::literal(s, values));
        }
        else if(input_as_shape == 0)
        {
            if(not contains(info.attributes, "shape"))
            {
                MIGRAPHX_THROW("ConstantFill: attribute output shape is needed");
            }

            literal ls = parser.parse_value(info.attributes.at("shape"));
            std::vector<std::size_t> dims;
            ls.visit([&](auto s) { dims.assign(s.begin(), s.end()); });
            migraphx::shape s{type, dims};
            std::vector<float> values(s.elements(), value);
            return info.add_literal(migraphx::literal(s, values));
        }
        else
        {
            MIGRAPHX_THROW("ConstantFill: wrong value of attribute input_as_shape");
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
