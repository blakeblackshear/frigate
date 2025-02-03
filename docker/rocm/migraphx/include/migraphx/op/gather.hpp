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
#ifndef MIGRAPHX_GUARD_OPERATORS_GATHER_HPP
#define MIGRAPHX_GUARD_OPERATORS_GATHER_HPP

#include <array>
#include <migraphx/check_shapes.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/streamutils.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <cmath>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct gather
{
    int64_t axis = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"));
    }

    value attributes() const
    {
        value normalize;
        normalize["axis"] = value::array{normalize_attribute::include_min};
        return {{"normalize_axes", normalize}};
    }

    std::string name() const { return "gather"; }

    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(2);
        shape data    = inputs[0];
        shape indices = inputs[1];
        auto type     = data.type();
        // If index_dims is dynamic, convert the data to dynamic too.
        if(indices.dynamic())
        {
            data = data.to_dynamic();
        }
        if(data.dynamic())
        {
            auto dims = data.dyn_dims();
            dims.erase(dims.begin() + axis);

            if(not indices.scalar())
            {
                auto index_dims = indices.to_dynamic().dyn_dims();
                dims.insert(dims.begin() + axis, index_dims.begin(), index_dims.end());
            }
            return {type, dims};
        }
        else
        {
            // Both data and indices are static.  indices may be scalar
            auto lens = data.lens();
            lens.erase(lens.begin() + axis);

            if(not indices.scalar())
            {
                auto ind_lens = indices.lens();
                lens.insert(lens.begin() + axis, ind_lens.begin(), ind_lens.end());
            }

            // for scalar output
            if(lens.empty())
            {
                return {type};
            }

            return {type, lens};
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result{dyn_out.computed_shape};
        // negative axis means counting dimensions from back
        auto lens                 = args[0].get_shape().lens();
        std::size_t axis_dim_size = lens[axis];
        // max dimension in axis
        visit_all(result, args[0])([&](auto output, auto data) {
            args[1].visit([&](auto indices) {
                if(dyn_out.computed_shape.scalar())
                {
                    auto in_index = indices.front();
                    in_index      = (in_index < 0) ? in_index + axis_dim_size : in_index;
                    output[0]     = data[in_index];
                }
                else
                {
                    auto out_lens  = data.get_shape().lens();
                    out_lens[axis] = indices.get_shape().elements();
                    migraphx::shape out_comp_shape{data.get_shape().type(), out_lens};
                    shape_for_each(out_comp_shape, [&](const auto& out_idx_v, size_t out_idx) {
                        auto data_idx   = out_idx_v;
                        auto in_index   = indices[data_idx[axis]];
                        in_index        = (in_index < 0) ? in_index + axis_dim_size : in_index;
                        // don't go out of bounds: https://github.com/ROCm/AMDMIGraphX/issues/2838
                        assert(in_index >= 0 and in_index < axis_dim_size);
                        data_idx[axis]  = in_index;
                        output[out_idx] = data(data_idx.begin(), data_idx.end());
                    });
                }
            });
        });

        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
