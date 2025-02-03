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
#ifndef MIGRAPHX_GUARD_OPERATORS_DOT_HPP
#define MIGRAPHX_GUARD_OPERATORS_DOT_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/gemm.hpp>
#include <migraphx/dyn_output.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Matrix multiplication of two tensors.
 */
struct dot
{
    std::string name() const { return "dot"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.same_type().same_ndims().has(2);
        const shape& a = inputs.at(0);
        const shape& b = inputs.at(1);
        auto t         = a.type();

        if(not std::all_of(inputs.begin(), inputs.end(), [](auto s) { return s.ndim() >= 2; }))
        {
            MIGRAPHX_THROW("DOT: dot only accepts operands with 2 or more dimensions ");
        }
        if(a.dynamic() or b.dynamic())
        {
            auto s0 = a.to_dynamic();
            auto s1 = b.to_dynamic();
            std::vector<shape::dynamic_dimension> out_dyn_dims;

            // Check outer dynamic dimensions are compatible.
            // Must allow for intersection because of how simplify_dyn_ops
            // simplifies each broadcast_for_dot individually.
            bool same_outers = std::equal(s0.dyn_dims().begin(),
                                          s0.dyn_dims().end() - 2,
                                          s1.dyn_dims().begin(),
                                          s1.dyn_dims().end() - 2,
                                          [&](auto x, auto y) {
                                              auto intersect = x.intersection(y);
                                              if(intersect.has_value())
                                              {
                                                  out_dyn_dims.push_back(intersect.value());
                                                  return true;
                                              }
                                              return false;
                                          });

            if(not same_outers)
            {
                MIGRAPHX_THROW("DOT: dynamic outer dimensions of A and B are not compatible: {" +
                               to_string_range(s0.dyn_dims()) + "} x {" +
                               to_string_range(s1.dyn_dims()) + "}");
            }
            std::size_t dim_i = s0.ndim() - 2;
            std::size_t dim_j = s0.ndim() - 1;
            auto x            = s0.dyn_dims()[dim_j];
            auto y            = s1.dyn_dims()[dim_i];

            // check inner dimensions are compatible
            if(not x.intersection(y).has_value())
            {
                MIGRAPHX_THROW("DOT: dynamic inner dimensions are not compatible: {" +
                               to_string_range(s0.dyn_dims()) + "} x {" +
                               to_string_range(s1.dyn_dims()) + "}");
            }

            out_dyn_dims.push_back(s0.dyn_dims()[dim_i]);
            out_dyn_dims.push_back(s1.dyn_dims()[dim_j]);
            return {t, out_dyn_dims};
        }
        else
        {
            // only handle the case that all the dimensions except the last two are the same
            if(not std::equal(
                   a.lens().rbegin() + 2, a.lens().rend(), b.lens().rbegin() + 2, b.lens().rend()))
            {
                MIGRAPHX_THROW("DOT: static outer dimensions of A and B mismatch: {" +
                               to_string_range(a.lens()) + "} x {" + to_string_range(b.lens()) +
                               "}");
            }

            std::size_t dim_0 = a.ndim() - 2;
            std::size_t dim_1 = a.ndim() - 1;
            if(a.lens()[dim_1] != b.lens()[dim_0])
            {
                MIGRAPHX_THROW("DOT: static inner dimensions do not match: {" +
                               to_string_range(a.lens()) + "} x {" + to_string_range(b.lens()) +
                               "}");
            }

            auto out_lens   = a.lens();
            out_lens[dim_1] = b.lens()[dim_1];
            return {t, out_lens};
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result = argument{dyn_out.computed_shape};
        visit_all(result, args[0], args[1])(
            [&](auto cmat, auto amat, auto bmat) { gemm(cmat, amat, bmat, 1.0f, 0.0f); });
        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
