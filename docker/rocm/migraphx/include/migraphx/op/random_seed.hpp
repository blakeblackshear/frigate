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

#ifndef MIGRAPHX_GUARD_OPERATORS_RANDOM_SEED_HPP
#define MIGRAPHX_GUARD_OPERATORS_RANDOM_SEED_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <random>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 *    Generates a random seed for the use of random number generators.  Generating the seed
 * at runtime guarantees there will be a different random sequence on every execution.
 * This operation has no inputs or attributes, and outputs an unsigned integer tensor with
 * a single value.
 */
struct random_seed
{
    shape::type_t dtype = shape::type_t::uint64_type;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.dtype, "dtype"));
    }

    std::string name() const { return "random_seed"; }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(0);
        return shape{dtype};
    }

    argument compute(const shape& output_shape, const std::vector<argument>&) const
    {
        argument result(output_shape);

        result.visit([&](auto output) { output.front() = std::random_device{}(); });
        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
