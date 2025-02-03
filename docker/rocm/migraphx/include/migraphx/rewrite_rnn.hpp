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
#ifndef MIGRAPHX_GUARD_RTGLIB_REWRITE_RNN_HPP
#define MIGRAPHX_GUARD_RTGLIB_REWRITE_RNN_HPP

#include <string>
#include <vector>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/config.hpp>
#include <migraphx/op/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct module;

/**
 * Rewrite rnn to gemm and add.
 */
struct MIGRAPHX_EXPORT rewrite_rnn
{
    std::string name() const { return "rewrite_rnn"; }
    void apply(module& m) const;

    private:
    // for vanilla rnn operators
    void apply_vanilla_rnn(module& m, instruction_ref ins) const;
    std::vector<instruction_ref> vanilla_rnn_cell(bool is_forward,
                                                  module& m,
                                                  instruction_ref ins,
                                                  std::vector<instruction_ref> inputs,
                                                  const operation& actv_func) const;
    std::vector<operation> vanilla_rnn_actv_funcs(instruction_ref ins) const;

    // for gru operators
    void apply_gru(module& m, instruction_ref ins) const;
    std::vector<instruction_ref> gru_cell(bool is_forward,
                                          module& m,
                                          instruction_ref ins,
                                          std::vector<instruction_ref> inputs,
                                          int linear_before_reset,
                                          const operation& actv_func1,
                                          const operation& actv_func2) const;

    std::vector<operation> gru_actv_funcs(instruction_ref ins) const;

    // for lstm operators
    void apply_lstm(module& m, instruction_ref ins) const;
    std::vector<instruction_ref> lstm_cell(bool is_forward,
                                           module& m,
                                           instruction_ref ins,
                                           std::vector<instruction_ref> inputs,
                                           const operation& actv_func1,
                                           const operation& actv_func2,
                                           const operation& actv_func3) const;

    std::vector<operation> lstm_actv_funcs(instruction_ref ins) const;

    bool is_variable_seq_lens(const module& m, instruction_ref seq_lens) const;
    instruction_ref replace_last_hs_output(module& m,
                                           instruction_ref ins,
                                           instruction_ref seq_lens,
                                           instruction_ref last_hs_output,
                                           op::rnn_direction dirct) const;

    void replace_last_cell_output(module& m,
                                  instruction_ref ins,
                                  instruction_ref seq_lens,
                                  instruction_ref cell_outputs,
                                  instruction_ref last_cell_output,
                                  op::rnn_direction dirct) const;

    std::size_t get_seq_len(const module& m, instruction_ref input, instruction_ref seq_lens) const;

    instruction_ref pad_hidden_states(module& m,
                                      instruction_ref seq,
                                      instruction_ref seq_lens,
                                      instruction_ref hs) const;
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
