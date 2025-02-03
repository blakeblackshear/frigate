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
#ifndef MIGRAPHX_GUARD_OPERATORS_ONEHOT_HPP
#define MIGRAPHX_GUARD_OPERATORS_ONEHOT_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/shape_for_each.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Produces a one-hot tensor.
 * Called with `axis` attribute that defaults to the last output axis
 * Constant depth: `onehot(indices, values), depth attribute must be set;
 * Variable depth: `onehot(indices, depth, values)`;
 * `indicies` as a N rank tensor of indices where value is `on_value`
 * `depth` scalar with the number of classes for the one-hot dimension
 * `values` `[off_value, on_value]`
 * `axis` which axis to add the one-hot dimension to
 * For axis = 0 and rank(indices) = 2:
 * output is A[indicies[j, k], j, k] = on_value; A[i, j, k] = off_value otherwise
 * Can be simplified to other operators when `indices` has a static shape and
 * `depth` is constant at compile-time.
 */
struct onehot
{
    // cannot use normalize_attribute here since rank(output_shape) = rank(indices) + 1
    int64_t axis = -1;
    // optional depth attribute for static output shape
    std::optional<int64_t> depth;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"), f(self.depth, "depth"));
    }

    std::string name() const { return "onehot"; }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this, true}.has(2, 3);
        const auto& indices_shape = inputs[0];
        auto normalized_axis =
            (this->axis < 0) ? this->axis + indices_shape.ndim() + 1 : this->axis;
        if(normalized_axis > indices_shape.ndim())
        {
            MIGRAPHX_THROW("ONEHOT: axis is out of range");
        }
        if(depth.has_value())
        {
            if(depth.value() < 0)
            {
                MIGRAPHX_THROW("ONEHOT: negative depth attribute value");
            }
            check_shapes{inputs, *this, true}.has(2);
            // `values` should have static shape
            (void)check_shapes{inputs.begin() + 1, inputs.end(), *this, false};
            const auto& values_shape = inputs[1];
            if(not indices_shape.dynamic())
            {
                // static output shape
                auto output_lens = indices_shape.lens();
                output_lens.insert(output_lens.begin() + normalized_axis, depth.value());
                return {values_shape.type(), output_lens};
            }
            // dynamic output shape
            auto output_dds       = indices_shape.to_dynamic().dyn_dims();
            std::size_t depth_val = depth.value();
            output_dds.insert(output_dds.begin() + normalized_axis,
                              shape::dynamic_dimension{depth_val, depth_val});
            return {values_shape.type(), output_dds};
        }
        else
        {
            // dynamic output shape
            check_shapes{inputs, *this, true}.has(3);
            // `depth` and `values` should have static shape
            (void)check_shapes{inputs.begin() + 1, inputs.end(), *this, false};
            const auto& values_shape = inputs[2];
            auto output_dds          = indices_shape.to_dynamic().dyn_dims();
            std::size_t max_val      = std::numeric_limits<std::size_t>::max();
            output_dds.insert(output_dds.begin() + normalized_axis,
                              shape::dynamic_dimension{0, max_val});
            return {values_shape.type(), output_dds};
        }
    }

    argument compute(const shape&, std::vector<argument> args) const
    {
        auto indices_shape = args[0].get_shape();
        int64_t depth_val;
        auto values_iter = args.begin();
        if(this->depth.has_value())
        {
            assert(args.size() == 2);
            depth_val = depth.value();
            values_iter += 1;
        }
        else
        {
            assert(args.size() == 3);
            args[1].visit([&](auto d) { depth_val = d(0); });
            values_iter += 2;
        }
        if(depth_val < 0)
        {
            MIGRAPHX_THROW("ONEHOT: negative depth value");
        }
        auto output_lens     = indices_shape.lens();
        auto normalized_axis = (axis < 0) ? axis + indices_shape.ndim() + 1 : axis;
        output_lens.insert(output_lens.begin() + normalized_axis, depth_val);
        shape output_shape{values_iter->get_shape().type(), output_lens};

        argument result{output_shape};
        visit_all(result, *values_iter)([&](auto output, auto values) {
            auto off_value = values(0);
            auto on_value  = values(1);
            // fill result with off_value
            par_for(output_shape.elements(), [&](auto i) { output[i] = off_value; });
            args[0].visit([&](auto indices) {
                auto ind_s = indices.get_shape();
                shape_for_each(ind_s, [&](const auto& idx) {
                    auto index = indices(idx.begin(), idx.end());
                    // normalize negative indices
                    index = (index < 0) ? index + depth_val : index;
                    // no on_value if index is out of range
                    if(index >= 0 and index < depth_val)
                    {
                        std::vector<std::size_t> out_idx = idx;
                        out_idx.insert(out_idx.begin() + normalized_axis, index);
                        output(out_idx.begin(), out_idx.end()) = on_value;
                    }
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
