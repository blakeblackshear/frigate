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
#include <migraphx/literal.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_constant : op_parser<parse_constant>
{
    std::vector<op_desc> operators() const { return {{"Constant"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          const std::vector<instruction_ref>& /*args*/) const
    {
        static const std::vector<std::string> attributes = {
            "value", "value_float", "value_floats", "value_int", "value_ints"};

        std::vector<std::string> present_attributes;
        std::copy_if(attributes.begin(),
                     attributes.end(),
                     std::back_inserter(present_attributes),
                     [&](const std::string& a) { return contains(info.attributes, a); });

        if(present_attributes.empty())
        {
            MIGRAPHX_THROW("Constant node does not contain any supported attribute");
        }

        if(present_attributes.size() > 1)
        {
            MIGRAPHX_THROW("Constant contains multiple attributes: " +
                           join_strings(std::move(present_attributes), ", "));
        }

        // cppcheck-suppress accessMoved
        auto&& attr = info.attributes[present_attributes[0]];
        literal v   = parser.parse_value(attr);

        // return empty literal
        if(v.get_shape().elements() == 0)
        {
            return info.add_literal(literal{v.get_shape().type()});
        }

        // if dim_size is 0, it is a scalar
        if(attr.has_t() and attr.t().dims_size() == 0)
        {
            migraphx::shape scalar_shape{v.get_shape().type()};
            return info.add_literal(migraphx::literal{scalar_shape, v.data()});
        }

        return info.add_literal(v);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
