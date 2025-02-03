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
#include <migraphx/simplify_qdq.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/program.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/quant_convolution.hpp>
#include <migraphx/op/dot.hpp>
#include <migraphx/op/quant_dot.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/fp8_types.hpp>
#include <migraphx/match/dq_helpers.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace {

std::unordered_set<std::string> get_quantizable_op_names()
{
    static std::unordered_set<std::string> s = {"convolution", "dot"};
    return s;
}

struct match_find_quantizable_ops
{
    static bool
    is_valid_qparam(instruction_ref qparam, std::vector<std::size_t> lens, std::size_t axis)
    {
        return qparam->get_shape().elements() == 1 or
               qparam->get_shape().elements() == lens.at(axis);
    }

    static bool is_symmetric_zero_point(instruction_ref zp)
    {
        if(not zp->can_eval())
            return false;

        bool all_zeros = false;
        zp->eval().visit([&](auto z) {
            all_zeros =
                std::all_of(z.begin(), z.end(), [&](auto val) { return float_equal(val, 0); });
        });
        return all_zeros;
    }

    static auto
    qparam_broadcast_op(instruction_ref qparam, std::vector<std::size_t> lens, std::size_t axis)
    {
        if(qparam->get_shape().scalar())
        {
            return migraphx::make_op("multibroadcast", {{"out_lens", lens}});
        }
        else
        {
            return migraphx::make_op("broadcast", {{"out_lens", lens}, {"axis", axis}});
        }
    }

    // Helper function to insert quantized versions of any broadcasts and transpose ops that
    // occur between dequantizelinear and the quantized op
    static auto propagate_quantized_ins(module& m,
                                        const instruction_ref dqins,
                                        const instruction_ref qop_arg,
                                        bool is_fp16_model = false)
    {
        auto prev_ins = qop_arg;
        std::vector<instruction_ref> ins_inbetween;
        // matcher skips continguous, multi/broadcasts and transposes, collect all those
        // instructions
        while(prev_ins != dqins)
        {
            ins_inbetween.push_back(prev_ins);
            prev_ins = prev_ins->inputs().front();
        }
        auto qinp = dqins->inputs().front();
        for(auto ins : reverse_iterator_for(ins_inbetween))
        {
            if((*ins)->name() == "convert" and is_fp16_model)
            {
                continue;
            }
            qinp = m.insert_instruction(dqins, (*ins)->get_operator(), {qinp});
        }
        return qinp;
    }

