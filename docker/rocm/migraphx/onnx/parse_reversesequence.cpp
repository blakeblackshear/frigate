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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

// Parser for ReverseSequence ONNX operator.
/*!
  Reverses the data along the time axis for the batches along the batch axis.
  The sequence lengths can be given to reverse up to the given length for each batch, keeping the
  rest of the sequence in the original order. Variable sequence_lens is not supported in this
  version of MIGraphX. You can pass the sequence_lens either as a constant node or an attribute. The
  batch axis and time axis must be [0, 1] and not the same.
*/
struct parse_reversesequence : op_parser<parse_reversesequence>
{
    std::vector<op_desc> operators() const { return {{"ReverseSequence"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        int batch_axis = 1;
        if(contains(info.attributes, "batch_axis"))
        {
            batch_axis = info.attributes.at("batch_axis").i();
        }
        if(batch_axis != 0 and batch_axis != 1)
        {
            MIGRAPHX_THROW("REVERSESEQUENCE: batch axis not 0 or 1");
        }

        int time_axis = 0;
        if(contains(info.attributes, "time_axis"))
        {
            time_axis = info.attributes.at("time_axis").i();
        }
        if(time_axis != 0 and time_axis != 1)
        {
            MIGRAPHX_THROW("REVERSESEQUENCE: time axis not 0 or 1");
        }

        if(time_axis == batch_axis)
        {
            MIGRAPHX_THROW("REVERSESEQUENCE: time axis and batch axis are the same");
        }

        auto input      = args[0];
        auto input_lens = input->get_shape().lens();
        if(input_lens.size() < 2)
        {
            MIGRAPHX_THROW("REVERSESEQUENCE: input tensor must have rank >= 2");
        }

        std::vector<int64_t> sequence_lens;
        if(args.size() == 2)
        {
            migraphx::argument seq_lens_arg = args.back()->eval();
            check_arg_empty(seq_lens_arg, "REVERSESEQUENCE: cannot handle variable sequence_lens");
            seq_lens_arg.visit([&](auto s) { sequence_lens.assign(s.begin(), s.end()); });
        }
        else if(contains(info.attributes, "sequence_lens"))
        {
            literal s = parser.parse_value(info.attributes.at("sequence_lens"));
            s.visit([&](auto v) { sequence_lens.assign(v.begin(), v.end()); });
        }
        auto batch_size = input_lens[batch_axis];
        auto time_size  = input_lens[time_axis];

        // this condition may still work if sequence_len's shape was incorrect
        if(sequence_lens.size() != batch_size)
        {
            MIGRAPHX_THROW("REVERSESEQUENCE: sequence_lens has incorrect shape");
        }

        instruction_ref ret;

        auto add_slice = [&info, &input, batch_axis, time_axis](int b, int t_start, int t_end) {
            return info.add_instruction(make_op("slice",
                                                {{"axes", {batch_axis, time_axis}},
                                                 {"starts", {b, t_start}},
                                                 {"ends", {b + 1, t_end}}}),
                                        input);
        };

        for(int b = 0; b < batch_size; ++b)
        {
            instruction_ref s0;
            if(sequence_lens[b] > 1)
            {
                s0 = add_slice(b, 0, sequence_lens[b]);
                s0 = info.add_instruction(make_op("reverse", {{"axes", {time_axis}}}), s0);

                // if reversed less than whole batch, concat rest of batch
                if(sequence_lens[b] < time_size)
                {
                    auto s1 = add_slice(b, sequence_lens[b], time_size);
                    s0 = info.add_instruction(make_op("concat", {{"axis", time_axis}}), s0, s1);
                }
            }
            else
            { // cases where nothing changes
                s0 = add_slice(b, 0, time_size);
            }
            if(b == 0)
            {
                ret = s0;
            }
            else
            {
                ret = info.add_instruction(make_op("concat", {{"axis", batch_axis}}), ret, s0);
            }
        }
        return ret;
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
