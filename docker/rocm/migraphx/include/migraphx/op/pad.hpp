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
#ifndef MIGRAPHX_GUARD_OPERATORS_PAD_HPP
#define MIGRAPHX_GUARD_OPERATORS_PAD_HPP

#include <array>
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

struct pad
{
    std::vector<int64_t> pads;
    float value = 0.0f;
    enum pad_op_mode_t
    {
        constant_pad,
        reflect_pad,
        edge_pad
    };
    pad_op_mode_t mode = constant_pad;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.mode, "mode"), f(self.pads, "pads"), f(self.value, "value"));
    }

    std::string name() const { return "pad"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        const auto& s0 = inputs.front();
        if(s0.dynamic())
        {
            auto out_dyn_dims = s0.dyn_dims();
            for(std::size_t i = 0; i < s0.ndim(); ++i)
            {
                out_dyn_dims[i] += pads[i] + pads[i + s0.ndim()];
            }
            return {s0.type(), out_dyn_dims};
        }
        else
        {
            auto&& idims = s0.lens();
            std::vector<std::size_t> rdims(idims.begin(), idims.end());
            std::size_t num_dims = rdims.size();
            for(std::size_t i = 0; i < num_dims; i++)
            {
                rdims[i] += pads[i] + pads[i + num_dims];
            }
            return s0.with_lens(rdims);
        }
    }

    std::size_t pad_ndims() const
    {
        assert(pads.size() % 2 == 0);
        return pads.size() / 2;
    }

    bool symmetric() const
    {
        std::size_t num_dims = pads.size() / 2;
        return std::equal(
            pads.begin(), pads.begin() + num_dims, pads.begin() + num_dims, pads.end());
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
