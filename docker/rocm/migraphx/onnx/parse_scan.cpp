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
#include <migraphx/argument.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/module_ref.hpp>
#include <migraphx/onnx/onnx_parser.hpp>
#include <algorithm>
#include <cstdint>
#include <ios>
#include <iterator>
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_scan : op_parser<parse_scan>
{
    std::vector<op_desc> operators() const { return {{"Scan"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       onnx_parser& parser,
                                       onnx_parser::node_info info,
                                       std::vector<instruction_ref> args) const
    {
        if(parser.opset_version == 8)
            MIGRAPHX_THROW("Scan: Opset 8 version not supported");

        check_for_required_attributes(info, {"body", "num_scan_inputs"});

        const auto& body_graph = info.attributes["body"].g();
        auto* body             = parser.prog.create_module(info.name + "_scan");
        parser.parse_graph(body, body_graph);

        // Scan has:
        // N + M inputs (N state variables, M scan inputs)
        // N + K outputs (N state variables, K scan outputs)
        // Same input and output counts apply for body
        auto body_outs = body->get_returns();
        const auto m   = info.attributes["num_scan_inputs"].i();
        const auto n   = args.size() - m;
        const auto k   = body_outs.size() - n;

        std::vector<instruction_ref> body_params;
        transform(body->get_parameter_names(),
                  std::back_inserter(body_params),
                  [&](const auto& name) { return body->get_parameter(name); });

        if(auto num_body_params = body_params.size(); num_body_params != n + m)
            MIGRAPHX_THROW("Scan: Number of inputs to body {" + std::to_string(num_body_params) +
                           "} does not match number of inputs to Scan {" + std::to_string(n + m) +
                           "}");

        const auto scan_input_axes = parse_axes(info, "scan_input_axes", m, args.begin() + n, 0);
        const auto scan_input_directions = parse_dirs(info, "scan_input_directions", m);
        const auto scan_output_axes =
            parse_axes(info, "scan_output_axes", k, body_outs.begin() + n, 1);
        const auto scan_output_directions = parse_dirs(info, "scan_output_directions", k);

        // Check that scan axes lens are the same across all scan inputs
        size_t num_iters = args[n]->get_shape().lens()[scan_input_axes[0]];
        for(auto i = 1; i < m; ++i)
            if(args[n + i]->get_shape().lens()[scan_input_axes[i]] != num_iters)
                MIGRAPHX_THROW(
                    "Scan: Lengths of scan_input_axes do not match across all scan inputs.\n"
                    "Scan input shapes: " +
                    to_string_range(
                        to_shapes(std::vector<instruction_ref>(args.begin() + n, args.end()))) +
                    "\nScan input axes: " + to_string_range(scan_input_axes));

        if(num_iters > parser.max_loop_iterations)
            MIGRAPHX_THROW("Scan: Number of required iterations {" + std::to_string(num_iters) +
                           "} would exceed the maximum iteration limit {" +
                           std::to_string(parser.max_loop_iterations) + "}");

        // Check that state variable shapes match between the Scan node and its body attribute
        for(auto i = 0; i < n; ++i)
            if(args[i]->get_shape() != body_params[i]->get_shape())
                MIGRAPHX_THROW("Scan: State input " + std::to_string(i) + " shape {" +
                               to_string(args[i]->get_shape()) +
                               "} does not match corresponding body input shape {" +
                               to_string(body_params[i]->get_shape()) + "}");

        // Check that the shapes of scan inputs sliced across scan input axes match the shapes of
        // the body attribute scan inputs
        for(auto i = 0; i < m; ++i)
        {
            auto node_shape = args[i + n]->get_shape();
            auto node_lens  = node_shape.lens();
            node_lens.erase(node_lens.begin() + scan_input_axes[i]);
            auto slice_sh = shape(node_shape.type(), std::move(node_lens));
            if(body_params[i + n]->get_shape() != slice_sh)
                MIGRAPHX_THROW("Slice: Sliced scan input " + std::to_string(i) + " shape {" +
                               to_string(slice_sh) +
                               "} does not match corresponding body input shape {" +
                               to_string(body_params[i + n]->get_shape()) + "}");
        }

        modify_body(body, args, n, m, scan_input_axes, scan_input_directions);

        auto max_iter_lit = info.add_literal(literal{shape{shape::int64_type}, {num_iters}});
        auto cond_lit     = info.add_literal(literal{shape{shape::bool_type}, {true}});
        std::vector<instruction_ref> loop_args{max_iter_lit, cond_lit};
        loop_args.insert(loop_args.end(), args.begin(), args.begin() + n);

        auto loop =
            info.add_instruction(make_op("loop",
                                         {{"max_iterations", num_iters},
                                          {"scan_output_directions", scan_output_directions}}),
                                 loop_args,
                                 {body});

        std::vector<instruction_ref> ret;
        ret.reserve(n + k);
        for(auto i = 0; i < n; ++i)
            ret.push_back(info.add_instruction(make_op("get_tuple_elem", {{"index", i}}), loop));

        for(auto i = 0; i < k; ++i)
        {
            auto o = info.add_instruction(make_op("get_tuple_elem", {{"index", i + n}}), loop);
            // Loop concatenates scan axes along axis 0 which is inserted/unsqueezed, e.g. a body
            // scan output(from a single iteration) of shape {2, 2} is first expanded to {1, 2, 2},
            // and then concatenated with body scan outputs from previous iterations. For n
            // iterations of the loop, this will end up producing a scan output of shape {n, 2, 2}.
            //
            // The scan_output_axes attribute of Scan can define an axis other than zero as the
            // concatenation axis. Using the previous scenario, for a body scan output of
            // shape {2,2}, with the scan output axis being 1, it is unsqueezed to {2, 1, 2}. The
            // final concatenation is then of shape {2, n, 2}.
            //
            // Since Loop only concatenates along the unsqueezed axis 0, a transpose is necessary to
            // place axis 0 in the appropriate scan_output_axis position
            auto perm = make_perm_for_scan_out(o->get_shape().ndim(), scan_output_axes[i]);
            ret.push_back(info.add_instruction(make_op("transpose", {{"permutation", perm}}), o));
        }

        return ret;
    }

    void check_for_required_attributes(onnx_parser::node_info& info,
                                       const std::vector<std::string>& attribute_names) const
    {
        auto it = std::find_if(
            attribute_names.cbegin(), attribute_names.cend(), [&](const std::string& name) {
                return not contains(info.attributes, name);
            });
        if(it != attribute_names.cend())
            MIGRAPHX_THROW("Scan: " + *it + " attribute required");
    }

    std::vector<int64_t> parse_vector_attribute(onnx_parser::node_info& info,
                                                const std::string& attr_name,
                                                size_t expected_size) const
    {
        if(not contains(info.attributes, attr_name))
            return {};

        std::vector<int64_t> res;
        auto&& attr = info.attributes[attr_name].ints();
        if(attr.size() != expected_size)
            MIGRAPHX_THROW("Scan: " + attr_name + " size is " + to_string(attr.size()) +
                           ", should be " + to_string(expected_size));
        res.assign(attr.begin(), attr.end());

        return res;
    }

    std::vector<int64_t>
    parse_dirs(onnx_parser::node_info& info, const std::string& name, size_t expected_size) const
    {
        auto dirs = parse_vector_attribute(info, name, expected_size);
        if(dirs.empty())
            return std::vector<int64_t>(expected_size, 0); // NOLINT

        if(any_of(dirs, [](auto i) { return i != 0 and i != 1; }))
            MIGRAPHX_THROW("Scan: " + name +
                           " may contain only 1s and 0s, actual values: " + to_string_range(dirs));

        return dirs;
    }

    int64_t normalize_axis(int64_t axis, int64_t rank, const std::string& attr_name) const
    {
        if(axis < -rank or axis >= rank)
            MIGRAPHX_THROW("Scan: " + attr_name + " axis value {" + to_string(axis) +
                           "} out of range [" + to_string(-rank) + ", " + to_string(rank) + ")");

        return axis < 0 ? rank + axis : axis;
    }

    std::vector<int64_t> parse_axes(onnx_parser::node_info& info,
                                    const std::string& name,
                                    long expected_size,
                                    std::vector<instruction_ref>::iterator ins_begin,
                                    size_t rank_offset) const
    {
        auto axes = parse_vector_attribute(info, name, expected_size);
        if(axes.empty())
            return std::vector<int64_t>(expected_size, 0); // NOLINT

        std::transform(axes.begin(),
                       axes.end(),
                       ins_begin,
                       axes.begin(),
                       [&](int64_t axis, instruction_ref arg) {
                           return normalize_axis(axis, arg->get_shape().ndim() + rank_offset, name);
                       });

        return axes;
    }

    // Alter the Scan body to match a body that Loop would expect.
    //
    // Loop body inputs: iteration_num, condition, loop_state_variables
    // Scan body inputs: loop_state_variables, scan_input_slices
    // iteration_num and condition parameters are prepended to the Scan body parameter list, while
    // scan_input_slices are removed from parameters.
    // Instead, scan_inputs are used directly in Scan body(as values from enclosing scope), and
    // together with iteration_num passed to the scan_slice operator which produces slices that are
    // used instead of the scan_inputs_slices.
    //
    // Loop body outputs: condition, loop_state_variables, scan_output_slices
    // Scan body outputs: loop_state_variables, scan_output_slices
    // The inserted Scan body condition parameter is prepended to the Scan body returns
    void modify_body(module_ref mod,
                     const std::vector<instruction_ref>& args,
                     int64_t n,
                     int64_t m,
                     const std::vector<int64_t>& scan_input_axes,
                     const std::vector<int64_t>& scan_input_directions) const
    {
        std::vector<instruction_ref> params;
        params.reserve(n + m);
        transform(mod->get_parameter_names(),
                  std::back_inserter(params),
                  [&](const std::string& name) { return mod->get_parameter(name); });

        // iteration_num, condition, and duplicate loop_state_variables are appended to parameters.
        // References to the original loop_state_variables in other instructions are then replaced
        // with references to the duplicate ones, after which the originals are removed.
        //
        // References to the scan_input_slices are replaced with references to inserted
        // scan_slice->squeeze instructions, after which the scan_input_slices parameters are
        // removed.
        auto iter_param = mod->add_parameter("iter", shape{shape::int64_type});
        auto cond_param = mod->add_parameter("cond", shape{shape::bool_type});
        std::vector<instruction_ref> new_params;
        new_params.reserve(n);
        for(auto i = 0; i < n; ++i)
            new_params.push_back(
                mod->add_parameter("state_var" + std::to_string(i), params[i]->get_shape()));

        for(auto i = 0; i < params.size(); ++i)
        {
            if(i < n)
            {
                mod->replace_instruction(params[i], new_params[i]);
            }
            else
            {
                auto scan_axis = scan_input_axes[i - n];
                auto scan_dir  = scan_input_directions[i - n];
                auto new_ins   = mod->insert_instruction(
                    params[i],
                    make_op("scan_slice", {{"axis", scan_axis}, {"direction", scan_dir}}),
                    args[i],
                    iter_param);
                new_ins = mod->insert_instruction(
                    params[i], make_op("squeeze", {{"axes", {scan_axis}}}), new_ins);
                mod->replace_instruction(params[i], new_ins);
            }
            mod->remove_instruction(params[i]);
        }

        auto returns = mod->get_returns();
        returns.insert(returns.begin(), cond_param);
        mod->replace_return(returns);
    }

    // Creates permutation so that axis 0 will be permuted to position axis, while maintaining the
    // relative ordering of all the other axes.
    // e.g. for rank = 4, axis = 2, the created perm is: [1, 2, 0, 3]
    std::vector<int64_t> make_perm_for_scan_out(int64_t rank, int64_t axis) const
    {
        std::vector<int64_t> perm(rank);
        std::iota(perm.begin(), perm.end(), 0);
        std::copy(perm.begin() + 1, perm.begin() + 1 + axis, perm.begin());
        perm[axis] = 0;

        return perm;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
