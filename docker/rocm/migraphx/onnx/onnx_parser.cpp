/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/onnx/onnx_parser.hpp>
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/fallthrough.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/common.hpp>
#include <migraphx/type_traits.hpp>
#include <migraphx/float_equal.hpp>
#include <migraphx/file_buffer.hpp>
#include <migraphx/filesystem.hpp>
#include <migraphx/op/unknown.hpp>
#include <migraphx/float8.hpp>
#include <migraphx/env.hpp>
#include <onnx.pb.h>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_ONNX_PARSER)

static shape shape_from_dyn_dims(shape::type_t shape_type,
                                 const std::vector<shape::dynamic_dimension>& dyn_dims)
{
    if(std::all_of(dyn_dims.begin(), dyn_dims.end(), [](auto dd) { return dd.is_fixed(); }))
    {
        std::vector<std::size_t> dims;
        std::transform(dyn_dims.cbegin(), dyn_dims.cend(), std::back_inserter(dims), [](auto d) {
            return d.max;
        });
        return {shape_type, dims};
    }
    return {shape_type, dyn_dims};
}

static onnx_parser::attribute_map get_attributes(const onnx::NodeProto& node)
{
    std::unordered_map<std::string, onnx::AttributeProto> result;
    for(auto&& attr : node.attribute())
    {
        result[attr.name()] = attr;
    }
    return result;
}

static literal
create_literal(shape::type_t shape_type, const std::vector<size_t>& dims, const char* data)
{
    // empty input
    auto elem_num =
        std::accumulate(dims.begin(), dims.end(), std::size_t(1), std::multiplies<std::size_t>());
    if(elem_num == 0)
    {
        return literal{shape_type};
    }

    // in case of scalar constants in onnx file, use dims=1 to fill initializer data
    if(dims.empty())
        return literal{{shape_type}, data};
    return literal{{shape_type, dims}, data};
}

template <class T, MIGRAPHX_REQUIRES(not std::is_pointer<T>{})>
static literal create_literal(shape::type_t shape_type, const std::vector<size_t>& dims, T data)
{
    // empty input
    auto elem_num =
        std::accumulate(dims.begin(), dims.end(), std::size_t(1), std::multiplies<std::size_t>());
    if(elem_num == 0)
    {
        return literal{shape_type};
    }

    // scalar input
    if(dims.empty())
        return literal{{shape_type}, data.begin(), data.end()};
    return literal{{shape_type, dims}, data.begin(), data.end()};
}

template <class T>
static literal from_repeated(shape::type_t t, const T& r)
{
    std::size_t size = r.size();
    return literal{{t, {size}}, r.begin(), r.end()};
}

instruction_ref onnx_parser::node_info::make_contiguous(instruction_ref ins) const
{
    auto attr       = ins->get_operator().to_value();
    std::string key = "require_std_shape";
    if((attr.get(key, false)) or (not ins->get_shape().standard()))
    {
        return add_instruction(make_op("contiguous"), ins);
    }

    return ins;
}

instruction_ref onnx_parser::node_info::add_bias(const std::vector<instruction_ref>& args,
                                                 instruction_ref curr_ins,
                                                 uint64_t axis) const
{
    if(args.size() == 3)
    {
        instruction_ref bias_bcast;
        // if curr_ins has a dynamic output shape use 2 input broadcast
        if(curr_ins->get_shape().dynamic())
        {
            bias_bcast =
                mod->add_instruction(make_op("broadcast", {{"axis", axis}}), args[2], curr_ins);
        }
        else
        {
            bias_bcast = mod->add_instruction(
                make_op("broadcast", {{"axis", axis}, {"out_lens", curr_ins->get_shape().lens()}}),
                args[2]);
        }
        return mod->add_instruction(make_op("add"), curr_ins, bias_bcast);
    }
    return curr_ins;
}

instruction_ref onnx_parser::node_info::add_broadcastable_binary_op(const std::string& op_name,
                                                                    instruction_ref arg0,
                                                                    instruction_ref arg1) const
{
    return this->add_common_op(op_name, arg0, arg1);
}

/**
 * @brief A wrapper for insert_common_args(), which constructs an argument list
 * and inserts multibroadcast and convert ops to match inputs to a common shape and type
 * as required.  The requested operation is placed after the added multibroadcast and convert ops,
 * if any, so that their results are transparent to the programmer.
 *
 * Use add_common_op() to match input sizes when inputs may be
 *  either static or dynamic.
 *
 * @param op_name               string; Name of operation (op) to add; valid names are the same as
 * for make_op()
 *
 * @param inputs                vector of instruction_ref.  List of instructions for the new
 * operator.  Multibroadcast and convert operations, if needed, are deduced from these too.
 *
 * @return instruction_ref      Returns an instruction_ref which is the result of the requested
 * operation.
 *
 */
