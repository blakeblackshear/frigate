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
#include <google/protobuf/text_format.h>
#include <google/protobuf/io/zero_copy_stream_impl.h>
#include <graph.pb.h>
#include <iostream>
#include <fstream>
#include <unordered_map>
#include <unordered_set>
#include <functional>
#include <array>
#include <utility>
#include <vector>

#include <migraphx/fallthrough.hpp>
#include <migraphx/program.hpp>
#include <migraphx/op/unknown.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/config.hpp>
#include <migraphx/tf.hpp>
#include <migraphx/common.hpp>
#include <migraphx/make_op.hpp>

#include <migraphx/tf/tf_parser.hpp>
#include <migraphx/tf/op_parser.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace tf {

bool tf_parser::should_transpose(instruction_ref ins) const
{
    return is_nhwc and ins->get_shape().lens().size() == 4;
}

instruction_ref tf_parser::to_nhwc(instruction_ref ins) const
{
    if(should_transpose(ins))
        return mm->add_instruction(make_op("transpose", {{"permutation", {0, 2, 3, 1}}}), ins);
    return ins;
}

instruction_ref tf_parser::to_nchw(instruction_ref ins) const
{
    if(should_transpose(ins))
        return mm->add_instruction(make_op("transpose", {{"permutation", {0, 3, 1, 2}}}), ins);
    return ins;
}

instruction_ref tf_parser::to_kcxy(instruction_ref ins) const
{
    return mm->add_instruction(make_op("transpose", {{"permutation", {3, 2, 0, 1}}}), ins);
}

std::vector<instruction_ref> tf_parser::to_nchw(const std::vector<instruction_ref>& args) const
{
    std::vector<instruction_ref> result(args.size());
    std::transform(
        args.begin(), args.end(), result.begin(), [&](auto ins) { return this->to_nchw(ins); });
    return result;
}

std::vector<instruction_ref> tf_parser::to_nhwc(const std::vector<instruction_ref>& args) const
{
    std::vector<instruction_ref> result(args.size());
    std::transform(
        args.begin(), args.end(), result.begin(), [&](auto ins) { return this->to_nhwc(ins); });
    return result;
}

instruction_ref tf_parser::node_info::make_contiguous(instruction_ref ins) const
{
    if(ins->get_shape().standard())
        return ins;
    else
        return mm->add_instruction(make_op("contiguous"), ins);
}

instruction_ref tf_parser::node_info::add_broadcastable_binary_op(const std::string& op_name,
                                                                  instruction_ref arg0,
                                                                  instruction_ref arg1) const
{
    return this->add_common_op(op_name, arg0, arg1);
}

instruction_ref tf_parser::node_info::add_common_op(const std::string& op_name,
                                                    std::vector<instruction_ref> inputs) const
{
    return migraphx::add_common_op(*mm, make_op(op_name), std::move(inputs));
}

int64_t tf_parser::parse_axis(const int64_t dim, const size_t num_dims) const
{
    int64_t new_dim = dim;
    if(is_nhwc and num_dims >= 4)
    {
        switch(dim)
        {
        case 0: new_dim = 0; break;
        case 1: new_dim = 2; break;
        case 2: new_dim = 3; break;
        case 3: new_dim = 1; break;
        default: break;
        }
    }
    return new_dim;
}

instruction_ref
tf_parser::node_info::add_instruction(const operation& op,
                                      const std::vector<instruction_ref>& args) const
{
    return mm->add_instruction(op, args);
}

instruction_ref tf_parser::node_info::add_literal(literal l) const
{
    return mm->add_literal(std::move(l));
}

std::vector<int64_t> get_axes_from_mask(const size_t num_axes, const uint32_t mask)
{
    uint32_t bitwise_compare = 1;
    std::vector<int64_t> axes;
    for(size_t i = 0; i < num_axes; i++)
    {
        // the LSB corresponds to axis 0 when determining which axes to begin
        if(((mask >> i) & bitwise_compare) == 1)
            axes.push_back(1);
        else
            axes.push_back(0);
    }
    return axes;
}

tf_parser::tf_parser()
{
    // Add all registered op parsers
    for(auto&& name : get_op_parsers())
        ops.emplace(name, get_op_parser(name));
}

static std::string get_name(const tensorflow::NodeDef& node) { return node.name(); }

static tf_parser::node_map get_nodes(const tensorflow::GraphDef& graph,
                                     std::vector<tensorflow::NodeDef>& input_nodes)
{
    tf_parser::node_map result;
    for(auto&& node : graph.node())
    {
        auto node_name = get_name(node);
        // assume each node in graph has an associated name
        if(node_name.empty())
            MIGRAPHX_THROW("tf node with no name found");
        result[node_name] = node;
        if(node.op() == "Placeholder")
        {
            input_nodes.push_back(node);
        }
    }
    return result;
}

