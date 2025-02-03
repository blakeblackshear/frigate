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
#include <migraphx/onnx/map_activation_functions.hpp>
#include <migraphx/op/common.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

void gru_transpose_inputs(onnx_parser::node_info& info, std::vector<instruction_ref>& args)
{
    std::vector<int64_t> perm{1, 0, 2};
    args[0] = info.add_instruction(make_op("transpose", {{"permutation", perm}}), args[0]);

    if(not args[5]->is_undefined())
    {
        args[5] = info.add_instruction(make_op("transpose", {{"permutation", perm}}), args[5]);
    }
}

void gru_transpose_outputs(onnx_parser::node_info& info,
                           instruction_ref& hidden_states,
                           instruction_ref& last_output)
{
    std::vector<int64_t> perm_hs{2, 0, 1, 3};
    hidden_states =
        info.add_instruction(make_op("transpose", {{"permutation", perm_hs}}), hidden_states);
    std::vector<int64_t> perm_last{1, 0, 2};
    last_output =
        info.add_instruction(make_op("transpose", {{"permutation", perm_last}}), last_output);
}

struct parse_gru : op_parser<parse_gru>
{
    std::vector<op_desc> operators() const { return {{"GRU"}}; }

    std::vector<instruction_ref> parse(const op_desc& /*opd*/,
                                       const onnx_parser& parser,
                                       onnx_parser::node_info info,
                                       std::vector<instruction_ref> args) const
    {
        migraphx::shape input_shape = args[0]->get_shape();
        std::size_t hidden_size     = args[2]->get_shape().lens()[2];

        if(contains(info.attributes, "hidden_size"))
        {
            std::size_t hidden_size_att =
                parser.parse_value(info.attributes.at("hidden_size")).at<int>();
            if(hidden_size != hidden_size_att)
            {
                MIGRAPHX_THROW("GRU: hidden size mismatch in input and attribute");
            }
        }

        // Handling of direction to be added later
        std::string direction{"forward"};
        if(contains(info.attributes, "direction"))
        {
            direction = info.attributes.at("direction").s();
        }

        op::rnn_direction dirct = op::rnn_direction::forward;
        if(direction == "bidirectional")
        {
            dirct = op::rnn_direction::bidirectional;
        }
        else if(direction == "reverse")
        {
            dirct = op::rnn_direction::reverse;
        }

        // set default activation functions
        std::vector<std::string> vec_names = {"sigmoid", "tanh"};
        if(dirct == op::rnn_direction::bidirectional)
        {
            // repeat the activation functions
            vec_names.push_back(vec_names.at(0));
            vec_names.push_back(vec_names.at(1));
        }

        if(contains(info.attributes, "activations"))
        {
            auto names = info.attributes.at("activations").strings();
            vec_names.clear();
            vec_names.resize(names.size());
            std::transform(names.begin(), names.end(), vec_names.begin(), [](auto name) {
                return to_lower(name);
            });
        }

        auto num_actv_functions = dirct == op::rnn_direction::bidirectional ? 4 : 2;
        if(vec_names.size() != static_cast<size_t>(num_actv_functions))
        {
            MIGRAPHX_THROW("GRU: Invalid activation functions number, should be: " +
                           to_string(num_actv_functions));
        }

        auto name_it = std::find_if(vec_names.begin(), vec_names.end(), [&](auto& name) {
            return (map_activation_functions().count(name) == 0);
        });
        if(name_it != vec_names.end())
        {
            MIGRAPHX_THROW("GRU: activation function " + std::string(*name_it) + " not supported");
        }

        std::vector<operation> vec_actv_funcs(vec_names.size());
        std::transform(vec_names.begin(),
                       vec_names.end(),
                       vec_actv_funcs.begin(),
                       [&](const auto& name) { return map_activation_functions().at(name); });

        float clip = 0.0;
        if(contains(info.attributes, "clip"))
        {
            clip = parser.parse_value(info.attributes.at("clip")).at<float>();
        }

        int layout = 0;
        if(contains(info.attributes, "layout"))
        {
            layout = parser.parse_value(info.attributes.at("layout")).at<int>();
        }

        int linear_before_reset = 0;
        if(contains(info.attributes, "linear_before_reset"))
        {
            linear_before_reset =
                parser.parse_value(info.attributes.at("linear_before_reset")).at<int>();
        }

        // append undefined opeator to make 6 arguments
        if(args.size() < 6)
        {
            auto ins = info.add_instruction(make_op("undefined"));
            args.insert(args.end(), 6 - args.size(), ins);
        }

        if(layout != 0)
        {
            gru_transpose_inputs(info, args);
        }

        // first output for concatenation of hidden states
        auto hidden_states =
            info.add_instruction(make_op("gru",
                                         {{"hidden_size", hidden_size},
                                          {"actv_func", to_value(vec_actv_funcs)},
                                          {"direction", dirct},
                                          {"clip", clip},
                                          {"linear_before_reset", linear_before_reset}}),
                                 args);

        // second output for last gru output
        auto last_output = info.add_instruction(make_op("rnn_last_hs_output"), hidden_states);

        if(layout != 0)
        {
            gru_transpose_outputs(info, hidden_states, last_output);
        }

        return {hidden_states, last_output};
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
