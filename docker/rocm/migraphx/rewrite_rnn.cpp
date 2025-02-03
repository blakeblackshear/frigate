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
#include <migraphx/rewrite_rnn.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/op/add.hpp>
#include <migraphx/op/broadcast.hpp>
#include <migraphx/op/concat.hpp>
#include <migraphx/op/dot.hpp>
#include <migraphx/op/gru.hpp>
#include <migraphx/op/lstm.hpp>
#include <migraphx/op/mul.hpp>
#include <migraphx/op/rnn.hpp>
#include <migraphx/op/slice.hpp>
#include <migraphx/op/squeeze.hpp>
#include <migraphx/op/sub.hpp>
#include <migraphx/op/transpose.hpp>
#include <migraphx/op/unsqueeze.hpp>
#include <migraphx/op/contiguous.hpp>
#include <migraphx/op/common.hpp>
#include <migraphx/op/rnn_var_sl_last_output.hpp>
#include <migraphx/op/rnn_variable_seq_lens.hpp>
#include <migraphx/make_op.hpp>

#include <migraphx/iterator_for.hpp>
#include <migraphx/dfor.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void rewrite_rnn::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() == "rnn")
        {
            apply_vanilla_rnn(m, ins);
        }
        else if(ins->name() == "gru")
        {
            apply_gru(m, ins);
        }
        else if(ins->name() == "lstm")
        {
            apply_lstm(m, ins);
        }
    }
}

// NOLINTNEXTLINE(readability-function-cognitive-complexity)
void rewrite_rnn::apply_vanilla_rnn(module& m, instruction_ref ins) const
{
    assert(ins->name() == "rnn");
    // could be 3 to 6 inputs, but the parse_rnn function will
    // append undefined operators to make 6 arguments when parsing
    // an onnx file. Another case is user can have num of arguments
    // when writing their module.
    auto args = ins->inputs();

    shape seq_shape         = args[0]->get_shape();
    std::size_t hidden_size = args[1]->get_shape().lens()[1];
    std::size_t batch_size  = seq_shape.lens()[1];
    shape::type_t type      = seq_shape.type();
    migraphx::shape ih_shape{type, {1, batch_size, hidden_size}};
    std::vector<float> data(ih_shape.elements(), 0);

    auto actv_funcs         = vanilla_rnn_actv_funcs(ins);
    auto rnn_op             = any_cast<op::rnn>(ins->get_operator());
    op::rnn_direction dirct = rnn_op.direction;

    // process sequence length
    instruction_ref seq_lens = m.end();
    if((args.size() >= 5) and not args[4]->is_undefined())
    {
        seq_lens = args[4];
    }

    bool variable_seq_len = is_variable_seq_lens(m, seq_lens);

    instruction_ref last_output{};
    if(dirct == op::rnn_direction::bidirectional)
    {
        // input weight matrix
        auto w_forward = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[1]);
        auto w_reverse = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[1]);

        // hidden state weight matrix
        auto r_forward = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[2]);
        auto r_reverse = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[2]);

        // process bias
        instruction_ref bias_forward = m.end();
        instruction_ref bias_reverse = m.end();
        if(args.size() >= 4 and not args[3]->is_undefined())
        {
            bias_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[3]);
            bias_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[3]);
        }

        // process intial hidden state, it could be the 6th argument
        // or the 5th one (if the sequence len argument is ignored)
        instruction_ref ih_forward{};
        instruction_ref ih_reverse{};
        if(args.size() == 6 and not args[5]->is_undefined())
        {
            ih_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[5]);
            ih_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[5]);
        }
        else
        {
            ih_forward = m.add_literal(migraphx::literal{ih_shape, data});
            ih_reverse = m.add_literal(migraphx::literal{ih_shape, data});
        }

        auto ret_forward =
            vanilla_rnn_cell(true,
                             m,
                             ins,
                             {args[0], w_forward, r_forward, bias_forward, seq_lens, ih_forward},
                             actv_funcs.at(0));

        if(variable_seq_len)
        {
            args[0] =
                m.insert_instruction(ins, make_op("rnn_var_sl_shift_sequence"), args[0], seq_lens);
        }

        auto ret_reverse =
            vanilla_rnn_cell(false,
                             m,
                             ins,
                             {args[0], w_reverse, r_reverse, bias_reverse, seq_lens, ih_reverse},
                             actv_funcs.at(1));

        auto concat_output = m.insert_instruction(
            ins, make_op("concat", {{"axis", 1}}), ret_forward[1], ret_reverse[1]);
        last_output = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), concat_output);

        // The following logic is to ensure the last instruction rewritten from
        // rnn operator is a concat instruction
        // sequence len is 1
        if(ret_forward[0] == m.end())
        {
            m.replace_instruction(
                ins, make_op("concat", {{"axis", 1}}), ret_forward[1], ret_reverse[1]);
        }
        else
        {
            ret_forward[0] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_forward[0], ret_forward[1]);
            ret_reverse[0] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_reverse[1], ret_reverse[0]);
            m.replace_instruction(
                ins, make_op("concat", {{"axis", 1}}), {ret_forward[0], ret_reverse[0]});
        }
    }
    else
    {
        bool is_forward = (dirct == op::rnn_direction::forward);
        // input weight matrix
        auto w = args[1];

        // hidden state weight matrix
        auto r = args[2];

        // process bias and initial hidden state
        instruction_ref bias = m.end();
        if(args.size() >= 4 and not args[3]->is_undefined())
        {
            bias = args[3];
        }

        // process intial hidden state
        instruction_ref ih;
        if(args.size() == 6 and not args[5]->is_undefined())
        {
            ih = args[5];
        }
        else
        {
            ih = m.add_literal(migraphx::literal{ih_shape, data});
        }

        if(not is_forward and variable_seq_len)
        {
            args[0] =
                m.insert_instruction(ins, make_op("rnn_var_sl_shift_sequence"), args[0], seq_lens);
        }

        auto ret = vanilla_rnn_cell(
            is_forward, m, ins, {args[0], w, r, bias, seq_lens, ih}, actv_funcs.at(0));
        last_output = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ret[1]);

        // following logic is to ensure the last instruction is a
        // concat instruction
        // sequence len is 1
        if(ret[0] == m.end())
        {
            m.replace_instruction(ins, make_op("concat", {{"axis", 0}}), ret[1]);
        }
        else
        {
            auto concat_arg0 = is_forward ? ret[0] : ret[1];
            auto concat_arg1 = is_forward ? ret[1] : ret[0];
            m.replace_instruction(ins, make_op("concat", {{"axis", 0}}), concat_arg0, concat_arg1);
        }
    }

    // in case of all sequences are of the same lengths and shorter than the
    // max sequence length, need to pad 0's at the end for output hidden states
    ins = pad_hidden_states(m, args[0], seq_lens, ins);
    replace_last_hs_output(m, ins, seq_lens, last_output, dirct);
}

