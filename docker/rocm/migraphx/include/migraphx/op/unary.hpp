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
#ifndef MIGRAPHX_GUARD_OPERATORS_UNARY_HPP
#define MIGRAPHX_GUARD_OPERATORS_UNARY_HPP

#include <migraphx/op/name.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/value.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/par.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

template <class Derived>
struct unary : op_name<Derived>
{
    std::string point_function() const { return this->name(); }
    std::string point_op() const
    {
        const auto& self = static_cast<const Derived&>(*this);
        auto pf          = self.point_function();
        if(pf.empty())
            return {};
        if(with_char(::ispunct)(pf.front()))
        {
            return pf + "${0}";
        }
        else
        {
            return "${function:" + pf + "}(${0})";
        }
    }
    value base_attributes() const
    {
        const auto& self = static_cast<const Derived&>(*this);
        return {{"pointwise", true}, {"point_op", self.point_op()}};
    }
    value attributes() const { return base_attributes(); }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, static_cast<const Derived&>(*this), true}.has(1);
        auto s = inputs.at(0);
        if(s.dynamic() or s.scalar())
        {
            return s;
        }
        else if(s.broadcasted())
        {
            return {s.type(), s.lens()};
        }
        else
        {
            return s.with_lens(s.lens());
        }
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        argument result{dyn_out.computed_shape};
        result.visit([&](auto output) {
            args[0].visit([&](auto input) {
                par_transform(input.begin(),
                              input.end(),
                              output.begin(),
                              static_cast<const Derived&>(*this).apply());
            });
        });
        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
