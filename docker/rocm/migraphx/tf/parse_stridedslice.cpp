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
#include <migraphx/tf/op_parser.hpp>
#include <migraphx/tf/tf_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace tf {

struct parse_strideslice : op_parser<parse_strideslice>
{
    std::vector<op_desc> operators() const { return {{"StridedSlice"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const tf_parser& /*parser*/,
                          tf_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        auto starts              = args[1]->eval().get<int32_t>().to_vector();
        auto ends                = args[2]->eval().get<int32_t>().to_vector();
        auto l0                  = args[0];
        size_t num_axes          = l0->get_shape().lens().size();
        std::vector<size_t> axes = l0->get_shape().lens();

        std::vector<int64_t> op_starts(starts.begin(), starts.end());
        std::vector<int64_t> op_ends(ends.begin(), ends.end());
        std::vector<int64_t> op_axes(num_axes);
        std::iota(op_axes.begin(), op_axes.end(), 0);
        uint32_t begin_mask       = 0;
        uint32_t end_mask         = 0;
        uint32_t shrink_axis_mask = 0;
        uint32_t bitwise_compare  = 1;
        std::vector<int64_t> squeeze_axes;

        if(contains(info.attributes, "begin_mask"))
            begin_mask = static_cast<uint32_t>(info.attributes.at("begin_mask").i());

        if(contains(info.attributes, "end_mask"))
            end_mask = static_cast<uint32_t>(info.attributes.at("end_mask").i());

        if(contains(info.attributes, "shrink_axis_mask"))
            shrink_axis_mask = static_cast<uint32_t>(info.attributes.at("shrink_axis_mask").i());

        std::vector<int64_t> begin_axes = get_axes_from_mask(num_axes, begin_mask);
        std::vector<int64_t> end_axes   = get_axes_from_mask(num_axes, end_mask);

        for(size_t i = 0; i < num_axes; i++)
        {
            if(begin_axes.at(i) == 1)
            {
                op_starts.at(i) = 0;
            }
            if(end_axes.at(i) == 1)
            {
                op_ends.at(i) = axes.at(i);
            }
        }

        auto op = make_op("slice", {{"starts", op_starts}, {"ends", op_ends}, {"axes", op_axes}});
        auto l1 = info.add_instruction(op, l0);
        if(shrink_axis_mask == 0)
            return l1;

        for(size_t i = 0; i < num_axes; i++)
        {
            // the LSB corresponds to axis 0 when determining which axes to squeeze
            if(((shrink_axis_mask >> i) & bitwise_compare) == 1)
                squeeze_axes.push_back(i);
        }

        return info.add_instruction(make_op("squeeze", {{"axes", squeeze_axes}}), l1);
    }
};

} // namespace tf
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
