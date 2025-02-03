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
#ifndef MIGRAPHX_GUARD_KERNELS_PAD_HPP
#define MIGRAPHX_GUARD_KERNELS_PAD_HPP

#include <migraphx/kernels/shape.hpp>
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/algorithm.hpp>
#include <migraphx/kernels/ranges.hpp>
#include <migraphx/kernels/vec.hpp>

namespace migraphx {

template <class Offsets, class Input, class Output, class PadVal>
__device__ void pad(const index& idx,
                    const Offsets& offsets,
                    const Input& input,
                    Output& output,
                    const PadVal& pad_val)
{
    auto output_shape = output.get_shape();
    idx.global_stride(output_shape.elements(), [&](auto i) {
        // 1. get current multi-index for output
        // 2. get the size of the input to determine input boundaries
        // 3. compute the corresponding multi-index for input by accounting for offsets
        // 4. if current multi-index is within offsets or input's new multi-index is out of bounds,
        //    use pad value instead of input's value
        auto multi        = output_shape.multi(i);
        auto input_bounds = input.get_shape().lens;
        auto input_idx    = multi - offsets;
        auto range_multi  = range(multi.size());

        if(any_of(range_multi.begin(), range_multi.end(), [&](auto j) {
               return multi[j] < offsets[j] or input_idx[j] >= input_bounds[j];
           }))
            output[multi] = implicit_conversion(pad_val);
        else
            output[multi] = implicit_conversion(input[input_idx]);
    });
}

} // namespace migraphx
#endif
