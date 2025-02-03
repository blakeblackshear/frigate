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
#include <migraphx/cpu/pointwise.hpp>
#include <migraphx/op/concat.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

struct dnnl_concat : dnnl_extend_op<dnnl_concat, dnnl::concat, op::concat>
{
    std::vector<int> arg_map(int size) const
    {
        std::vector<int> result(size);
        std::iota(result.begin(), result.end(), MIGRAPHX_DNNL_PREFIX(ARG_MULTIPLE_SRC));
        return result;
    }
    // Custom desc class since its missing in dnnl
    struct desc
    {
        dnnl::memory::desc dst;
        std::size_t axis = 1;
        std::vector<dnnl::memory::desc> srcs;
    };
    desc get_desc(const std::unordered_map<int, dnnl::memory::desc>& m) const
    {
        std::vector<dnnl::memory::desc> srcs;
        srcs.reserve(m.size() - 1);

        for(auto i = 0; i < m.size() - 1; i++)
        {
            srcs.push_back(m.at(MIGRAPHX_DNNL_PREFIX(ARG_MULTIPLE_SRC) + i));
        }
        return {m.at(MIGRAPHX_DNNL_PREFIX(ARG_DST)), std::size_t(op.axis), srcs};
    }

    auto get_primitive_desc(const desc& d, const dnnl::primitive_attr& attr) const
    {
        return dnnl::concat::primitive_desc(d.dst, d.axis, d.srcs, get_dnnl_context().engine, attr);
    }
};

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
