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

void lstm_actv_functions(op::rnn_direction dirct, std::vector<std::string>& actv_func_names)
{
    // need 6 activation functions for bidirectional directions
    if(dirct == op::rnn_direction::bidirectional)
    {
        actv_func_names.push_back(actv_func_names.at(0));
        actv_func_names.push_back(actv_func_names.at(1));
        actv_func_names.push_back(actv_func_names.at(2));
    }
}

void lstm_transpose_inputs(onnx_parser::node_info& info, std::vector<instruction_ref>& args)
{
    std::vector<int64_t> perm{1, 0, 2};
    args[0] = info.add_instruction(make_op("transpose", {{"permutation", perm}}), args[0]);

    if(args.size() >= 6 and not args[5]->is_undefined())
    {
        args[5] = info.add_instruction(make_op("transpose", {{"permutation", perm}}), args[5]);
    }

    if(args.size() >= 7 and not args[6]->is_undefined())
    {
        args[6] = info.add_instruction(make_op("transpose", {{"permutation", perm}}), args[6]);
    }
}

void lstm_transpose_outputs(onnx_parser::node_info& info,
                            instruction_ref& hidden_states,
                            instruction_ref& last_output,
                            instruction_ref& last_cell_output)
{
    std::vector<int64_t> perm_hs{2, 0, 1, 3};
    hidden_states =
        info.add_instruction(make_op("transpose", {{"permutation", perm_hs}}), hidden_states);
    std::vector<int64_t> perm_last{1, 0, 2};
    last_output =
        info.add_instruction(make_op("transpose", {{"permutation", perm_last}}), last_output);
    last_cell_output =
        info.add_instruction(make_op("transpose", {{"permutation", perm_last}}), last_cell_output);
}

struct parse_lstm : op_parser<parse_lstm>
{
    std::vector<op_desc> operators() const { return {{"LSTM"}}; }

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
                MIGRAPHX_THROW("LSTM: hidden size mismatch in input and attribute");
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
        else if(direction == "forward")
        {
            dirct = op::rnn_direction::forward;
        }
        else
        {
            MIGRAPHX_THROW("LSTM: incorrect direction attribute");
        }

        // set default activation functions
        std::vector<std::string> vec_names = {"sigmoid", "tanh", "tanh"};
        lstm_actv_functions(dirct, vec_names);

        if(contains(info.attributes, "activations"))
        {
            auto names = info.attributes.at("activations").strings();
            vec_names.clear();
            vec_names.resize(names.size());
            std::transform(names.begin(), names.end(), vec_names.begin(), [](auto name) {
                return to_lower(name);
            });
        }

        auto num_actv_functions = dirct == op::rnn_direction::bidirectional ? 6 : 3;
        if(vec_names.size() != static_cast<size_t>(num_actv_functions))
        {
            MIGRAPHX_THROW("LSTM: Invalid activation functions number, should be: " +
                           to_string(num_actv_functions));
        }

        auto name_it = std::find_if(vec_names.begin(), vec_names.end(), [&](auto& name) {
            return (map_activation_functions().count(name) == 0);
        });
        if(name_it != vec_names.end())
        {
            MIGRAPHX_THROW("LSTM: activation function " + std::string(*name_it) + " not supported");
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

        int input_forget = 0;
        if(contains(info.attributes, "input_forget"))
        {
            input_forget = parser.parse_value(info.attributes.at("input_forget")).at<int>();
        }

        int layout = 0;
        if(contains(info.attributes, "layout"))
        {
            layout = parser.parse_value(info.attributes.at("layout")).at<int>();
        }

        // append undefined opeator to make 6 arguments
        if(args.size() < 8)
        {
            auto ins = info.add_instruction(make_op("undefined"));
            args.insert(args.end(), 8 - args.size(), ins);
        }

        if(layout != 0)
        {
            lstm_transpose_inputs(info, args);
        }

        // first output for concatenation of hidden states
        auto hidden_states = info.add_instruction(make_op("lstm",
                                                          {{"hidden_size", hidden_size},
                                                           {"actv_func", to_value(vec_actv_funcs)},
                                                           {"direction", dirct},
                                                           {"clip", clip},
                                                           {"input_forget", input_forget}}),
                                                  args);

        auto last_output = info.add_instruction(make_op("rnn_last_hs_output"), hidden_states);

        // third output for last cell output
        auto last_cell_output =
            info.add_instruction(make_op("rnn_last_cell_output"), hidden_states);

        if(layout != 0)
        {
            lstm_transpose_outputs(info, hidden_states, last_output, last_cell_output);
        }

        return {hidden_states, last_output, last_cell_output};
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
