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
#include <migraphx/config.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/reflect.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/context.hpp>
#include <migraphx/cpu/context.hpp>
#include <migraphx/cpu/dnnl.hpp>
#include <migraphx/op/pooling.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

struct dnnl_pooling : dnnl_extend_op<dnnl_pooling, dnnl::pooling_v2_forward, op::pooling>
{
    std::vector<int> arg_map(int) const { return {MIGRAPHX_DNNL_PREFIX(ARG_SRC)}; }

    dnnl::algorithm get_algo() const
    {
        switch(op.mode)
        {
        case op::pooling_mode::max: return dnnl::algorithm::pooling_max;
        case op::pooling_mode::average:
            return op.count_include_pad ? dnnl::algorithm::pooling_avg_include_padding
                                        : dnnl::algorithm::pooling_avg_exclude_padding;
        case op::pooling_mode::lpnorm: MIGRAPHX_THROW("Lpnorn pooling mode not supported");
        }
        MIGRAPHX_THROW("Unknown pooling mode");
    }

    dnnl::pooling_v2_forward::desc
    get_desc(const std::unordered_map<int, dnnl::memory::desc>& m) const
    {
        auto algo  = get_algo();
        auto kdims = op.kdims();
        std::vector<size_t> padding_l(op.padding.begin(), op.padding.begin() + kdims);
        std::vector<size_t> padding_r(op.padding.begin() + kdims, op.padding.end());
        // Note: It is not documented, but the default dilation seems to be 0 instead of 1.
        //       We need to offset dilations with -1.
        std::vector<size_t> dilations;
        std::transform(op.dilations.cbegin(),
                       op.dilations.cend(),
                       std::back_inserter(dilations),
                       [](size_t d) { return d - 1; });
        return {dnnl::prop_kind::forward_inference,
                algo,
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_SRC)),
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_DST)),
                to_dnnl_dims(op.stride),
                to_dnnl_dims(op.lengths),
                to_dnnl_dims(dilations),
                to_dnnl_dims(padding_l),
                to_dnnl_dims(padding_r)};
    }
};

} // namespace cpu

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
