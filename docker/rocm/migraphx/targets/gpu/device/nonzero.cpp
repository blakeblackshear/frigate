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
#include <migraphx/gpu/device/nonzero.hpp>
#include <migraphx/gpu/device/float_equal.hpp>
#include <migraphx/gpu/device/scan.hpp>
#include <migraphx/gpu/device/reduce_ops.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

argument nonzero(hipStream_t stream, const argument& result, const argument& arg_data)
{
    auto s            = arg_data.get_shape();
    auto elem_num     = s.elements();
    auto out_elem_num = result.get_shape().elements();

    // call the prefix_sum function to do a prefix_sum to compute
    // index in the output. Only 1 block can be used since we have
    // only one prefix sum
    const index_int block_size = 256;
    hip_visit_all(arg_data, s)([&](auto input, auto si) {
        const auto* in_ptr = device_cast(input.data());
        auto* ptr          = result.cast<int64_t>();
        gs_launch(stream, block_size, block_size)([=](auto, auto idx) __device__ {
            // fill all output to 0 first
            idx.local_stride(out_elem_num, [&](auto j) { ptr[j] = 0; });

            block_scan<block_size>(
                idx,
                sum{},
                0,
                elem_num,
                [&](auto j) { return (float_equal(in_ptr[j], 0)) ? 0 : 1; },
                [&](auto j, auto x) {
                    auto out_loc = x - 1;
                    if(float_equal(in_ptr[j], 0))
                        return;

                    auto index = si.multi(j);
                    for(size_t k = 0; k < index.size(); ++k)
                    {
                        ptr[k * elem_num + out_loc] = index[k];
                    }
                });
        });
    });

    return result;
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
