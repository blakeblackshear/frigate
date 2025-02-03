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
#ifndef MIGRAPHX_GUARD_GPU_PREFIX_SCAN_SUM_HPP
#define MIGRAPHX_GUARD_GPU_PREFIX_SCAN_SUM_HPP

#include <migraphx/gpu/name.hpp>
#include <migraphx/gpu/hip.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/device/prefix_scan_sum.hpp>
#include <migraphx/op/prefix_scan_sum.hpp>
#include <migraphx/reflect.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <utility>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct context;

struct hip_prefix_scan_sum : oper<hip_prefix_scan_sum>
{
    op::prefix_scan_sum op;

    template <class Self, class T>
    static auto reflect(Self& self, T f)
    {
        return migraphx::reflect(self.op, f);
    }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        std::vector<shape> in_shapes{inputs};
        in_shapes.pop_back();
        check_shapes{in_shapes, *this}.standard();
        return op.normalize_compute_shape(in_shapes);
    }

    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        device::prefix_scan_sum(
            ctx.get_stream().get(), args[1], args[0], op.axis, op.exclusive, op.reverse);
        return args[1];
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_GPU_PREFIX_SCAN_SUM_HPP
