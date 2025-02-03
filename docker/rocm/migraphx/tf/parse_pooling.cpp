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
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/pad_calc.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace tf {

struct parse_pooling : op_parser<parse_pooling>
{
    bool transpose() const { return true; }
    std::vector<op_desc> operators() const { return {{"AvgPool"}, {"MaxPool"}}; }

    instruction_ref parse(const op_desc& opd,
                          const tf_parser& parser,
                          tf_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        if(not starts_with(opd.tf_name, "Max") and not starts_with(opd.tf_name, "Av"))
        {
            MIGRAPHX_THROW("tf pooling mode must be Max or Average");
        }
        op::pooling op{starts_with(opd.tf_name, "Max") ? op::pooling_mode::max
                                                       : op::pooling_mode::average};

        if(contains(info.attributes, "strides"))
        {
            std::vector<size_t> stride;
            copy(info.attributes.at("strides").list().i(), std::back_inserter(stride));
            parser.reorder_data(stride);
            if(stride.size() != 4)
            {
                MIGRAPHX_THROW("strides should have 4 values");
            }
            op.stride[0] = stride[2];
            op.stride[1] = stride[3];
        }
        if(contains(info.attributes, "ksize"))
        {
            std::vector<size_t> ksize;
            copy(info.attributes.at("ksize").list().i(), std::back_inserter(ksize));
            parser.reorder_data(ksize);
            if(ksize.size() != 4)
            {
                MIGRAPHX_THROW("ksize should have 4 values");
            }
            op.lengths[0] = ksize[2];
            op.lengths[1] = ksize[3];
        }

        auto l0 = args[0];
        if(contains(info.attributes, "padding"))
        {
            const std::string& pad_mode = info.attributes.at("padding").s();
            if(pad_mode.find("SAME") != std::string::npos)
            {
                auto input_dims = l0->get_shape().lens();
                std::vector<int64_t> pads(input_dims.size());
                calculate_padding(0, pads, input_dims[2], op.stride[0], 1, op.lengths[0]);
                calculate_padding(1, pads, input_dims[3], op.stride[1], 1, op.lengths[1]);

                op.padding = std::vector<size_t>(pads.begin(), pads.end());
            }
        }
        return info.add_instruction(op, l0);
    }
};

} // namespace tf
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
