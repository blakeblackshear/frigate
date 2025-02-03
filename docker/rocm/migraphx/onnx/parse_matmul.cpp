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
#include <migraphx/common.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_matmul : op_parser<parse_matmul>
{
    std::vector<op_desc> operators() const
    {
        return {{"MatMul", "dot"},
                {"MatMulInteger", "quant_dot"},
                {"MatMulIntegerToFloat", "quant_dot_scaled"}};
    }

    static void broadcast_dimensions(const onnx_parser::node_info& info,
                                     const std::vector<size_t>& s0_lens,
                                     const std::vector<size_t>& s1_lens,
                                     const instruction_ref& a0,
                                     const instruction_ref& a1,
                                     instruction_ref& ba0,
                                     instruction_ref& ba1)
    {
        // try broadcasting if dimensions other than last two do not match
        if(not std::equal(
               s0_lens.rbegin() + 2, s0_lens.rend(), s1_lens.rbegin() + 2, s1_lens.rend()))
        {
            auto l0_it = s0_lens.begin() + s0_lens.size() - 2;
            std::vector<std::size_t> l0_broadcasted_lens(s0_lens.begin(), l0_it);
            auto l1_it = s1_lens.begin() + s1_lens.size() - 2;
            std::vector<std::size_t> l1_broadcasted_lens(s1_lens.begin(), l1_it);
            auto output_lens = compute_broadcasted_lens(l0_broadcasted_lens, l1_broadcasted_lens);
            l0_broadcasted_lens = output_lens;
            l0_broadcasted_lens.insert(l0_broadcasted_lens.end(), l0_it, s0_lens.end());
            l1_broadcasted_lens = output_lens;
            l1_broadcasted_lens.insert(l1_broadcasted_lens.end(), l1_it, s1_lens.end());
            if(s0_lens != l0_broadcasted_lens)
            {
                ba0 = info.add_instruction(
                    make_op("multibroadcast", {{"out_lens", l0_broadcasted_lens}}), a0);
            }
            if(s1_lens != l1_broadcasted_lens)
            {
                ba1 = info.add_instruction(
                    make_op("multibroadcast", {{"out_lens", l1_broadcasted_lens}}), a1);
            }
        }
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

    static bool is_symmetric_zero_point(instruction_ref zp)
    {
        if(not zp->can_eval())
            return false;

        float check_value = 0;
        if(zp->get_shape().type() == migraphx::shape::uint8_type)
            check_value = 128;

        bool all_zeros = false;
        zp->eval().visit([&](auto z) {
            all_zeros = std::all_of(
                z.begin(), z.end(), [&](auto val) { return float_equal(val, check_value); });
        });
        return all_zeros;
    }

    static instruction_ref set_scale_arg(const onnx_parser::node_info& info,
                                         const std::vector<instruction_ref>& args,
                                         const instruction_ref& mat_input,
                                         const int index)
    {
        instruction_ref scale_arg                            = args[index];
        std::set<migraphx::shape::type_t> supported_dq_types = {migraphx::shape::float_type,
                                                                migraphx::shape::half_type};

        auto scale_shape = scale_arg->get_shape();

        if(not(contains(supported_dq_types, scale_shape.type())))
        {
            MIGRAPHX_THROW("PARSE_QUANT_DOT_SCALED: Scales must be float or half_type");
        }

        if(scale_shape.lens().at(0) != *(mat_input->get_shape().lens().rbegin()) and
           not scale_shape.scalar())
        {
            MIGRAPHX_THROW("PARSE_QUANT_DOT_SCALED: Scale must have same dim as matrix column");
        }

        if(scale_shape.lens().size() > 1 and not scale_shape.scalar())
        {
            MIGRAPHX_THROW("PARSE_QUANT_DOT_SCALED: Scales shape must be scalar or 1-D tensor");
        }

        if(scale_shape.scalar())
        {
            scale_arg   = info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), scale_arg);
            scale_shape = scale_arg->get_shape();
        }

        scale_arg = info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), scale_arg);

        return scale_arg;
    }

    static instruction_ref set_scale_bias(const std::vector<instruction_ref>& args,
                                          const int index,
                                          const migraphx::shape& scale_arg_shape,
                                          const instruction_ref& compare_arg,
                                          bool& has_valid_scale_bias)
    {
        has_valid_scale_bias = false;

        if(args.size() > index)
        {
            instruction_ref scale_bias_arg                       = args[index];
            std::set<migraphx::shape::type_t> supported_dq_types = {migraphx::shape::float_type,
                                                                    migraphx::shape::half_type};

            if(not(contains(supported_dq_types, scale_bias_arg->get_shape().type())))
            {
                MIGRAPHX_THROW("PARSE_QUANT_DOT_SCALED: Bias must be float or half_type");
            }

            if(scale_bias_arg->get_shape().type() != scale_arg_shape.type())
            {
                MIGRAPHX_THROW("PARSE_QUANT_DOT_SCALED: Bias must be the same type as scales");
            }

            if(scale_bias_arg->get_shape().lens().at(0) !=
               *(compare_arg->get_shape().lens().rbegin()))
            {
                MIGRAPHX_THROW("PARSE_QUANT_DOT_SCALED: Bias have same dim as matrix B column");
            }

            has_valid_scale_bias = true;
            return scale_bias_arg;
        }
        return compare_arg;
    }

    static instruction_ref set_bias_arg(const std::string& name,
                                        const std::vector<instruction_ref>& args,
                                        const int index,
                                        const instruction_ref& input,
                                        bool& has_valid_bias)
    {
        has_valid_bias = false;

        if(args.size() > index)
        {
            instruction_ref bias_arg = args[index];
            if(bias_arg->get_shape().type() != input->get_shape().type())
            {
                MIGRAPHX_THROW(name + ": zero point must be the same type as data");
            }

            // Don't return zero point if it will cause symmetric zero point. No need to bias
            if(is_symmetric_zero_point(bias_arg))
                return input;

            has_valid_bias = true;
            return bias_arg;
        }
        return input;
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
        else
        {
            input_bias = input;
        }
    }

    static void handle_scaled_transposes(const onnx_parser::node_info& info,
                                         instruction_ref& scale,
                                         instruction_ref& zp,
                                         bool no_zp)
    {
        if(no_zp)
        {
            scale = info.add_instruction(make_op("transpose", {{"permutation", {0, 1}}}), scale);
        }
        else
        {
            scale = info.add_instruction(make_op("transpose", {{"permutation", {0, 1}}}), scale);
            zp    = info.add_instruction(make_op("transpose", {{"permutation", {1, 0}}}), zp);
        }
    }

    static instruction_ref handle_dequantized(const onnx_parser::node_info& info,
                                              const instruction_ref& a0,
                                              const instruction_ref& scale_a0,
                                              const instruction_ref& zp_a0,
                                              bool no_zp)
    {
        instruction_ref dequantized_op;

        if(no_zp)
        {
            auto bc_scale_a0 = info.add_instruction(
                make_op("multibroadcast", {{"out_lens", a0->get_shape().lens()}}), scale_a0);
            dequantized_op = info.add_instruction(make_op("dequantizelinear"), a0, bc_scale_a0);
        }
        else
        {
            auto bc_scale_a0 = info.add_instruction(
                make_op("multibroadcast", {{"out_lens", a0->get_shape().lens()}}), scale_a0);

            auto bc_zp_a0 = info.add_instruction(
                make_op("multibroadcast", {{"out_lens", a0->get_shape().lens()}}), zp_a0);

            dequantized_op =
                info.add_instruction(make_op("dequantizelinear"), a0, bc_scale_a0, bc_zp_a0);
        }
        return dequantized_op;
    }

    static instruction_ref handle_scaled_output(const onnx_parser::node_info& info,
                                                const instruction_ref& a0,
                                                const instruction_ref& a1,
                                                const instruction_ref& scale_a0,
                                                const instruction_ref& scale_a1,
                                                const instruction_ref& zp_a0,
                                                const instruction_ref& zp_a1,
                                                const instruction_ref& scaled_bias,
                                                const bool has_scale_bias)
    {

        instruction_ref unsq_zp_a0;
        instruction_ref unsq_zp_a1;

        bool a0_has_no_zp = (a0 == zp_a0);
        bool a1_has_no_zp = (a1 == zp_a1);

        if(not a0_has_no_zp)
        {
            unsq_zp_a0 = info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), zp_a0);
            if(zp_a0->get_shape().scalar())
            {
                unsq_zp_a0 =
                    info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), unsq_zp_a0);
            }
        }

        if(not a1_has_no_zp)
        {
            unsq_zp_a1 = info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), zp_a1);
            if(zp_a1->get_shape().scalar())
            {
                unsq_zp_a1 =
                    info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), unsq_zp_a1);
            }
        }

        auto dq_a0 = handle_dequantized(info, a0, scale_a0, unsq_zp_a0, a0_has_no_zp);
        auto dq_a1 = handle_dequantized(info, a1, scale_a1, unsq_zp_a1, a1_has_no_zp);
        auto res   = info.add_instruction(make_op("dot"), dq_a0, dq_a1);

        // Handle case of the bias after scaling
        if(has_scale_bias)
            res = info.add_common_op("sub", res, scaled_bias);

        return res;
    }

    static void handle_uint8_input(const onnx_parser::node_info& info,
                                   const bool has_bias,
                                   const instruction_ref& offset_op,
                                   instruction_ref& arg,
                                   instruction_ref& bias_arg)
    {
        auto arg_type = arg->get_shape().type();
        // always convert uint8 to int8 to avoid rollover
        if(arg_type == migraphx::shape::uint8_type)
        {
            shift_input_and_bias(info, offset_op, has_bias, arg, bias_arg);
        }

        // subtract bias from result after conversion
        if(has_bias)
        {
            bias_arg = info.add_common_op("sub", arg, bias_arg);
        }
    }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& /*parser*/,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        std::string op_name{opd.op_name};
        auto a0 = args[0];
        auto a1 = args[1];
        auto s0 = a0->get_shape();
        auto s1 = a1->get_shape();

        instruction_ref dot_res;
        bool is_a_prepended = false;
        bool is_b_appended  = false;
        if(s0.ndim() == 1)
        {
            is_a_prepended = true;
            a0             = info.add_instruction(make_op("unsqueeze", {{"axes", {0}}}), args[0]);
        }
        if(s1.ndim() == 1)
        {
            is_b_appended = true;
            a1            = info.add_instruction(make_op("unsqueeze", {{"axes", {1}}}), args[1]);
        }

        auto is_quant_dot        = opd.op_name == "quant_dot";
        auto is_quant_dot_scaled = opd.op_name == "quant_dot_scaled";
        auto is_dot              = opd.op_name == "dot";

        if(s0.dynamic() or s1.dynamic())
        {
            if(is_quant_dot or is_quant_dot_scaled)
            {
                MIGRAPHX_THROW(op_name + ": dynamic inputs not supported");
            }

            auto s0_dds = a0->get_shape().to_dynamic().dyn_dims();
            auto s1_dds = a1->get_shape().to_dynamic().dyn_dims();

            if(not std::equal(
                   s0_dds.rbegin() + 2, s0_dds.rend(), s1_dds.rbegin() + 2, s1_dds.rend()))
            {
                auto broadcasted_a0 = info.add_instruction(make_op("broadcast_for_dot"), a0, a1);
                auto broadcasted_a1 = info.add_instruction(make_op("broadcast_for_dot"), a1, a0);
                dot_res =
                    info.add_instruction(make_op(opd.op_name), broadcasted_a0, broadcasted_a1);
            }
            else
            {
                dot_res = info.add_instruction(make_op(opd.op_name), a0, a1);
            }
        }
        else
        {
            auto s0_lens        = a0->get_shape().lens();
            auto s1_lens        = a1->get_shape().lens();

            if(is_dot and args.size() > 2)
            {
                MIGRAPHX_THROW(op_name + ": Bias Args not supported");
            }

            bool has_ba0        = false;
            bool has_ba1        = false;
            bool has_scale_bias = false;

            int a0_zp_index = 2;
            int a1_zp_index = 3;

            instruction_ref scale_a0;
            instruction_ref scale_a1;
            // Handles case with for when scales are present in operator
            if(is_quant_dot_scaled)
            {
                a0_zp_index = 4;
                a1_zp_index = 5;
                scale_a0    = set_scale_arg(info, args, a0, 2);
                scale_a1    = set_scale_arg(info, args, a1, 3);
                if(scale_a0->get_shape().type() != scale_a1->get_shape().type())
                {
                    MIGRAPHX_THROW(op_name + ": Scales must be the same type");
                }
            }

            instruction_ref ba0 = set_bias_arg(op_name, args, a0_zp_index, a0, has_ba0);
            instruction_ref ba1 = set_bias_arg(op_name, args, a1_zp_index, a1, has_ba1);

            // handle optional bias arg to the result
            instruction_ref scaled_bias;
            if(is_quant_dot_scaled)
            {
                auto scaled_index = 6;
                scaled_bias =
                    set_scale_bias(args, scaled_index, scale_a1->get_shape(), a1, has_scale_bias);
            }

            // Only INT8 or UINT8 type currently supported
            std::set<migraphx::shape::type_t> supported_types = {migraphx::shape::uint8_type,
                                                                 migraphx::shape::int8_type};
            const auto a0_type                                = a0->get_shape().type();
            const auto a1_type                                = a1->get_shape().type();

            if((not is_dot) and
               (not contains(supported_types, a0_type) or not contains(supported_types, a1_type)))
            {
                MIGRAPHX_THROW(op_name + ": Unsupported type");
            }

            if((is_quant_dot and ((a0_type == migraphx::shape::uint8_type) or
                                  (a1_type == migraphx::shape::uint8_type))))
            {
                auto offset_op = info.add_literal(
                    migraphx::literal{migraphx::shape{migraphx::shape::half_type}, {-128}});
                handle_uint8_input(info, has_ba0, offset_op, a0, ba0);
                handle_uint8_input(info, has_ba1, offset_op, a1, ba1);
            }

            broadcast_dimensions(info, s0_lens, s1_lens, a0, a1, ba0, ba1);

            // Apply the scale to dequantize input to then perform a simple dot
            // after the zero points are applied otherwise get a int32 output from the quantized
            // equivalent. Ensure these are broadcasted accordingly before we perform a dot
            if(is_quant_dot_scaled)
            {
                dot_res = handle_scaled_output(
                    info, a0, a1, scale_a0, scale_a1, ba0, ba1, scaled_bias, has_scale_bias);
            }
            else
            {
                dot_res = info.add_instruction(make_op(opd.op_name), ba0, ba1);
            }
        }

        // squeeze the appended or prepended dimensions
        int64_t num_axis = dot_res->get_shape().ndim();
        if(is_a_prepended)
        {
            dot_res = info.add_instruction(make_op("squeeze", {{"axes", {num_axis - 2}}}), dot_res);
            --num_axis;
        }
        if(is_b_appended)
        {
            dot_res = info.add_instruction(make_op("squeeze", {{"axes", {num_axis - 1}}}), dot_res);
        }

        return dot_res;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
