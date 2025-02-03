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
#ifndef MIGRAPHX_GUARD_OPERATORS_POOLING_HPP
#define MIGRAPHX_GUARD_OPERATORS_POOLING_HPP

#include <migraphx/op/common.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/pad_calc.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/dyn_output.hpp>
#include <cmath>
#include <utility>

namespace migraphx {

inline namespace MIGRAPHX_INLINE_NS {
namespace op {

// The Pooling operator mostly follows the specifications for the Onnx pooling op.
// It assumes an NCHW layout, extended to support any number of spatial dimensions
// from 1 on up; dimensions are <batch index, channels, spatial dimensions...>
//
struct pooling
{
    //  Class members mode, ceil_mode, padding_mode have similar names but refer to separate
    //  concepts.
    pooling_mode mode = {pooling_mode::average};

    // If the input has rank other than 4 then padding, stride, lengths must all be specified
    // since the defaults have 2-dimensions.  Exception: padding not required if
    // padding_mode != default_

    // Padding along each spatial input dimension
    // Can be ndim or 2*ndim values where ndim is size of lengths
    // ndim values means pad the same before and after each dimension
    // 2*ndim values contains n pre and then n post padding values
    std::vector<std::size_t> padding = {0, 0};

    // Size of stride to take from one placement of the pooling kernel to the next.
    // This is distinct from the strides used by the shape class.  Must be the same
    // ndim as lengths.
    std::vector<std::size_t> stride = {1, 1};

    // Spatial dimensions of the pooling kernel or window,
    // 2 smaller than the input tensor rank (NCHW layout)
    std::vector<std::size_t> lengths = {1, 1};

    // Spacing between the elements of the pooling kernel. Must be the same ndim as lengths.
    std::vector<std::size_t> dilations = {1, 1};

    // ceiling mode is a flag affecting output size
    // or equivalently, placements of the pooling kernel.
    // When true, round the size upwards.  When false, round down so that all
    // kernel placements fit but some input values may be dropped.
    bool ceil_mode = false;
    int lp_order   = 2;

    // Mode for auto padding.  default_ indicates no auto padding.
    padding_mode_t padding_mode = padding_mode_t::default_;

    // Global pooling with dynamic shape input
    bool dyn_global = false;

    // Whether padding elements are included in the average count
    bool count_include_pad = false;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.mode, "mode"),
                    f(self.padding, "padding"),
                    f(self.padding_mode, "padding_mode"),
                    f(self.stride, "stride"),
                    f(self.lengths, "lengths"),
                    f(self.dilations, "dilations"),
                    f(self.ceil_mode, "ceil_mode"),
                    f(self.count_include_pad, "count_include_pad"),
                    f(self.lp_order, "lp_order"),
                    f(self.dyn_global, "dyn_global"));
    }

    std::string name() const { return "pooling"; }

    void check_attribute_size() const
    {
        if(dyn_global)
            return;
        if((padding_mode != default_ and padding.size() != stride.size() and
            (padding.size()) != stride.size() * 2) or
           stride.size() != lengths.size() or dilations.size() != lengths.size())
        {
            MIGRAPHX_THROW("POOLING: inconsistent attribute sizes");
        }

        const auto is_zero = [](auto el) { return el == 0; };
        if(std::any_of(lengths.begin(), lengths.end(), is_zero) or
           std::any_of(stride.begin(), stride.end(), is_zero) or
           std::any_of(dilations.begin(), dilations.end(), is_zero))
        {
            MIGRAPHX_THROW("POOLING: size 0 pooling kernel or stride or dilations");
        }
    }

    size_t kdims() const
    {
        check_attribute_size();
        return stride.size();
    }

    value attributes() const { return {{"normalize_padding", "padding"}}; }

    inline std::size_t dilate_dim(std::size_t dim, std::size_t dilation) const
    {
        return 1 + dilation * (dim - 1);
    }

