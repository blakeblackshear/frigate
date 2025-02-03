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
#ifndef MIGRAPHX_GUARD_OPERATORS_QUANT_DOT_HPP
#define MIGRAPHX_GUARD_OPERATORS_QUANT_DOT_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/gemm.hpp>
#include <migraphx/value.hpp>
#include <migraphx/fp8_types.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct quant_dot
{
    value attributes() const { return {{"general_data_type", "dot"}}; }

    std::string name() const { return "quant_dot"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{{inputs.at(0), inputs.at(1)}, *this}.same_type().has(2);
        const shape& a = inputs.at(0);
        const shape& b = inputs.at(1);
        auto t         = a.type();
        std::set<migraphx::shape::type_t> supported_types = fp8_types{}.get();
        supported_types.insert(shape::int8_type);
        supported_types.insert(shape::uint8_type);
        if(not contains(supported_types, t))
        {
            MIGRAPHX_THROW("QUANT_DOT: only support data type int8_t, uint8_t and fp8 types");
        }

        if(not std::all_of(
               inputs.begin(), inputs.end(), [](auto s) { return s.lens().size() >= 2; }))
        {
            MIGRAPHX_THROW("QUANT_DOT: dot only accept 2 or more dims operands");
        }

        // only handle the case that the batch size of a and b are the same
        if(not std::equal(
               a.lens().rbegin() + 2, a.lens().rend(), b.lens().rbegin() + 2, b.lens().rend()))
        {
            MIGRAPHX_THROW("QUANT_DOT: batch size of A and B mismatch: {" +
                           to_string_range(a.lens()) + "} x {" + to_string_range(b.lens()) + "}");
        }

        std::size_t dim_0 = a.lens().size() - 2;
        std::size_t dim_1 = a.lens().size() - 1;
        if(a.lens()[dim_1] != b.lens()[dim_0])
        {
            MIGRAPHX_THROW("QUANT_DOT: inner dimensions do not match: {" +
                           to_string_range(a.lens()) + "} x {" + to_string_range(b.lens()) + "}");
        }

        auto out_lens   = a.lens();
        out_lens[dim_1] = b.lens()[dim_1];
        if(contains(fp8_types{}.get(), t))
        {
            return {shape::float_type, out_lens};
        } // else int8 gemm
        return {shape::int32_type, out_lens};
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
