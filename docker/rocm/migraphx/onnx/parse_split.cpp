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
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/tune_axis.hpp>
#include <migraphx/onnx/checks.hpp>

#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

auto parse_dyn_split(const onnx_parser::node_info& info,
                     const std::vector<instruction_ref>& args,
                     int64_t tuned_axis)
{
    if(contains(info.attributes, "split"))
    {
        MIGRAPHX_THROW("PARSE_SPLIT: dynamic input and non-fixed split axis and `split` "
                       "attribute not supported");
    }
    if(args.size() == 2)
    {
        MIGRAPHX_THROW("PARSE_SPLIT: dynamic input and non-fixed split axis and `split` "
                       "input not supported");
    }

    std::size_t num_outputs = info.num_outputs;
    std::vector<instruction_ref> ret_ins(num_outputs);

    // Doing shape calculations for the splits in the graph
    auto split_dim = info.add_instruction(
        make_op("dimensions_of", {{"start", tuned_axis}, {"end", tuned_axis + 1}}), args[0]);
    shape int64_scalar_shape{shape::int64_type, {1}, {0}};
    auto num_outputs_lit         = info.add_literal(literal{int64_scalar_shape, {num_outputs}});
    auto num_outputs_minus_1_lit = info.add_literal(literal{int64_scalar_shape, {num_outputs - 1}});
    // (A + (B - 1)) / B == ceil(A / B)
    auto chunk_size = info.add_instruction(
        make_op("div"),
        info.add_instruction(make_op("add"), split_dim, num_outputs_minus_1_lit),
        num_outputs_lit);
    for(int n = 0; n < num_outputs - 1; ++n)
    {
        // slice(input, starts = {n * chunk_size}, ends = {(n+1) * chunk_size}); axes =
        // {tuned_axis}
        ret_ins.at(n) = info.add_instruction(
            make_op("slice", {{"axes", {tuned_axis}}}),
            args[0],
            info.add_instruction(
                make_op("mul"), chunk_size, info.add_literal(literal{int64_scalar_shape, {n}})),
            info.add_instruction(make_op("mul"),
                                 chunk_size,
                                 info.add_literal(literal{int64_scalar_shape, {n + 1}})));
    }
    // last slice: slice(input, starts = {n * chunk_size}); ends = max_int, axes =
    // {tuned_axis}
    ret_ins.at(num_outputs - 1) = info.add_instruction(
        make_op("slice", {{"axes", {tuned_axis}}, {"ends", {std::numeric_limits<int64_t>::max()}}}),
        args[0],
        info.add_instruction(make_op("mul"),
                             chunk_size,
                             info.add_literal(literal{int64_scalar_shape, {num_outputs - 1}})));
    return ret_ins;
}

auto parse_static_split(const onnx_parser::node_info& info,
                        const onnx_parser& parser,
                        const std::vector<instruction_ref>& args,
                        int64_t tuned_axis)
{
    const auto& input_shape = args[0]->get_shape();
    // either static shape or fixed dynamic_dimension for split axis
    auto tuned_axis_len = input_shape.to_static(0).lens().at(tuned_axis);
    std::vector<int64_t> vec_splits;
    if(contains(info.attributes, "split"))
    {
        literal s = parser.parse_value(info.attributes.at("split"));
        s.visit([&](auto v) { vec_splits.assign(v.begin(), v.end()); });
    }
    else if(args.size() == 2)
    {
        auto s = args[1]->eval();
        check_arg_empty(s, "PARSE_SPLIT: non-constant `split` input is not supported");
        s.visit([&](auto v) { vec_splits.assign(v.begin(), v.end()); });
    }
    // no split attribute, input is equally divided
    else
    {
        std::size_t num_outputs = info.num_outputs;
        // the num_outputs attribute seems to be redundant since we already have
        // node_info::num_outputs, but we can still perform an error check
        if(contains(info.attributes, "num_outputs"))
        {
            num_outputs = parser.parse_value(info.attributes.at("num_outputs")).at<std::size_t>();
            if(num_outputs != info.num_outputs)
            {
                MIGRAPHX_THROW("PARSE_SPLIT: num_outputs attribute " + std::to_string(num_outputs) +
                               " doesn't match actual number of outputs " +
                               std::to_string(info.num_outputs) + "!");
            }
        }
        if(tuned_axis_len % num_outputs == 0)
        {
            std::size_t chunk_size = tuned_axis_len / num_outputs;
            vec_splits.resize(num_outputs, chunk_size);
        }
        else
        {
            std::size_t chunk_size      = tuned_axis_len / num_outputs + 1;
            std::size_t last_chunk_size = tuned_axis_len - chunk_size * (num_outputs - 1);
            vec_splits.resize(num_outputs - 1, chunk_size);
            vec_splits.push_back(last_chunk_size);
        }
    }

    if(std::accumulate(vec_splits.begin(), vec_splits.end(), int64_t(0)) !=
       static_cast<int64_t>(tuned_axis_len))
    {
        MIGRAPHX_THROW(
            "PARSE_SPLIT: sum of split attribute unequal to dim size of axis! tuned axis:" +
            std::to_string(tuned_axis_len) + " Output " + to_string_range(vec_splits) + " Rank " +
            std::to_string(input_shape.ndim()));
    }

    std::vector<instruction_ref> ret_ins;
    int64_t start = 0;
    for(auto sl : vec_splits)
    {
        ret_ins.push_back(info.add_instruction(
            make_op("slice", {{"axes", {tuned_axis}}, {"starts", {start}}, {"ends", {start + sl}}}),
            args[0]));
        start += sl;
    }

    return ret_ins;
}

struct parse_split : op_parser<parse_split>
{
    std::vector<op_desc> operators() const { return {{"Split"}}; }

    std::vector<instruction_ref> parse(const op_desc& opd,
                                       const onnx_parser& parser,
                                       onnx_parser::node_info info,
                                       std::vector<instruction_ref> args) const
    {
        int64_t axis = 0;
        if(contains(info.attributes, "axis"))
        {
            axis = parser.parse_value(info.attributes.at("axis")).at<int>();
        }

        const auto& input_shape = args[0]->get_shape();
        // axis over which the split occurs (split_axis)
        int64_t tuned_axis = tune_axis(input_shape.ndim(), axis, opd.onnx_name);

        auto split_axis_is_fixed = [&]() {
            return input_shape.dyn_dims().at(tuned_axis).is_fixed();
        };

        if(input_shape.dynamic() and not split_axis_is_fixed())
        {
            return parse_dyn_split(info, args, tuned_axis);
        }
        else
        {
            return parse_static_split(info, parser, args, tuned_axis);
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
