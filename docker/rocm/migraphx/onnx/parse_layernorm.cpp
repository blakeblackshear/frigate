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
#include <migraphx/make_op.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_layernorm : op_parser<parse_layernorm>
{
    std::vector<op_desc> operators() const { return {{"LayerNormalization"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       const onnx_parser& parser,
                                       const onnx_parser::node_info& info,
                                       std::vector<instruction_ref> args) const
    {
        int64_t axis = -1;
        if(contains(info.attributes, "axis"))
        {
            axis = parser.parse_value(info.attributes.at("axis")).at<int64_t>();
        }
        float epsilon = 1e-5f;
        if(contains(info.attributes, "epsilon"))
        {
            epsilon = parser.parse_value(info.attributes.at("epsilon")).at<float>();
        }
        if(contains(info.attributes, "stash_type"))
        {
            std::cerr << "WARNING: LAYERNORM does not support stash_type, it will be ignored.\n";
        }

        if(args.size() < 2 or args.size() > 3)
        {
            MIGRAPHX_THROW("PARSE_LAYERNORM: invalid input count");
        }

        auto x         = args.at(0);
        auto scale     = args.at(1);
        bool skip_bias = args.size() == 2;
        instruction_ref bias;
        if(not skip_bias)
        {
            bias = args.at(2);
        }

        auto x_shape   = x->get_shape();
        auto x_dtype   = x_shape.type();
        int64_t x_rank = x_shape.ndim();

        if(x_rank < 2)
        {
            MIGRAPHX_THROW("PARSE_LAYERNORM: invalid input shape");
        }

        // If rank(X) is r, axis' allowed range is [-r, r)
        if(axis < -x_rank or axis >= x_rank)
        {
            MIGRAPHX_THROW("PARSE_LAYERNORM: invalid axis");
        }

        // y = (x - mean) * rsqrt(variance + epsilon) * scale + bias
        // mean = reduce_mean({D1, D2, ... Dk}, x)
        // variance = reduce_mean({D1, D2, ... Dk}, (x - mean)^2)

        // axis can be negative
        axis = axis < 0 ? axis + x_rank : axis;

        auto kdims = x_rank - axis;
        std::vector<int64_t> axes(kdims);
        std::iota(axes.begin(), axes.end(), axis);
        auto skipped_axes = x_rank - kdims;

        auto mean          = info.add_instruction(make_op("reduce_mean", {{"axes", axes}}), x);
        auto x_sub_mean    = info.add_common_op("sub", x, mean);
        auto x_sqdiff_mean = info.add_common_op("sqdiff", x, mean);
        auto variance =
            info.add_instruction(make_op("reduce_mean", {{"axes", axes}}), x_sqdiff_mean);
        epsilon =
            (x_dtype == migraphx::shape::half_type and std::abs(epsilon) < 1e-7) ? 1e-7 : epsilon;
        auto eps     = info.add_literal(migraphx::literal{migraphx::shape{x_dtype}, {epsilon}});
        auto var_eps = info.add_common_op("add", variance, eps);
        auto rsqrt   = info.add_instruction(make_op("rsqrt"), var_eps);
        auto result  = info.add_common_op("mul", x_sub_mean, rsqrt);

        instruction_ref scale_bcast = scale;
        instruction_ref bias_bcast  = bias;
        if(skipped_axes > 0)
        {
            auto x_dims = x_shape.lens();
            scale_bcast = info.add_instruction(
                make_op("broadcast", {{"axis", skipped_axes}, {"out_lens", x_dims}}), scale);
            if(not skip_bias)
            {
                bias_bcast = info.add_instruction(
                    make_op("broadcast", {{"axis", skipped_axes}, {"out_lens", x_dims}}), bias);
            }
        }
        auto scaled = info.add_instruction(make_op("mul"), result, scale_bcast);
        auto y      = skip_bias ? scaled : info.add_instruction(make_op("add"), scaled, bias_bcast);
        return {y, mean, rsqrt};
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
