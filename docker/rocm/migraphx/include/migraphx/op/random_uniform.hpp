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

/**
 * Random Uniform distribution operator.  Given a shape, populate it with random
 * values.  Calls to random_uniform using the same randomization seed as a
 * literal input will
 * always generate the same pseudo-random sequence.
 *
 *      Inputs:   (1) randomization seed (any type is allowed)
 *                (2) output buffer argument to be populated.
 *
 *      Attributes:  none
 *
 *      Output:   Returns the buffer from input #2.
 *
 */
#ifndef MIGRAPHX_GUARD_OPERATORS_RANDOM_UNIFORM_HPP
#define MIGRAPHX_GUARD_OPERATORS_RANDOM_UNIFORM_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <random>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * random_uniform populates the passed shape with random numbers, in a uniform
 * distribution.  Range for floating-point data types is (0, 1);
 * for integer types it is [0, <max value for the type>]
 */
struct random_uniform
{
    // The random_uniform operation needs the random number generator seed
    // to be passed as a runtime input.

    std::string name() const { return "random_uniform"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(2);

        return inputs.at(1);
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        // Output goes into the passed buffer, not the shape output.
        argument result{dyn_out.computed_shape};
        uint64_t local_seed = args[0].at<uint64_t>(0);
        std::mt19937 gen(local_seed);

        result.visit([&](auto output) {
            using type = typename decltype(output)::value_type;
            if constexpr(std::is_integral<type>{})
            {
#ifdef _MSC_VER
                // According to the C++ specification, the effect is undefined if the result type
                // for the generator is not one of short, int, long, long long, unsigned short,
                // unsigned int, unsigned long, or unsigned long long. See
                // https://en.cppreference.com/w/cpp/numeric/random/uniform_int_distribution.
                if constexpr(sizeof(type) == 1)
                {
                    std::uniform_int_distribution<int> dis{std::numeric_limits<type>::min(),
                                                           std::numeric_limits<type>::max()};
                    std::generate(output.begin(), output.end(), [&] { return dis(gen); });
                }
                else
#endif
                {
                    // default range for all integer types is
                    // (0, std::uniform_int_distribution<type>::max()).
                    // Todo:  enable different ranges
                    std::uniform_int_distribution<type> dis;
                    std::generate(output.begin(), output.end(), [&] { return dis(gen); });
                }
            }
            else
            {
                // default real distribution type is double with range (0, 1);
                std::uniform_real_distribution<> dis;
                std::generate(output.begin(), output.end(), [&] { return dis(gen); });
            }
        });
        return result;
    }

    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 1; }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
