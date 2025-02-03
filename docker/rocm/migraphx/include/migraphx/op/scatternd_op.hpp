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
#ifndef MIGRAPHX_GUARD_OPERATORS_SCATTERND_OP_HPP
#define MIGRAPHX_GUARD_OPERATORS_SCATTERND_OP_HPP

#include <migraphx/op/name.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {
/**
 * @brief
 * N-dimensional Scatter operations. This struct is parent class to ops which differ in what formula
 * is used to reduce (combine old and new values of) the scattered value.  It was originally based
 * on Onnx ScatterND operation (see
 * https://github.com/onnx/onnx/blob/main/docs/Operators.md#ScatterND) and is also similar to Numpy
 * numpy.add.at().
 *
 * @tparam Derived   a template parameter in the CRTP inheritance idiom, represents one of the child
 * operations.
 */
template <class Derived>
struct scatternd_op : op_name<Derived>
{
    /** Validate input shapes and return the correct output shape.  For Scatter ops, the output
     * is the same shape as the data tensor (first input), but cast to a standard shape.
     *
     */
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(3);
        auto data_shape  = inputs.front();
        auto index_shape = inputs.at(1);
        auto upd_shape   = inputs.back();

        auto r = data_shape.ndim();
        auto q = index_shape.ndim();
        size_t k;
        if(index_shape.dynamic())
        {
            // the rank of the output is a function of k, so k must be fixed.
            if(not index_shape.dyn_dims().back().is_fixed())
            {
                MIGRAPHX_THROW(
                    "GATHERND: last dimension of indices tensor must be fixed (min=max)");
            }
            k = index_shape.dyn_dims().back().min;
        }
        else
            k = index_shape.lens().back();

        // Checks on the sizes of input tensors
        if(q + r != upd_shape.ndim() + k + 1)
            MIGRAPHX_THROW("ScatterND:  ranks of inputs don't match. " + std::to_string(q) + " + " +
                           std::to_string(r) + " - " + std::to_string(k) +
                           " - 1 != " + std::to_string(upd_shape.ndim()));
        if(k > r)
            MIGRAPHX_THROW("ScatterND: index of size " + std::to_string(k) +
                           " is too large for tensor of rank " + std::to_string(r));

        // Convert all static shape dimensions to dynamic so they can be compared.
        // It's possible for some of the 3 inputs to be dynamic shapes and some static,
        // but any dynamic dimension that's compared to a static dimension must be fixed.
        auto ind_dims  = index_shape.to_dynamic().dyn_dims();
        auto upd_dims  = upd_shape.to_dynamic().dyn_dims();
        auto data_dims = data_shape.to_dynamic().dyn_dims();

        // Check that corresponding portions of tensor shapes match.
        // Brackets around q - 1 are placed for safeguarding against the breaking iterator out of
        // vector range.
        if(not(std::equal(ind_dims.begin(), ind_dims.begin() + (q - 1), upd_dims.begin()) and
               std::equal(data_dims.begin() + k, data_dims.end(), upd_dims.begin() + (q - 1))))
            MIGRAPHX_THROW("ScatterND: incorrect update shape. Update dimensions must match "
                           "indices and data.");

        if(data_shape.dynamic())
            return data_shape;
        else if(data_shape.broadcasted())
        {
            return {data_shape.type(), data_shape.lens()};
        }
        else
        {
            return data_shape.with_lens(data_shape.lens());
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result{dyn_out.computed_shape};
        auto& self = static_cast<const Derived&>(*this);
        visit_all(result, args[0], args[2])([&](auto output, auto data, auto updates) {
            std::copy(data.begin(), data.end(), output.begin());
            args[1].visit([&](auto indices) {
                auto updates_shape = updates.get_shape();
                auto updates_std   = shape{updates_shape.type(), updates_shape.lens()};
                auto indices_shape = indices.get_shape();
                auto k             = indices_shape.lens().back();
                auto q             = indices_shape.ndim();
                auto r             = dyn_out.computed_shape.ndim();
                for(auto i = 0u; i < updates_shape.elements(); ++i)
                {
                    auto updates_idx = updates_std.multi(i);
                    std::vector<std::size_t> indices_idx(q, 0);
                    std::copy(
                        updates_idx.begin(), updates_idx.begin() + (q - 1), indices_idx.begin());
                    auto index_start = indices.begin() +
                                       indices_shape.index(indices_idx.begin(), indices_idx.end());
                    auto index_end = index_start + k;

                    std::vector<std::size_t> out_idx(r, 0);
                    std::copy(index_start, index_end, out_idx.begin());
                    std::copy(
                        updates_idx.begin() + (q - 1), updates_idx.end(), out_idx.begin() + k);

                    self.reduction()(output[dyn_out.computed_shape.index(out_idx)], updates[i]);
                }
            });
        });

        return result;
    }

    auto init() const {}
    scatternd_op() {}
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
