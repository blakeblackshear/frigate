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
#ifndef MIGRAPHX_GUARD_OPERATORS_BROADCAST_WITH_DIMS_HPP
#define MIGRAPHX_GUARD_OPERATORS_BROADCAST_WITH_DIMS_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * Broadcast the input tensor to the shape defined by the values of the second input.
 * Used as `broadcast_with_dims(input_tensor, dims)`, where dims is a vector of integer dimensions.
 * `input_tensor` must be broadcastable with `dims`, otherwise this operator with throw at compute.
 * This operator can be replaced with `multibroadcast(input_tensor)` if the `dims` vector is
 * constant.
 *
 * Example:
 *  input_tensor shape: lens = {2, 3}, strides = {3, 1}
 *  dims = [4, 1, 3]
 *  output shape: lens = {4, 2, 3}, strides = {0, 3, 1}
 */
struct broadcast_with_dims
{
    std::string name() const { return "broadcast_with_dims"; }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        migraphx::check_shapes{inputs, *this, true}.has(2);
        // check that second input has a static shape
        (void)migraphx::check_shapes{inputs.begin() + 1, inputs.end(), *this, false};
        // output tensor rank is greater of input_tensor rank or length of dims vector
        const auto& input_tensor_shape = inputs.at(0);
        const auto& dims_shape         = inputs.at(1);
        size_t out_ndim     = std::max(input_tensor_shape.ndim(), dims_shape.lens().at(0));
        std::size_t max_int = std::numeric_limits<std::size_t>::max();
        std::vector<shape::dynamic_dimension> dyn_dims(out_ndim,
                                                       shape::dynamic_dimension{0, max_int});
        return {input_tensor_shape.type(), dyn_dims};
    }

    argument compute(const shape& output_shape, const std::vector<argument>& args) const
    {
        auto s0             = args.at(0).get_shape();
        const auto& in_lens = s0.lens();
        std::vector<std::size_t> dims_input(output_shape.ndim());
        args.at(1).visit([&](auto a) { dims_input.assign(a.begin(), a.end()); });
        auto out_lens  = compute_broadcasted_lens(in_lens, dims_input);
        auto out_shape = make_bcast_shape(s0, out_lens);
        return args[0].reshape(out_shape);
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
