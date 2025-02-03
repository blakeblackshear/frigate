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
#include <migraphx/onnx/checks.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

template <typename Derived>
struct reduce_parser : op_parser<Derived>
{
    instruction_ref parse_reduce_oper(const std::string& op_name,
                                      const onnx_parser& parser,
                                      onnx_parser::node_info info,
                                      std::vector<instruction_ref> args) const
    {
        auto constant_axes = parse_constant_axes(args, info);

        int noop_with_empty_axes =
            parse_attribute<int>("noop_with_empty_axes", parser, info).value_or(0);

        int keep_dims = parse_attribute<int>("keepdims", parser, info).value_or(1);

        std::vector<int64_t> all_axes(args.front()->get_shape().ndim());
        std::iota(all_axes.begin(), all_axes.end(), 0);

        // Handle axes attribute, constant input axes, and missing both attribute and input cases
        if(constant_axes.has_value())
        {
            if(noop_with_empty_axes != 0 and constant_axes->empty())
                return args[0];

            if(noop_with_empty_axes == 0 and constant_axes->empty())
                constant_axes = all_axes;

            auto reduce =
                info.add_instruction(make_op(op_name, {{"axes", *constant_axes}}), args[0]);

            if(keep_dims == 0)
                return info.add_instruction(make_op("squeeze", {{"axes", *constant_axes}}), reduce);

            return reduce;
        }

        // Handle variable input axes
        if(keep_dims == 0)
            MIGRAPHX_THROW("Keepdims not supported with runtime provided axes");

        // Empty axes attribute indicates to the operator to look for axes in the inputs
        // If the input axes are empty, the default behavior of reduce_op is to be an
        // identity operator
        auto reduce_op = make_op(op_name, {{"axes", {}}});

        if(noop_with_empty_axes != 0)
            return info.add_instruction(reduce_op, args);

        if(args[1]->get_shape().dynamic())
        {
            auto reduce_input_axes = info.add_instruction(reduce_op, args);
            auto all_axes_lit      = info.add_literal(
                literal{shape{shape::type_t::int64_type, {all_axes.size()}}, all_axes});
            auto reduce_all_axes = info.add_instruction(reduce_op, args[0], all_axes_lit);
            auto zero      = info.add_literal(literal{shape{shape::type_t::int64_type}, {0u}});
            auto axes_size = info.add_instruction(make_op("dimensions_of", {{"end", 1}}), args[1]);
            auto is_axes_empty = info.add_instruction(make_op("equal"), axes_size, zero);

            return info.add_instruction(
                make_op("where"), is_axes_empty, reduce_all_axes, reduce_input_axes);
        }
        else if(args[1]->get_shape().elements() == 0)
        {
            auto all_axes_lit = info.add_literal(
                literal{shape{shape::type_t::int64_type, {all_axes.size()}}, all_axes});
            return info.add_instruction(reduce_op, args[0], all_axes_lit);
        }
        else
        {
            return info.add_instruction(reduce_op, args);
        }
    }

    private:
    template <typename T>
    std::optional<T> parse_attribute(const std::string& attribute_name,
                                     const onnx_parser& parser,
                                     onnx_parser::node_info& info) const
    {
        if(not contains(info.attributes, attribute_name))
            return std::nullopt;

        return parser.parse_value(info.attributes[attribute_name]).at<T>();
    }

    std::optional<std::vector<int64_t>> parse_constant_axes(std::vector<instruction_ref>& args,
                                                            onnx_parser::node_info& info) const
    {
        std::vector<int64_t> axes;
        if(args.size() == 2)
        {
            if(not args[1]->can_eval())
                return std::nullopt;
            args[1]->eval().visit([&](auto s) { axes.assign(s.begin(), s.end()); });
        }
        else if(contains(info.attributes, "axes"))
        {
            auto&& attr_axes = info.attributes["axes"].ints();
            axes.assign(attr_axes.begin(), attr_axes.end());
        }

        return axes;
    }
};

struct parse_reduce_op : reduce_parser<parse_reduce_op>
{
    std::vector<op_desc> operators() const
    {
        return {{"ReduceMax", "reduce_max"},
                {"ReduceMean", "reduce_mean"},
                {"ReduceMin", "reduce_min"},
                {"ReduceProd", "reduce_prod"},
                {"ReduceSum", "reduce_sum"}};
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        return parse_reduce_oper(opd.op_name, parser, std::move(info), std::move(args));
    }
};

struct parse_reduce_l1 : reduce_parser<parse_reduce_l1>
{
    std::vector<op_desc> operators() const { return {{"ReduceL1"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        args[0] = info.add_instruction(make_op("abs"), args[0]);
        return parse_reduce_oper("reduce_sum", parser, std::move(info), std::move(args));
    }
};

struct parse_reduce_l2 : reduce_parser<parse_reduce_l2>
{
    std::vector<op_desc> operators() const { return {{"ReduceL2"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        args[0]      = info.add_instruction(make_op("mul"), args[0], args[0]);
        auto sum_ins = parse_reduce_oper("reduce_sum", parser, info, std::move(args));
        return info.add_instruction(make_op("sqrt"), sum_ins);
    }
};

struct parse_reduce_log_sum : reduce_parser<parse_reduce_log_sum>
{
    std::vector<op_desc> operators() const { return {{"ReduceLogSum"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        auto sum_ins = parse_reduce_oper("reduce_sum", parser, info, std::move(args));
        return info.add_instruction(make_op("log"), sum_ins);
    }
};

struct parse_reduce_log_sum_exp : reduce_parser<parse_reduce_log_sum_exp>
{
    std::vector<op_desc> operators() const { return {{"ReduceLogSumExp"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        args[0]      = info.add_instruction(make_op("exp"), args[0]);
        auto sum_ins = parse_reduce_oper("reduce_sum", parser, info, std::move(args));
        return info.add_instruction(make_op("log"), sum_ins);
    }
};

struct parse_reduce_sum_square : reduce_parser<parse_reduce_sum_square>
{
    std::vector<op_desc> operators() const { return {{"ReduceSumSquare"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        args[0] = info.add_instruction(make_op("mul"), args[0], args[0]);
        return parse_reduce_oper("reduce_sum", parser, std::move(info), std::move(args));
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
