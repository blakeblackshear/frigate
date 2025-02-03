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
#include <migraphx/tune_axis.hpp>
#include <optional>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

// generate unique output stream y, given input stream x;
//
// case unsorted:
// input x: [2, 1, 1, 3, 4, 3], attr_sorted = 0;
// output(s):
// y: [2, 1, 3, 4]   --- the unique output
// y_indices: [0, 1, 3, 4]  --- first incidence, in terms of indices of x
// x_rev_indices: [0, 1, 1, 2, 3, 2] --- x seen in terms of indices of y
// y_count: [1, 2, 2, 1] -- count at each y_index. sum = len(x)
//
// case sorted:
// input x: [2, 1, 1, 3, 4, 3], attr_sorted = 1;
// output(s):
// y: [1, 2, 3, 4]   --- the unique output
// y_indices: [1, 0, 3, 4]  --- first incidence, in terms of indices of x
// x_rev_indices: [1, 0, 0, 2, 3, 2] --- x seen in terms of indices of y
// y_count: [2, 1, 2, 1] -- count at each y_index. sum = len(x)

struct parse_unique : op_parser<parse_unique>
{

    std::vector<op_desc> operators() const { return {{"Unique"}}; }

    std::vector<instruction_ref> parse(const op_desc& opd,
                                       const onnx_parser& parser,
                                       const onnx_parser::node_info& info,
                                       std::vector<instruction_ref> args) const
    {
        int64_t sorted = 1; // default = sorted.

        if(contains(info.attributes, "sorted"))
            sorted = parser.parse_value(info.attributes.at("sorted")).at<int>();

        std::optional<int64_t> axis;
        if(contains(info.attributes, "axis"))
        {
            auto n_dim = args[0]->get_shape().ndim();
            axis       = parser.parse_value(info.attributes.at("axis")).at<int>();
            axis       = tune_axis(n_dim, *axis, opd.onnx_name);
        }
        migraphx::argument data_arg = args.back()->eval();

        auto opr     = axis ? migraphx::make_op("unique", {{"axis", *axis}, {"sorted", sorted}})
                            : migraphx::make_op("unique", {{"sorted", sorted}});
        auto u_opr   = info.add_instruction(opr, args.at(0));
        auto i_y     = info.add_instruction(make_op("get_tuple_elem", {{"index", 0}}), u_opr);
        auto i_y_idx = info.add_instruction(make_op("get_tuple_elem", {{"index", 1}}), u_opr);
        auto i_x_idx = info.add_instruction(make_op("get_tuple_elem", {{"index", 2}}), u_opr);
        auto i_count = info.add_instruction(make_op("get_tuple_elem", {{"index", 3}}), u_opr);

        return {i_y, i_y_idx, i_x_idx, i_count};
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
