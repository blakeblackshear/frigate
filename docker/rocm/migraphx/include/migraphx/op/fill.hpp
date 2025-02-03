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
#ifndef MIGRAPHX_GUARD_OPERATORS_FILL_HPP
#define MIGRAPHX_GUARD_OPERATORS_FILL_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/par_for.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * fill(default_value, output_buffer)
 * Fill an output buffer with the given default_value.
 * Note that if the default_value is a literal and the output_buffer
 * has a static shape this operator can be replaced with a literal.
 */
struct fill
{
    std::string name() const { return "fill"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(2).same_type();
        if(inputs.at(0).dynamic() or inputs.at(0).elements() != 1)
        {
            MIGRAPHX_THROW("FILL: default_value is dynamic or more than one element");
        }
        return inputs.back();
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        visit_all(args[0], args[1])([&](auto value, auto output) {
            par_for(dyn_out.computed_shape.elements(), [&](auto i) { output[i] = value.front(); });
        });
        return args[1];
    }

    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 1; }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
