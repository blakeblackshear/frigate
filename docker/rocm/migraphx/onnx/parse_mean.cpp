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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_mean : op_parser<parse_mean>
{
    std::set<shape::type_t> float_types = {shape::float_type, shape::half_type, shape::double_type};

    std::vector<op_desc> operators() const { return {{"Mean"}}; }

    /// Calculates the element-wise mean of n>=1 input tensors
    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& /*parser*/,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        auto num_data = args.size();
        if(num_data == 1)
            return args[0];

        auto divisor = info.add_literal(
            migraphx::literal{migraphx::shape{args[0]->get_shape().type()}, {num_data}});

        if(contains(float_types, args[0]->get_shape().type()))
        {
            return std::accumulate(args.begin() + 1,
                                   args.end(),
                                   info.add_broadcastable_binary_op("div", args[0], divisor),
                                   [&](auto mean, auto data_i) {
                                       // Pre-divide each tensor element-wise by n to reduce risk of
                                       // overflow during summation
                                       auto div =
                                           info.add_broadcastable_binary_op("div", data_i, divisor);
                                       return info.add_broadcastable_binary_op("add", mean, div);
                                   });
        }
        else
        {
            // Compute sum before division for integral types
            auto sum = std::accumulate(
                args.begin() + 1, args.end(), args[0], [&](auto accum, auto data_i) {
                    return info.add_broadcastable_binary_op("add", accum, data_i);
                });

            return info.add_broadcastable_binary_op("div", sum, divisor);
        }
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
