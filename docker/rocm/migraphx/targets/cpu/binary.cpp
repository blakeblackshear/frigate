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

struct dnnl_binary : dnnl_op<dnnl_binary, dnnl::binary>
{
    std::string algo;
    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack_join(self.reflect_base(self, f), pack(f(self.algo, "algo")));
    }

    std::string group() const { return this->name() + "::" + algo; }

    std::string name() const { return "dnnl::binary"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        // Compensate for allocation
        inputs.pop_back();
        check_shapes{this->trim_post_op_inputs(inputs), *this}.has(2);
        auto s0 = inputs.at(0);
        auto s1 = inputs.at(1);
        auto r  = s0;
        if(s0 != s1 or not s0.packed())
        {
            if(s0.packed() != s1.packed())
            {
                r = s0.packed() ? s0 : s1;
            }
            else if(s0.broadcasted() != s1.broadcasted())
            {
                r = s0.broadcasted() ? s1.with_lens(s0.lens()) : s0.with_lens(s0.lens());
            }
            else
            {
                r = {s0.type(), s0.lens()};
            }
        }
        // Call to get_primitive to make sure an algo is available
        this->get_primitive(this->to_memory_desc(r, inputs));
        return r;
    }

    dnnl::binary::desc get_desc(const std::unordered_map<int, dnnl::memory::desc>& m) const
    {
        return {to_dnnl_algo(algo),
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_SRC_0)),
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_SRC_1)),
                m.at(MIGRAPHX_DNNL_PREFIX(ARG_DST))};
    }
};

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
