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
#include <migraphx/config.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/reflect.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/context.hpp>
#include <migraphx/cpu/context.hpp>
#include <migraphx/cpu/dnnl.hpp>
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/quant_convolution.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

struct dnnl_convolution
    : dnnl_extend_op<dnnl_convolution, dnnl::convolution_forward, op::convolution>
{
    std::vector<int> arg_map(int) const
    {
        return {MIGRAPHX_DNNL_PREFIX(ARG_SRC), MIGRAPHX_DNNL_PREFIX(ARG_WEIGHTS)};
    }

    shape adjust_shape(const shape& x, int i, const shape& output) const
    {
        auto s = base_adjust_shape(x, output);
        if(i == 1 and op.group > 1)
        {
            // TODO: Add support for transposed weights
            if(not s.standard())
                MIGRAPHX_THROW("Weights for grouped convolution must be standard");
            auto lens = s.lens();
            lens.insert(lens.begin(), op.group);
            lens.at(1) /= op.group;
            return shape{s.type(), lens};
        }
        return s;
    }

    dnnl::convolution_forward::desc
    get_desc(const std::unordered_map<int, dnnl::memory::desc>& m) const
    {
        // In DNNL dilation is zero-based
        auto dilation = op.dilation;
        std::transform(
            dilation.begin(), dilation.end(), dilation.begin(), [](auto x) { return x - 1; });
        auto kdims = op.kdims();
        std::vector<size_t> padding_l(op.padding.begin(), op.padding.begin() + kdims);
        std::vector<size_t> padding_r(op.padding.begin() + kdims, op.padding.end());
        return {dnnl::prop_kind::forward_inference,
                dnnl::algorithm::convolution_auto,
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_SRC)),
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_WEIGHTS)),
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_DST)),
                to_dnnl_dims(op.stride),
                to_dnnl_dims(dilation),
                to_dnnl_dims(padding_l),
                to_dnnl_dims(padding_r)};
    }
};

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
