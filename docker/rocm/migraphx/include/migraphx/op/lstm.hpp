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
#ifndef MIGRAPHX_GUARD_OPERATORS_LSTM_HPP
#define MIGRAPHX_GUARD_OPERATORS_LSTM_HPP

#include <array>
#include <migraphx/op/common.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/op/sigmoid.hpp>
#include <migraphx/op/tanh.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/streamutils.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/config.hpp>
#include <cmath>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct lstm
{
    std::size_t hidden_size = 1;
    std::vector<operation> actv_funcs{sigmoid{}, tanh{}, tanh{}};
    rnn_direction direction = rnn_direction::forward;
    float clip              = 0.0f;
    int input_forget        = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.hidden_size, "hidden_size"),
                    f(self.actv_funcs, "actv_func"),
                    f(self.direction, "direction"),
                    f(self.clip, "clip"),
                    f(self.input_forget, "input_forget"));
    }

    std::string name() const { return "lstm"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        auto in_dims     = inputs[0].lens();
        auto hidden_dims = inputs[2].lens();
        if(hidden_size != hidden_dims[2])
        {
            MIGRAPHX_THROW("LSTM: hidden size mismatch in attribute and input");
        }

        std::size_t num_directions = 1;
        if(direction == rnn_direction::bidirectional)
        {
            num_directions = 2;
        }

        if(num_directions != hidden_dims[0])
        {
            MIGRAPHX_THROW("LSTM: num_direction does not match the direction attribute");
        }

        std::vector<std::size_t> out_dims(in_dims);
        out_dims.insert(out_dims.begin() + 1, num_directions);
        out_dims.back() = hidden_size;

        return {inputs[0].type(), out_dims};
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
