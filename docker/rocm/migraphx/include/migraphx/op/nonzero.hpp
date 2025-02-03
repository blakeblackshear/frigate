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
#ifndef MIGRAPHX_GUARD_OPERATORS_NONZERO_HPP
#define MIGRAPHX_GUARD_OPERATORS_NONZERO_HPP

#include <migraphx/shape_for_each.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/float_equal.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/argument.hpp>
#include <cmath>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct nonzero
{
    std::string name() const { return "nonzero"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(1).standard();
        auto elem_num                     = inputs[0].elements();
        auto dim_num                      = inputs[0].lens().size();
        std::vector<std::size_t> out_lens = {dim_num, elem_num};

        return {shape::int64_type, out_lens};
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        std::vector<std::vector<std::size_t>> vec_idx;
        auto s = args.front().get_shape();
        args.front().visit([&](auto v) {
            shape_for_each(s, [&](const auto& idx_v, size_t idx) {
                if(not float_equal(v[idx], 0))
                {
                    vec_idx.push_back(idx_v);
                }
            });
        });

        argument result{output_shape};
        result.visit([&](auto output) {
            std::fill(output.begin(), output.end(), 0);
            par_for(vec_idx.size(), [&](auto i) {
                for(std::size_t j = 0; j < vec_idx.front().size(); ++j)
                {
                    output[output_shape.index({j, i})] = vec_idx[i][j];
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
