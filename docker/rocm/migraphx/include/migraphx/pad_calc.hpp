/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_OPERATORS_PAD_CALC_HPP
#define MIGRAPHX_GUARD_OPERATORS_PAD_CALC_HPP

#include <cstdint>
#include <vector>
#include <migraphx/config.hpp>
#include <migraphx/shape.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_EXPORT
void calculate_padding(int64_t idx,
                       std::vector<int64_t>& pads,
                       int64_t input_dim,
                       int64_t stride,
                       int64_t dilation,
                       int64_t weight_dim,
                       bool is_same_upper = true);

/*!
 * Calculate the padding for auto_padding. Used for dynamic shapes
 * where the padding calculation must be done at evaluation time.
 * \return padding in the form of {x0_begin, x1_begin, ... x0_end , x1_end, ...}
 */
MIGRAPHX_EXPORT
std::vector<std::size_t> calc_dyn_auto_pad(const std::vector<std::size_t>& input_lens,
                                           const std::vector<std::size_t>& wei_lens,
                                           const std::vector<std::size_t>& strides,
                                           const std::vector<std::size_t>& dilations,
                                           bool use_upper);

// Used for dynamic auto padding of convolution operators since padding needs to be computed at
// evaulation time.
MIGRAPHX_EXPORT
shape compute_padded_shape(const shape& input,
                           const shape& weights,
                           const std::vector<std::size_t>& padding,
                           const std::vector<std::size_t>& stride,
                           const std::vector<std::size_t>& dilation);

// Used for dynamic auto padding of pooling operators where padding needs to be computed at
// evaulation time.
MIGRAPHX_EXPORT
shape compute_padded_pool_shape(const shape& input,
                                const shape& kernel,
                                const std::vector<std::size_t>& padding,
                                const std::vector<std::size_t>& stride,
                                const std::vector<std::size_t>& dilation);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