    auto matcher() const
    {
        auto dq1 = match::arg(0)(
            skip_post_dq_ops(match::dequantizelinear_op("scale1", "zp1").bind("dq1")));
        auto dq2 = match::arg(1)(
            skip_post_dq_ops(match::dequantizelinear_op("scale2", "zp2").bind("dq2")));
        return match::name(get_quantizable_op_names())(dq1, dq2);
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto qop    = r.result;
        auto dq1    = r.instructions["dq1"];
        auto dq2    = r.instructions["dq2"];
        auto scale1 = r.instructions["scale1"];
        auto scale2 = r.instructions["scale2"];
        auto zp1    = r.instructions["zp1"];
        auto zp2    = r.instructions["zp2"];
        // Only INT8 or FP8 type currently supported
        std::set<migraphx::shape::type_t> supported_types = fp8_types{}.get();
        supported_types.insert(migraphx::shape::int8_type);
        if(not contains(supported_types, dq1->inputs().front()->get_shape().type()) or
           not contains(supported_types, dq2->inputs().front()->get_shape().type()))
            return;

        // Propagate q1 and q2 through any broadcasts and transposes before qop
        auto qop_args      = qop->inputs();
        bool is_fp16_model = false;
        if(dq1->get_shape().type() != qop->get_shape().type() and
           qop->get_shape().type() == migraphx::shape::half_type)
        {
            assert(dq1->get_shape().type() == migraphx::shape::float_type);
            is_fp16_model = true;
        }
        qop_args.at(0) = propagate_quantized_ins(m, dq1, qop_args[0], is_fp16_model);
        qop_args.at(1) = propagate_quantized_ins(m, dq2, qop_args[1], is_fp16_model);
        auto arg1_lens = qop_args[0]->get_shape().lens();
        auto arg2_lens = qop_args[1]->get_shape().lens();
        instruction_ref dq;
        instruction_ref out_scale;
        instruction_ref out_zp;
        if(qop->name() == "convolution")
        {
            auto conv_val = qop->get_operator().to_value();
            dq            = m.insert_instruction(
                qop, migraphx::make_op("quant_convolution", conv_val), qop_args);
            auto out_lens = dq->get_shape().lens();

            // Ensure input and weight quantization paramaters are of a proper form
            // Input is of shape [n, c, x1, ..., xn]. Only scalar quantization allowed
            // Weight is of shape [k, c, y1, ... , yn]. Valid quantization axis is k

            if(not(scale1->get_shape().elements() == 1 and zp1->get_shape().elements() == 1 and
                   is_valid_qparam(scale2, arg2_lens, 0) and is_valid_qparam(zp2, arg2_lens, 0)))
                return;

            // This implementation supports affine quantization for both input and weight
            // In practice, weight is quantized symmetrically

            auto s1_bcast =
                m.insert_instruction(qop, qparam_broadcast_op(scale1, out_lens, 1), scale1);
            auto s2_bcast =
                m.insert_instruction(qop, qparam_broadcast_op(scale2, out_lens, 1), scale2);

            out_scale = m.insert_instruction(qop, migraphx::make_op("mul"), s1_bcast, s2_bcast);

            // Compute the zero-point terms; initialize as 0 and add relevant terms
            auto zero_lit = m.add_literal(literal{shape{dq->get_shape().type()}, {0}});
            out_zp        = m.insert_instruction(
                qop, make_op("multibroadcast", {{"out_lens", dq->get_shape().lens()}}), zero_lit);

            auto inp_zp_bc = m.insert_instruction(qop, qparam_broadcast_op(zp1, arg1_lens, 1), zp1);
            auto w_zp_bc   = m.insert_instruction(qop, qparam_broadcast_op(zp2, arg2_lens, 0), zp2);

            if(not is_symmetric_zero_point(zp1))
            {
                auto out_zp_1 = m.insert_instruction(
                    qop, migraphx::make_op("quant_convolution", conv_val), inp_zp_bc, qop_args[1]);
                out_zp = m.insert_instruction(qop, migraphx::make_op("add"), out_zp, out_zp_1);
            }

            if(not is_symmetric_zero_point(zp2))
            {
                auto out_zp_2 = m.insert_instruction(
                    qop, migraphx::make_op("quant_convolution", conv_val), qop_args[0], w_zp_bc);
                out_zp = m.insert_instruction(qop, migraphx::make_op("add"), out_zp, out_zp_2);
            }

            if(not is_symmetric_zero_point(zp1) and not is_symmetric_zero_point(zp2))
            {
                auto out_zp_3 = m.insert_instruction(
                    qop, migraphx::make_op("quant_convolution", conv_val), inp_zp_bc, w_zp_bc);
                out_zp = m.insert_instruction(qop, migraphx::make_op("sub"), out_zp, out_zp_3);
            }
        }
        else if(qop->name() == "dot")
        {
            dq            = m.insert_instruction(qop, migraphx::make_op("quant_dot"), qop_args);
            auto out_lens = dq->get_shape().lens();

            // For (..., M, N) x (..., N, K) dot, valid quantization axes are M for input1 and K for
            // input 2
            if(not(is_valid_qparam(scale1, out_lens, out_lens.size() - 2) and
                   is_valid_qparam(zp1, out_lens, out_lens.size() - 2) and
                   is_valid_qparam(scale2, out_lens, out_lens.size() - 1) and
                   is_valid_qparam(zp2, out_lens, out_lens.size() - 1)))
            {
                return;
            }

            // This implementation supports both arguments being per-axis affine quantized
            // In practice, inputs are per-tensor affine and weights are per-axis symmetric

            auto s1_bcast = m.insert_instruction(
                qop, qparam_broadcast_op(scale1, out_lens, out_lens.size() - 2), scale1);
            auto s2_bcast = m.insert_instruction(
                qop, qparam_broadcast_op(scale2, out_lens, out_lens.size() - 1), scale2);

            out_scale = m.insert_instruction(qop, migraphx::make_op("mul"), s1_bcast, s2_bcast);

            // Compute the zero-point terms; initialize as 0 and add relevant terms
            auto zero_lit = m.add_literal(literal{shape{dq->get_shape().type()}, {0}});
            out_zp        = m.insert_instruction(
                qop, make_op("multibroadcast", {{"out_lens", dq->get_shape().lens()}}), zero_lit);

            auto zp1_bc = m.insert_instruction(
                qop, qparam_broadcast_op(zp1, arg1_lens, arg1_lens.size() - 2), zp1);
            auto zp2_bc = m.insert_instruction(
                qop, qparam_broadcast_op(zp2, arg2_lens, arg2_lens.size() - 1), zp2);

            if(not is_symmetric_zero_point(zp1))
            {
                auto out_zp_1 =
                    m.insert_instruction(qop, migraphx::make_op("quant_dot"), zp1_bc, qop_args[1]);
                out_zp = m.insert_instruction(qop, migraphx::make_op("add"), out_zp, out_zp_1);
            }

            if(not is_symmetric_zero_point(zp2))
            {
                auto out_zp_2 =
                    m.insert_instruction(qop, migraphx::make_op("quant_dot"), qop_args[0], zp2_bc);
                out_zp = m.insert_instruction(qop, migraphx::make_op("add"), out_zp, out_zp_2);
            }

            if(not is_symmetric_zero_point(zp1) and not is_symmetric_zero_point(zp2))
            {
                auto out_zp_3 =
                    m.insert_instruction(qop, migraphx::make_op("quant_dot"), zp1_bc, zp2_bc);
                out_zp = m.insert_instruction(qop, migraphx::make_op("sub"), out_zp, out_zp_3);
            }
        }

        dq = m.insert_instruction(qop, make_op("dequantizelinear"), dq, out_scale, out_zp);
        if(is_fp16_model)
        {
            dq = m.insert_instruction(
                qop, make_op("convert", {{"target_type", migraphx::shape::half_type}}), dq);
        }
        m.replace_instruction(qop, dq);
    }
};

