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

#include <migraphx/gpu/device/contiguous.hpp>
#include <migraphx/gpu/device/nary.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

void contiguous_nonstandard(hipStream_t stream, const argument& result, const argument& arg)
{
    shape s{result.get_shape().type(), result.get_shape().lens()};
    visit_all(result, arg)([&](auto output_v, auto input_v) {
        hip_visit_views(output_v, input_v, s)([&](auto output, auto input, auto standard_shape) {
            mi_gs_launch(stream,
                         standard_shape)([=](auto idx) __device__ { output[idx] = input[idx]; });
        });
    });
}

void contiguous_packed(hipStream_t stream, const argument& result, const argument& arg)
{
    index_int nelements = result.get_shape().elements();
    visit_all(result, arg)([&](auto output_v, auto input_v) {
        const auto* input = device_cast(input_v.data());
        auto* output      = device_cast(output_v.data());
        gs_launch(stream, nelements)([=](auto i) __device__ { output[i] = input[i]; });
    });
}

void contiguous(hipStream_t stream, const argument& result, const argument& arg)
{
    if(result.get_shape() == arg.get_shape() and result.get_shape().packed())
        contiguous_packed(stream, result, arg);
    else
        contiguous_nonstandard(stream, result, arg);
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
