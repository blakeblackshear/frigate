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
 *  * Multinomial or categorical distribution.  Performs a sampling of random input
 *         and returns a count of
 *         each category, or bucket.  This does not require the standard multinomial
 *         distribution but instead takes a probability distribution, i.e. cumulative
 *         distribution function (CDF) as its first input.
 *
 *      Inputs:   args[0] - a tensor of probabilities for each category.  Values are
 *                          cumulative density function
 *                          totals as provided by operation prefix_scan_sum.  Values are
 *                          cumulative probabilities (i.e. start with any set of numbers > 0
 *                          and then apply prefix_scan_sum).  Values do not need to be
 *                          normalized to sum to 1; this is done in runtime computation.
 *
 *                          This input has Rank 2.  Dimension 0 is batch #, so that there can be
 *                          a different CDF for each iteration in the batch.  The size of dimension
 *                          1 is the number of categories.
 *
 *                args[1] - a tensor of random numbers.  The last dimension is the sample
 *                          size, i.e. the number of
 *                          random samples in each iteration of the batch.  Nominally
 *                          has two dimensions where the first dimension is batch size, but
 *                          any reshaping such that the total
 *                          number of elements is (batch_size * sample_size) is legal.
 *
 *                          Values as created by a std::mt19937 like this:
 *
 *                           size_t sample_size = 100000;
 *                           float seed         = 0.0f;
 *                           std::mt19937 gen(seed);
 *                           std::uniform_real_distribution<> dis(0.0, 1.0);
 *                           std::vector<float> rand_samples(sample_size);
 *                           std::generate(rand_samples.begin(), rand_samples.end(), [&]() { return
 *                                dis(gen); });
 *
 *        Output:   A 2D vector of category each input.  Dimensions are (Input 1[first], Input
 2[last]).
 *
*/
#ifndef MIGRAPHX_GUARD_OPERATORS_MULTINOMIAL_HPP
#define MIGRAPHX_GUARD_OPERATORS_MULTINOMIAL_HPP

#include <migraphx/argument.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/reflect.hpp>
#include <random>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct multinomial
{
    shape::type_t dtype = shape::type_t::int32_type;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.dtype, "dtype"));
    }

    std::string name() const { return "multinomial"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(2).only_dims(2);

        if(inputs.back().ndim() < 1)
            MIGRAPHX_THROW("Multinomial: Second input shape (sample) has no dimensions");
        if(dtype == shape::bool_type)
            MIGRAPHX_THROW("Multinomial: boolean output type invalid.");

        // Output takes one dimension from each of the two input shapes.  If they are both fixed,
        // return a static shape
        if((not inputs.front().dynamic()) or (inputs.front().dyn_dims().front().is_fixed()))
        {
            if((not inputs.back().dynamic()) or (inputs.back().dyn_dims().back().is_fixed()))
            {
                size_t batch = {inputs.front().max_lens().front()};
                size_t sample_size{inputs.back().max_lens().back()};
                return {dtype, {batch, sample_size}};
            }
        }
        return {dtype,
                {inputs.front().to_dynamic().dyn_dims().front(),
                 inputs.back().to_dynamic().dyn_dims().back()}};
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result{dyn_out.computed_shape};
        size_t batch_size  = dyn_out.computed_shape.lens().front();
        size_t class_size  = args[0].get_shape().lens().back();
        size_t sample_size = dyn_out.computed_shape.lens().back();

        visit_all(args[0], args[1])([&](auto cdf, auto dist) {
            result.visit([&](auto output) {
                par_for(batch_size * sample_size, [&](auto i) {
                    auto idx       = args[1].get_shape().multi(i);
                    auto cdf_begin = cdf.begin() + (idx[0] * class_size);
                    auto cdf_end   = cdf_begin + class_size;

                    // std::upper_bound returns an iterator to the bucket the value belongs in,
                    // when normalized by the probability distribution dist
                    auto sample_iter =
                        std::upper_bound(cdf_begin, cdf_end, dist[i] * *(std::prev(cdf_end)));
                    // convert iterator to an integer index
                    output[i] = std::distance(cdf_begin, sample_iter);
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
