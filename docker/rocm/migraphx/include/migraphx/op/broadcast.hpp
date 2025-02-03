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
#ifndef MIGRAPHX_GUARD_OPERATORS_BROADCAST_HPP
#define MIGRAPHX_GUARD_OPERATORS_BROADCAST_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/dyn_output.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * 1 input version:
 * Broadcasts a tensor from the original shape to the broadcast_lens by setting the stride of
 * broadcasted dimensions to zero. `axis` attribute for a 1D input shape is the output dimension
 * that stays the same.
 * ex: broadcasting shape [1024] -> [4, 1024, 3] has axis = 1.
 *
 * For higher rank input shapes, axis is an offset parameter for the broadcasting.
 * Such that this operator would work in the opposite direction of NumPy broadcasting
 * (left-most to rightwards element-wise comparison)
 * ex: broadcasting shape [2, 2] -> [2, 2, 3] with axis = 0
 *
 * 2 input version:
 * Broadcast the first input 1D shape into the second input shape based on the axis parameter.
 * Handles broadcasting a 1D static shape into a higher rank dynamic shape.
 * broadcast_lens is not used
 */
struct broadcast
{
    uint64_t axis                           = 0;
    std::vector<std::size_t> broadcast_lens = {};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"), f(self.broadcast_lens, "out_lens"));
    }

    std::string name() const { return "broadcast"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1, 2);
        auto s0 = inputs.at(0);
        auto t  = s0.type();
        if(inputs.size() == 1)
        {
            // the ONNX broadcast op is deprecated now, so not handling the negative
            // value of axis anymore
            if(s0.dynamic())
                MIGRAPHX_THROW(
                    "BROADCAST: Single dynamic input shape not supported.  Use two inputs.");
            if(axis >= broadcast_lens.size())
            {
                MIGRAPHX_THROW("BROADCAST : axis " + migraphx::to_string(axis) +
                               " is out of range");
            }
            if(broadcast_lens.size() - axis < s0.lens().size())
            {
                MIGRAPHX_THROW("BROADCAST: (broadcast ndims - axis) is less than s0 ndims");
            }
            if(not std::equal(s0.lens().begin(), s0.lens().end(), broadcast_lens.begin() + axis))
            {
                MIGRAPHX_THROW("BROADCAST: when broadcasting, succeeding sizes must match");
            }

            std::vector<size_t> bcast_strides(broadcast_lens.size(), 0);
            std::copy(s0.strides().begin(), s0.strides().end(), bcast_strides.begin() + axis);
            shape output{t, broadcast_lens, std::move(bcast_strides)};
            if(output.elements() < s0.elements())
            {
                // don't think this can occur?
                MIGRAPHX_THROW("BROADCAST: output size must be greater than or equal to s0 size");
            }
            return output;
        }
        else
        {
            // two inputs
            auto s1 = inputs.at(1);
            if(s0.dynamic())
            {
                MIGRAPHX_THROW("BROADCAST_2in: s0 is a dynamic shape, does not handle broadcasting "
                               "a dynamic shape");
            }
            if(s0.ndim() != 1)
            {
                MIGRAPHX_THROW("BROADCAST_2in: s0 has ndim " + migraphx::to_string(s0.ndim()) +
                               ", only handle ndim = 1");
            }
            if(axis >= s1.ndim())
            {
                MIGRAPHX_THROW("BROADCAST_2in: axis " + migraphx::to_string(axis) +
                               " is out of range");
            }
            if(s1.dynamic())
            {
                s0 = s0.to_dynamic();
                if(s0.dyn_dims()[0] != s1.dyn_dims()[axis])
                {
                    MIGRAPHX_THROW("BROADCAST_2in: s0 length doesn't match with dynamic s1 axis "
                                   "dimension length (" +
                                   migraphx::to_string(s0.dyn_dims()[0]) +
                                   " != " + migraphx::to_string(s1.dyn_dims()[axis]) + ")");
                }
                return s1;
            }

            if(s0.lens()[0] != s1.lens()[axis])
            {
                MIGRAPHX_THROW("BROADCAST_2in: s0 length doesn't match with static s1 axis "
                               "dimension length (" +
                               migraphx::to_string(s0.lens()[0]) +
                               " != " + migraphx::to_string(s1.lens()[axis]) + ")");
            }
            std::vector<size_t> bcast_strides(s1.ndim(), 0);
            std::copy(s0.strides().begin(), s0.strides().end(), bcast_strides.begin() + axis);
            shape output{t, s1.lens(), std::move(bcast_strides)};
            return output;
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