bool compare_literals(instruction_ref ins1, instruction_ref ins2)
{
    if(ins1->name() == "broadcast" or ins1->name() == "multibroadcast")
        ins1 = ins1->inputs().front();
    auto x = ins1->eval();
    if(x.empty())
        return false;
    auto literal1 = ins1->get_literal();
    if(ins2->name() == "broadcast" or ins2->name() == "multibroadcast")
        ins2 = ins2->inputs().front();
    auto y = ins2->eval();
    if(y.empty())
        return false;
    auto literal2 = ins2->get_literal();

    bool diff_shapes_equal_vals = false;
    visit_all(ins1->get_literal(), ins2->get_literal())([&](const auto l1, const auto l2) {
        diff_shapes_equal_vals =
            std::all_of(l1.begin() + 1,
                        l1.end(),
                        [&](auto v) {
                            return ((float_equal(v, l1.front())) or
                                    (std::isinf(static_cast<double>(l1.front())) and
                                     std::isinf(static_cast<double>(v))));
                        }) and
            std::all_of(l2.begin(), l2.end(), [&](auto v) {
                return ((float_equal(v, l1.front())) or
                        (std::isinf(static_cast<double>(l1.front())) and
                         std::isinf(static_cast<double>(v))));
            });
    });

    return (x == y) or diff_shapes_equal_vals;
}

template <class Iterator>
bool precedes(Iterator x, Iterator y, Iterator last)
{
    auto r = range(std::next(x), last);
    return any_of(iterator_for(r), [&](auto it) { return it == y; });
}

