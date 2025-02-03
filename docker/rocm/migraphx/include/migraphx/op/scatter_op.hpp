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
#ifndef MIGRAPHX_GUARD_OPERATORS_SCATTER_ELEMENTS_OP_HPP
#define MIGRAPHX_GUARD_OPERATORS_SCATTER_ELEMENTS_OP_HPP

#include <array>
#include <migraphx/check_shapes.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/op/name.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <migraphx/argument.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

// The scatter operator fetches a subset of data given by an index array and then performs a
// reduction operation (add, multiply, or just set the data) on each element returned.  We implement
// it as a separate derived struct for each of the three reduction methods.  The related operator
// scatterND is a generalization that works on a set of 3 tensors of different ranks.  The
// complementary operations are gather/gatherND.

template <typename Derived>
struct scatter_op : op_name<Derived>
{
    int64_t axis = 0;
    // skip scattering indicies that are out of bounds
    bool skip_out_of_bounds = false;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"), f(self.skip_out_of_bounds, "skip_out_of_bounds"));
    }

    value attributes() const
    {
        value normalize;
        normalize["axis"] = value::array{normalize_attribute::include_min};
        return {{"normalize_axes", normalize}};
    }

    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(3);
        // If non-packed, this converts to a packed output while preserving permutation of tensor
        return inputs.front().with_lens(inputs.front().lens());
    }

    // iterate through items in shape
    template <class TensorView0, class TensorView1>
    void scatter_reduce_iterate(TensorView0 indices, TensorView1 output, TensorView1 update) const
    {
        auto ind_s         = indices.get_shape();
        auto output_shape  = output.get_shape();
        auto axis_dim_size = output_shape.lens()[axis];
        shape_for_each(ind_s, [&](const auto& idx) {
            auto out_idx = idx;

            // tensor_view::() invokes indexing logic of
            // std::size_t shape::index(std::size_t i) const
            auto index = indices(idx.begin(), idx.end());

            // this addition doesn't necessarily make index positive if index was out of bounds
            index = (index < 0) ? index + axis_dim_size : index;
            assert(skip_out_of_bounds or index >= 0);
            if(skip_out_of_bounds and index < 0)
            {
                return;
            }
            out_idx[axis] = index;
            // skip index out of bounds if attribute on, else assert
            assert(skip_out_of_bounds or output_shape.multi_within_bounds(out_idx));
            if(skip_out_of_bounds)
            {
                if(not output_shape.multi_within_bounds(out_idx))
                {
                    return;
                }
            }
            // look up the appropriate locations in output, using idx and out_idx.
            // call reduction() method of derived struct to copy and reduce that element
            derived().reduction()(output(out_idx.begin(), out_idx.end()),
                                  update(idx.begin(), idx.end()));
            return;
        });
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};

        visit_all(result, args[0], args[2])([&](auto output, auto data, auto update) {
            std::copy(data.begin(), data.end(), output.begin());
            args[1].visit([&](auto indices) { scatter_reduce_iterate(indices, output, update); });
        });

        return result;
    }

    const Derived& derived() const { return static_cast<const Derived&>(*this); }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
