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
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_constant_of_shape : op_parser<parse_constant_of_shape>
{
    std::vector<op_desc> operators() const { return {{"ConstantOfShape"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        literal l_val{};
        if(contains(info.attributes, "value"))
        {
            l_val = parser.parse_value(info.attributes.at("value"));
            if(l_val.get_shape().elements() != 1)
            {
                MIGRAPHX_THROW("ConstantOfShape: attribute value can contain only 1 elements!");
            }
            // convert to a scalar literal
            l_val = literal(shape{l_val.get_shape().type(), {1}, {0}}, l_val.data());
        }
        else
        {
            l_val = literal({shape::float_type, {1}, {0}}, {0.0f});
        }

        if(args.empty())
        {
            MIGRAPHX_THROW("ConstantOfShape : must have 1 input!");
        }
        else
        {
            migraphx::shape s;
            // input is empty, output is a scalar
            auto type = l_val.get_shape().type();
            migraphx::argument input = args[0]->eval();
            if(not input.empty())
            {
                // empty input tensor, output is a scalar
                if(args[0]->get_shape().elements() == 0)
                {
                    s = migraphx::shape{type, {1}, {0}};
                }
                else
                {
                    std::vector<std::size_t> dims;
                    input.visit([&](auto ia) { dims.assign(ia.begin(), ia.end()); });
                    s = migraphx::shape{type, dims};
                }
                literal l_out{};
                l_val.visit([&](auto val) {
                    using val_type = std::remove_cv_t<typename decltype(val)::value_type>;
                    // l_val contains only one element
                    std::vector<val_type> out_vec(s.elements(), val.front());
                    l_out = literal(s, out_vec);
                });
                return info.add_literal(l_out);
            }
            // has variable input (dynamic shape buffer)
            else
            {
                auto dv_lit = info.add_literal(l_val);
                auto alloc_ins =
                    info.add_instruction(make_op("allocate", {{"buf_type", type}}), args[0]);
                return info.add_instruction(make_op("fill"), dv_lit, alloc_ins);
            }
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