static tf_parser::attribute_map get_attributes(const tensorflow::NodeDef& node)
{
    tf_parser::attribute_map result;
    for(auto&& attr : node.attr())
    {
        result[attr.first] = attr.second;
    }

    return result;
}

static std::vector<size_t> parse_dims(const tensorflow::TensorShapeProto& s)
{
    std::vector<size_t> dims;
    auto input_dims = s.dim();
    std::transform(input_dims.begin(),
                   input_dims.end(),
                   std::back_inserter(dims),
                   [](const tensorflow::TensorShapeProto_Dim& dim) { return dim.size(); });
    return dims;
}

template <class T>
static std::vector<T> get_data_vals(const google::protobuf::RepeatedField<T>& data,
                                    const size_t& shape_size)
{
    std::vector<T> data_vals(shape_size);
    // check if shape has enough data values given existing fields
    if(data.size() == 1)
    {
        std::fill(data_vals.begin(), data_vals.end(), data[0]);
    }
    else
        copy(data.begin(), data.end(), data_vals.begin());
    return data_vals;
}

template <class T>
static literal
create_literal(shape::type_t shape_type, const std::vector<size_t>& dims, std::vector<T> data)
{
    // assume if explicit value is mentioned in protobuf and dim size <= 1, treat as scalar
    if(dims.empty() or (dims.size() == 1 and dims.front() == 1))
        return literal{{shape_type}, data};
    return literal{{shape_type, dims}, data};
}

static bool is_valid_op(const tensorflow::NodeDef& node)
{
    std::vector<std::string> ignored{"NoOp", "Assert"};
    return none_of(ignored, [&](const auto& op) {
        const auto& name = get_name(node);
        return node.op() == op or contains(name, op);
    });
}

std::vector<std::string> tf_parser::find_outputs() const
{
    std::unordered_set<std::string> inputs;
    for(auto&& p : nodes)
    {
        auto&& node = p.second;
        std::copy(node.input().begin(), node.input().end(), std::inserter(inputs, inputs.end()));
    }
    std::vector<std::string> outputs;
    for(auto&& p : nodes)
    {
        const auto& name = p.first;
        const auto& node = p.second;
        if(not is_valid_op(node))
            continue;
        // control flow related, ignore this node
        if(contains(name, "^"))
            continue;
        // literals are valid ops, but they are not outputs unless specified
        if(node.op() == "Const")
            continue;
        if(inputs.count(name) == 0)
            outputs.push_back(name);
    }
    return outputs;
}

void tf_parser::parse_graph(const tensorflow::GraphDef& graph)
{
    nodes = get_nodes(graph, input_nodes);
    for(auto&& input : input_nodes)
    {
        const std::string& name   = input.name();
        attribute_map input_attrs = get_attributes(input);
        shape::type_t shape_type  = parse_type(input_attrs.at("dtype").type());
        std::vector<size_t> dims  = parse_dims(input_attrs.at("shape").shape());

        if(contains(map_input_dims, name))
        {
            dims = map_input_dims.at(name);
        }
        else
        {
            if(is_nhwc and dims.size() >= 4)
            {
                this->reorder_data(dims);
            }
            std::transform(dims.begin(), dims.end(), dims.begin(), [&](auto dim) {
                return static_cast<int>(dim) <= 0 ? batch_size : dim;
            });
        }

        shape s            = shape{shape_type, dims};
        instructions[name] = to_nhwc(mm->add_parameter(name, s));
    }
    for(auto&& p : nodes)
    {
        this->parse_node(p.first);
    }
    if(mm->size() == 0)
        return;

    // Needs to add a ret instruction at the end of
    // the program
    if(output_node_names.empty())
    {
        output_node_names = find_outputs();
    }

    std::vector<instruction_ref> output_ins;
    std::transform(output_node_names.begin(),
                   output_node_names.end(),
                   std::back_inserter(output_ins),
                   [&](auto output_name) {
                       if(not contains(instructions, output_name))
                           MIGRAPHX_THROW("PARSE_TF: output name " + output_name +
                                          " not found in graph!");
                       return this->to_nchw(instructions[output_name]);
                   });
    mm->add_return(output_ins);
}

