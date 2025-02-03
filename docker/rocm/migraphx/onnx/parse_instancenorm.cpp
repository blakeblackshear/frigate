/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#include <iterator>
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/env.hpp>

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_DISABLE_FP16_INSTANCENORM_CONVERT);

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_instancenorm : op_parser<parse_instancenorm>
{
    std::set<shape::type_t> valid_types = {
        shape::float_type, shape::half_type, shape::double_type, shape::bf16_type};

    std::vector<op_desc> operators() const { return {{"InstanceNormalization"}}; }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> oargs) const
    {
        // y = scale * ( x - mean ) / sqrt ( variance + epsilon ) + bias
        // mean = reduce_mean({D1, D2, ... Dk}, x)
        // variance = reduce_mean({D1, D2, ... Dk}, (x - mean)^2)
        // Convert fp16 to fp32 to workaround for FP16 accuracy issues with reduce_mean/variance.
        bool convert_fp16 = true;
        if(enabled(MIGRAPHX_DISABLE_FP16_INSTANCENORM_CONVERT{}))
        {
            convert_fp16 = false;
        }
        float epsilon = 1e-5f;
        if(contains(info.attributes, "epsilon"))
        {
            epsilon = parser.parse_value(info.attributes.at("epsilon")).at<float>();
        }
        auto dtype         = oargs[0]->get_shape().type();
        auto literal_dtype = dtype;
        std::vector<instruction_ref> args;
        // cppcheck-suppress knownConditionTrueFalse
        if(dtype == shape::half_type and convert_fp16)
        {
            std::transform(oargs.begin(), oargs.end(), std::back_inserter(args), [&](const auto i) {
                return info.add_instruction(
                    make_op("convert", {{"target_type", shape::float_type}}), i);
            });
            literal_dtype = shape::float_type;
        }
        else
        {
            args = oargs;
        }

        auto x     = args[0];
        auto scale = args[1];
        auto bias  = args[2];
        if(not contains(valid_types, dtype))
            MIGRAPHX_THROW(opd.onnx_name + ": invalid output type: " + std::to_string(dtype) +
                           ". Valid types are 1 (float), 10 (half), and 11 (double).");

        auto ndims = x->get_shape().ndim();
        assert(ndims >= 2);
        auto kdims = ndims - 2;
        std::vector<int64_t> axes(kdims);
        std::iota(axes.begin(), axes.end(), 2);
        auto mean = info.add_instruction(make_op("reduce_mean", {{"axes", axes}}), x);

        // Use add_common_op() to insert multibroadcast/convert instructions where needed when
        // inputs may be either static or dynamic.
        auto l1 = info.add_common_op("sub", x, mean);
        // for the fp16, if not converting to fp32 then divide `x` and `mean` by `sqrt(n)` and take
        // reduce_sum to calculate variance i.e.
        // var =  reduce_sum((x/s_n - mean/s_n)^2) where s_n = sqrt(n)
        std::string reduce_op_name =
            (dtype == shape::half_type and not convert_fp16) ? "reduce_sum" : "reduce_mean";
        if(dtype == shape::half_type and not convert_fp16)
        {
            if(x->get_shape().dynamic())
            {
                MIGRAPHX_THROW("PARSE_INSTANCENORM: half type not supported with dynamic shape "
                               "unless convert_fp16 is TRUE");
            }
            auto dims = x->get_shape().lens();
            double n =
                std::accumulate(dims.begin() + 2, dims.end(), 1, [&](const auto& i, const auto& j) {
                    return i * j;
                });
            n              = 1.0 / std::sqrt(n);
            auto n_literal = info.add_literal(literal{dtype, {n}});
            x              = info.add_common_op("mul", {x, n_literal});
        }
        auto l0              = info.add_common_op("sqdiff", x, mean);
        auto variance        = info.add_instruction(make_op(reduce_op_name, {{"axes", axes}}), l0);
        auto epsilon_literal = info.add_literal(literal{shape{literal_dtype}, {epsilon}});
        auto l2              = info.add_common_op("add", variance, epsilon_literal);

        auto l3 = info.add_instruction(make_op("rsqrt"), l2);
        auto l4 = info.add_common_op("mul", l1, l3);

        // add_common_op() doesn't apply the plain broadcast op, so we add that op explicitly for
        // both scale and bias.
        instruction_ref scale_bcast;
        instruction_ref bias_bcast;
        if(x->get_shape().dynamic())
        {
            scale_bcast = info.add_instruction(make_op("broadcast", {{"axis", 1}}), scale, x);
            bias_bcast  = info.add_instruction(make_op("broadcast", {{"axis", 1}}), bias, x);
        }
        else
        {
            auto dims   = x->get_shape().lens();
            scale_bcast = info.add_instruction(
                make_op("broadcast", {{"axis", 1}, {"out_lens", dims}}), scale);
            bias_bcast =
                info.add_instruction(make_op("broadcast", {{"axis", 1}, {"out_lens", dims}}), bias);
        }
        auto l5  = info.add_instruction(make_op("mul"), l4, scale_bcast);
        auto ret = info.add_instruction(make_op("add"), l5, bias_bcast);
        if(dtype == shape::half_type and convert_fp16)
        {
            return info.add_instruction(make_op("convert", {{"target_type", shape::half_type}}),
                                        ret);
        }
        return ret;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