std::vector<instruction_ref> rewrite_rnn::vanilla_rnn_cell(bool is_forward,
                                                           module& m,
                                                           instruction_ref ins,
                                                           std::vector<instruction_ref> inputs,
                                                           const operation& actv_func) const
{
    assert(inputs.size() == 6);
    auto seq      = inputs.at(0);
    auto w        = inputs.at(1);
    auto r        = inputs.at(2);
    auto bias     = inputs.at(3);
    auto seq_lens = inputs.at(4);
    auto ih       = inputs.at(5);

    // squeeze and transpose w
    std::vector<int64_t> perm{1, 0};
    auto sw      = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), w);
    auto tran_sw = m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), sw);

    // squeeze and transpose r
    auto sr      = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), r);
    auto tran_sr = m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), sr);

    // initial hidden state
    auto sih      = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ih);
    auto sih_lens = sih->get_shape().lens();

    // bias
    instruction_ref bb{};
    if(bias != m.end())
    {
        long hs    = r->get_shape().lens()[2];
        auto sbias = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), bias);
        auto wb    = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {hs}}}), sbias);
        auto rb = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {hs}}, {"ends", {2 * hs}}}), sbias);
        auto wrb = m.insert_instruction(ins, make_op("add"), wb, rb);
        bb       = m.insert_instruction(
            ins, make_op("broadcast", {{"axis", 1}, {"out_lens", sih_lens}}), wrb);
    }

    instruction_ref hidden_out = m.end();
    instruction_ref last_out{};
    last_out     = m.insert_instruction(ins, make_op("unsqueeze", {{"axes", {0, 1}}}), sih);
    long seq_len = get_seq_len(m, seq, seq_lens);
    for(long i = 0; i < seq_len; i++)
    {
        long seq_index = is_forward ? i : (seq_len - 1 - i);
        auto xt        = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {0}}, {"starts", {seq_index}}, {"ends", {seq_index + 1}}}),
            seq);
        auto cont_xt = m.insert_instruction(ins, make_op("contiguous"), xt);
        xt           = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), cont_xt);
        auto xt_wi   = m.insert_instruction(ins, make_op("dot"), xt, tran_sw);
        auto ht_ri   = m.insert_instruction(ins, make_op("dot"), sih, tran_sr);
        if(bias != m.end())
        {
            xt_wi = m.insert_instruction(ins, make_op("add"), xt_wi, bb);
        }
        auto xt_ht = m.insert_instruction(ins, make_op("add"), xt_wi, ht_ri);

        // apply activation function
        auto ht = m.insert_instruction(ins, actv_func, xt_ht);
        sih     = ht;

        // add the dimensions of sequence length (axis 0 for sequence length,
        // axis 1 for num_directions
        last_out = m.insert_instruction(ins, make_op("unsqueeze", {{"axes", {0, 1}}}), ht);

        // concatenation for the last last_out is performed in the apply()
        // function to ensure the last instruction is concat, then we have
        // output inserted
        if(i < seq_len - 1)
        {
            if(is_forward)
            {
                hidden_out = (seq_index == 0)
                                 ? last_out
                                 : m.insert_instruction(
                                       ins, make_op("concat", {{"axis", 0}}), hidden_out, last_out);
            }
            else
            {
                hidden_out = (seq_index == seq_len - 1)
                                 ? last_out
                                 : m.insert_instruction(
                                       ins, make_op("concat", {{"axis", 0}}), last_out, hidden_out);
            }
        }
    }

    return {hidden_out, last_out};
}

std::vector<operation> rewrite_rnn::vanilla_rnn_actv_funcs(instruction_ref ins) const
{
    auto rnn_op = any_cast<op::rnn>(ins->get_operator());
    // could be 3 to 6 inputs, but the parse_gru function will
    // append undefined operators to make 6 arguments when parsing
    // an onnx file. Another case is user can have any num of arguments
    // when writing their program.
    if(rnn_op.direction == op::rnn_direction::bidirectional)
    {
        if(rnn_op.actv_funcs.empty())
        {
            // default is tanh
            return {make_op("tanh"), make_op("tanh")};
        }
        else if(rnn_op.actv_funcs.size() == 1)
        {
            return {rnn_op.actv_funcs.at(0), rnn_op.actv_funcs.at(0)};
        }
        else
        {
            return rnn_op.actv_funcs;
        }
    }
    else
    {
        if(rnn_op.actv_funcs.empty())
        {
            // default is tanh
            return {make_op("tanh")};
        }
        else
        {
            return rnn_op.actv_funcs;
        }
    }
}