instruction_ref onnx_parser::node_info::add_common_op(const std::string& op_name,
                                                      std::vector<instruction_ref> inputs) const
{
    return migraphx::add_common_op(*mod, make_op(op_name), std::move(inputs));
}

instruction_ref
onnx_parser::node_info::add_instruction(const operation& op,
                                        const std::vector<instruction_ref>& args) const
{
    return mod->add_instruction(op, args);
}

instruction_ref onnx_parser::node_info::add_instruction(const operation& op,
                                                        const std::vector<instruction_ref>& args,
                                                        const std::vector<module_ref>& mods) const
{
    return mod->add_instruction(op, args, mods);
}

instruction_ref onnx_parser::node_info::add_literal(literal l) const
{
    return mod->add_literal(std::move(l));
}

onnx_parser::onnx_parser()
{
    // Add all registered op parsers
    for(auto&& name : get_op_parsers())
        ops.emplace(name, get_op_parser(name));
}

operation onnx_parser::load(const std::string& name, const node_info& info) const
{
    auto op = make_op(name);
    auto v  = op.to_value();
    for(auto&& x : v)
    {
        if(info.attributes.count(x.get_key()) == 0)
            continue;
        literal s = parse_value(info.attributes.at(x.get_key()));
        if(x.is_array())
        {
            std::vector<value> values;
            s.visit([&](auto y) {
                std::transform(y.begin(), y.end(), std::back_inserter(values), [](auto z) {
                    return value(z);
                });
            });
            x = values;
        }
        else
        {
            s.visit([&](auto y) { x = y.front(); });
        }
    }
    op.from_value(v);
    return op;
}

void onnx_parser::parse_undefined(module* mod, const std::string& name)
{
    if(not contains(instructions, name))
    {
        auto ins           = mod->add_instruction(make_op("undefined"));
        instructions[name] = ins;
    }
}

void onnx_parser::parse_from(std::istream& is, std::string name)
{
    auto* mm         = prog.get_main_module();
    this->filename   = std::move(name);
    auto parent_path = fs::path(this->filename).parent_path();
    if(not parent_path.empty())
        this->path = parent_path.string();

    onnx::ModelProto model;
    if(model.ParseFromIstream(&is))
    {
        auto version  = get_opset_version(model);
        opset_version = (version == -1) ? opset_version : version;

        if(model.has_graph())
        {
            (void)this->parse_graph(mm, model.graph());
        }
    }
    else
    {
        MIGRAPHX_THROW("PARSE_FROM: Failed reading onnx file: " + this->filename);
    }
}

void onnx_parser::parse_from(const void* data, std::size_t size)
{
    auto* mm = prog.get_main_module();
    onnx::ModelProto model;
    if(model.ParseFromArray(data, size))
    {
        auto version  = get_opset_version(model);
        opset_version = (version == -1) ? opset_version : version;

        if(model.has_graph())
        {
            (void)this->parse_graph(mm, model.graph());
        }
    }
    else
    {
        MIGRAPHX_THROW("Failed reading onnx file.");
    }
}

int64_t onnx_parser::get_opset_version(const onnx::ModelProto& model)
{
    const auto& opset_import = model.opset_import();
    int64_t version          = -1;
    for(const auto& opset : opset_import)
    {
        if(opset.has_version())
        {
            version = std::max(version, opset.version());
        }
    }

    return version;
}

void print_added_instructions(module* mod,
                              const std::vector<instruction_ref>& args,
                              const std::vector<instruction_ref>& result)
{
    // Print instructions added by the parser not in args
    std::vector<instruction_ref> added_instructions;
    fix([&](auto self, auto r) {
        for(auto ins : r)
        {
            if(contains(args, ins))
                continue;
            if(contains(added_instructions, ins))
                continue;
            self(ins->inputs());
            added_instructions.push_back(ins);
        }
    })(result);
    mod->debug_print(added_instructions);
}

static bool is_type_packed_int4(const onnx::TensorProto& t)
{
    return t.data_type() == onnx::TensorProto::INT4 or t.data_type() == onnx::TensorProto::UINT4;
}

