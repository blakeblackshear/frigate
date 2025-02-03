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
 * Parent struct for prefix scan ops.  A prefix scan is a mathematical entity useful
 * in parallelizing various computations.  Given a list of numbers, a prefix scan
 * op returns an equal size list of running totals of the values.  Other operations
 * besides addition can be supported by child ops.
 */
#ifndef MIGRAPHX_GUARD_OPERATORS_SCAN_OP_HPP
#define MIGRAPHX_GUARD_OPERATORS_SCAN_OP_HPP

#include <migraphx/op/name.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/op/normalize_attribute.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Parent struct for prefix scan operations.  A prefix scan is equivalent to the C++
 * std::exclusive_scan or std::inclusive_scan.  Given a list of numbers, a prefix scan
 * sum op returns an equal size list of running totals of the values.  Other operations
 * besides addition can be supported by their own child ops.
 */
template <class Derived>
struct prefix_scan_op : op_name<Derived>
{
    int64_t axis;
    bool exclusive = false;
    bool reverse   = false;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(
            f(self.axis, "axis"), f(self.exclusive, "exclusive"), f(self.reverse, "reverse"));
    }

    value attributes() const
    {
        value normalize;
        normalize["axis"] = value::array{normalize_attribute::include_min};
        return {{"normalize_axes", normalize}};
    }

    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1);
        auto s = inputs.front();
        if(s.dynamic())
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
        shape output_shape(dyn_out.computed_shape);
        argument result{output_shape};
        auto s = args[0].get_shape();
        if(s == output_shape)
        {
            result = args[0].copy();
        }
        else
        {
            visit_all(result, args[0])([&](auto output, auto input) {
                par_for(output_shape.elements(),
                        [&](auto i) { output[output_shape.index(i)] = input[s.index(i)]; });
            });
            s = output_shape;
        }
        auto slice = shape{s.type(), {s.lens()[axis]}, {s.strides()[axis]}};
        auto lens  = s.lens();
        lens[axis] = 1;
        auto batch = shape{s.type(), lens, s.strides()};
        auto& self = static_cast<const Derived&>(*this);
        result.visit([&](auto output) {
            using type = decltype(output);
            par_for(batch.elements(), [&](auto i) {
                auto* start = output.data() + batch.index(i);
                type x{slice, start};
                if(reverse)
                {
                    if(exclusive)
                    {
                        std::copy(++x.begin(), x.end(), x.begin());
                        x.back() = 0;
                    }
                    std::partial_sum(std::make_reverse_iterator(x.end()),
                                     std::make_reverse_iterator(x.begin()),
                                     std::make_reverse_iterator(x.end()),
                                     self.op());
                }
                else
                {
                    if(exclusive)
                    {
                        std::copy_backward(x.begin(), --x.end(), x.end());
                        x.front() = 0;
                    }
                    std::partial_sum(x.begin(), x.end(), x.begin(), self.op());
                }
            });
        });

        return result;
    }

    auto init() const {}
    prefix_scan_op() : axis(0) {}
    prefix_scan_op(int64_t ax) : axis(ax) {}
    prefix_scan_op(int64_t ax, bool excl) : axis(ax), exclusive(excl) {}
    prefix_scan_op(int64_t ax, bool excl, bool rev) : axis(ax), exclusive(excl), reverse(rev) {}
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