// NOLINTNEXTLINE(readability-function-cognitive-complexity)
void rewrite_rnn::apply_gru(module& m, instruction_ref ins) const
{
    assert(ins->name() == "gru");
    const auto actv_funcs = gru_actv_funcs(ins);
    // could be 3 to 6 inputs, but the parse_gru function will
    // append undefined operators to make 6 arguments when parsing
    // an onnx file. Another case is user can have num of arguments
    // when writing their program.
    auto args = ins->inputs();

    shape seq_shape         = args[0]->get_shape();
    std::size_t hidden_size = args[2]->get_shape().lens()[2];
    std::size_t batch_size  = seq_shape.lens()[1];
    shape::type_t type      = seq_shape.type();
    migraphx::shape ih_shape{type, {1, batch_size, hidden_size}};
    std::vector<float> data(ih_shape.elements(), 0.0);

    auto gru_op             = any_cast<op::gru>(ins->get_operator());
    op::rnn_direction dirct = gru_op.direction;

    // process sequence length
    instruction_ref seq_lens = m.end();
    if((args.size() >= 5) and not args[4]->is_undefined())
    {
        seq_lens = args[4];
    }

    bool variable_seq_len = is_variable_seq_lens(m, seq_lens);

    instruction_ref last_output{};
    if(dirct == op::rnn_direction::bidirectional)
    {
        // w weight matrix
        auto w_forward = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[1]);
        auto w_reverse = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[1]);

        // r weight matrix
        auto r_forward = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[2]);
        auto r_reverse = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[2]);

        // bias
        instruction_ref bias_forward = m.end();
        instruction_ref bias_reverse = m.end();
        if(args.size() >= 4 and not args[3]->is_undefined())
        {
            bias_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[3]);
            bias_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[3]);
        }

        // intial hidden state
        instruction_ref ih_forward{};
        instruction_ref ih_reverse{};
        if(args.size() == 6 and not args[5]->is_undefined())
        {
            ih_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[5]);
            ih_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[5]);
        }
        else
        {
            ih_forward = m.add_literal(migraphx::literal{ih_shape, data});
            ih_reverse = m.add_literal(migraphx::literal{ih_shape, data});
        }

        auto ret_forward =
            gru_cell(true,
                     m,
                     ins,
                     {args[0], w_forward, r_forward, bias_forward, seq_lens, ih_forward},
                     gru_op.linear_before_reset,
                     actv_funcs.at(0),
                     actv_funcs.at(1));

        if(variable_seq_len)
        {
            args[0] =
                m.insert_instruction(ins, make_op("rnn_var_sl_shift_sequence"), args[0], seq_lens);
        }

        auto ret_reverse =
            gru_cell(false,
                     m,
                     ins,
                     {args[0], w_reverse, r_reverse, bias_reverse, seq_lens, ih_reverse},
                     gru_op.linear_before_reset,
                     actv_funcs.at(2),
                     actv_funcs.at(3));

        auto concat_output = m.insert_instruction(
            ins, make_op("concat", {{"axis", 1}}), ret_forward[1], ret_reverse[1]);
        last_output = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), concat_output);

        // The following logic is to ensure the last instruction rewritten
        // from gru operator is a concat
        if(ret_forward[0] == m.end())
        {
            m.replace_instruction(
                ins, make_op("concat", {{"axis", 1}}), ret_forward[1], ret_reverse[1]);
        }
        else
        {
            ret_forward[0] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_forward[0], ret_forward[1]);
            ret_reverse[0] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_reverse[1], ret_reverse[0]);
            m.replace_instruction(
                ins, make_op("concat", {{"axis", 1}}), {ret_forward[0], ret_reverse[0]});
        }
    }
    else
    {
        bool is_forward = (dirct == op::rnn_direction::forward);
        // weight matrix
        auto w = args[1];
        auto r = args[2];

        // bias
        instruction_ref bias = m.end();
        if(args.size() >= 4 and not args[3]->is_undefined())
        {
            bias = args[3];
        }

        // intial hidden state
        instruction_ref ih{};
        if(args.size() == 6 and not args[5]->is_undefined())
        {
            ih = args[5];
        }
        else
        {
            ih = m.add_literal(migraphx::literal{ih_shape, data});
        }

        if(not is_forward and variable_seq_len)
        {
            args[0] =
                m.insert_instruction(ins, make_op("rnn_var_sl_shift_sequence"), args[0], seq_lens);
        }

        auto ret = gru_cell(is_forward,
                            m,
                            ins,
                            {args[0], w, r, bias, seq_lens, ih},
                            gru_op.linear_before_reset,
                            actv_funcs.at(0),
                            actv_funcs.at(1));

        last_output = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ret[1]);

        if(ret[0] == m.end())
        {
            m.replace_instruction(ins, make_op("concat", {{"axis", 0}}), ret[1]);
        }
        else
        {
            auto concat_arg0 = is_forward ? ret[0] : ret[1];
            auto concat_arg1 = is_forward ? ret[1] : ret[0];
            m.replace_instruction(ins, make_op("concat", {{"axis", 0}}), concat_arg0, concat_arg1);
        }
    }

    // in case of all sequences are of the same lengths and shorter than the
    // max sequence length, need to pad 0's at the end for output hidden states
    ins = pad_hidden_states(m, args[0], seq_lens, ins);
    replace_last_hs_output(m, ins, seq_lens, last_output, dirct);
}