std::unordered_map<std::string, instruction_ref>
parse_intializer(const onnx_parser& parser, module* mod, const onnx::GraphProto& graph)
{
    std::unordered_map<std::string, instruction_ref> mod_insts;
    for(auto&& f : graph.initializer())
    {
        if(enabled(MIGRAPHX_TRACE_ONNX_PARSER{}))
            std::cout << "initializer: " << f.name() << std::endl;
        // backup instructions in parent mod
        auto pt  = parser.parse_tensor(f);
        auto lit = mod->add_literal(pt);

        if(is_type_packed_int4(f))
            lit = mod->add_instruction(migraphx::make_op("unpack_int4"), lit);

        mod_insts[f.name()] = lit;
        if(enabled(MIGRAPHX_TRACE_ONNX_PARSER{}))
            mod->debug_print(mod_insts[f.name()]);
    }
    return mod_insts;
}

std::unordered_map<std::string, instruction_ref>
parse_inputs(const onnx_parser& parser,
             module* mod,
             const onnx::GraphProto& graph,
             std::unordered_map<std::string, instruction_ref> mod_insts)
{
    for(auto&& input : graph.input())
    {
        const std::string& name = input.name();
        // input not in initializer_data, so it is a real input
        if(not contains(mod_insts, name))
        {
            // ONNX specification does not specify how to deal with the
            // scenario that a nested subgraph contains a parameter with the
            // name existed in its parent graph.
            // In the current implementation, MIGraphX throws an exception for that.
            if(contains(parser.instructions, name))
            {
                MIGRAPHX_THROW("module \"" + mod->name() + "\" has parameter name \"" + name +
                               "\" existing in parent graph!");
            }

            shape s;
            if(parser.map_input_dims.count(name) > 0)
            {
                std::vector<std::size_t> dims = parser.map_input_dims.at(name);
                s                             = parser.parse_type(input.type(), dims);
            }
            else if(parser.map_dyn_input_dims.count(name) > 0)
            {
                shape::type_t shape_type = get_type(input.type().tensor_type().elem_type());
                s = shape_from_dyn_dims(shape_type, parser.map_dyn_input_dims.at(name));
            }
            else
            {
                s = parser.parse_type(input.type());
            }
            mod_insts[name] = mod->add_parameter(name, s);
        }
    }
    return mod_insts;
}

std::vector<instruction_ref>
onnx_parser::parse_graph(module* mod, const onnx::GraphProto& graph, bool inlining)
{
    std::unordered_map<std::string, instruction_ref> mod_insts =
        parse_intializer(*this, mod, graph);

    mod_insts = parse_inputs(*this, mod, graph, mod_insts);

    std::copy(mod_insts.begin(), mod_insts.end(), std::inserter(instructions, instructions.end()));

    for(auto&& node : graph.node())
    {
        if(enabled(MIGRAPHX_TRACE_ONNX_PARSER{}))
            std::cout << "operator: " << node.op_type() << std::endl;

        std::vector<instruction_ref> args;
        for(auto&& input : node.input())
        {
            if(input.empty())
            {
                this->parse_undefined(mod, input);
            }
            if(instructions.count(input) == 0)
            {
                MIGRAPHX_THROW("PARSE_GRAPH: invalid onnx file. Input \"" + input +
                               "\" is unavailable due to unordered nodes!");
            }
            args.push_back(instructions.at(input));
        }

        std::vector<instruction_ref> result;
        std::size_t output_num = node.output().size();
        if(ops.count(node.op_type()) == 0)
        {
            if(skip_unknown_operators)
                result.push_back(mod->add_instruction(op::unknown{node.op_type()}, args));
            else
                MIGRAPHX_THROW("Unknown operator: " + node.op_type());
        }
        else
        {
            std::string node_name = node.op_type() + "_" + std::to_string(mod->size());
            result                = ops[node.op_type()](
                *this, {get_attributes(node), output_num, node_name, mod}, args);
        }

        output_num = std::min<std::size_t>(output_num, result.size());
        std::transform(node.output().begin(),
                       node.output().begin() + output_num,
                       result.begin(),
                       std::inserter(instructions, instructions.end()),
                       [](auto&& x, auto&& y) { return std::make_pair(x, y); });

        if(enabled(MIGRAPHX_TRACE_ONNX_PARSER{}))
        {
            print_added_instructions(mod, args, result);
        }
    }

    // Find instructions corresponding to the output
    auto prog_output = graph.output();
    std::vector<std::string> all_output_names;
    std::vector<std::string> prog_output_names;
    std::transform(prog_output.begin(),
                   prog_output.end(),
                   std::back_inserter(all_output_names),
                   [](auto& node) { return node.name(); });
    std::copy_if(
        all_output_names.begin(),
        all_output_names.end(),
        std::back_inserter(prog_output_names),
        [&](const auto& name) { return not(name.empty() or instructions.count(name) == 0); });

    std::vector<instruction_ref> output_ins;
    std::transform(prog_output_names.begin(),
                   prog_output_names.end(),
                   std::back_inserter(output_ins),
                   [&](const auto& name) { return instructions[name]; });

    if(not inlining)
    {
        // add the return instuction
        mod->add_return(output_ins);

        // Remove instructions added in module (this is turned off for subgraph inlining)
        erase_if(instructions, [&](auto&& p) { return mod->has_instruction(p.second); });
    }

    return output_ins;
}

