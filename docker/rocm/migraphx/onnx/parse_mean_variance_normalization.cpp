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
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_mean_variance_normalization : op_parser<parse_mean_variance_normalization>
{
    std::vector<op_desc> operators() const { return {{"MeanVarianceNormalization"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& /*parser*/,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        auto&& data    = args.front();
        auto data_rank = data->get_shape().ndim();
        std::vector<int64_t> axes{0, 2, 3};

        if(contains(info.attributes, "axes"))
        {
            const auto& axes_attr = info.attributes["axes"].ints();
            axes.assign(axes_attr.begin(), axes_attr.end());
        }
        else if(data_rank != 4)
        {
            MIGRAPHX_THROW(
                "Input tensor needs to be rank 4 when axes is not specified. Instead it is rank " +
                std::to_string(data_rank));
        }

        if(axes.size() != data_rank - 1)
        {
            MIGRAPHX_THROW("Length of axes array needs to be equal to input tensor rank - 1");
        }

        auto data_mean = info.add_instruction(make_op("reduce_mean", {{"axes", axes}}), data);
        auto data_mean_squared = info.add_common_op("mul", data_mean, data_mean);

        auto data_squared = info.add_common_op("mul", data, data);
        auto data_squared_mean =
            info.add_instruction(make_op("reduce_mean", {{"axes", axes}}), data_squared);

        auto mean_sub = info.add_common_op("sub", data_squared_mean, data_mean_squared);
        auto std      = info.add_common_op("sqrt", mean_sub);

        auto dividend = info.add_common_op("sub", data, data_mean);
        auto epsilon =
            info.add_literal({data->get_shape().type(),
                              {data->get_shape().type() == shape::half_type ? 1e-7 : 1e-9}});
        auto divisor = info.add_common_op("add", std, epsilon);

        return info.add_common_op("div", dividend, divisor);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