struct match_qlinear_reused
{
    auto matcher() const
    {
        return match::name("quantizelinear")(
            match::used_once(), match::arg(0)(match::none_of(match::used_once()).bind("x")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto x_ins = r.instructions["x"];
        assert(ins != x_ins);

        auto dq_inputs = ins->inputs();
        dq_inputs[0]   = ins;
        auto outputs   = x_ins->outputs();
        if(outputs.size() != 2)
            return;
        for(auto output : outputs)
        {
            if(output->name() == "quantizelinear")
                continue;
            if(not output->get_operator().attributes().contains("pointwise"))
                continue;
            if(not precedes(ins, output, m.end()))
                continue;
            auto dq = m.insert_instruction(std::next(ins), make_op("dequantizelinear"), dq_inputs);
            instruction::replace_argument(output, x_ins, dq);
        }
    }
};

bool is_same_value(instruction_ref a, instruction_ref b)
{
    if(a == b)
        return true;
    return compare_literals(a, b);
}

bool is_same_scale_zero(instruction_ref a, instruction_ref b)
{
    if(a->inputs().size() != b->inputs().size())
        return false;
    if(not is_same_value(a->inputs().at(1), b->inputs().at(1)))
        return false;
    if(a->inputs().size() == 2)
        return true;
    return is_same_value(a->inputs().at(2), b->inputs().at(2));
}

// When an unpack instruction is inserted, its original input must be an int4/uint4.
// Therefore check for an unpack_int4 operator -- while ignoring out shape related ops.
bool is_any_input_int4(instruction_ref a)
{
    static std::set<std::string> ign = {"unsqueeze",
                                        "broadcast",
                                        "multibroadcast",
                                        "contiguous",
                                        "transpose",
                                        "reshape",
                                        "convert"};
    return std::any_of(a->inputs().begin(), a->inputs().end(), [](auto i) {
        while(ign.find(i->name()) != ign.end())
            i = i->inputs()[0];
        return i->name() == "unpack_int4";
    });
}

void remove_qdq_pairs(module& m)
{
    for(auto ins : iterator_for(m))
    {
        auto args = ins->inputs();
        for(auto&& arg : args)
        {
            if(arg->name() == "dequantizelinear")
            {
                auto q = arg->inputs().front();
                if((q->name() == "quantizelinear") and is_same_scale_zero(arg, q))
                {
                    instruction::replace_argument(ins, arg, q->inputs().front());
                }
            }
        }
    }
}

void remove_zero_point(module& m)
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "dequantizelinear")
            continue;
        if(ins->inputs().size() != 3)
            continue;
        auto zp = ins->inputs().at(2);
        if(not zp->can_eval())
            continue;
        auto a       = zp->eval();
        bool is_zero = false;
        a.visit([&](auto t) {
            is_zero = std::all_of(t.begin(), t.end(), [](auto x) { return float_equal(x, 0); });
        });
        if(not is_zero)
            continue;
        m.replace_instruction(ins, ins->get_operator(), ins->inputs().at(0), ins->inputs().at(1));
    }
}

void add_int4_pack_unpack_pair(module& m)
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "dequantizelinear")
            continue;

        for(auto&& inp : ins->inputs())
        {
            if((inp->name() == "quantizelinear") and is_any_input_int4(inp))
            {
                auto pk   = m.insert_instruction(ins, make_op("pack_int4"), inp);
                auto unpk = m.insert_instruction(ins, make_op("unpack_int4"), pk);
                instruction::replace_argument(ins, inp, unpk);
            }
        }
    }
}

} // namespace

void simplify_qdq::apply(module& m) const
{
    // first step: add pack/unpack pair between qdq for int4 weights
    add_int4_pack_unpack_pair(m);
    match::find_matches(m, match_find_quantizable_ops{});
    migraphx::run_passes(m, {migraphx::dead_code_elimination{}});
    remove_qdq_pairs(m);
    migraphx::run_passes(m, {migraphx::dead_code_elimination{}});
    match::find_matches(m, match_qlinear_reused{});
    migraphx::run_passes(m, {migraphx::dead_code_elimination{}});
    remove_zero_point(m);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