// NOLINTNEXTLINE(readability-function-cognitive-complexity)
std::vector<instruction_ref> rewrite_rnn::gru_cell(bool is_forward,
                                                   module& m,
                                                   instruction_ref ins,
                                                   std::vector<instruction_ref> inputs,
                                                   int linear_before_reset,
                                                   const operation& actv_func1,
                                                   const operation& actv_func2) const
{
    assert(inputs.size() == 6);
    auto seq      = inputs.at(0);
    auto w        = inputs.at(1);
    auto r        = inputs.at(2);
    auto bias     = inputs.at(3);
    auto seq_lens = inputs.at(4);
    auto ih       = inputs.at(5);

    instruction_ref hidden_states = m.end();
    instruction_ref last_output{};
    migraphx::shape seq_shape = seq->get_shape();
    migraphx::shape r_shape   = r->get_shape();
    long hs                   = r_shape.lens()[2];

    migraphx::shape ss(seq_shape.type(), {seq_shape.lens()[1], r_shape.lens()[2]});
    std::vector<float> data(ss.elements(), 1.0f);
    auto l1 = m.add_literal(migraphx::literal{ss, data});

    // w matrix squeeze to 2-dim and do a transpose
    std::vector<int64_t> perm{1, 0};
    auto sw = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), w);
    auto tw = m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), sw);

    // r slide to two part, zr and h
    auto sr  = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), r);
    auto rzr = m.insert_instruction(
        ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {2 * hs}}}), sr);
    auto trzr = m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), rzr);

    auto rh = m.insert_instruction(
        ins, make_op("slice", {{"axes", {0}}, {"starts", {2 * hs}}, {"ends", {3 * hs}}}), sr);
    auto trh = m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), rh);

    // initial states
    auto sih  = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ih);
    size_t bs = ih->get_shape().lens()[1];

    // bias
    instruction_ref bwb{};
    instruction_ref brb_zr{};
    instruction_ref brb_h{};
    if(bias != m.end())
    {
        auto sbias = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), bias);
        auto wb    = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {3 * hs}}}), sbias);
        bwb = m.insert_instruction(
            ins,
            make_op("broadcast", {{"axis", 1}, {"out_lens", {bs, static_cast<size_t>(3 * hs)}}}),
            wb);

        auto rb_zr = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {0}}, {"starts", {3 * hs}}, {"ends", {5 * hs}}}),
            sbias);
        auto rb_h = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {0}}, {"starts", {5 * hs}}, {"ends", {6 * hs}}}),
            sbias);
        brb_zr = m.insert_instruction(
            ins,
            make_op("broadcast", {{"axis", 1}, {"out_lens", {bs, static_cast<size_t>(2 * hs)}}}),
            rb_zr);
        brb_h = m.insert_instruction(
            ins,
            make_op("broadcast", {{"axis", 1}, {"out_lens", {bs, static_cast<size_t>(hs)}}}),
            rb_h);
    }

    long seq_len = get_seq_len(m, seq, seq_lens);
    for(long i = 0; i < seq_len; i++)
    {
        long seq_index = is_forward ? i : (seq_len - 1 - i);
        auto xt        = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {0}}, {"starts", {seq_index}}, {"ends", {seq_index + 1}}}),
            seq);
        auto cont_xt = m.insert_instruction(ins, make_op("contiguous"), xt);
        xt           = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), cont_xt);

        auto xt_w    = m.insert_instruction(ins, make_op("dot"), xt, tw);
        auto ih1_rzr = m.insert_instruction(ins, make_op("dot"), sih, trzr);
        if(bias != m.end())
        {
            xt_w    = m.insert_instruction(ins, make_op("add"), xt_w, bwb);
            ih1_rzr = m.insert_instruction(ins, make_op("add"), ih1_rzr, brb_zr);
        }

        auto xw_z = m.insert_instruction(
            ins, make_op("slice", {{"axes", {1}}, {"starts", {0}}, {"ends", {hs}}}), xt_w);
        auto xw_r = m.insert_instruction(
            ins, make_op("slice", {{"axes", {1}}, {"starts", {hs}}, {"ends", {2 * hs}}}), xt_w);
        auto xw_h = m.insert_instruction(
            ins, make_op("slice", {{"axes", {1}}, {"starts", {2 * hs}}, {"ends", {3 * hs}}}), xt_w);

        auto hr_z = m.insert_instruction(
            ins, make_op("slice", {{"axes", {1}}, {"starts", {0}}, {"ends", {hs}}}), ih1_rzr);
        auto hr_r = m.insert_instruction(
            ins, make_op("slice", {{"axes", {1}}, {"starts", {hs}}, {"ends", {2 * hs}}}), ih1_rzr);

        auto xw_hr_z = m.insert_instruction(ins, make_op("add"), xw_z, hr_z);
        auto zt      = m.insert_instruction(ins, actv_func1, xw_hr_z);

        auto xw_hr_r = m.insert_instruction(ins, make_op("add"), xw_r, hr_r);
        auto rt      = m.insert_instruction(ins, actv_func1, xw_hr_r);

        instruction_ref hr_h{};
        if(linear_before_reset == 0)
        {
            // equation g(Xt*(Wh^T) + (rt (.) Ht-1)*(Rh^T) + Rbh + Wbh)
            auto rt_ht1 = m.insert_instruction(ins, make_op("mul"), rt, sih);
            hr_h        = m.insert_instruction(ins, make_op("dot"), rt_ht1, trh);
            if(bias != m.end())
            {
                hr_h = m.insert_instruction(ins, make_op("add"), hr_h, brb_h);
            }
        }
        else
        {
            // equation ht = g(Xt*(Wh^T) + (rt (.) (Ht-1*(Rh^T) + Rbh)) + Wbh)
            auto ht1_rh = m.insert_instruction(ins, make_op("dot"), sih, trh);
            if(bias != m.end())
            {
                ht1_rh = m.insert_instruction(ins, make_op("add"), ht1_rh, brb_h);
            }
            hr_h = m.insert_instruction(ins, make_op("mul"), rt, ht1_rh);
        }

        auto xw_hr_h = m.insert_instruction(ins, make_op("add"), xw_h, hr_h);
        auto ht      = m.insert_instruction(ins, actv_func2, xw_hr_h);

        // equation Ht = (1 - zt) (.) ht + zt (.) Ht-1
        auto one_minus_zt    = m.insert_instruction(ins, make_op("sub"), l1, zt);
        auto one_minus_zt_ht = m.insert_instruction(ins, make_op("mul"), one_minus_zt, ht);
        auto zt_ht1          = m.insert_instruction(ins, make_op("mul"), zt, sih);
        sih                  = m.insert_instruction(ins, make_op("add"), one_minus_zt_ht, zt_ht1);
        last_output = m.insert_instruction(ins, make_op("unsqueeze", {{"axes", {0, 1}}}), sih);

        if(i < seq_len - 1)
        {
            if(is_forward)
            {
                hidden_states =
                    (seq_index == 0)
                        ? last_output
                        : m.insert_instruction(
                              ins, make_op("concat", {{"axis", 0}}), hidden_states, last_output);
            }
            else
            {
                hidden_states =
                    (seq_index == seq_len - 1)
                        ? last_output
                        : m.insert_instruction(
                              ins, make_op("concat", {{"axis", 0}}), last_output, hidden_states);
            }
        }
    }

    return {hidden_states, last_output};
}

