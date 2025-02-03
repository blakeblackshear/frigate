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
#ifndef MIGRAPHX_GUARD_RTGLIB_UNARY_HPP
#define MIGRAPHX_GUARD_RTGLIB_UNARY_HPP

#include <migraphx/gpu/name.hpp>
#include <migraphx/gpu/hip.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/reduce_dims.hpp>
#include <utility>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

template <class Derived, std::size_t N>
struct device_base : oper<Derived>
{
    template <class Self, class F>
    static auto reflect(Self&, F)
    {
        return pack();
    }

    std::vector<shape> reduce_shapes;

    void finalize(context&, const shape&, const std::vector<shape>& inputs)
    {
        reduce_shapes = reduce_dims(inputs);
    }

    argument get_arg(const std::vector<argument>& args, std::size_t i) const
    {
        if(reduce_shapes.empty())
            return args[i];
        return args.at(i).reshape(reduce_shapes.at(i));
    }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(N + 1);
        auto s0 = inputs.at(0);
        if(std::all_of(inputs.begin(), inputs.end() - 1, [&](auto s) { return s == s0; }) and
           s0.packed())
            return s0;
        else
            return {s0.type(), s0.lens()};
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }
};

template <class Derived, void (*F)(hipStream_t, const argument&, const argument&)>
struct unary_device : device_base<Derived, 1>
{
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        F(ctx.get_stream().get(), this->get_arg(args, 1), this->get_arg(args, 0));
        return args[1];
    }
};

template <class Derived, void (*F)(hipStream_t, const argument&, const argument&, const argument&)>
struct binary_device : device_base<Derived, 2>
{
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        F(ctx.get_stream().get(),
          this->get_arg(args, 2),
          this->get_arg(args, 0),
          this->get_arg(args, 1));
        return args[2];
    }
};

template <class Derived,
          void (*F)(
              hipStream_t, const argument&, const argument&, const argument&, const argument&)>
struct ternary_device : device_base<Derived, 3>
{
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        F(ctx.get_stream().get(),
          this->get_arg(args, 3),
          this->get_arg(args, 0),
          this->get_arg(args, 1),
          this->get_arg(args, 2));
        return args[3];
    }
};

template <class Derived,
          void (*F)(hipStream_t,
                    const argument&,
                    const argument&,
                    const argument&,
                    const argument&,
                    const argument&)>
struct quaternary_device : device_base<Derived, 4>
{
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        F(ctx.get_stream().get(),
          this->get_arg(args, 4),
          this->get_arg(args, 0),
          this->get_arg(args, 1),
          this->get_arg(args, 2),
          this->get_arg(args, 3));
        return args[4];
    }
};

template <class Derived,
          void (*F)(hipStream_t,
                    const argument&,
                    const argument&,
                    const argument&,
                    const argument&,
                    const argument&,
                    const argument&)>
struct quinary_device : device_base<Derived, 5>
{
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        F(ctx.get_stream().get(),
          this->get_arg(args, 5),
          this->get_arg(args, 0),
          this->get_arg(args, 1),
          this->get_arg(args, 2),
          this->get_arg(args, 3),
          this->get_arg(args, 4));
        return args[5];
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
