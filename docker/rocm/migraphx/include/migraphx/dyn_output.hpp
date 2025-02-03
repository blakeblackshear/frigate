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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_DYN_OUTPUT_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_DYN_OUTPUT_HPP

#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct dyn_output
{
    // original shape from the instruction
    shape ins_shape;
    // shape computed at eval time using input arguments
    shape computed_shape;
};

/**
 * Handle dynamic and static shape at evaluation time.
 * If converted to shape type, returns original ins_shape.
 * If converted to dyn_output type, will compute an output shape using the input arguments.
 */
template <class F>
struct compute_output_shape
{
    F ins_inputs;

    operator dyn_output() const
    {
        return ins_inputs([](const auto& x, shape ins_shape, const std::vector<argument>& inputs) {
            if(ins_shape.dynamic())
                return dyn_output{ins_shape, compute_shape(x, to_shapes(inputs))};
            return dyn_output{ins_shape, ins_shape};
        });
    }

    operator shape() const
    {
        return ins_inputs(
            [](const auto&, shape ins_shape, const std::vector<argument>&) { return ins_shape; });
    }
};

template <class F>
compute_output_shape<F> make_compute_output_shape(F f)
{
    return {f};
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif
