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
#include <migraphx/instruction_ref.hpp>
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/onnx/onnx_parser.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_if : op_parser<parse_if>
{
    std::vector<op_desc> operators() const { return {{"If"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       onnx_parser& parser,
                                       const onnx_parser::node_info& info,
                                       std::vector<instruction_ref> args) const
    {
        const auto& then_graph = info.attributes.at("then_branch").g();
        const auto& else_graph = info.attributes.at("else_branch").g();

        if(args.front()->get_shape().elements() != 1)
        {
            MIGRAPHX_THROW("PARSE_IF: " + info.name +
                           " condition input can have only one element!");
        }

        // Fold instruction if condition is constant thus can be evaled
        // prior to inference
        if(args.front()->can_eval())
        {
            auto cond_arg = args.front()->eval();
            auto* mod     = info.mod;
            // then branch
            if(cond_arg.at<bool>())
            {
                return parser.parse_graph(mod, then_graph, true);
            }
            // else branch
            else
            {
                return parser.parse_graph(mod, else_graph, true);
            }
        }

        std::string then_name = info.name + "_if";
        module_ref then_mdl   = parser.prog.create_module(then_name);

        std::string else_name = info.name + "_else";
        module_ref else_mdl   = parser.prog.create_module(else_name);

        // parse the then sub_graph
        (void)parser.parse_graph(then_mdl, then_graph);

        // parse_the else sub_graph
        (void)parser.parse_graph(else_mdl, else_graph);

        auto then_out_shapes = then_mdl->get_output_shapes();
        auto else_out_shapes = else_mdl->get_output_shapes();
        if(not std::equal(then_out_shapes.begin(),
                          then_out_shapes.end(),
                          else_out_shapes.begin(),
                          else_out_shapes.end()))
        {
            MIGRAPHX_THROW("PARSE_IF: " + info.name +
                           " then and else sub_grahps must have same output shapes!");
        }

        auto if_ret = info.add_instruction(make_op("if"), args, {then_mdl, else_mdl});
        auto out_s  = if_ret->get_shape();
        assert(out_s.type() == shape::tuple_type);

        const auto& vec_shapes = out_s.sub_shapes();
        std::vector<instruction_ref> out_inss;
        for(std::size_t i = 0; i < vec_shapes.size(); ++i)
        {
            auto ret = info.add_instruction(make_op("get_tuple_elem", {{"index", i}}), if_ret);
            out_inss.push_back(ret);
        }

        return out_inss;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
