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
#include "migraphx/gpu/device/visit.hpp"
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/gpu/device/reverse.hpp>
#include <migraphx/gpu/device/tensor.hpp>
#include <migraphx/gpu/device/launch.hpp>
#include <migraphx/gpu/device/types.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

argument
reverse(hipStream_t stream, argument result, argument arg1, const std::vector<int64_t>& axes)
{
    auto s = arg1.get_shape();
    // auto lens             = s.lens();
    std::vector<std::size_t> axis_len(axes.begin(), axes.end());
    shape sa{shape::float_type, axis_len};
    std::size_t nelements = s.elements();
    visit_all(result, arg1)([&](auto output1, auto input1) {
        hip_visit_views(output1, input1, s)([&](auto output, auto input, auto hs) {
            hip_visit_views(sa)([&](auto daxes) {
                auto lens = hs.lens;
                gs_launch(stream, nelements)([=](auto i) __device__ {
                    auto idx    = hs.multi(i);
                    auto in_idx = idx;
                    for(auto axis : daxes.lens)
                        in_idx[axis] = lens[axis] - 1 - idx[axis];
                    output[idx] = input[in_idx];
                });
            });
        });
    });

    return result;
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
