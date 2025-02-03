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
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/common.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_where : op_parser<parse_where>
{
    std::vector<op_desc> operators() const { return {{"Where"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& /*parser*/,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        // TODO: broadcasting for dynamic shapes is only implemented
        // for binary ops at time of writing, not ternary ops.
        //   When it becomes available, add multibroadcasting steps in the dynamic shape case.
        // For now for dynamic shapes, just insert the Where op.  All shapes must be the
        // same for it to succeed.
        if(std::all_of(args.begin(), args.end(), [](auto v) { return v->get_shape().dynamic(); }))
        {
            return info.add_instruction(make_op("where"), args[0], args[1], args[2]);
        }
        else if(std::none_of(
                    args.begin(), args.end(), [](auto v) { return v->get_shape().dynamic(); }))
        {
            // If shapes are static and any are broadcasted, insert multibroadcast ops
            auto lens =
                compute_broadcasted_lens(args[0]->get_shape().lens(), args[1]->get_shape().lens());
            lens = compute_broadcasted_lens(lens, args[2]->get_shape().lens());

            if(args[0]->get_shape().lens() != lens)
            {
                args[0] =
                    info.add_instruction(make_op("multibroadcast", {{"out_lens", lens}}), args[0]);
            }

            if(args[1]->get_shape().lens() != lens)
            {
                args[1] =
                    info.add_instruction(make_op("multibroadcast", {{"out_lens", lens}}), args[1]);
            }

            if(args[2]->get_shape().lens() != lens)
            {
                args[2] =
                    info.add_instruction(make_op("multibroadcast", {{"out_lens", lens}}), args[2]);
            }

            return info.add_instruction(make_op("where"), args[0], args[1], args[2]);
        }
        else
            MIGRAPHX_THROW("PARSE_WHERE: doesn't support mixed static and dynamic shape inputs");
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
