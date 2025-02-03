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
#ifndef MIGRAPHX_GUARD_OPERATORS_BIT_CAST_HPP
#define MIGRAPHX_GUARD_OPERATORS_BIT_CAST_HPP

#include <migraphx/op/unary.hpp>
#include <migraphx/config.hpp>
#include <migraphx/bit_cast.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Obtain a value of type `target_type` by reinterpreting
 * the object represnetaion of the input. Originally used
 * for casting from fp8e4m3fn to fp8e4m3fnuz.
 */
struct bit_cast : unary<bit_cast>
{
    shape::type_t target_type;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.target_type, "target_type"));
    }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        auto input = inputs.at(0);
        std::size_t target_type_size;
        shape::visit(target_type, [&](auto as) { target_type_size = as.size(); });
        if(input.type_size() != target_type_size)
        {
            MIGRAPHX_THROW("BIT_CAST: target_type has different type_size from input's");
        }
        if(input.dynamic())
        {
            return {target_type, input.dyn_dims()};
        }
        else
        {
            return {target_type, input.lens(), input.strides()};
        }
    }

    std::string point_op() const
    {
        return "${function:bit_cast}<" + shape::cpp_type(target_type) + ">(${0})";
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result{dyn_out.computed_shape};
        result.visit([&](auto output) {
            using otype = typename decltype(output)::value_type;
            args[0].visit([&](auto input) {
                using itype = typename decltype(input)::value_type;
                if constexpr(sizeof(otype) == sizeof(itype))

                {
                    par_transform(input.begin(), input.end(), output.begin(), [&](auto x) {
                        return migraphx::bit_cast<otype>(x);
                    });
                }
                else
                {
                    // not possible to hit this unless somehow the types change after compute_shape
                    // is called
                    MIGRAPHX_THROW("BIT_CAST: type size mismatch");
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