std::vector<operation> rewrite_rnn::gru_actv_funcs(instruction_ref ins) const
{
    auto gru_op = any_cast<op::gru>(ins->get_operator());
    // before rewrite the gru operator, need to ensure
    // we have 4 actv funcs, even though a user does not
    // specifiy any actv func. If less than 4, use the
    // algorithm in parse_gru to make 4 actv functions
    if(gru_op.direction == op::rnn_direction::bidirectional)
    {
        if(gru_op.actv_funcs.empty())
            return {make_op("sigmoid"), make_op("tanh"), make_op("sigmoid"), make_op("tanh")};
        else if(gru_op.actv_funcs.size() == 1)
            return {gru_op.actv_funcs.at(0),
                    gru_op.actv_funcs.at(0),
                    gru_op.actv_funcs.at(0),
                    gru_op.actv_funcs.at(0)};
        else if(gru_op.actv_funcs.size() == 2)
            return {gru_op.actv_funcs.at(0),
                    gru_op.actv_funcs.at(1),
                    gru_op.actv_funcs.at(0),
                    gru_op.actv_funcs.at(1)};
        else if(gru_op.actv_funcs.size() == 3)
            return {gru_op.actv_funcs.at(0),
                    gru_op.actv_funcs.at(1),
                    gru_op.actv_funcs.at(2),
                    gru_op.actv_funcs.at(0)};
        else
            return gru_op.actv_funcs;
    }
    else
    {
        if(gru_op.actv_funcs.empty())
            return {make_op("sigmoid"), make_op("tanh")};
        else if(gru_op.actv_funcs.size() == 1)
            return {gru_op.actv_funcs.at(0), gru_op.actv_funcs.at(0)};
        else
            return gru_op.actv_funcs;
    }
}

// for lstm operators
// NOLINTNEXTLINE(readability-function-cognitive-complexity)
void rewrite_rnn::apply_lstm(module& m, instruction_ref ins) const
{
    assert(ins->name() == "lstm");
    auto args = ins->inputs();

    shape seq_shape         = args[0]->get_shape();
    std::size_t hidden_size = args[2]->get_shape().lens()[2];
    std::size_t batch_size  = seq_shape.lens()[1];
    shape::type_t type      = seq_shape.type();
    migraphx::shape ihc_shape{type, {1, batch_size, hidden_size}};
    std::vector<float> ihc_data(ihc_shape.elements(), 0.0);

    migraphx::shape pph_shape{type, {1, 3 * hidden_size}};

    auto actv_funcs         = lstm_actv_funcs(ins);
    auto lstm_op            = any_cast<op::lstm>(ins->get_operator());
    op::rnn_direction dirct = lstm_op.direction;

    // process sequence length
    instruction_ref seq_lens = m.end();
    if((args.size() >= 5) and not args[4]->is_undefined())
    {
        seq_lens = args[4];
    }

    bool variable_seq_len = is_variable_seq_lens(m, seq_lens);

    instruction_ref last_hs_output{};
    instruction_ref last_cell_output{};
    instruction_ref hidden_state{};
    instruction_ref cell_outputs{};
    if(dirct == op::rnn_direction::bidirectional)
    {
        // input weight matrix
        // input weight matrix
        auto w_forward = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[1]);
        auto w_reverse = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[1]);

        // hidden state weight matrix
        auto r_forward = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[2]);
        auto r_reverse = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[2]);

        // process bias
        instruction_ref bias_forward = m.end();
        instruction_ref bias_reverse = m.end();
        if(args.size() >= 4 and not args[3]->is_undefined())
        {
            bias_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[3]);
            bias_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[3]);
        }

        // process intial hidden state, it is the 6th argument
        instruction_ref ih_forward{};
        instruction_ref ih_reverse{};
        if(args.size() >= 6 and not args[5]->is_undefined())
        {
            ih_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[5]);
            ih_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[5]);
        }
        else
        {
            ih_forward = m.add_literal(migraphx::literal{ihc_shape, ihc_data});
            ih_reverse = m.add_literal(migraphx::literal{ihc_shape, ihc_data});
        }

        // process initial cell value
        instruction_ref ic_forward{};
        instruction_ref ic_reverse{};
        if(args.size() >= 7 and not args[6]->is_undefined())
        {
            ic_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[6]);
            ic_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[6]);
        }
        else
        {
            ic_forward = m.add_literal(migraphx::literal{ihc_shape, ihc_data});
            ic_reverse = m.add_literal(migraphx::literal{ihc_shape, ihc_data});
        }

        // process weight of the peephole
        instruction_ref pph_forward = m.end();
        instruction_ref pph_reverse = m.end();
        if(args.size() == 8 and not args[7]->is_undefined())
        {
            pph_forward = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {1}}}), args[7]);
            pph_reverse = m.insert_instruction(
                ins, make_op("slice", {{"axes", {0}}, {"starts", {1}}, {"ends", {2}}}), args[7]);
        }

        auto ret_forward = lstm_cell(true,
                                     m,
                                     ins,
                                     {args[0],
                                      w_forward,
                                      r_forward,
                                      bias_forward,
                                      seq_lens,
                                      ih_forward,
                                      ic_forward,
                                      pph_forward},
                                     actv_funcs.at(0),
                                     actv_funcs.at(1),
                                     actv_funcs.at(2));

        if(variable_seq_len)
        {
            args[0] =
                m.insert_instruction(ins, make_op("rnn_var_sl_shift_sequence"), args[0], seq_lens);
        }
        auto ret_reverse = lstm_cell(false,
                                     m,
                                     ins,
                                     {args[0],
                                      w_reverse,
                                      r_reverse,
                                      bias_reverse,
                                      seq_lens,
                                      ih_reverse,
                                      ic_reverse,
                                      pph_reverse},
                                     actv_funcs.at(3),
                                     actv_funcs.at(4),
                                     actv_funcs.at(5));

        auto concat_hs_output = m.insert_instruction(
            ins, make_op("concat", {{"axis", 1}}), ret_forward[1], ret_reverse[1]);
        auto concat_cell_output = m.insert_instruction(
            ins, make_op("concat", {{"axis", 1}}), ret_forward[3], ret_reverse[3]);
        last_hs_output =
            m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), concat_hs_output);
        last_cell_output =
            m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), concat_cell_output);

        // the following logic is to ensure the last instruction is a concat
        if(ret_forward[0] == m.end())
        {
            cell_outputs = concat_cell_output;
        }
        else
        {
            ret_forward[1] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_forward[0], ret_forward[1]);
            ret_reverse[1] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_reverse[1], ret_reverse[0]);

            ret_forward[3] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_forward[2], ret_forward[3]);
            ret_reverse[3] = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), ret_reverse[3], ret_reverse[2]);
            cell_outputs = m.insert_instruction(
                ins, make_op("concat", {{"axis", 1}}), ret_forward[3], ret_reverse[3]);
        }

        hidden_state = m.replace_instruction(
            ins, make_op("concat", {{"axis", 1}}), {ret_forward[1], ret_reverse[1]});
    }
    else
    {
        bool is_forward = (dirct == op::rnn_direction::forward);
        // weight matrices
        auto w = args[1];
        auto r = args[2];

        // bias
        instruction_ref bias = m.end();
        if(args.size() >= 4 and not args[3]->is_undefined())
        {
            bias = args[3];
        }

        // initial hidden state
        instruction_ref ih{};
        if(args.size() >= 6 and not args[5]->is_undefined())
        {
            ih = args[5];
        }
        else
        {
            ih = m.add_literal(migraphx::literal{ihc_shape, ihc_data});
        }

        // initial cell value
        instruction_ref ic{};
        if(args.size() >= 7 and not args[6]->is_undefined())
        {
            ic = args[6];
        }
        else
        {
            ic = m.add_literal(migraphx::literal{ihc_shape, ihc_data});
        }

        // process weight of the peephole
        instruction_ref pph = m.end();
        if(args.size() == 8 and not args[7]->is_undefined())
        {
            pph = args[7];
        }

        if(not is_forward and variable_seq_len)
        {
            args[0] =
                m.insert_instruction(ins, make_op("rnn_var_sl_shift_sequence"), args[0], seq_lens);
        }
        auto ret = lstm_cell(is_forward,
                             m,
                             ins,
                             {args[0], w, r, bias, seq_lens, ih, ic, pph},
                             actv_funcs.at(0),
                             actv_funcs.at(1),
                             actv_funcs.at(2));

        last_hs_output   = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ret[1]);
        last_cell_output = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ret[3]);

        if(ret[0] == m.end())
        {
            cell_outputs = ret[3];
            hidden_state = m.replace_instruction(ins, make_op("concat", {{"axis", 0}}), ret[1]);
        }
        else
        {
            auto concat_cell_arg0 = is_forward ? ret[2] : ret[3];
            auto concat_cell_arg1 = is_forward ? ret[3] : ret[2];
            cell_outputs          = m.insert_instruction(
                ins, make_op("concat", {{"axis", 0}}), concat_cell_arg0, concat_cell_arg1);

            auto concat_arg0 = is_forward ? ret[0] : ret[1];
            auto concat_arg1 = is_forward ? ret[1] : ret[0];
            hidden_state     = m.replace_instruction(
                ins, make_op("concat", {{"axis", 0}}), concat_arg0, concat_arg1);
        }
    }

    // in case of all sequences are of the same lengths and shorter than the
    // max sequence length, need to pad 0's at the end for output hidden states
    hidden_state = pad_hidden_states(m, args[0], seq_lens, hidden_state);

    // replace last hidden states with corresponding instructions
    ins = replace_last_hs_output(m, hidden_state, seq_lens, last_hs_output, dirct);

    // replace last cell outputs with corresponding instructions
    replace_last_cell_output(m, ins, seq_lens, cell_outputs, last_cell_output, dirct);
}

