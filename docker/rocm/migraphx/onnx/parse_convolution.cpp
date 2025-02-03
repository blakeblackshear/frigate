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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/onnx/conv.hpp>
#include <migraphx/onnx/padding.hpp>
#include <migraphx/op/common.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/literal.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_convolution : op_parser<parse_convolution>
{
    std::vector<op_desc> operators() const
    {
        return {{"Conv", "convolution"}, {"ConvInteger", "quant_convolution"}};
    }

    // Convert to half prior to a shift to ensure we preserve accuracy here then
    // convert back to int8
    static instruction_ref add_int8_shift(const onnx_parser::node_info& info,
                                          const instruction_ref& offset_op,
                                          instruction_ref& unshifted_input)
    {
        auto unshifted_input_half = info.add_instruction(
            migraphx::make_op("convert", {{"target_type", migraphx::shape::half_type}}),
            unshifted_input);

        auto input_shifted_half = info.add_common_op("add", unshifted_input_half, offset_op);

        return info.add_instruction(
            migraphx::make_op("convert", {{"target_type", migraphx::shape::int8_type}}),
            input_shifted_half);
    }

    static void shift_input_and_bias(const onnx_parser::node_info& info,
                                     const instruction_ref& offset_op,
                                     const bool has_bias,
                                     instruction_ref& input,
                                     instruction_ref& input_bias)
    {
        input = add_int8_shift(info, offset_op, input);
        if(has_bias)
        {
            input_bias = add_int8_shift(info, offset_op, input_bias);
        }
    }

    static float get_symmetric_value(const instruction_ref& input)
    {
        float symmetric_value = 0;
        // adjust symmetric zero point value for uint8 types
        if(input->get_shape().type() == migraphx::shape::uint8_type)
        {
            symmetric_value = 128;
        }
        return symmetric_value;
    }

    static instruction_ref gen_symmetric_literal(const instruction_ref& input,
                                                 const bool is_quant_conv,
                                                 onnx_parser::node_info& info)
    {
        instruction_ref ret = input;
        if(is_quant_conv)
        {
            float symmetric_value = get_symmetric_value(input);
            ret                   = info.add_literal(migraphx::literal{
                migraphx::shape{input->get_shape().type(), {1}, {0}}, {symmetric_value}});
        }

        return ret;
    }

    static instruction_ref get_zero_point(const instruction_ref& input,
                                          int index,
                                          const bool is_quant_conv,
                                          onnx_parser::node_info& info,
                                          const std::vector<instruction_ref>& args)
    {
        instruction_ref ret = input;
        if(args.size() > index)
        {
            // Check for type mismatch on parse
            if(input->get_shape().type() != args[index]->get_shape().type())
                MIGRAPHX_THROW("PARSE:Conv Data and Data Zero Point must have same type");

            ret = args[index];
            if(is_symmetric_zero_point(ret))
            {
                ret = gen_symmetric_literal(ret, is_quant_conv, info);
            }
        }
        else
        {
            ret = gen_symmetric_literal(ret, is_quant_conv, info);
        }

        return ret;
    }

    static bool is_symmetric_zero_point(instruction_ref zp)
    {
        if(not zp->can_eval())
            return false;

        float symmetric_value = get_symmetric_value(zp);

        bool all_zeros = false;
        zp->eval().visit([&](auto z) {
            all_zeros = std::all_of(
                z.begin(), z.end(), [&](auto val) { return float_equal(val, symmetric_value); });
        });
        return all_zeros;
    }

    static migraphx::operation
    qparam_broadcast_op(instruction_ref qparam, std::vector<std::size_t> lens, std::size_t axis)
    {
        if(qparam->get_shape().elements() == 1)
        {
            return migraphx::make_op("multibroadcast", {{"out_lens", lens}});
        }
        return migraphx::make_op("broadcast", {{"out_lens", lens}, {"axis", axis}});
    }

    static instruction_ref handle_quant_bias(const operation& op,
                                             const instruction_ref& input,
                                             const instruction_ref& x,
                                             const instruction_ref& weights,
                                             const instruction_ref& x_zp,
                                             const instruction_ref& w_zp,
                                             onnx_parser::node_info& info)
    {
        // to handle the bias, apply the following transformation:
        // conv(x-x_zp,w-w_zp) = conv(x,w) - conv(x_zp,w) - conv(x,w_zp) + conv(x_zp,w_zp)
        instruction_ref ret = input;

        // multibroadcast (or broadcast) zero points according to spec
        // x_zp should be a scalar or literal with one element
        // w_zp can be either a single element or a 1d tensor with size out_channels
        migraphx::operation x_zp_bc =
            migraphx::make_op("multibroadcast", {{"out_lens", x->get_shape().lens()}});
        migraphx::operation w_zp_bc = qparam_broadcast_op(w_zp, weights->get_shape().lens(), 0);

        if(not is_symmetric_zero_point(x_zp))
        {
            auto x_zp_mb  = info.add_instruction(x_zp_bc, x_zp);
            auto out_zp_1 = info.add_instruction(op, x_zp_mb, weights);
            ret           = info.add_common_op("sub", ret, out_zp_1);
        }

        if(not is_symmetric_zero_point(w_zp))
        {
            auto w_zp_mb  = info.add_instruction(w_zp_bc, w_zp);
            auto out_zp_2 = info.add_instruction(op, x, w_zp_mb);
            ret           = info.add_common_op("sub", ret, out_zp_2);
        }

        if(not(is_symmetric_zero_point(x_zp)) and not(is_symmetric_zero_point(w_zp)))
        {
            auto x_zp_mb = info.add_instruction(x_zp_bc, x_zp);
            auto w_zp_mb = info.add_instruction(w_zp_bc, w_zp);

            auto out_zp_3 = info.add_instruction(op, x_zp_mb, w_zp_mb);

            ret = info.add_common_op("add", ret, out_zp_3);
        }
        return ret;
    }

    static void handle_quant_inputs(const bool is_quant_conv,
                                    instruction_ref& input,
                                    instruction_ref& weights,
                                    instruction_ref& input_zp,
                                    instruction_ref& weight_zp,
                                    onnx_parser::node_info& info)
    {
        if(not is_quant_conv)
            return;

        auto input_type  = input->get_shape().type();
        auto weight_type = weights->get_shape().type();

        // Handle uint8 bias and input shifts
        instruction_ref offset_op;
        if(((input_type == migraphx::shape::uint8_type) or
            (weight_type == migraphx::shape::uint8_type)))
        {
            offset_op = info.add_literal(
                migraphx::literal{migraphx::shape{migraphx::shape::half_type}, {-128}});
        }

        if(input_type == migraphx::shape::uint8_type)
        {
            shift_input_and_bias(
                info, offset_op, (not is_symmetric_zero_point(input_zp)), input, input_zp);
        }

        if(weight_type == migraphx::shape::uint8_type)
        {
            shift_input_and_bias(
                info, offset_op, (not is_symmetric_zero_point(weight_zp)), weights, weight_zp);
        }
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        auto op      = make_op(opd.op_name);
        auto values  = op.to_value();
        auto x       = args[0];
        auto weights = args[1];
        auto x_shape = x->get_shape();
        auto w_shape = weights->get_shape();
        auto in_lens = x_shape.max_lens();
        assert(in_lens.size() > 2);
        auto kdims = in_lens.size() - 2;

        // ensure pads available only when auto_pad is "NOT_SET"
        check_padding_mode(info, opd.onnx_name);

        if(contains(info.attributes, "strides"))
        {
            values["stride"].clear();
            copy(info.attributes["strides"].ints(), std::back_inserter(values["stride"]));
            check_attr_sizes(kdims, values["stride"].size(), "PARSE_CONV: inconsistent strides");
        }
        if(contains(info.attributes, "dilations"))
        {
            values["dilation"].clear();
            copy(info.attributes["dilations"].ints(), std::back_inserter(values["dilation"]));
            check_attr_sizes(
                kdims, values["dilation"].size(), "PARSE_CONV: inconsistent dilations");
        }

        std::vector<int64_t> padding;
        if(contains(info.attributes, "pads"))
        {
            values["padding"].clear();
            copy(info.attributes["pads"].ints(), std::back_inserter(padding));
            check_attr_sizes(kdims, padding.size() / 2, "PARSE_CONV: inconsistent paddings");
        }
        if(contains(info.attributes, "auto_pad"))
        {
            bool is_same_padding = false;
            auto auto_pad        = info.attributes["auto_pad"].s();
            if(auto_pad.find("SAME") != std::string::npos)
            {
                is_same_padding = true;
            }

            // check if image shape is dynamic
            bool image_shape_dynamic = false;
            if(x_shape.dynamic())
            {
                auto dyn_dims = x_shape.dyn_dims();
                std::for_each(dyn_dims.begin() + 2, dyn_dims.end(), [&](auto dyn_dim) {
                    if(not dyn_dim.is_fixed())
                    {
                        image_shape_dynamic = true;
                    }
                });
            }

            // check if kernel shape is dynamic
            bool kernel_shape_dynamic = false;
            if(w_shape.dynamic())
            {
                auto dyn_dims = w_shape.dyn_dims();
                std::for_each(dyn_dims.begin() + 2, dyn_dims.end(), [&](auto dyn_dim) {
                    if(not dyn_dim.is_fixed())
                    {
                        kernel_shape_dynamic = true;
                    }
                });
            }

            if(is_same_padding)
            {
                if(image_shape_dynamic or kernel_shape_dynamic)
                {
                    // must calculate "same" padding with input shape data
                    bool is_same_upper     = (auto_pad.find("SAME_UPPER") != std::string::npos);
                    values["padding_mode"] = is_same_upper
                                                 ? to_value(op::padding_mode_t::same_upper)
                                                 : to_value(op::padding_mode_t::same_lower);
                }
                else
                {
                    // kernel shape will be fixed, so max_lens() == min_len() for kernel lengths
                    auto weight_lens = weights->get_shape().max_lens();
                    std::vector<std::size_t> k_lens(weight_lens.begin() + 2, weight_lens.end());
                    cal_auto_padding_size(info,
                                          values,
                                          k_lens,
                                          values["dilation"].to_vector<std::size_t>(),
                                          in_lens,
                                          padding);
                }
            }
        }
        values["padding"] = std::vector<size_t>(padding.begin(), padding.end());

        if(contains(info.attributes, "group"))
        {
            values["group"] = parser.parse_value(info.attributes.at("group")).at<int>();
        }

        recalc_conv_attributes(values, kdims);

        instruction_ref ret;
        // parse a_zero_point and b_zero_point values
        auto is_quant_conv = opd.op_name == "quant_convolution";

        auto x_zp = get_zero_point(x, 2, is_quant_conv, info, args);
        auto w_zp = get_zero_point(weights, 3, is_quant_conv, info, args);

        op.from_value(values);

        handle_quant_inputs(is_quant_conv, x, weights, x_zp, w_zp, info);

        ret = info.add_instruction(op, x, weights);

        // Handle quant_conv residuals between input/weights to avoid overflow
        if(is_quant_conv)
        {
            ret = handle_quant_bias(op, ret, x, weights, x_zp, w_zp, info);
        }
        else
        {
            // Handle Convolution case with bias to output
            ret = info.add_bias(args, ret, 1);
        }

        return ret;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
