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
#ifndef MIGRAPHX_GUARD_OPERATORS_RESHAPE_LAZY_HPP
#define MIGRAPHX_GUARD_OPERATORS_RESHAPE_LAZY_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/optional.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct reshape_lazy
{
    std::vector<int64_t> dims;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.dims, "dims"));
    }

    value attributes() const { return {{"require_std_shape", true}}; }

    std::string name() const { return "reshape_lazy"; }

    shape dyn_compute_shape(shape s0) const
    {
        auto dyn_dims      = s0.dyn_dims();
        auto num_not_fixed = std::count_if(
            dyn_dims.cbegin(), dyn_dims.cend(), [](auto dd) { return not dd.is_fixed(); });
        if(num_not_fixed != 1)
        {
            MIGRAPHX_THROW("reshape_lazy: Only supports one non-fixed dynamic_dimension");
        }
        // track number of fixed elements in input and output
        std::size_t num_dims_ele = 1;
        std::size_t num_dd_ele   = 1;
        for(std::size_t i = 0; i < dyn_dims.size(); ++i)
        {
            if(dyn_dims[i].is_fixed())
            {
                num_dims_ele *= dims[i];
                num_dd_ele *= dyn_dims[i].min;
            }
            else
            {
                if(dims[i] != 0 and dims[i] != -1)
                {
                    MIGRAPHX_THROW(
                        "reshape_lazy: Non-fixed dynamic_dimension doesn't match with 0 or -1 "
                        "output dimension");
                }
            }
        }
        if(num_dims_ele != num_dd_ele)
        {
            MIGRAPHX_THROW("reshape_lazy: Number of fixed elements must match. Input: " +
                           std::to_string(num_dd_ele) + " Output: " + std::to_string(num_dims_ele));
        }
        // construct output dynamic shape from dims attribute
        std::vector<shape::dynamic_dimension> output_dyn_dims(dims.size());
        std::transform(dims.cbegin(),
                       dims.cend(),
                       dyn_dims.cbegin(),
                       output_dyn_dims.begin(),
                       [](std::size_t dim, auto dyn_dim) {
                           if(not dyn_dim.is_fixed())
                               return dyn_dim;
                           return shape::dynamic_dimension{dim, dim};
                       });
        return {s0.type(), output_dyn_dims};
    }

    template <class Iterator>
    static auto compute_end_dim(Iterator start, Iterator last, std::size_t dim)
    {
        std::size_t x = 1;
        auto it       = std::find_if(start, last, [&](auto i) {
            x *= i;
            return x >= dim;
        });
        if(x != dim)
            return start;
        return it;
    }

    template <class OptionalPair>
    static OptionalPair try_merge_pairs(OptionalPair p2, OptionalPair p1)
    {
        if(not p1.has_value())
            return nullopt;
        if(not p2.has_value())
            return nullopt;
        auto dim1     = p1->first;
        auto dim2     = p2->first;
        auto stride1  = p1->second;
        auto stride2  = p2->second;
        auto elements = dim1 * dim2;
        // Transposed
        if(stride2 > stride1)
            return nullopt;
        // Broadcasted check to avoid division by zero
        if(stride2 == 0)
        {
            if(stride1 == 0)
                return {{elements, 0}};
            return nullopt;
        }
        if(stride1 % stride2 != 0)
            return nullopt;
        auto space = (stride1 * dim1 + stride2 * dim2 - stride1) / stride2;
        // Nonpacked
        if(space != elements)
            return nullopt;
        return {{elements, stride2}};
    }

    template <class DimIterator, class StrideIterator>
    static optional<std::size_t> merge_strides(DimIterator dim_start,
                                               DimIterator dim_last,
                                               StrideIterator stride_start,
                                               StrideIterator stride_last)
    {
        if(dim_start == dim_last)
            return nullopt;
        (void)stride_start; // Is only used in the assert
        assert(std::distance(dim_start, dim_last) == std::distance(stride_start, stride_last));
        auto make_pair_optional = [&](auto dim, auto stride) {
            return std::make_optional(std::make_pair(dim, stride));
        };
        auto dim_stride_pair =
            std::inner_product(std::make_reverse_iterator(dim_last - 1),
                               std::make_reverse_iterator(dim_start),
                               std::make_reverse_iterator(stride_last - 1),
                               make_pair_optional(*std::prev(dim_last), *std::prev(stride_last)),
                               MIGRAPHX_LIFT(try_merge_pairs),
                               make_pair_optional);
        if(not dim_stride_pair.has_value())
            return nullopt;
        return dim_stride_pair->second;
    }

    template <class DimIterator, class StrideIterator>
    static auto can_strides_merge(DimIterator dim_start,
                                  DimIterator dim_last,
                                  StrideIterator stride_start,
                                  StrideIterator stride_last)
    {
        return merge_strides(dim_start, dim_last, stride_start, stride_last).has_value();
    }

    // This will attempt to alias the dimensions of the input shape to the lens of
    // `rdims`. If this can't be done without changing memory layout then it
    // will return nullopt
    static optional<shape> reshape_lazy_dims(const shape& input,
                                             const std::vector<std::size_t>& rdims)
    {
        if(input.standard())
            return shape{input.type(), rdims};

        const auto& idims    = input.lens();
        const auto& istrides = input.strides();

        std::vector<std::size_t> rstrides;
        std::size_t i = 0;
        std::size_t r = 0;
        while(i < idims.size() and r < rdims.size())
        {
            auto idim = idims[i];
            auto rdim = rdims[r];
            if(rdim == idim)
            {
                rstrides.push_back(istrides[i]);
            }
            // squeeze
            else if(rdim > idim)
            {
                auto start = idims.begin() + i;
                auto it    = compute_end_dim(start, idims.end(), rdim);
                if(it == start)
                    return nullopt;
                auto n = it - start;
                assert((i + n) <= istrides.size());
                if(not can_strides_merge(
                       start, it + 1, istrides.begin() + i, istrides.begin() + i + n + 1))
                    return nullopt;
                i += n;
                rstrides.push_back(istrides[i]);
            }
            // unsqueeze
            else // if(rdim < idim)
            {
                auto start = rdims.begin() + i;
                auto it    = compute_end_dim(start, rdims.end(), idim);
                if(it == start)
                    return nullopt;
                auto n = it - start;
                assert((r + n) <= rdims.size());
                auto stride = istrides[i] * idim;
                std::for_each(start, it + 1, [&](auto dim) {
                    stride /= dim;
                    rstrides.push_back(stride);
                });
                r += n;
            }
            i++;
            r++;
        }

        // Handle trailing 1s
        if(rstrides.size() < rdims.size() and not rstrides.empty())
        {
            auto stride = rstrides.back();
            for(auto d : range(rdims.begin() + rstrides.size(), rdims.end()))
            {
                if(d != 1)
                    return nullopt;
                rstrides.push_back(stride);
            }
        }

        if(rdims.size() != rstrides.size())
            return nullopt;

        return shape{input.type(), rdims, rstrides};
    }

    shape static_compute_shape(std::vector<shape> inputs, std::size_t n_neg_dims) const
    {
        check_shapes{inputs, *this}.has(1);
        auto&& idims = inputs.front().lens();
        std::vector<std::size_t> rdims(dims.begin(), dims.end());

        for(std::size_t i = 0; i < dims.size(); i++)
        {
            if(dims[i] == 0)
                rdims[i] = idims[i];

            // since rdims using size_t type, -1 is the max value
            // is size_t that cause later compuation incorrect
            if(dims[i] == -1)
                rdims[i] = 1;
        }

        if(n_neg_dims > 0)
        {
            size_t missing_dim =
                inputs.front().elements() /
                std::accumulate(rdims.begin(), rdims.end(), 1, std::multiplies<int64_t>());
            for(std::size_t i = 0; i < rdims.size(); i++)
            {
                if(dims[i] == -1)
                    rdims[i] = missing_dim;
            }
        }

        auto s = reshape_lazy_dims(inputs.front(), rdims);
        if(not s.has_value())
            MIGRAPHX_THROW("reshape_lazy on axis that is not packed.");

        if(s->elements() != inputs.front().elements())
            MIGRAPHX_THROW(
                "reshape_lazy: Wrong number of elements for reshape_lazy: reshape_lazy has " +
                std::to_string(s->elements()) + " elements whereas the input has " +
                std::to_string(inputs.front().elements()));

        assert(s->bytes() == inputs.front().bytes());
        return *s;
    }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        auto n_neg_dims = std::count(dims.begin(), dims.end(), -1);
        if(n_neg_dims > 1)
            MIGRAPHX_THROW("reshape_lazy: Dimensions for reshape_lazy can only have one -1 dim");
        auto s0 = inputs[0];
        if(s0.dynamic())
        {
            return dyn_compute_shape(s0);
        }
        else
        {
            return static_compute_shape(inputs, n_neg_dims);
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        return args[0].reshape(dyn_out.computed_shape);
    }

    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 0; }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