void tf_parser::parse_node(const std::string& name)
{
    if(instructions.count(name) == 0)
    {
        auto&& node = nodes.at(name);
        if(not is_valid_op(node))
            return;
        std::vector<instruction_ref> args;
        for(auto&& input : node.input())
        {
            // control dependencies (signified by ^ before the name) are ignored
            if(contains(input, "^"))
                continue;
            std::string input_name = input;
            // if input has trailing `:0` index then remove it
            auto multi_out_idx = input.find(':');
            if(multi_out_idx != std::string::npos and input.substr(multi_out_idx + 1) == "0")
            {
                input_name = input.substr(0, multi_out_idx);
            }
            if(nodes.count(input_name) > 0)
            {
                // input was from a node with multiple outputs
                if(contains(input_name, ':'))
                {
                    input_name.resize(input.find(':'));
                }
                else
                {
                    input_name = get_name(nodes.at(input_name));
                }
                assert(name != input_name);
                this->parse_node(input_name);
                args.push_back(instructions.at(input_name));
            }
            else
            {
                args.push_back(instructions.at(input_name));
            }
        }
        std::vector<instruction_ref> result;
        if(ops.count(node.op()) == 0)
        {
            result.push_back(mm->add_instruction(op::unknown{node.op()}, args));
        }
        else
        {
            result = ops[node.op()](*this, {get_attributes(node), node.op(), mm}, args);
        }
        assert(not result.empty());
        // First output has no ":" delimiter
        instructions[name] = result.front();
        for(size_t i = 1; i < result.size(); i++)
        {
            instructions[name + ":" + std::to_string(i)] = result.at(i);
        }
    }
}

void tf_parser::parse_from(std::istream& is)
{
    tensorflow::GraphDef graph;
    if(graph.ParseFromIstream(&is))
    {
        this->parse_graph(graph);
    }
    else
    {
        throw std::runtime_error("Failed reading tf file");
    }
}

void tf_parser::parse_from(const void* data, std::size_t size)
{
    tensorflow::GraphDef graph;
    if(graph.ParseFromArray(data, size))
    {
        this->parse_graph(graph);
    }
    else
    {
        throw std::runtime_error("Failed reading tf buffer array");
    }
}

shape::type_t tf_parser::parse_type(const tensorflow::DataType t) const
{
    shape::type_t shape_type{};
    switch(t)
    {
    case tensorflow::DataType::DT_FLOAT: shape_type = shape::float_type; break;
    case tensorflow::DataType::DT_DOUBLE: shape_type = shape::double_type; break;
    case tensorflow::DataType::DT_INT32: shape_type = shape::int32_type; break;
    case tensorflow::DataType::DT_INT16: shape_type = shape::int16_type; break;
    case tensorflow::DataType::DT_INT8: shape_type = shape::int8_type; break;
    case tensorflow::DataType::DT_INT64: shape_type = shape::int64_type; break;
    case tensorflow::DataType::DT_UINT16: shape_type = shape::uint16_type; break;
    case tensorflow::DataType::DT_HALF: shape_type = shape::half_type; break;
    case tensorflow::DataType::DT_UINT32: shape_type = shape::uint32_type; break;
    case tensorflow::DataType::DT_UINT64: shape_type = shape::uint64_type; break;

    case tensorflow::DataType::DT_INVALID:
    case tensorflow::DataType::DT_UINT8:
    case tensorflow::DataType::DT_STRING:
    case tensorflow::DataType::DT_COMPLEX64:
    case tensorflow::DataType::DT_BOOL:
    case tensorflow::DataType::DT_QINT8:
    case tensorflow::DataType::DT_QUINT8:
    case tensorflow::DataType::DT_QINT32:
    case tensorflow::DataType::DT_BFLOAT16:
    case tensorflow::DataType::DT_QINT16:
    case tensorflow::DataType::DT_QUINT16:
    case tensorflow::DataType::DT_COMPLEX128:
    case tensorflow::DataType::DT_RESOURCE:
    case tensorflow::DataType::DT_VARIANT:
    // tf pb should not use these types
    case tensorflow::DataType::DT_FLOAT_REF:
    case tensorflow::DataType::DT_DOUBLE_REF:
    case tensorflow::DataType::DT_INT32_REF:
    case tensorflow::DataType::DT_UINT8_REF:
    case tensorflow::DataType::DT_INT16_REF:
    case tensorflow::DataType::DT_INT8_REF:
    case tensorflow::DataType::DT_STRING_REF:
    case tensorflow::DataType::DT_COMPLEX64_REF:
    case tensorflow::DataType::DT_INT64_REF:
    case tensorflow::DataType::DT_BOOL_REF:
    case tensorflow::DataType::DT_QINT8_REF:
    case tensorflow::DataType::DT_QUINT8_REF:
    case tensorflow::DataType::DT_QINT32_REF:
    case tensorflow::DataType::DT_BFLOAT16_REF:
    case tensorflow::DataType::DT_QINT16_REF:
    case tensorflow::DataType::DT_QUINT16_REF:
    case tensorflow::DataType::DT_UINT16_REF:
    case tensorflow::DataType::DT_COMPLEX128_REF:
    case tensorflow::DataType::DT_HALF_REF:
    case tensorflow::DataType::DT_RESOURCE_REF:
    case tensorflow::DataType::DT_VARIANT_REF:
    case tensorflow::DataType::DT_UINT32_REF:
    case tensorflow::DataType::DT_UINT64_REF:
    case tensorflow::DataType::DataType_INT_MAX_SENTINEL_DO_NOT_USE_:
    case tensorflow::DataType::DataType_INT_MIN_SENTINEL_DO_NOT_USE_: break;
    }
    return shape_type;
}

