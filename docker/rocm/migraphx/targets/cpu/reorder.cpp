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
#include <migraphx/cpu/dnnl.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

struct dnnl_reorder : dnnl_op<dnnl_reorder, dnnl::reorder>
{
    std::string name() const { return "dnnl::reorder"; }

    shape adjust_shape(const shape& x, int, const shape&) const { return x; }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(2);
        auto r = inputs.back();
        // Call to get_primitive to make sure an algo is available
        this->get_primitive(this->to_memory_desc(r, inputs));
        return r;
    }
    // Custom desc class since its missing in dnnl
    struct desc
    {
        dnnl::memory::desc src;
        dnnl::memory::desc dst;
    };
    desc get_desc(const std::unordered_map<int, dnnl::memory::desc>& m) const
    {
        return {m.at(MIGRAPHX_DNNL_PREFIX(ARG_SRC)), m.at(MIGRAPHX_DNNL_PREFIX(ARG_DST))};
    }

    auto get_primitive_desc(const desc& d, const dnnl::primitive_attr& attr) const
    {
        auto& engine = get_dnnl_context().engine;
        return dnnl::reorder::primitive_desc(engine, d.src, engine, d.dst, attr);
    }
};

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
