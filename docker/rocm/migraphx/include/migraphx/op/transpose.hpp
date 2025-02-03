/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_OPERATORS_TRANSPOSE_HPP
#define MIGRAPHX_GUARD_OPERATORS_TRANSPOSE_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <migraphx/dyn_output.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct transpose
{
    std::vector<int64_t> dims;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.dims, "permutation"));
    }

    std::string name() const { return "transpose"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        auto input = inputs.at(0);

        if(dims.size() != input.ndim())
        {
            MIGRAPHX_THROW("TRANSPOSE: Permutation has wrong number of axes");
        }
        std::vector<int64_t> axes(dims.size());
        std::iota(axes.begin(), axes.end(), 0);
        if(not std::is_permutation(axes.begin(), axes.end(), dims.begin()))
        {
            MIGRAPHX_THROW("TRANSPOSE: Invalid permutation");
        }

        if(input.dynamic())
        {
            std::vector<shape::dynamic_dimension> output_dyn_dims(input.ndim());
            std::transform(dims.cbegin(), dims.cend(), output_dyn_dims.begin(), [&](auto dim) {
                return input.dyn_dims()[dim];
            });
            return {input.type(), output_dyn_dims};
        }
        else
        {
            auto input_lens    = input.lens();
            auto input_strides = input.strides();

            std::vector<size_t> output_lens(input.ndim());
            std::vector<size_t> output_strides(input.ndim());
            for(std::size_t i = 0; i < input.ndim(); i++)
            {
                output_lens[i]    = input_lens[dims[i]];
                output_strides[i] = input_strides[dims[i]];
            }
            return {input.type(), output_lens, output_strides};
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