literal tf_parser::parse_tensor(const tensorflow::TensorProto& t) const
{
    std::vector<size_t> dims = parse_dims(t.tensor_shape());
    size_t shape_size = std::accumulate(dims.begin(), dims.end(), 1, std::multiplies<size_t>());
    if(not t.tensor_content().empty()) // has raw data
    {
        const std::string& s = t.tensor_content();
        switch(t.dtype())
        {
        case tensorflow::DataType::DT_FLOAT: return literal{{shape::float_type, dims}, s.data()};
        case tensorflow::DataType::DT_BOOL:
        case tensorflow::DataType::DT_INT8: return literal{{shape::int8_type, dims}, s.data()};
        case tensorflow::DataType::DT_UINT16:
        case tensorflow::DataType::DT_INT16: return literal{{shape::int16_type, dims}, s.data()};
        case tensorflow::DataType::DT_INT32: return literal{{shape::int32_type, dims}, s.data()};
        case tensorflow::DataType::DT_INT64: return literal{{shape::int64_type, dims}, s.data()};
        case tensorflow::DataType::DT_HALF: return literal{{shape::half_type, dims}, s.data()};
        case tensorflow::DataType::DT_DOUBLE: return literal{{shape::double_type, dims}, s.data()};
        case tensorflow::DataType::DT_INVALID:
        case tensorflow::DataType::DT_UINT8:
        case tensorflow::DataType::DT_STRING:
        case tensorflow::DataType::DT_UINT32:
        case tensorflow::DataType::DT_UINT64:
        case tensorflow::DataType::DT_COMPLEX64:
        case tensorflow::DataType::DT_COMPLEX128:
        case tensorflow::DataType::DT_QINT8:
        case tensorflow::DataType::DT_QUINT8:
        case tensorflow::DataType::DT_QINT32:
        case tensorflow::DataType::DT_BFLOAT16:
        case tensorflow::DataType::DT_QINT16:
        case tensorflow::DataType::DT_QUINT16:
        case tensorflow::DataType::DT_RESOURCE:
        case tensorflow::DataType::DT_VARIANT:
        case tensorflow::DataType::DT_FLOAT_REF:
        case tensorflow::DataType::DT_DOUBLE_REF:
        case tensorflow::DataType::DT_INT32_REF:
        case tensorflow::DataType::DT_UINT8_REF:
        case tensorflow::DataType::DT_INT16_REF:
        case tensorflow::DataType::DT_INT8_REF:
        case tensorflow::DataType::DT_STRING_REF:
        case tensorflow::DataType::DT_COMPLEX64_REF:
        case tensorflow::DataType::DT_INT64_REF:
        case tensorflow::DataType::DT_BOOL_REF:
        case tensorflow::DataType::DT_QINT8_REF:
        case tensorflow::DataType::DT_QUINT8_REF:
        case tensorflow::DataType::DT_QINT32_REF:
        case tensorflow::DataType::DT_BFLOAT16_REF:
        case tensorflow::DataType::DT_QINT16_REF:
        case tensorflow::DataType::DT_QUINT16_REF:
        case tensorflow::DataType::DT_UINT16_REF:
        case tensorflow::DataType::DT_COMPLEX128_REF:
        case tensorflow::DataType::DT_HALF_REF:
        case tensorflow::DataType::DT_RESOURCE_REF:
        case tensorflow::DataType::DT_VARIANT_REF:
        case tensorflow::DataType::DT_UINT32_REF:
        case tensorflow::DataType::DT_UINT64_REF:
        case tensorflow::DataType::DataType_INT_MAX_SENTINEL_DO_NOT_USE_:
        case tensorflow::DataType::DataType_INT_MIN_SENTINEL_DO_NOT_USE_:
            throw std::runtime_error("");
        }
        MIGRAPHX_THROW("Invalid tensor type");
    }
    switch(t.dtype())
    {
    case tensorflow::DataType::DT_FLOAT:
        return create_literal(shape::float_type, dims, get_data_vals(t.float_val(), shape_size));
    case tensorflow::DataType::DT_INT8:
        return create_literal(shape::int8_type, dims, get_data_vals(t.int_val(), shape_size));
    case tensorflow::DataType::DT_UINT16:
        return create_literal(shape::uint16_type, dims, get_data_vals(t.int_val(), shape_size));
    case tensorflow::DataType::DT_INT16:
        return create_literal(shape::int16_type, dims, get_data_vals(t.int_val(), shape_size));
    case tensorflow::DataType::DT_INT32:
        return create_literal(shape::int32_type, dims, get_data_vals(t.int_val(), shape_size));
    case tensorflow::DataType::DT_INT64:
        return create_literal(shape::int64_type, dims, get_data_vals(t.int64_val(), shape_size));
    case tensorflow::DataType::DT_BOOL:
        return create_literal(shape::int32_type, dims, get_data_vals(t.bool_val(), shape_size));
    case tensorflow::DataType::DT_HALF: {
        std::vector<int> data_int32 = get_data_vals(t.half_val(), shape_size);
        std::vector<uint16_t> data_uint16(data_int32.begin(), data_int32.end());
        std::vector<half> data_half;
        std::transform(data_uint16.begin(),
                       data_uint16.end(),
                       std::back_inserter(data_half),
                       [](uint16_t raw_val) { return *reinterpret_cast<half*>(&raw_val); });
        return create_literal(shape::half_type, dims, data_half);
    }
    case tensorflow::DataType::DT_DOUBLE:
        return literal{{shape::double_type, dims}, get_data_vals(t.double_val(), shape_size)};
    case tensorflow::DataType::DT_INVALID:
    case tensorflow::DataType::DT_UINT8:
    case tensorflow::DataType::DT_STRING:
    case tensorflow::DataType::DT_UINT32:
    case tensorflow::DataType::DT_UINT64:
    case tensorflow::DataType::DT_COMPLEX64:
    case tensorflow::DataType::DT_COMPLEX128:
    case tensorflow::DataType::DT_QINT8:
    case tensorflow::DataType::DT_QUINT8:
    case tensorflow::DataType::DT_QINT32:
    case tensorflow::DataType::DT_BFLOAT16:
    case tensorflow::DataType::DT_QINT16:
    case tensorflow::DataType::DT_QUINT16:
    case tensorflow::DataType::DT_RESOURCE:
    case tensorflow::DataType::DT_VARIANT:
    case tensorflow::DataType::DT_FLOAT_REF:
    case tensorflow::DataType::DT_DOUBLE_REF:
    case tensorflow::DataType::DT_INT32_REF:
    case tensorflow::DataType::DT_UINT8_REF:
    case tensorflow::DataType::DT_INT16_REF:
    case tensorflow::DataType::DT_INT8_REF:
    case tensorflow::DataType::DT_STRING_REF:
    case tensorflow::DataType::DT_COMPLEX64_REF:
    case tensorflow::DataType::DT_INT64_REF:
    case tensorflow::DataType::DT_BOOL_REF:
    case tensorflow::DataType::DT_QINT8_REF:
    case tensorflow::DataType::DT_QUINT8_REF:
    case tensorflow::DataType::DT_QINT32_REF:
    case tensorflow::DataType::DT_BFLOAT16_REF:
    case tensorflow::DataType::DT_QINT16_REF:
    case tensorflow::DataType::DT_QUINT16_REF:
    case tensorflow::DataType::DT_UINT16_REF:
    case tensorflow::DataType::DT_COMPLEX128_REF:
    case tensorflow::DataType::DT_HALF_REF:
    case tensorflow::DataType::DT_RESOURCE_REF:
    case tensorflow::DataType::DT_VARIANT_REF:
    case tensorflow::DataType::DT_UINT32_REF:
    case tensorflow::DataType::DT_UINT64_REF:
    case tensorflow::DataType::DataType_INT_MAX_SENTINEL_DO_NOT_USE_:
    case tensorflow::DataType::DataType_INT_MIN_SENTINEL_DO_NOT_USE_: throw std::runtime_error("");
    }
    MIGRAPHX_THROW("Invalid tensor type");
}

} // namespace tf
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
