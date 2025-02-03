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
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_trilu : op_parser<parse_trilu>
{
    std::vector<op_desc> operators() const { return {{"Trilu"}}; }

    instruction_ref parse(const op_desc&,
                          const onnx_parser&,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        auto input_shape = args[0]->get_shape();
        assert(input_shape.ndim() >= 2);
        auto input_lens = input_shape.lens();

        size_t num_rows = *(input_lens.rbegin() + 1);
        size_t num_cols = input_lens.back();
        int k           = 0;
        bool upper      = true;

        if(args.size() > 1)
        {
            auto arg_k = args[1]->eval();
            check_arg_empty(arg_k, "PARSE_TRILU: dynamic k not supported");
            k = arg_k.at<int>();
        }

        if(contains(info.attributes, "upper"))
        {
            upper = static_cast<bool>(info.attributes.at("upper").i());
        }

        shape::type_t output_type = args[0]->get_shape().type();

        // when creating the mask, if upper == 1,
        // the inner triangle will have values set to 0
        std::vector<bool> mask_mat(num_rows * num_cols, upper);
        // if upper == 0, kth diagonal must also be masked
        if(not upper)
            k++;
        for(size_t i = 0; i < num_rows; i++)
        {
            for(int j = 0; j < std::min(k, static_cast<int>(num_cols)); j++)
            {
                mask_mat[i * num_cols + j] = not upper;
            }
            k++;
        }

        auto mask = info.add_literal(
            migraphx::literal{migraphx::shape{output_type, {num_rows, num_cols}}, mask_mat});

        return info.add_broadcastable_binary_op("mul", mask, args[0]);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
