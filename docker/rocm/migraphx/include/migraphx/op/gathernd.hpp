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
#ifndef MIGRAPHX_GUARD_OPERATORS_GATHERND_HPP
#define MIGRAPHX_GUARD_OPERATORS_GATHERND_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/argument.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct gathernd
{
    int batch_dims = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.batch_dims, "batch_dims"));
    }

    std::string name() const { return "gathernd"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(2);
        auto i_shape    = inputs.back();
        auto data_shape = inputs.front();
        auto r          = data_shape.ndim();
        auto q          = i_shape.ndim();

        size_t k;
        if(i_shape.dynamic())
        {
            // the rank of the output is a function of k, so it must be fixed.
            if(not i_shape.dyn_dims().back().is_fixed())
            {
                MIGRAPHX_THROW(
                    "GATHERND: last dimension of indices tensor must be fixed (min=max)");
            }
            k = i_shape.dyn_dims().back().min;
        }
        else
            k = i_shape.lens().back();

        // Begin input validation checks.
        int output_ndim = int(q) + r - k - batch_dims - 1;

        if(k > r - batch_dims)
        {
            MIGRAPHX_THROW("GATHERND: Indices of length " + std::to_string(k) +
                           " cannot be used to access data of rank " +
                           std::to_string(r - batch_dims));
        }

        if(batch_dims >= q or batch_dims >= r)
        {
            MIGRAPHX_THROW("GATHERND: rank of an input cannot be less than batch_dims=" +
                           std::to_string(batch_dims));
        }

        if(output_ndim < 0)
        {
            MIGRAPHX_THROW("GATHERND: Indices too large for static data input: k=" +
                           std::to_string(k));
        }

        if(migraphx::none_of(inputs, [](auto v) { return v.dynamic(); }))
        {
            auto indices_lens_iter = i_shape.lens().begin();

            // A rank 0 output is a scalar
            if(output_ndim == 0)
                return shape{data_shape.type(), {1}};

            // Part of the output shape comes from indices tensor, part from data tensor
            std::vector<std::size_t> output_lens(output_ndim);
            std::copy(indices_lens_iter, indices_lens_iter + (q - 1), output_lens.begin());
            // fill the rest of output shape from data tensor
            if(k + batch_dims < r)
            {
                auto data_lens = data_shape.lens();
                std::copy(data_lens.begin() + batch_dims + k,
                          data_lens.end(),
                          output_lens.begin() + q - 1);
            }
            shape output_shape{data_shape.type(), output_lens};
            return output_shape;
        }
        else
        {
            // If one or both inputs are dynamic shapes, the output is dynamic.
            // Make both inputs dynamic to simplify computations.
            data_shape = data_shape.to_dynamic();
            i_shape    = i_shape.to_dynamic();

            // A rank 0 output is a scalar
            if(output_ndim == 0)
                return shape(data_shape.type(), {shape::dynamic_dimension({1, 1})});

            // Part of the output shape comes from indices tensor, part from data tensor
            std::vector<shape::dynamic_dimension> output_dims(output_ndim);
            std::copy(i_shape.dyn_dims().begin(),
                      i_shape.dyn_dims().begin() + q - 1,
                      output_dims.begin());

            // fill the rest of output shape from data tensor
            if(k + batch_dims < r)
            {
                auto data_dims = data_shape.dyn_dims();
                std::copy(data_dims.begin() + batch_dims + k,
                          data_dims.begin() + r,
                          output_dims.begin() + q - 1);
            }
            shape output_shape(data_shape.type(), output_dims);
            return output_shape;
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result{dyn_out.computed_shape};
        visit_all(result, args[0])([&](auto output, auto data) {
            args[1].visit([&](auto indices) {
                auto indices_shape        = indices.get_shape();
                auto indices_shape_lens   = indices_shape.lens();
                auto data_shape           = data.get_shape();
                auto data_shape_lens      = data_shape.lens();
                auto k                    = indices_shape.lens().back();
                const auto num_slice_dims = k;
                std::size_t num_slices    = std::accumulate(indices_shape_lens.begin(),
                                                         indices_shape_lens.end() - 1,
                                                         1,
                                                         std::multiplies<std::size_t>());
                std::size_t slice_size  = std::accumulate(data_shape_lens.begin() + k + batch_dims,
                                                         data_shape_lens.end(),
                                                         1,
                                                         std::multiplies<std::size_t>());
                std::size_t num_batches = std::accumulate(data_shape_lens.begin(),
                                                          data_shape_lens.begin() + batch_dims,
                                                          1,
                                                          std::multiplies<std::size_t>());
                std::size_t data_batch_stride =
                    std::accumulate(data_shape_lens.begin() + batch_dims,
                                    data_shape_lens.end(),
                                    1,
                                    std::multiplies<std::size_t>());
                auto num_slices_per_batch = num_slices / num_batches;

                std::vector<std::size_t> sizes_from_slice_dims(num_slice_dims);
                {
                    auto running_product = slice_size;
                    for(std::size_t i = 0; i < num_slice_dims; ++i)
                    {
                        sizes_from_slice_dims[num_slice_dims - 1 - i] = running_product;
                        running_product *= data_shape_lens[batch_dims + num_slice_dims - 1 - i];
                    }
                }

                std::vector<std::size_t> input_slice_offsets(num_slices);
                par_for(num_slices, [&](const auto i) {
                    std::size_t batch_idx = i / num_slices_per_batch;

                    auto slice_indices                = indices.begin() + (i * num_slice_dims);
                    std::size_t relative_slice_offset = 0;
                    for(size_t dim_idx = 0; dim_idx < num_slice_dims; ++dim_idx)
                    {
                        int64_t index                   = *(slice_indices + dim_idx);
                        const std::size_t input_dim_idx = batch_dims + dim_idx;
                        const auto input_dim            = data_shape_lens[input_dim_idx];
                        if(index < -static_cast<int64_t>(input_dim) or
                           index >= static_cast<int64_t>(input_dim))
                            MIGRAPHX_THROW("GatherND: index " + std::to_string(index) +
                                           " is out of bounds for dim of len " +
                                           std::to_string(input_dim));
                        if(index < 0)
                            index += input_dim;

                        relative_slice_offset += index * sizes_from_slice_dims[dim_idx];
                    }

                    input_slice_offsets[i] =
                        (batch_idx * data_batch_stride) + relative_slice_offset;
                });

                par_for(num_slices * slice_size, [&](const auto i) {
                    auto slice_offset = input_slice_offsets[i / slice_size];
                    output[i]         = data[slice_offset + i % slice_size];
                });
            });
        });

        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