    std::vector<std::size_t> calc_spatial_dim_out(const std::vector<std::size_t>& input_lens,
                                                  std::size_t kdims) const
    {
        std::vector<std::size_t> output_lens{};
        for(size_t i = 0; i < kdims; ++i)
        {
            std::size_t padding_factor = 2 * padding[i];
            if(padding.size() == 2 * kdims)
                padding_factor = padding[i] + padding[i + kdims];
            std::size_t dilated_length = dilate_dim(lengths[i], dilations[i]);
            std::size_t dim_size;
            if(input_lens[i + 2] + padding_factor < dilated_length)
            {
                if(padding_mode == default_)
                    MIGRAPHX_THROW("POOLING: not enough padding for the given kernel size");
                // lengths can be legitimately larger only if we're doing auto padding
                // with a dynamic shape, in which case given padding is ignored.  Set a dummy value.
                dim_size = 2;
            }
            else
            {
                dim_size = input_lens[i + 2] + padding_factor - dilated_length;
            }
            std::size_t len =
                (ceil_mode)
                    ? dim_size / stride[i] +
                          static_cast<std::size_t>((dim_size % stride[i] != 0)) // ceil uint divide
                    : dim_size / stride[i];                                     // floor divide
            output_lens.push_back(len + 1);
        }
        return output_lens;
    }

    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1).min_ndims(3);
        check_attribute_size();

        const shape& input = inputs.at(0);
        auto stride_size   = stride.size();
        size_t kdims       = input.ndim() - 2;
        if(input.ndim() != stride_size + 2)
        {
            MIGRAPHX_THROW("POOLING: input and attribute size mismatch!");
        }

        if(input.dynamic())
        {
            auto input_dyn_dims = input.dyn_dims();
            std::vector<shape::dynamic_dimension> output_dyn_dims(input_dyn_dims.begin(),
                                                                  input_dyn_dims.begin() + 2);
            if(dyn_global)
            {
                for(size_t i = 0; i < kdims; ++i)
                {
                    output_dyn_dims.push_back(shape::dynamic_dimension{1, 1});
                }
                return {input.type(), output_dyn_dims};
            }
            else if(padding_mode != default_)
            {
                const size_t num_spatial_dims = inputs[0].ndim() - 2;
                const shape& x_shape          = inputs[0];
                // same as convolution::dynamic_compute_shape()

                for(std::size_t i = 0; i < num_spatial_dims; ++i)
                {
                    auto ceil_div = [](std::size_t x, std::size_t y) { return (x + y - 1) / y; };
                    auto s        = stride[i];

                    auto x = x_shape.dyn_dims()[i + 2];
                    std::set<std::size_t> optimals{};
                    std::transform(x.optimals.begin(),
                                   x.optimals.end(),
                                   std::inserter(optimals, optimals.begin()),
                                   [&](auto o) { return ceil_div(o, s); });
                    output_dyn_dims.push_back(
                        shape::dynamic_dimension{ceil_div(x.min, s), ceil_div(x.max, s), optimals});
                }
                return {input.type(), output_dyn_dims};
            }
            else
            {
                // does not compute optimals
                auto min_spatial_dims = calc_spatial_dim_out(input.min_lens(), kdims);
                auto max_spatial_dims = calc_spatial_dim_out(input.max_lens(), kdims);
                for(size_t i = 0; i < kdims; ++i)
                {
                    output_dyn_dims.push_back(
                        shape::dynamic_dimension{min_spatial_dims[i], max_spatial_dims[i], {}});
                }
                return {input.type(), output_dyn_dims};
            }
        }
        else
        {
            auto input_lens = input.lens();

            std::vector<std::size_t> output_lens(input_lens.begin(), input_lens.begin() + 2);
            // Used for when normalize_compute_shape() is called again at model eval time
            // for an originally dynamic shape. Kernel shape is not used with dyn_global.
            if(dyn_global)
            {
                for(size_t i = 0; i < kdims; ++i)
                {
                    output_lens.push_back(1);
                }
                return {input.type(), output_lens};
            }
            else
            {
                auto output_spatial_lens = calc_spatial_dim_out(input_lens, kdims);
                output_lens.insert(
                    output_lens.end(), output_spatial_lens.begin(), output_spatial_lens.end());
                return inputs[0].with_lens(output_lens);
            }
        }
    }

    struct lpnorm_pool
    {
        int p = 0;

        lpnorm_pool() = delete;

        explicit lpnorm_pool(int x) : p{x} {};

        template <class T>
        double init() const
        {
            return 0.0;
        }

        double operator()(double x, double y) const { return x + std::pow(std::abs(y), p); }

        double final(double x, std::size_t) const { return (p == 0) ? 1 : std::pow(x, 1. / p); }
    };

    struct avg_pool
    {
        template <class T>
        double init() const
        {
            return 0.0;
        }

        double operator()(double x, double y) const { return x + y; }

        double final(double x, std::size_t y) const { return (y == 0) ? 0.0 : (x / y); }
    };

    struct max_pool
    {
        template <class T>
        T init() const
        {
            return std::numeric_limits<T>::lowest();
        }

        double operator()(double x, double y) const { return std::max(x, y); }

        double final(double x, std::size_t) const { return (x); }
    };

    template <class Type, class Out, class In, class Op>
    void calc_pooling(const shape& output_shape,
                      Out& output,
                      const In& input,
                      const std::vector<std::size_t>& kernel_dims,
                      const std::vector<std::size_t>& padding_vals,
                      Op op) const
    {
        auto in_s    = input.get_shape();
        auto in_lens = in_s.lens();

        // For each element of output; i.e., for each placement of pooling kernel...
        par_for(output_shape.elements(), [&](auto i) {
            auto idx_o = output_shape.multi(i);
            auto n_dim = idx_o.size();
            // starting offset of the pooling window
            std::vector<int> win_start;
            std::vector<std::size_t> win_size;

            // For each spatial dimension, find starting and ending index of pooling kernel
            for(std::size_t dim = 2; dim < n_dim; ++dim)
            {
                auto d_2  = dim - 2;
                int start = static_cast<int>(idx_o[dim] * stride[d_2]) -
                            static_cast<int>(padding_vals[d_2]);
                int end;
                std::size_t dilated_kernel_dim = dilate_dim(kernel_dims[d_2], dilations[d_2]);
                // NOLINT
                if(count_include_pad and mode == pooling_mode::average)
                {
                    // Even when using padding, if in ceil_mode a window
                    // could extend beyond the end of both input and
                    // padding.  Clip out-of-bounds indexes but not padding.

                    // Check if this kernel extends beyond the padding at end of dimension
                    end = std::min(start + dilated_kernel_dim,
                                   in_lens[dim] + static_cast<int>(padding_vals[d_2]));
                }
                else
                {
                    // count_include_pad is false, or for max pooling, clip off padding.
                    end = std::min(start + dilated_kernel_dim, in_lens[dim]);
                }
                win_start.push_back(start);
                if(end < start)
                {
                    // This error can be caused by misc. bad input combinations
                    MIGRAPHX_THROW("POOLING:  invalid attributes");
                }
                win_size.push_back(end - start);
            }

            shape win_shape{output_shape.type(), win_size};

            auto pool_size    = win_shape.elements();
            double output_val = op.template init<Type>();

            // for each element in the window...
            shape_for_each(win_shape, [&](const auto& idx_w) {
                // Skip elements that belong to the dilated area
                for(size_t axis = 0; axis < idx_w.size(); ++axis)
                {
                    if(idx_w[axis] % dilations[axis])
                    {
                        pool_size -= 1;
                        return;
                    }
                }

                // the coordinates of this element
                auto idx = idx_o;

                // Add the kernel location idx_w and the offset win_start, for each dimension.
                // Negative results are cast to very large unsigned integers.
                std::transform(idx_w.begin(),
                               idx_w.end(),
                               win_start.begin(),
                               idx.begin() + 2,
                               [](auto ii, auto jj) { return ii + jj; });
                // Check if any of coordinates are out of input tensor's range
                if(std::equal(idx.begin() + 2,
                              idx.end(),
                              in_lens.begin() + 2,
                              in_lens.end(),
                              std::less<>{}))
                {
                    output_val = op(output_val, input[idx]);
                }
                else
                {
                    // this is a padding element.  Padding locations
                    // don't contribute to average or max pooling total but can play in
                    // lpnorm pooling.
                    if(mode == pooling_mode::lpnorm)
                    {
                        output_val = op(output_val, op.template init<Type>());
                    }
                    if(mode == pooling_mode::average and not count_include_pad)
                    {
                        // Ignore padding
                        pool_size -= 1;
                    }
                }
            });
            output[i] = Type(op.final(output_val, pool_size));
        });
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result;
        auto input_lens = args[0].get_shape().lens();
        std::vector<std::size_t> kernel_dims;
        shape output_shape;
        // If we have to auto-calculate padding, it will be passed to calc_pooling() as an argument
        // instead of the member variable padding.
        std::vector<std::size_t> temp_padding(padding);
        if(dyn_global)
        {
            // for dynamic GlobalPooling, there's no padding
            kernel_dims.insert(kernel_dims.end(), input_lens.begin() + 2, input_lens.end());
            output_shape = dyn_out.computed_shape;
            result       = argument{dyn_out.computed_shape};
        }
        else if((padding_mode != op::padding_mode_t::default_))
        {
            // if padding_mode is set, input was a dynamic size.  Calculate padded size now.

            // kernel_lens is the same as kernel_dims, but prepended with the 2 non-
            // spatial dimensions.  For size computations, it's used like the weights
            // tensor for convolutions.
            std::vector<std::size_t> kernel_lens;
            kernel_lens.insert(kernel_lens.end(), input_lens.begin(), input_lens.begin() + 2);
            kernel_lens.insert(kernel_lens.end(), lengths.begin(), lengths.end());
            kernel_dims = this->lengths;

            auto type = args[0].get_shape().type();
            // dilation not currently supported for pooling, so default to all 1's
            temp_padding = calc_dyn_auto_pad(
                input_lens, kernel_lens, stride, {1, 1}, bool(padding_mode == op::same_upper));

            output_shape = compute_padded_pool_shape(
                args[0].get_shape(), shape(type, kernel_dims), temp_padding, stride, {1, 1});

            result = argument(output_shape);
        }
        else // fixed/static input
        {
            kernel_dims  = this->lengths;
            output_shape = dyn_out.computed_shape;
            result       = argument{dyn_out.computed_shape};
        }

        // Perform the computation and populate result
        visit_all(result, args[0])([&](auto output, auto input) {
            using type = typename decltype(output)::value_type;
            switch(mode)
            {
            case migraphx::op::pooling_mode::average:
                calc_pooling<type>(
                    output_shape, output, input, kernel_dims, temp_padding, avg_pool{});
                break;
            case migraphx::op::pooling_mode::max:
                calc_pooling<type>(
                    output_shape, output, input, kernel_dims, temp_padding, max_pool{});
                break;
            case migraphx::op::pooling_mode::lpnorm:
                calc_pooling<type>(
                    output_shape, output, input, kernel_dims, temp_padding, lpnorm_pool{lp_order});
                break;
            }
        });

        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