// NOLINTNEXTLINE(readability-function-cognitive-complexity)
std::vector<instruction_ref> rewrite_rnn::lstm_cell(bool is_forward,
                                                    module& m,
                                                    instruction_ref ins,
                                                    std::vector<instruction_ref> inputs,
                                                    const operation& actv_func1,
                                                    const operation& actv_func2,
                                                    const operation& actv_func3) const
{
    // must have 7 args in the input vector
    assert(inputs.size() == 8);
    auto seq      = inputs.at(0);
    auto w        = inputs.at(1);
    auto r        = inputs.at(2);
    auto bias     = inputs.at(3);
    auto seq_lens = inputs.at(4);
    auto ih       = inputs.at(5);
    auto ic       = inputs.at(6);
    auto pph      = inputs.at(7);

    instruction_ref hidden_states = m.end();
    instruction_ref cell_outputs  = m.end();

    instruction_ref last_hs_output{};
    instruction_ref last_cell_output{};

    migraphx::shape r_shape = r->get_shape();
    long hs                 = r_shape.lens()[2];
    auto bs                 = ih->get_shape().lens()[1];

    std::vector<int64_t> perm{1, 0};
    // w matrix, squeeze and transpose
    auto sw  = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), w);
    auto tsw = m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), sw);

    // r matrix, squeeze and transpose
    auto sr  = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), r);
    auto tsr = m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), sr);

    // initial hidden state
    auto sih = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ih);

    // initial cell state
    auto sic     = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), ic);
    auto ic_lens = sic->get_shape().lens();

    // bias
    instruction_ref wrb{};
    if(bias != m.end())
    {

        auto sbias = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), bias);
        auto ub_wb = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {4 * hs}}}), sbias);
        auto ub_rb = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {0}}, {"starts", {4 * hs}}, {"ends", {8 * hs}}}),
            sbias);
        auto ub_wrb = m.insert_instruction(ins, make_op("add"), ub_wb, ub_rb);

        wrb = m.insert_instruction(
            ins,
            make_op("broadcast", {{"axis", 1}, {"out_lens", {bs, 4 * static_cast<size_t>(hs)}}}),
            ub_wrb);
    }

    // peep hole
    instruction_ref pphi_brcst{};
    instruction_ref ppho_brcst{};
    instruction_ref pphf_brcst{};
    if(pph != m.end())
    {
        auto spph = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), pph);
        auto pphi = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", {hs}}}), spph);
        pphi_brcst = m.insert_instruction(
            ins, make_op("broadcast", {{"axis", 1}, {"out_lens", ic_lens}}), pphi);

        auto ppho = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {hs}}, {"ends", {2 * hs}}}), spph);
        ppho_brcst = m.insert_instruction(
            ins, make_op("broadcast", {{"axis", 1}, {"out_lens", ic_lens}}), ppho);

        auto pphf = m.insert_instruction(
            ins, make_op("slice", {{"axes", {0}}, {"starts", {2 * hs}}, {"ends", {3 * hs}}}), spph);
        pphf_brcst = m.insert_instruction(
            ins, make_op("broadcast", {{"axis", 1}, {"out_lens", ic_lens}}), pphf);
    }

    long seq_len = get_seq_len(m, seq, seq_lens);
    for(long i = 0; i < seq_len; ++i)
    {
        long seq_index = is_forward ? i : (seq_len - 1 - i);
        auto xt        = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {0}}, {"starts", {seq_index}}, {"ends", {seq_index + 1}}}),
            seq);
        auto cont_xt = m.insert_instruction(ins, make_op("contiguous"), xt);
        xt           = m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), cont_xt);

        auto xt_tsw  = m.insert_instruction(ins, make_op("dot"), xt, tsw);
        auto sih_tsr = m.insert_instruction(ins, make_op("dot"), sih, tsr);
        auto xt_sih  = m.insert_instruction(ins, make_op("add"), xt_tsw, sih_tsr);
        if(bias != m.end())
        {
            xt_sih = m.insert_instruction(ins, make_op("add"), xt_sih, wrb);
        }

        auto it_before_actv = m.insert_instruction(
            ins, make_op("slice", {{"axes", {1}}, {"starts", {0}}, {"ends", {hs}}}), xt_sih);
        auto ot_before_actv = m.insert_instruction(
            ins, make_op("slice", {{"axes", {1}}, {"starts", {hs}}, {"ends", {2 * hs}}}), xt_sih);
        auto ft_before_actv = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {1}}, {"starts", {2 * hs}}, {"ends", {3 * hs}}}),
            xt_sih);
        auto ct_before_actv = m.insert_instruction(
            ins,
            make_op("slice", {{"axes", {1}}, {"starts", {3 * hs}}, {"ends", {4 * hs}}}),
            xt_sih);

        if(pph != m.end())
        {
            auto pphi_ct   = m.insert_instruction(ins, make_op("mul"), pphi_brcst, sic);
            it_before_actv = m.insert_instruction(ins, make_op("add"), it_before_actv, pphi_ct);

            auto pphf_ct   = m.insert_instruction(ins, make_op("mul"), pphf_brcst, sic);
            ft_before_actv = m.insert_instruction(ins, make_op("add"), ft_before_actv, pphf_ct);
        }
        auto it = m.insert_instruction(ins, actv_func1, it_before_actv);
        auto ft = m.insert_instruction(ins, actv_func1, ft_before_actv);
        auto ct = m.insert_instruction(ins, actv_func2, ct_before_actv);

        // equation Ct = ft (.) Ct-1 + it (.) ct
        auto ft_cell = m.insert_instruction(ins, make_op("mul"), ft, sic);
        auto it_ct   = m.insert_instruction(ins, make_op("mul"), it, ct);
        auto cellt   = m.insert_instruction(ins, make_op("add"), ft_cell, it_ct);

        if(pph != m.end())
        {
            auto ppho_cellt = m.insert_instruction(ins, make_op("mul"), ppho_brcst, cellt);
            ot_before_actv  = m.insert_instruction(ins, make_op("add"), ot_before_actv, ppho_cellt);
        }
        auto ot = m.insert_instruction(ins, actv_func1, ot_before_actv);

        // Ht = ot (.) h(Ct)
        auto h_cellt = m.insert_instruction(ins, actv_func3, cellt);
        auto ht      = m.insert_instruction(ins, make_op("mul"), ot, h_cellt);

        sic = cellt;
        sih = ht;

        last_hs_output = m.insert_instruction(ins, make_op("unsqueeze", {{"axes", {0, 1}}}), ht);
        last_cell_output =
            m.insert_instruction(ins, make_op("unsqueeze", {{"axes", {0, 1}}}), cellt);

        if(i < seq_len - 1)
        {
            if(i == 0)
            {
                hidden_states = last_hs_output;
                cell_outputs  = last_cell_output;
            }
            else
            {
                auto concat_hs_arg0 = is_forward ? hidden_states : last_hs_output;
                auto concat_hs_arg1 = is_forward ? last_hs_output : hidden_states;
                hidden_states       = m.insert_instruction(
                    ins, make_op("concat", {{"axis", 0}}), concat_hs_arg0, concat_hs_arg1);

                auto concat_cell_arg0 = is_forward ? cell_outputs : last_cell_output;
                auto concat_cell_arg1 = is_forward ? last_cell_output : cell_outputs;
                cell_outputs          = m.insert_instruction(
                    ins, make_op("concat", {{"axis", 0}}), concat_cell_arg0, concat_cell_arg1);
            }
        }
    }

    return {hidden_states, last_hs_output, cell_outputs, last_cell_output};
}

