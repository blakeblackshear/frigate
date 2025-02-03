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
#ifndef MIGRAPHX_GUARD_OPERATORS_RNN_VARIABLE_SEQ_LENS_HPP
#define MIGRAPHX_GUARD_OPERATORS_RNN_VARIABLE_SEQ_LENS_HPP

#include <array>
#include <migraphx/op/common.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/streamutils.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/config.hpp>
#include <cmath>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct rnn_var_sl_shift_output
{
    std::string output_name = "hidden_states";
    rnn_direction direction = rnn_direction::forward;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.output_name, "output_name"), f(self.direction, "direction"));
    }

    std::string name() const { return "rnn_var_sl_shift_output"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(2);
        return inputs[0];
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        int64_t max_len = output_shape.lens()[0];
        visit_all(result, args[0])([&](auto output, auto input) {
            using value_type = typename decltype(output)::value_type;
            args[1].visit([&](auto seq_lens) {
                par_for(output_shape.elements(), [&](auto i) {
                    auto idx       = output_shape.multi(i);
                    auto batch_id  = idx[2];
                    auto d         = idx[1];
                    auto t         = idx[0];
                    auto sl        = seq_lens[batch_id];
                    value_type val = value_type{0};
                    if(t < sl)
                    {
                        auto in_idx = idx;
                        int offset  = (direction == rnn_direction::reverse or d == 1) ? 1 : 0;
                        in_idx[0] += offset * (max_len - sl);
                        val = input(in_idx.begin(), in_idx.end());
                    }
                    output(idx.begin(), idx.end()) = val;
                });
            });
        });

        return result;
    }
};

struct rnn_var_sl_shift_sequence
{
    std::string name() const { return "rnn_var_sl_shift_sequence"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(2);
        return inputs[0];
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        int64_t max_len = output_shape.lens()[0];
        visit_all(result, args[0])([&](auto output, auto input) {
            using value_type = typename decltype(output)::value_type;
            args[1].visit([&](auto seq_lens) {
                par_for(output_shape.elements(), [&](auto i) {
                    auto idx       = output_shape.multi(i);
                    auto b         = idx[1];
                    auto t         = idx[0];
                    auto sl        = seq_lens[b];
                    value_type val = value_type{0};
                    if(t >= max_len - sl)
                    {
                        auto in_idx = idx;
                        in_idx[0] -= (max_len - sl);
                        val = input(in_idx.begin(), in_idx.end());
                    }
                    output(idx.begin(), idx.end()) = val;
                });
            });
        });

        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
