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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_PARSER_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_PARSER_HPP

#include <migraphx/config.hpp>
#include <migraphx/filesystem.hpp>
#include <migraphx/program.hpp>
#include <google/protobuf/text_format.h>
#include <google/protobuf/io/zero_copy_stream_impl.h>
#include <onnx.pb.h>
#include <unordered_map>
#include <functional>
#include <utility>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

namespace onnx = onnx_for_migraphx;

struct onnx_parser
{
    std::string filename;
    fs::path path;
    std::string external_data_path;
    using attribute_map = std::unordered_map<std::string, onnx::AttributeProto>;
    struct node_info
    {
        attribute_map attributes{};
        std::size_t num_outputs = 1;
        std::string name        = "";
        module* mod             = nullptr;
        instruction_ref make_contiguous(instruction_ref ins) const;
        instruction_ref add_bias(const std::vector<instruction_ref>& args,
                                 instruction_ref curr_ins,
                                 uint64_t axis) const;

        instruction_ref add_broadcastable_binary_op(const std::string& op_name,
                                                    instruction_ref arg0,
                                                    instruction_ref arg1) const;

        instruction_ref add_common_op(const std::string& op_name,
                                      std::vector<instruction_ref> inputs) const;

        template <class... Ts>
        instruction_ref add_common_op(const std::string& op_name, Ts... xs) const
        {
            return add_common_op(op_name, {xs...});
        }

        instruction_ref add_instruction(const operation& op,
                                        const std::vector<instruction_ref>& args) const;

        instruction_ref add_instruction(const operation& op,
                                        const std::vector<instruction_ref>& args,
                                        const std::vector<module_ref>& mods) const;

        template <class... Ts>
        instruction_ref add_instruction(const operation& op, Ts... xs) const
        {
            return add_instruction(op, {xs...});
        }
        instruction_ref add_literal(literal l) const;
        template <class... Ts>
        instruction_ref add_literal(Ts&&... xs) const
        {
            return add_literal(literal{std::forward<Ts>(xs)...});
        }
    };
    using node_map = std::unordered_map<std::string, onnx::NodeProto>;
    using op_func  = std::function<std::vector<instruction_ref>(
        onnx_parser&, const node_info&, std::vector<instruction_ref>)>;
    node_map nodes;
    std::unordered_map<std::string, instruction_ref> instructions;
    program prog                                   = program();
    shape::dynamic_dimension default_dyn_dim_value = {1, 1};
    std::unordered_map<std::string, std::vector<std::size_t>> map_input_dims;
    std::unordered_map<std::string, shape::dynamic_dimension> dim_params;
    std::unordered_map<std::string, std::vector<shape::dynamic_dimension>> map_dyn_input_dims;
    bool use_dyn_output          = false;
    bool skip_unknown_operators  = false;
    int64_t max_loop_iterations  = 10;
    int64_t limit_max_iterations = std::numeric_limits<uint16_t>::max();
    int64_t opset_version        = 13;

    std::unordered_map<std::string, op_func> ops;

    onnx_parser();
    operation load(const std::string& name, const node_info& info) const;

    void parse_undefined(module* mod, const std::string& name);

    static int64_t get_opset_version(const onnx::ModelProto& model);

    void parse_from(std::istream& is, std::string name = "");
    void parse_from(const void* data, std::size_t size);
    std::vector<instruction_ref>
    parse_graph(module* mod, const onnx::GraphProto& graph, bool inlining = false);
    literal parse_value(const onnx::AttributeProto& attr) const;
    literal parse_tensor(const onnx::TensorProto& t) const;
    shape parse_type(const onnx::TypeProto& t) const;
    shape parse_type(const onnx::TypeProto& t, const std::vector<std::size_t>& input_dims) const;
};

shape::type_t get_type(int dtype);
bool is_type_float(shape::type_t dtype);

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
