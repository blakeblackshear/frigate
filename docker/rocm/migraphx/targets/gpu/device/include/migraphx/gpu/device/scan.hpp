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
#ifndef MIGRAPHX_GUARD_DEVICE_SCAN_HPP
#define MIGRAPHX_GUARD_DEVICE_SCAN_HPP

#include <migraphx/gpu/device/launch.hpp>
#include <migraphx/gpu/device/visit.hpp>
#include <migraphx/gpu/device/multi_index.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

template <index_int N,
          class Op,
          class T,
          class ForStride,
          class Input,
          class Output,
          MIGRAPHX_REQUIRES(not std::is_integral<ForStride>{})>
__device__ void block_scan(index idx, Op op, T init, ForStride fs, Input input, Output output)
{
    using type = decltype(input(deduce_for_stride(fs)));
    MIGRAPHX_DEVICE_SHARED type buffer[2][N];
    type x = init;
    fs([&](auto i) {
        index_int iout = 0;
        index_int iin  = 1;
        if(idx.local == 0)
            buffer[iout][idx.local] = op(input(i), x);
        else
            buffer[iout][idx.local] = input(i);
        __syncthreads();
        for(index_int s = 1; s < idx.nlocal(); s *= 2)
        {
            iout = 1 - iout;
            iin  = 1 - iin;
            if(idx.local >= s)
            {
                buffer[iout][idx.local] = op(buffer[iin][idx.local], buffer[iin][idx.local - s]);
            }
            else
            {
                buffer[iout][idx.local] = buffer[iin][idx.local];
            }
            __syncthreads();
        }
        x = buffer[iout][idx.nlocal() - 1];
        output(i, buffer[iout][idx.local]);
    });
}

template <index_int N, class Op, class T, class Input, class Output>
__device__ void block_scan(index idx, Op op, T init, index_int n, Input input, Output output)
{
    block_scan<N>(
        idx,
        op,
        init,
        [&](auto f) -> decltype(f(index_int{})) { return idx.local_stride(n, f); },
        input,
        output);
}

template <class F>
constexpr auto reverse_scan(index_int n, F f)
{
    return [=](auto i, auto&&... xs) { return f(n - i - 1, xs...); };
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_DEVICE_SCAN_HPP
