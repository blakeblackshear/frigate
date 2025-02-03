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
#ifndef MIGRAPHX_GUARD_OPERATORS_SCAN_SLICE_HPP
#define MIGRAPHX_GUARD_OPERATORS_SCAN_SLICE_HPP

#include <migraphx/op/name.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <migraphx/normalize_attributes.hpp>
#include <array>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct scan_slice : op_name<scan_slice>
{
    int64_t axis      = 0;
    int64_t direction = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"), f(self.direction, "direction"));
    }

    value attributes() const
    {
        value normalize_axes   = value::object{};
        normalize_axes["axis"] = value::array{normalize_attribute::include_min};
        return {{"normalize_axes", normalize_axes}};
    }

    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(2);
        auto input_shape = inputs[0];
        auto new_lens    = input_shape.lens();
        new_lens[axis]   = 1;

        return shape{input_shape.type(), new_lens, input_shape.strides()};
    }

    argument compute(shape output_shape, std::vector<argument> args) const
    {
        auto input    = args[0];
        auto input_sh = input.get_shape();

        int64_t idx;
        args[1].visit([&](auto i) { idx = i.front(); });
        const auto max_idx = input_sh.lens()[axis] - 1;
        if(idx > max_idx or idx < 0)
            MIGRAPHX_THROW("ScanSlice: index {" + std::to_string(idx) + "} out of range [0, " +
                           std::to_string(max_idx) + "]");
        idx = (1 - direction) * idx + direction * (max_idx - idx);

        auto offset = idx * input_sh.strides().at(axis) * input_sh.type_size();
        return {output_shape, [=] { return input.data() + offset; }};
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