literal onnx_parser::parse_value(const onnx::AttributeProto& attr) const
{
    switch(attr.type())
    {
    case onnx::AttributeProto::FLOAT: return literal{attr.f()};
    case onnx::AttributeProto::INT: return literal{attr.i()};
    case onnx::AttributeProto::TENSOR: return parse_tensor(attr.t());
    case onnx::AttributeProto::FLOATS: return from_repeated(shape::float_type, attr.floats());
    case onnx::AttributeProto::INTS: return from_repeated(shape::int64_type, attr.ints());
    case onnx::AttributeProto::UNDEFINED:
    case onnx::AttributeProto::GRAPH:
    case onnx::AttributeProto::STRING:
    case onnx::AttributeProto::STRINGS:
    case onnx::AttributeProto::TENSORS:
    case onnx::AttributeProto::SPARSE_TENSOR:
    case onnx::AttributeProto::SPARSE_TENSORS:
    case onnx::AttributeProto::TYPE_PROTOS:
    case onnx::AttributeProto::TYPE_PROTO:
    case onnx::AttributeProto::GRAPHS: return {};
    }
    MIGRAPHX_THROW("PARSE_VALUE: Invalid attribute type " + std::to_string(attr.type()));
}

static shape parse_tensor_shape(const onnx::TensorProto& t)
{
    std::vector<std::size_t> dims(t.dims().begin(), t.dims().end());
    if(is_type_packed_int4(t))
    {
        auto dim_n = dims.back();
        if(dim_n > 0 and (dim_n % 2 == 0))
            dims.back() = dim_n / 2; // int4-packed dimension converted to int8-sized units
        else
            MIGRAPHX_THROW("Int4: currently supports only even-sized packed tensors");
    }
    return shape{get_type(t.data_type()), dims};
}

literal onnx_parser::parse_tensor(const onnx::TensorProto& t) const
{
    auto tensor_shape  = parse_tensor_shape(t);
    const auto& dims   = tensor_shape.lens();
    auto type          = tensor_shape.type();
    auto external_data = t.external_data();

    if(not external_data.empty())
    {
        const std::string& data_file = external_data.at(0).value();
        size_t num_data_fields       = external_data.size();
        size_t offset                = 0;
        size_t nbytes                = tensor_shape.bytes();

        if(num_data_fields > 1) // if offset field is present
        {
            offset = std::stoull(t.external_data().at(1).value());
        }
        if(num_data_fields > 2) // if nbytes field is present
        {
            nbytes = std::stoull(t.external_data().at(2).value());
        }
        std::vector<char> raw_buffer;
        if(not external_data_path.empty())
        {
            raw_buffer = read_buffer(fs::path{external_data_path} / data_file, offset, nbytes);
        }
        else
        {
            raw_buffer = read_buffer(path / data_file, offset, nbytes);
        }
        std::string s(raw_buffer.begin(), raw_buffer.end());
        return create_literal(type, dims, s.data());
    }

    if(t.has_raw_data())
    {
        const std::string& s = t.raw_data();
        return create_literal(type, dims, s.data());
    }

    switch(t.data_type())
    {
    case onnx::TensorProto::BOOL: return create_literal(shape::bool_type, dims, t.int32_data());

    // INT4 or UINT4 operate as 8-bit buffers:
    case onnx::TensorProto::INT4: return create_literal(shape::int8_type, dims, t.int32_data());
    case onnx::TensorProto::UINT4: return create_literal(shape::uint8_type, dims, t.int32_data());

    case onnx::TensorProto::INT8: return create_literal(shape::int8_type, dims, t.int32_data());
    case onnx::TensorProto::UINT8: return create_literal(shape::uint8_type, dims, t.int32_data());

    case onnx::TensorProto::INT16: return create_literal(shape::int16_type, dims, t.int32_data());
    case onnx::TensorProto::UINT16: return create_literal(shape::uint16_type, dims, t.int32_data());

    case onnx::TensorProto::INT32: return create_literal(shape::int32_type, dims, t.int32_data());
    case onnx::TensorProto::UINT32:
        return create_literal(shape::uint32_type, dims, t.uint64_data());

    case onnx::TensorProto::INT64: return create_literal(shape::int64_type, dims, t.int64_data());
    case onnx::TensorProto::UINT64:
        return create_literal(shape::uint64_type, dims, t.uint64_data());

    case onnx::TensorProto::FLOAT16: {
        std::vector<uint16_t> data_uint16(t.int32_data().begin(), t.int32_data().end());
        std::vector<half> data_half;
        std::transform(data_uint16.begin(),
                       data_uint16.end(),
                       std::back_inserter(data_half),
                       [](uint16_t raw_val) { return *reinterpret_cast<half*>(&raw_val); });
        return create_literal(shape::half_type, dims, data_half);
    }

    case onnx::TensorProto::DOUBLE:
        return create_literal(shape::double_type, dims, t.double_data());

    case onnx::TensorProto::FLOAT: return create_literal(shape::float_type, dims, t.float_data());

    case onnx::TensorProto::FLOAT8E4M3FNUZ: {
        std::vector<int32_t> data_int32(t.int32_data().begin(), t.int32_data().end());
        std::vector<migraphx::fp8::fp8e4m3fnuz> data_fp8;
        std::transform(data_int32.begin(),
                       data_int32.end(),
                       std::back_inserter(data_fp8),
                       [](float raw_val) { return migraphx::fp8::fp8e4m3fnuz{raw_val}; });
        return create_literal(shape::fp8e4m3fnuz_type, dims, data_fp8);
    }

    case onnx::TensorProto::FLOAT8E5M2FNUZ:
    case onnx::TensorProto::FLOAT8E5M2:
    case onnx::TensorProto::FLOAT8E4M3FN:
    case onnx::TensorProto::UNDEFINED:
    case onnx::TensorProto::STRING:
    case onnx::TensorProto::COMPLEX64:
    case onnx::TensorProto::COMPLEX128: throw std::runtime_error("");
    }
    MIGRAPHX_THROW("PARSE_TENSOR: Invalid tensor type");
}

