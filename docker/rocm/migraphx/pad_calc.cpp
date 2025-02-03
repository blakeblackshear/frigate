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
#include <migraphx/pad_calc.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void calculate_padding(int64_t idx,
                       std::vector<int64_t>& pads,
                       int64_t input_dim,
                       int64_t stride,
                       int64_t dilation,
                       int64_t weight_dim,
                       bool is_same_upper)
{
    int64_t output_dim     = (input_dim + stride - 1) / stride; // round up result
    int64_t new_weight_dim = weight_dim + (weight_dim - 1) * (dilation - 1);
    int64_t pad =
        std::max(static_cast<int64_t>(0), (output_dim - 1) * stride + new_weight_dim - input_dim);
    auto pad_ndims = pads.size() / 2;

    if(is_same_upper)
    {
        pads[idx]             = pad / 2;
        pads[idx + pad_ndims] = pad - pad / 2;
    }
    else
    {
        pads[idx + pad_ndims] = pad / 2;
        pads[idx]             = pad - pad / 2;
    }
}

/**
 * Given the input array dimensions; kernel (wei_lens); strides; and dilations,
 * calculate the padding value in each dimension.
 *
 */
std::vector<std::size_t> calc_dyn_auto_pad(const std::vector<std::size_t>& input_lens,
                                           const std::vector<std::size_t>& wei_lens,
                                           const std::vector<std::size_t>& strides,
                                           const std::vector<std::size_t>& dilations,
                                           bool use_upper)
{
    std::vector<std::size_t> padding;
    assert(input_lens.size() >= 3);
    assert(input_lens.size() == wei_lens.size());
    std::size_t num_spatial_dims = input_lens.size() - 2;
    padding.resize(2 * num_spatial_dims);
    for(std::size_t i = 0; i < num_spatial_dims; i++)
    {
        std::ptrdiff_t input_dim      = input_lens[i + 2];
        std::ptrdiff_t stride         = strides[i];
        std::ptrdiff_t weight_dim     = wei_lens[i + 2];
        std::ptrdiff_t dilation       = dilations[i];
        std::ptrdiff_t output_dim     = (input_dim + stride - 1) / stride; // round up result
        std::ptrdiff_t new_weight_dim = weight_dim + (weight_dim - 1) * (dilation - 1);
        std::size_t pad               = std::max(static_cast<std::ptrdiff_t>(0),
                                   (output_dim - 1) * stride + new_weight_dim - input_dim);
        auto pad_ndims                = padding.size() / 2;

        if(use_upper)
        {
            padding[i]             = pad / 2;
            padding[i + pad_ndims] = pad - pad / 2;
        }
        else
        {
            padding[i + pad_ndims] = pad / 2;
            padding[i]             = pad - pad / 2;
        }
    }
    return padding;
}

/**
 *   Calculate the correct output shape for a convolution with
 *   a given input size and other parameters.
 *
 */
shape compute_padded_shape(const shape& input,
                           const shape& weights,
                           const std::vector<std::size_t>& padding,
                           const std::vector<std::size_t>& stride,
                           const std::vector<std::size_t>& dilation)
{
    const size_t num_spatial_dims = input.lens().size() - 2;

    std::vector<size_t> output_lens{input.lens()[0], weights.lens()[0]};
    // calculate the output shape of the convolution: ((W - K + 2P) / S) + 1
    for(size_t i = 0; i < num_spatial_dims; ++i)
    {
        auto padding_factor = padding[i] + padding[i + num_spatial_dims];
        output_lens.push_back(std::size_t(std::max<std::ptrdiff_t>(
            1,
            (input.lens()[i + 2] - (1 + dilation[i] * (weights.lens()[i + 2] - 1)) +
             padding_factor) /
                    stride[i] +
                1)));
    }
    return input.with_lens(output_lens);
}

/**
 *   Calculate the correct output shape for a pooling with
 *   a given input size and other parameters.  This uses
 *   the same formula for pooling that compute_padded_shape() uses
 *   for convolutions, but takes slightly different inputs.
 *
 */
shape compute_padded_pool_shape(const shape& input,
                                const shape& kernel,
                                const std::vector<std::size_t>& padding,
                                const std::vector<std::size_t>& stride,
                                const std::vector<std::size_t>& dilation)
{
    const size_t num_spatial_dims = input.lens().size() - 2;

    std::vector<size_t> output_lens{input.lens()[0], input.lens()[1]};
    // calculate the output shape of the pooling: ((W - K + 2P) / S) + 1
    for(size_t i = 0; i < num_spatial_dims; ++i)
    {
        auto padding_factor = padding[i] + padding[i + num_spatial_dims];
        output_lens.push_back(std::size_t(std::max<std::ptrdiff_t>(
            1,
            (input.lens()[i + 2] - (1 + dilation[i] * (kernel.lens()[i] - 1)) + padding_factor) /
                    stride[i] +
                1)));
    }
    return input.with_lens(output_lens);
}
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
