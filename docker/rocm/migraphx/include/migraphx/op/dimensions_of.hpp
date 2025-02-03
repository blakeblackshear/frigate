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
#ifndef MIGRAPHX_GUARD_OPERATORS_DIMENSIONS_OF_HPP
#define MIGRAPHX_GUARD_OPERATORS_DIMENSIONS_OF_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/dyn_output.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Returns the dimensions of the input argument from starting axis to ending axis.
 * Atleast `end` must be set to use this operator (set `end` to ndim for default ONNX behavior of
 * `Shape` operator) This should only be used for dynamic shapes as this can be simplified to a
 * literal for static shapes.
 */
struct dimensions_of
{
    std::size_t start = 0;
    std::size_t end   = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.start, "start"), f(self.end, "end"));
    }

    std::string name() const { return "dimensions_of"; }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        if(start >= end)
        {
            MIGRAPHX_THROW("DIMENSIONS_OF: start >= end. start = " + std::to_string(start) +
                           ", end = " + std::to_string(end));
        }
        return shape{shape::int64_type, {end - start}};
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        auto input_lens = args[0].get_shape().lens();
        result.visit([&](auto output) {
            std::copy(input_lens.cbegin() + start, input_lens.cbegin() + end, output.begin());
        });
        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