shape onnx_parser::parse_type(const onnx::TypeProto& t) const
{
    shape::type_t shape_type = get_type(t.tensor_type().elem_type());

    std::vector<shape::dynamic_dimension> dynamic_dims;
    auto&& tensor_dims = t.tensor_type().shape().dim();
    std::transform(tensor_dims.begin(),
                   tensor_dims.end(),
                   std::back_inserter(dynamic_dims),
                   [&](auto&& d) -> shape::dynamic_dimension {
                       if(d.has_dim_param())
                       {
                           const auto& dim_param = d.dim_param();
                           if(contains(dim_params, dim_param))
                           {
                               return dim_params.at(dim_param);
                           }
                       }
                       if(d.has_dim_value())
                       {
                           if(static_cast<int>(d.dim_value()) <= 0)
                           {
                               return default_dyn_dim_value;
                           }
                           std::size_t tmp = d.dim_value();
                           return {tmp, tmp};
                       }
                       else
                       {
                           return default_dyn_dim_value;
                       }
                   });

    if(dynamic_dims.empty())
    {
        return {shape_type};
    }
    return shape_from_dyn_dims(shape_type, dynamic_dims);
}

shape onnx_parser::parse_type(const onnx::TypeProto& t,
                              const std::vector<std::size_t>& input_dims) const
{
    shape::type_t shape_type = get_type(t.tensor_type().elem_type());
    if(input_dims.empty())
        return {shape_type};
    return {shape_type, input_dims};
}

shape::type_t get_type(int dtype)
{
    switch(dtype)
    {
    case 1: return shape::float_type;
    case 2: return shape::uint8_type;
    case 3: return shape::int8_type;
    case 4: return shape::uint16_type;
    case 5: return shape::int16_type;
    case 6: return shape::int32_type;
    case 7: return shape::int64_type;
    case 9: return shape::bool_type;
    case 10: return shape::half_type;
    case 11: return shape::double_type;
    case 12: return shape::uint32_type;
    case 13: return shape::uint64_type;
    case 18: return shape::fp8e4m3fnuz_type;
    case 21: return shape::uint8_type;
    case 22: return shape::int8_type;
    case 14:
    case 15:
    case 16: return shape::bf16_type;
    case 17:
    case 19:
    case 20:
    default: {
        MIGRAPHX_THROW("Prototensor data type " + std::to_string(dtype) + " not supported");
    }
    }
}

bool is_type_float(shape::type_t dtype)
{
    bool r = false;
    if(dtype == shape::float_type or dtype == shape::double_type or dtype == shape::half_type or
       dtype == shape::bf16_type)
    {
        r = true;
    }
    return r;
}

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
