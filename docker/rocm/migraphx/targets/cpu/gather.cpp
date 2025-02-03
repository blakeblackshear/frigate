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
#include <migraphx/context.hpp>
#include <migraphx/cpu/context.hpp>
#include <migraphx/op/gather.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

struct cpu_gather : auto_register_op<cpu_gather>
{
    op::gather op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return migraphx::reflect(self.op, f);
    }
    std::string name() const { return "cpu::" + op.name(); }
    shape compute_shape(std::vector<shape> inputs) const
    {
        // Compensate for allocation
        inputs.pop_back();
        check_shapes(inputs, *this).standard();
        return migraphx::compute_shape(op, inputs);
    }

    argument
    compute(context& ctx, const shape& output_shape, const std::vector<argument>& args) const
    {
        std::size_t nelements = output_shape.elements();
        auto lens             = args[0].get_shape().lens();
        auto axis_dim_size    = lens[op.axis];
        lens[op.axis]         = args[1].get_shape().elements();
        shape out_comp{output_shape.type(), lens};

        visit_all(args.back(), args[0])([&](auto output, auto input) {
            args[1].visit([&](auto indices) {
                const auto* indices_ptr = indices.data();
                auto* output_ptr        = output.data();
                ctx.bulk_execute(nelements, 1024, [=](auto start, auto end) {
                    for(auto i = start; i < end; i++)
                    {
                        auto idx      = out_comp.multi(i);
                        auto in_index = indices_ptr[idx[op.axis]];
                        in_index      = (in_index < 0) ? in_index + axis_dim_size : in_index;
                        idx[op.axis]  = in_index;
                        output_ptr[i] = input(idx.begin(), idx.end());
                    }
                });
            });
        });

        return args.back();
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }
};

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
