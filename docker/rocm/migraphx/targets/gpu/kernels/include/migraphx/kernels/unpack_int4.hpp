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
#ifndef MIGRAPHX_GUARD_KERNELS_UNPACK_INT4_HPP
#define MIGRAPHX_GUARD_KERNELS_UNPACK_INT4_HPP

#include "migraphx/kernels/types.hpp"
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/tensor_view.hpp>

namespace migraphx {

template <int Axis, class Output, class Input>
__device__ void unpack_int4(Output output, Input input)
{
    const auto input_shape = input.get_shape();

    make_index().global_stride(input_shape.elements(), [&](auto i) {
        auto idx = input_shape.multi(i);
        idx[Axis] *= 2;
        const auto input_val = input[i];

        // unpack_int4 op's normalize_compute_shape will ensure that Input::type is either uint8_t
        // or int8_t
        if constexpr(is_unsigned<typename Input::type>{})
            output[idx] = input_val & 0xfu;
        else
            // NOLINTNEXTLINE (hicpp-signed-bitwise)
            output[idx] = static_cast<int8_t>(static_cast<uint8_t>(input_val) << 4) >> 4;

        idx[Axis] += 1;
        output[idx] = input_val >> 4;
    });
}

} // namespace migraphx
#endif
