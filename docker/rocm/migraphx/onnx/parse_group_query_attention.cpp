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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_group_query_attention : op_parser<parse_group_query_attention>
{
    std::vector<op_desc> operators() const { return {{"GroupQueryAttention"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       const onnx_parser& parser,
                                       const onnx_parser::node_info& info,
                                       const std::vector<instruction_ref>& args) const
    {
        bool do_rotary           = false;
        std::size_t kv_num_heads = 0;
        int local_window_size    = -1;
        std::size_t num_heads    = 1;
        bool rotary_interleaved  = false;
        float scale              = 0.0;
        if(contains(info.attributes, "do_rotary"))
        {
            do_rotary = parser.parse_value(info.attributes.at("do_rotary")).at<bool>();
        }
        if(contains(info.attributes, "kv_num_heads"))
        {
            kv_num_heads = parser.parse_value(info.attributes.at("kv_num_heads")).at<std::size_t>();
        }
        if(contains(info.attributes, "local_window_size"))
        {
            local_window_size =
                parser.parse_value(info.attributes.at("local_window_size")).at<int>();
        }
        if(contains(info.attributes, "num_heads"))
        {
            num_heads = parser.parse_value(info.attributes.at("num_heads")).at<std::size_t>();
        }
        if(contains(info.attributes, "rotary_interleaved"))
        {
            rotary_interleaved =
                parser.parse_value(info.attributes.at("rotary_interleaved")).at<bool>();
        }
        if(contains(info.attributes, "scale"))
        {
            scale = parser.parse_value(info.attributes.at("scale")).at<float>();
        }

        if(args.size() < 7 or args.size() > 9)
        {
            MIGRAPHX_THROW("GroupQueryAttention: Wrong number of inputs provided");
        }

        auto gqa             = info.add_instruction(make_op("group_query_attention",
                                                            {{"do_rotary", do_rotary},
                                                             {"kv_num_heads", kv_num_heads},
                                                             {"local_window_size", local_window_size},
                                                             {"num_heads", num_heads},
                                                             {"rotary_interleaved", rotary_interleaved},
                                                             {"scale", scale}}),
                                        args);
        auto gqa_output      = info.add_instruction(make_op("get_tuple_elem", {{"index", 0}}), gqa);
        auto gqa_present_key = info.add_instruction(make_op("get_tuple_elem", {{"index", 1}}), gqa);
        auto gqa_present_value =
            info.add_instruction(make_op("get_tuple_elem", {{"index", 2}}), gqa);

        return {gqa_output, gqa_present_key, gqa_present_value};
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
