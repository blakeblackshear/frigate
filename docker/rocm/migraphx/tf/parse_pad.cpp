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
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace tf {

struct parse_pad : op_parser<parse_pad>
{
    bool transpose() const { return true; }
    std::vector<op_desc> operators() const { return {{"Pad"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const tf_parser& parser,
                          const tf_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        size_t ndims = args.front()->get_shape().lens().size();

        // in tf, the paddings are arranged as a 2d shape (ndims, 2),
        // the last dim contains the left padding and right padding respectively
        std::vector<std::pair<int32_t, int32_t>> pad_per_dim(ndims);
        auto tf_padding = args[1]->eval().get<int32_t>().to_vector();
        for(size_t i = 0; i < 2 * ndims; i += 2)
        {
            pad_per_dim[i / 2].first  = tf_padding[i];
            pad_per_dim[i / 2].second = tf_padding[i + 1];
        }
        parser.reorder_data(pad_per_dim);

        std::vector<int64_t> pads(ndims * 2);
        for(size_t i = 0; i < ndims; i++)
        {
            pads[i]         = pad_per_dim[i].first;
            pads[i + ndims] = pad_per_dim[i].second;
        }
        return info.add_instruction(make_op("pad", {{"pads", pads}}), args.front());
    }
};

} // namespace tf
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