std::vector<operation> rewrite_rnn::lstm_actv_funcs(instruction_ref ins) const
{
    auto lstm_op = any_cast<op::lstm>(ins->get_operator());
    // before rewrite the lstm operator, need to ensure
    // we have 6 actv funcs, even though a user does not
    // specifiy any actv func. If less than 46, use the
    // algorithm in parse_lstm to make 6 actv functions
    const auto& actv_funcs     = lstm_op.actv_funcs;
    std::size_t num_actv_funcs = actv_funcs.size();
    if(lstm_op.direction == op::rnn_direction::bidirectional)
    {
        switch(num_actv_funcs)
        {
        case 0:
            return {make_op("sigmoid"),
                    make_op("tanh"),
                    make_op("tanh"),
                    make_op("sigmoid"),
                    make_op("tanh"),
                    make_op("tanh")};

        case 1:
            return {actv_funcs.at(0),
                    actv_funcs.at(0),
                    actv_funcs.at(0),
                    actv_funcs.at(0),
                    actv_funcs.at(0),
                    actv_funcs.at(0)};

        case 2:
            return {actv_funcs.at(0),
                    actv_funcs.at(1),
                    actv_funcs.at(1),
                    actv_funcs.at(0),
                    actv_funcs.at(1),
                    actv_funcs.at(1)};

        case 3:
            return {actv_funcs.at(0),
                    actv_funcs.at(1),
                    actv_funcs.at(2),
                    actv_funcs.at(0),
                    actv_funcs.at(1),
                    actv_funcs.at(2)};

        case 4:
            return {actv_funcs.at(0),
                    actv_funcs.at(1),
                    actv_funcs.at(2),
                    actv_funcs.at(3),
                    actv_funcs.at(3),
                    actv_funcs.at(3)};

        case 5:
            return {actv_funcs.at(0),
                    actv_funcs.at(1),
                    actv_funcs.at(2),
                    actv_funcs.at(3),
                    actv_funcs.at(4),
                    actv_funcs.at(4)};

        default: return actv_funcs;
        }
    }
    else
    {
        switch(num_actv_funcs)
        {
        case 0: return {make_op("sigmoid"), make_op("tanh"), make_op("tanh")};

        case 1: return {actv_funcs.at(0), actv_funcs.at(0), actv_funcs.at(0)};

        case 2: return {actv_funcs.at(0), actv_funcs.at(1), actv_funcs.at(1)};

        default: return actv_funcs;
        }
    }
}

