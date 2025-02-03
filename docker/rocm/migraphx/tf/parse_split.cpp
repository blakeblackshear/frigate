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

struct parse_split : op_parser<parse_split>
{
    std::vector<op_desc> operators() const { return {{"Split"}, {"SplitV"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       const tf_parser& /*parser*/,
                                       tf_parser::node_info info,
                                       std::vector<instruction_ref> args) const
    {
        bool vector_as_input = args.size() == 3;
        int num_outputs      = 1;
        auto axis_arg        = args[0];
        auto input_arg       = args[1];
        if(vector_as_input)
        {
            input_arg = args[0];
            axis_arg  = args[2];
        }

        if(contains(info.attributes, "num_split"))
            num_outputs = info.attributes.at("num_split").i();

        std::vector<int> splits(num_outputs);
        std::vector<int> slice_pos{0};
        if(vector_as_input)
        {
            splits      = args[1]->eval().get<int32_t>().to_vector();
            num_outputs = splits.size();
        }

        assert(num_outputs > 0);

        if(num_outputs == 1)
            return std::vector<instruction_ref>{
                info.add_instruction(make_op("identity"), input_arg)};

        auto lens     = input_arg->get_shape().lens();
        auto num_dims = lens.size();
        int axis      = axis_arg->eval().at<int32_t>();

        // ensure split is made evenly if "num_split" is used
        assert(vector_as_input or lens[axis] % num_outputs == 0);

        auto split_size = lens[axis] / num_outputs;

        // push back first end point of slice
        if(vector_as_input)
        {
            slice_pos.push_back(splits[0]);
        }
        else
        {
            slice_pos.push_back(split_size);
        }

        // calculate remaining end points for each slice
        for(auto i = 1; i < num_outputs; i++)
        {
            if(vector_as_input)
            {
                splits[i] += splits[i - 1];
                slice_pos.push_back(splits[i]);
            }
            else
            {
                slice_pos.push_back((i + 1) * split_size);
            }
        }
        std::vector<instruction_ref> result;
        for(auto i = 0; i < num_outputs; i++)
        {
            std::vector<int64_t> axes(num_dims);
            std::iota(axes.begin(), axes.end(), 0);
            std::vector<int64_t> starts(num_dims, 0);
            std::vector<int64_t> ends(lens.begin(), lens.end());

            starts[axis] = slice_pos[i];
            ends[axis]   = slice_pos[i + 1];
            auto op      = make_op("slice", {{"axes", axes}, {"starts", starts}, {"ends", ends}});
            result.push_back(info.add_instruction(op, input_arg));
        }
        return result;
    }
};

} // namespace tf
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
