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
#ifndef MIGRAPHX_GUARD_OPERATORS_ARGMIN_HPP
#define MIGRAPHX_GUARD_OPERATORS_ARGMIN_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <migraphx/float_equal.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct argmin
{
    int64_t axis = 0;
    bool select_last_index = false;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"), f(self.select_last_index, "select_last_index"));
    }

    value attributes() const
    {
        value normalize;
        normalize["axis"] = value::array{normalize_attribute::include_min};
        return {{"normalize_axes", normalize}};
    }

    std::string name() const { return "argmin"; }

    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(1);
        auto lens = inputs[0].lens();

        lens[axis] = 1;

        return {shape::int64_type, lens};
    }

    template <class T>
    int64_t calc_argmin(T& input, std::vector<std::size_t>& indices, size_t item_num) const
    {
        auto min_val      = input(indices.begin(), indices.end());
        int64_t min_index = 0;
        for(std::size_t i = 1; i < item_num; ++i)
        {
            indices[axis] = i;
            auto cur_val  = input(indices.begin(), indices.end());
            if(min_val > cur_val)
            {
                min_val   = cur_val;
                min_index = i;
            }
            else if(select_last_index and float_equal(min_val, cur_val))
            {
                min_index = i;
            }
        }

        return min_index;
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        std::size_t batch_item_num = args.front().get_shape().lens()[axis];

        result.visit([&](auto output) {
            args[0].visit([&](auto input) {
                par_for(output_shape.elements(), [&](auto i) {
                    auto data_idx = output_shape.multi(i);
                    output[i]     = this->calc_argmin(input, data_idx, batch_item_num);
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
