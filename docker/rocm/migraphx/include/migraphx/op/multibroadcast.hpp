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
#ifndef MIGRAPHX_GUARD_OPERATORS_MULTIBROADCAST_HPP
#define MIGRAPHX_GUARD_OPERATORS_MULTIBROADCAST_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/common.hpp>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Broadcast multiple dimensions between two tensors.
 * Two versions of this operator: 1 input and 2+ inputs.
 * One input version uses output_lens attribute and broadcasts to it.
 * 2+ inputs version broadcasts first input to the common shape at evaluation time.
 */
struct multibroadcast
{
    std::vector<std::size_t> output_lens = {};

    // optional attribute
    std::vector<shape::dynamic_dimension> output_dyn_dims = {};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.output_lens, "out_lens"), f(self.output_dyn_dims, "out_dyn_dims"));
    }

    std::string name() const { return "multibroadcast"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has_at_least(1);

        auto t  = inputs.at(0).type();
        auto s0 = inputs.at(0);

        if(s0.ndim() < 1)
        {
            MIGRAPHX_THROW("MULTIBROADCAST: input dimensions should be > 0");
        }

        if(inputs.size() == 1)
        {
            if(s0.dynamic())
                MIGRAPHX_THROW(
                    "MULTIBROADCAST: Single dynamic input shape not supported.  Use two inputs.");
            if(s0.ndim() > output_lens.size())
            {
                MIGRAPHX_THROW("MULTIBROADCAST: input dimensions should <= output size");
            }

            auto offset = output_lens.size() - s0.ndim();
            for(std::ptrdiff_t i = s0.ndim() - 1; i >= 0; i--)
            {
                if(output_lens[i + offset] != s0.lens()[i] and s0.lens()[i] != 1)
                {
                    MIGRAPHX_THROW("MULTIBROADCAST: input shape {" + to_string_range(s0.lens()) +
                                   "} cannot be broadcasted to {" + to_string_range(output_lens) +
                                   "}!");
                }
            }

            return make_bcast_shape(s0, output_lens);
        }
        else
        {
            // 2+ inputs
            if(std::any_of(
                   inputs.cbegin(), inputs.cend(), [](auto input) { return input.dynamic(); }))
            {
                if(not output_dyn_dims.empty())
                {
                    return {t, output_dyn_dims};
                }
                return {t, compute_common_dyn_dims(inputs)};
            }
            else
            {
                // output_lens will not be set for 2+ input version
                auto bcast_lens    = compute_common_lens(inputs);
                return make_bcast_shape(s0, bcast_lens);
            }
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        return args[0].reshape(dyn_out.computed_shape);
    }
    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 0; }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
