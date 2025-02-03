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
#ifndef MIGRAPHX_GUARD_OPERATORS_OP_HPP
#define MIGRAPHX_GUARD_OPERATORS_OP_HPP

#include <migraphx/op/name.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/tensor_view.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/op/normalize_attribute.hpp>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct lowest
{
    template <class T>
    operator T() const
    {
        return std::numeric_limits<T>::lowest();
    }
};

struct highest
{
    template <class T>
    operator T() const
    {
        return std::numeric_limits<T>::max();
    }
};

struct zero
{
    template <class T>
    operator T() const
    {
        return T{0};
    }
};

struct one
{
    template <class T>
    operator T() const
    {
        return T{1};
    }
};

template <class Derived>
struct reduce_op : op_name<Derived>
{
    std::vector<std::int64_t> axes{};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axes, "axes"));
    }

    value attributes() const
    {
        value normalize;
        normalize["axes"] = value::array{normalize_attribute::include_min};
        return {{"normalize_axes", normalize}, {"reduce", true}};
    }

    shape collapse_reduced_axes(const shape& original_shape,
                                const std::vector<int64_t>& reduce_axes) const
    {
        auto lens = original_shape.lens();
        for(const auto a : reduce_axes)
        {
            lens[a] = 1;
        }

        return original_shape.with_lens(lens);
    }

    // Compute the output shape for cases when the input tensor has a dynamic shape.
    //
    // If the axes are passed as a variable input(indicated by an empty axes attribute), we cannot
    // determine which axes must be collapsed until we see the actual input values, so we must treat
    // each axis as potentially collapsable and set its minimum dimension to 1.
    shape compute_dynamic_shape(const std::vector<shape>& inputs) const
    {
        const auto& data_shape = inputs[0];
        auto dims              = data_shape.dyn_dims();
        if(axes.empty())
        {
            for(auto& dim : dims)
            {
                dim = {1, dim.max};
            }
        }
        else
        {
            for(auto a : axes)
            {
                dims[a] = {1, 1};
            }
        }

        return {data_shape.type(), dims};
    }

    // Compute the output shape for cases when the input tensor has a static shape.
    // Depending on how axes is passed to the operator the output shape can be either dynamic or
    // static.
    //
    // If the axes are passed as a variable input(indicated by an empty axes attribute), we cannot
    // determine which axes must be collapsed until we see the actual input values, so we must treat
    // each axis as potentially collapsable, producing a dynamic output shape.
    shape compute_static_shape(const std::vector<shape>& inputs) const
    {
        const auto& data_shape = inputs[0];
        if(axes.empty())
        {
            std::vector<shape::dynamic_dimension> dims(data_shape.ndim());
            auto lens = data_shape.lens();
            std::transform(lens.begin(), lens.end(), dims.begin(), [](auto len) {
                return shape::dynamic_dimension{1, len};
            });

            return {data_shape.type(), std::move(dims)};
        }
        else
        {
            return collapse_reduced_axes(data_shape, axes);
        }
    }

    /**
     * @brief returns a shape in which the axis or axes named
     * for reduction by this op are set, to size 1.
     *
     * @param inputs list of input shapes
     * @return shape
     */
    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        auto expected_arg_count = axes.empty() ? 2 : 1;
        check_shapes{inputs, *this, true}.has(expected_arg_count);

        if(inputs[0].dynamic())
        {
            return compute_dynamic_shape(inputs);
        }
        else
        {
            return compute_static_shape(inputs);
        }
    }

    template <class T>
    void tune_dims(const std::vector<int64_t>& tuned_axes,
                   const std::vector<T>& in_lens,
                   std::vector<T>& out_lens) const
    {
        for(const auto& axis : tuned_axes)
        {
            out_lens[axis] = in_lens[axis];
        }
    }

    template <class T>
    void reduce(const tensor_view<T>& input,
                const shape& batch_shape,
                const std::vector<int64_t>& tuned_axes,
                const std::vector<std::size_t>& out_idx,
                tensor_view<T>& output) const
    {
        using accumulator = accumulator_type<T>;
        auto& self        = static_cast<const Derived&>(*this);
        auto data_idx     = out_idx;
        accumulator val   = self.init();
        shape_for_each(batch_shape, [&](const auto& b_idx) {
            this->tune_dims(tuned_axes, b_idx, data_idx);
            accumulator x = input(data_idx.begin(), data_idx.end());
            val           = self.op()(accumulator{self.input()(x)}, val);
        });

        output(out_idx.begin(), out_idx.end()) =
            static_cast<const Derived&>(*this).output(batch_shape)(val);
    }

    argument reduce(const shape& computed_shape,
                    const std::vector<int64_t>& reduce_axes,
                    argument& data_arg) const
    {
        std::vector<std::size_t> batch_lens(computed_shape.ndim(), 1);
        auto arg_lens = data_arg.get_shape().lens();
        tune_dims(reduce_axes, arg_lens, batch_lens);
        shape batch_shape{computed_shape.type(), batch_lens};
        argument result{computed_shape};

        visit_all(result, data_arg)([&](auto output, auto input) {
            par_for(computed_shape.elements(), [&](auto i) {
                auto out_idx = computed_shape.multi(i);
                this->reduce(input, batch_shape, reduce_axes, out_idx, output);
            });
        });

        return result;
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        auto&& data_arg = args[0];
        // cppcheck-suppress knownConditionTrueFalse
        if(not axes.empty())
            return reduce(dyn_out.computed_shape, axes, data_arg);

        if(args[1].get_shape().elements() == 0)
            return args[0];

        std::vector<int64_t> reduce_axes;
        args[1].visit([&](auto&& s) { reduce_axes.assign(s.begin(), s.end()); });
        const auto result_shape = collapse_reduced_axes(data_arg.get_shape(), reduce_axes);

        return reduce(result_shape, reduce_axes, data_arg);
    }

    auto init() const { return zero(); }

    auto input() const
    {
        return [](auto val) { return val; };
    }

    auto output(const shape&) const
    {
        return [](auto val) { return val; };
    }

    reduce_op() {}
    reduce_op(std::vector<int64_t> ax) : axes(std::move(ax)) {}
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