bool rewrite_rnn::is_variable_seq_lens(const module& m, instruction_ref seq_lens) const
{
    bool is_var_lens = false;
    if(seq_lens != m.end())
    {
        if(seq_lens->can_eval())
        {
            auto arg_lens = seq_lens->eval();
            std::vector<int64_t> vec_lens;
            arg_lens.visit([&](auto l) { vec_lens.assign(l.begin(), l.end()); });
            int64_t l = 0;
            if(not vec_lens.empty())
            {
                l = vec_lens[0];
            }
            if(not std::all_of(vec_lens.begin(), vec_lens.end(), [&](auto v) { return v == l; }))
            {
                is_var_lens = true;
            }
        }
        else
        {
            is_var_lens = true;
        }
    }

    return is_var_lens;
}

std::size_t
rewrite_rnn::get_seq_len(const module& m, instruction_ref input, instruction_ref seq_lens) const
{
    bool is_var_lens = is_variable_seq_lens(m, seq_lens);
    auto input_shape = input->get_shape();
    auto length      = input_shape.lens()[0];
    if(not is_var_lens and seq_lens != m.end())
    {
        auto arg_len = seq_lens->eval();
        std::vector<std::size_t> vec_lens;
        arg_len.visit([&](auto l) { vec_lens.assign(l.begin(), l.end()); });
        length = vec_lens.empty() ? length : vec_lens[0];
    }

    return length;
}

instruction_ref rewrite_rnn::replace_last_hs_output(module& m,
                                                    instruction_ref ins,
                                                    instruction_ref seq_lens,
                                                    instruction_ref last_hs_output,
                                                    op::rnn_direction dirct) const
{
    bool variable_seq_len = is_variable_seq_lens(m, seq_lens);
    instruction_ref result_ins{};
    if(variable_seq_len)
    {
        result_ins =
            m.insert_instruction(std::next(ins),
                                 make_op("rnn_var_sl_shift_output",
                                         {{"output_name", "hidden_states"}, {"direction", dirct}}),
                                 ins,
                                 seq_lens);
        m.replace_instruction(ins, result_ins);
        auto hs_outputs = find_all(result_ins->outputs(),
                                   [&](auto i) { return i->name() == "rnn_last_hs_output"; });

        for(auto& hs_out : hs_outputs)
        {
            auto inputs = hs_out->inputs();
            m.replace_instruction(hs_out,
                                  make_op("rnn_var_sl_last_output", {{"direction", dirct}}),
                                  inputs.front(),
                                  seq_lens);
        }
    }
    else
    {
        auto hs_outputs =
            find_all(ins->outputs(), [&](auto i) { return i->name() == "rnn_last_hs_output"; });

        for(auto& hs_out : hs_outputs)
        {
            m.replace_instruction(hs_out, last_hs_output);
        }

        result_ins = ins;
    }

    return result_ins;
}

void rewrite_rnn::replace_last_cell_output(module& m,
                                           instruction_ref ins,
                                           instruction_ref seq_lens,
                                           instruction_ref cell_outputs,
                                           instruction_ref last_cell_output,
                                           op::rnn_direction dirct) const
{
    bool variable_seq_len = is_variable_seq_lens(m, seq_lens);
    auto ins_outputs =
        find_all(ins->outputs(), [&](auto i) { return i->name() == "rnn_last_cell_output"; });

    if(variable_seq_len)
    {
        if(not ins_outputs.empty())
        {
            cell_outputs = m.insert_instruction(
                std::next(ins),
                make_op("rnn_var_sl_shift_output",
                        {{"output_name", "cell_outputs"}, {"direction", dirct}}),
                cell_outputs,
                seq_lens);
        }

        for(auto co : ins_outputs)
        {
            m.replace_instruction(co,
                                  make_op("rnn_var_sl_last_output", {{"direction", dirct}}),
                                  cell_outputs,
                                  seq_lens);
        }
    }
    // replace the rnn_last_cell_output with the last_cell_output. The while
    // loop is to handle the case of multiple rnn_last_cell_output operators
    else
    {
        for(auto co : ins_outputs)
        {
            m.replace_instruction(co, last_cell_output);
        }
    }
}

instruction_ref rewrite_rnn::pad_hidden_states(module& m,
                                               instruction_ref seq,
                                               instruction_ref seq_lens,
                                               instruction_ref hs) const
{
    auto max_seq_len = seq->get_shape().lens()[0];
    auto seq_len     = get_seq_len(m, seq, seq_lens);

    // condition of all sequence are of the same length and
    // less than max_seq_len, we need to append the hs outputs
    auto hs_padded = hs;
    if(seq_len < max_seq_len)
    {
        auto s        = hs->get_shape();
        auto pad_lens = s.lens();
        pad_lens[0]   = static_cast<std::size_t>(max_seq_len - seq_len);
        shape pad_s{s.type(), pad_lens};
        std::vector<float> pad_data(pad_s.elements(), 0.0f);
        auto pl   = m.add_literal(pad_s, pad_data.begin(), pad_data.end());
        hs_padded = m.insert_instruction(std::next(hs), make_op("concat", {{"axis", 0}}), hs, pl);
        m.replace_instruction(hs, hs_padded);
    }

    return hs_padded;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
