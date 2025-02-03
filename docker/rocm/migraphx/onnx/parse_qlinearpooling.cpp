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
#include <migraphx/onnx/pooling.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/onnx/broadcast_qdq.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

/*
 *********************************************************************************
 *  Reference: see QLinearAveragePool and QLinearGlobalAveragePool in            *
 *  github.com/microsoft/onnxruntime/blob/main/docs/ContribOperators.md          *
 *********************************************************************************
 */

struct parse_qlinearpooling : op_parser<parse_qlinearpooling>
{
    std::vector<op_desc> operators() const
    {
        return {{"QLinearGlobalAveragePool", "average"}, {"QLinearAveragePool", "average"}};
    }

    void check_inputs(const op_desc& opd, const std::vector<instruction_ref>& args) const
    {
        const auto& in_x     = args[0];
        const auto onnx_name = opd.onnx_name;

        if(in_x->get_shape().ndim() <= 2)
            MIGRAPHX_THROW(onnx_name + ": input dimensions too small");

        auto type_x = in_x->get_shape().type();
        if(type_x != migraphx::shape::int8_type and type_x != migraphx::shape::uint8_type)
            MIGRAPHX_THROW(onnx_name + ": unsupported input type");

        const auto& zero_pt_x = args[2];
        if(type_x != zero_pt_x->get_shape().type())
            MIGRAPHX_THROW(onnx_name + ": mismatched type: input zero point");

        if(args.size() == 5)
        {
            const auto& zero_pt_y = args[4];
            if(type_x != zero_pt_y->get_shape().type())
                MIGRAPHX_THROW(onnx_name + ": mismatched type: output zero point");
        }
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          const std::vector<instruction_ref>& args) const
    {
        if(contains(info.attributes, "channel_last"))
        {
            int channels_last =
                parser.parse_value(info.attributes.at("channels_last")).template at<int>();
            if(channels_last != 0)
                MIGRAPHX_THROW(opd.onnx_name + ": channels_last (N x D1..Dn x C) is not supported");
        }

        check_inputs(opd, args);

        // Input: X

        const auto& in_x      = args[0];
        const auto& scale_x   = args[1];
        const auto& zero_pt_x = args[2];
        auto dquant_x         = bcast_qdq_instr("dequantizelinear", in_x, scale_x, zero_pt_x, info);

        // Output Y = pooling_op(X)

        auto out_y = add_pooling_op(opd, info, dquant_x);

        const auto& in_scale_y = args[3];
        // zero_pt for Y is supplied as the last optional argument..
        if(args.size() == 5)
            return (bcast_qdq_instr("quantizelinear", out_y, in_scale_y, args[4], info));

        // if no zero_pt: just broadcast the scale..
        auto bcast_scale_y = bcast_scalar_instr(out_y->get_shape(), in_scale_y, info);
        return (info.add_instruction(migraphx::make_op("quantizelinear"), out_y, bcast_scale_y));
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
