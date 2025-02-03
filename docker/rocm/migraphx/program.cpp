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
#include <migraphx/version.h>
#include <migraphx/compile_options.hpp>
#include <migraphx/program.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/op/identity.hpp>
#include <migraphx/target.hpp>
#include <migraphx/env.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/time.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/iterator.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/output_iterator.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/marker.hpp>
#include <migraphx/supported_segments.hpp>

#include <iostream>
#include <queue>
#include <sstream>
#include <fstream>
#include <algorithm>
#include <set>
#include <unordered_map>
#include <utility>
#include <unordered_set>
#include <map>
#include <cassert>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

using milliseconds = std::chrono::duration<double, std::milli>;

struct mark_instruction_target
{
    std::size_t target_id = 0;
    std::string name() const { return "mark_instruction_target"; }
    void apply(module& m) const
    {
        for(auto& ins : m)
            ins.set_target_id(target_id);
    }
};

struct program_impl
{
    // A map is used to keep references to modules of the program
    std::unordered_map<std::string, module> modules;
    std::vector<context> contexts;
    std::vector<target> targets;
};

program::program() : impl(std::make_unique<program_impl>()) { this->create_module("main"); }
program::program(module m) : impl(std::make_unique<program_impl>())
{
    this->create_module("main", std::move(m));
}

program::program(program&&) noexcept = default;
program::~program() noexcept         = default;

// copy constructor
program::program(const program& p) { assign(p); }

// copy assignment operator
program& program::operator=(program p)
{
    std::swap(p.impl, this->impl);
    return *this;
}

void program::assign(const program& p)
{
    if(not impl)
    {
        impl = std::make_unique<program_impl>();
    }

    *impl = *p.impl;

    // build a map from old ins to new ins
    // Build a map from old module to new module
    std::unordered_map<module_ref, module_ref> mod_map;
    std::transform(
        impl->modules.begin(),
        impl->modules.end(),
        std::inserter(mod_map, mod_map.begin()),
        [&](auto&& xp) { return std::make_pair(&p.impl->modules.at(xp.first), &xp.second); });

    std::unordered_map<instruction_ref, instruction_ref> ins_map;
    for(auto&& pp : mod_map)
    {
        auto old_ins = iterator_for(*pp.first);
        auto new_ins = iterator_for(*pp.second);
        std::transform(old_ins.begin(),
                       old_ins.end(),
                       new_ins.begin(),
                       std::inserter(ins_map, ins_map.begin()),
                       [](auto x, auto y) { return std::make_pair(x, y); });
    }

    // Update all references from all modules
    for(auto&& mp : impl->modules)
    {
        for(auto ins : iterator_for(mp.second))
            instruction::replace_refs(ins, ins_map, mod_map);
    }
}

shape program::get_parameter_shape(std::string name) const
{
    const auto* mm = this->get_main_module();
    return mm->get_parameter_shape(std::move(name));
}

std::vector<std::string> program::get_parameter_names() const
{
    const auto* mm = this->get_main_module();
    return mm->get_parameter_names();
}

instruction_ref program::get_parameter(std::string name) const
{
    const auto* mm = this->get_main_module();
    return mm->get_parameter(std::move(name));
}

std::unordered_map<std::string, shape> program::get_parameter_shapes() const
{
    const auto* mm = this->get_main_module();
    return mm->get_parameter_shapes();
}

std::size_t program::size() const { return impl->modules.size(); }

std::vector<shape> program::get_output_shapes() const
{
    const auto* mm = this->get_main_module();
    return mm->get_output_shapes();
}

context& program::get_context() const
{
    assert(impl->contexts.size() == 1);
    return impl->contexts.front();
}

instruction_ref program::validate() const
{
    const auto* mm = this->get_main_module();
    return mm->validate();
}

target_assignments program::get_target_assignments(const std::vector<target>& targets,
                                                   assignment_options options)
{
    const auto m = options.metric;

    target_assignments p;

    const auto* mod = get_main_module();
    std::vector<std::pair<target, supported_segments>> target_subgraphs;
    target_subgraphs.reserve(targets.size());
    std::transform(targets.begin(),
                   targets.end(),
                   std::back_inserter(target_subgraphs),
                   [&](const auto& t) { return std::make_pair(t, t.find_supported(mod, m)); });

    for(const auto ins : iterator_for(*mod))
    {
        if(contains(p, ins))
        {
            continue;
        }

        for(const auto& [target, subgraph] : target_subgraphs)
        {
            // can't pass a structured binding into lambda in C++17 so create a variable for it
            const auto& t = target;
            for(const auto& segment : subgraph)
            {
                const auto& instructions = segment.instructions;
                if(not contains(instructions, ins))
                {
                    continue;
                }
                std::transform(instructions.begin(),
                               instructions.end(),
                               std::inserter(p, p.end()),
                               [&](auto instr) { return std::make_pair(instr, t.name()); });
            }
        }
    }
    return p;
}

bool program::is_compiled() const { return not this->impl->contexts.empty(); }

void program::compile(const std::vector<target>& targets, std::vector<compile_options> compile_opts)
{
    // Gather all the target roots
    std::unordered_multimap<std::size_t, module_ref> roots;
    auto mods = this->get_modules();
    for(const auto* mod : mods)
    {
        for(const auto& ins : *mod)
        {
            if(ins.name() != "run_on_target")
                continue;
            auto v                     = ins.get_operator().to_value();
            module_ref root            = ins.module_inputs().front();
            std::size_t root_target_id = v.at("target_id").to<std::size_t>();
            assert(root_target_id < targets.size());
            roots.insert({root_target_id, root});
        }
    }

    auto trace = tracer{};
    // TODO: Add tracer based on compile options
    if(enabled(MIGRAPHX_TRACE_COMPILE{}))
        trace = tracer{std::cout};

    trace(*this);
    trace();
    // It is assumed that all instructions outside of any root module would run on "ref" target
    // Ref target may or may not be passed as one of the target for the "compile()".
    // If it is not passed, Create one and add context of it into the map.
    auto target_idx = [&](const std::string& t_name) {
        return static_cast<std::size_t>(
            std::find_if(
                targets.begin(), targets.end(), [&](const auto& t) { return t.name() == t_name; }) -
            targets.begin());
    };

    std::size_t ref_target_id = target_idx("ref");
    if(ref_target_id == targets.size())
    {
        this->impl->contexts.resize(targets.size() + 1);
        this->impl->contexts[ref_target_id] = migraphx::make_target("ref").get_context();
        // users could pass lessers compile_ops than targets, in that case use default compile_opts
        compile_opts.resize(targets.size() + 1, migraphx::compile_options{});
    }
    else
    {
        this->impl->contexts.resize(targets.size());
        compile_opts.resize(targets.size(), migraphx::compile_options{});
    }
    // mark all the instruction as ref target first, later change target_id based on root-target
    run_passes(*this, {mark_instruction_target{ref_target_id}});

    // Run passes on each root target
    for(const auto i : range(targets.size()))
    {
        const auto& root_target              = targets.at(i);
        auto root_target_id                  = i;
        auto root_modules_range              = roots.equal_range(root_target_id);
        this->impl->contexts[root_target_id] = root_target.get_context();
        for(const auto& [id, current_mod] : range(root_modules_range))
        {
            auto passes = root_target.get_passes(this->impl->contexts[root_target_id],
                                                 compile_opts[root_target_id]);
            passes.push_back(mark_instruction_target{static_cast<size_t>(root_target_id)});
            run_passes(*this, current_mod, passes, trace);

            auto invalid = current_mod->validate();
            if(invalid != current_mod->end())
            {
                MIGRAPHX_THROW("Invalid module " + current_mod->name() +
                               " from compilation at instruction " +
                               std::to_string(std::distance(current_mod->begin(), invalid)));
            }
            auto dangling = current_mod->find_dangling_reference();
            if(dangling != current_mod->end())
            {
                auto index = std::distance(current_mod->begin(), dangling);
                MIGRAPHX_THROW("Dangling reference in module " + current_mod->name() +
                               " from instruction " + std::to_string(index));
            }
        }
    }
    this->finalize();
}

void program::compile(const target& t, compile_options options)
{
    // todo: combine with multi-target compile method
    assert(not this->is_compiled());
    this->impl->targets  = {t};
    this->impl->contexts = {t.get_context()};

    if(enabled(MIGRAPHX_TRACE_COMPILE{}))
        options.trace = tracer{std::cout};

    options.trace(*this);
    options.trace();
    auto&& passes = t.get_passes(this->impl->contexts.front(), options);
    run_passes(*this, passes, options.trace);
    auto mods = this->get_modules();
    // Validate and finalize
    for(const auto& mod : reverse(mods))
    {
        auto invalid = mod->validate();
        if(invalid != mod->end())
        {
            MIGRAPHX_THROW("Invalid module " + mod->name() + " from compilation at instruction " +
                           std::to_string(std::distance(mod->begin(), invalid)));
        }
        auto dangling = mod->find_dangling_reference();
        if(dangling != mod->end())
        {
            auto index = std::distance(mod->begin(), dangling);
            MIGRAPHX_THROW("Dangling reference in module " + mod->name() + " from instruction " +
                           std::to_string(index));
        }
        mod->finalize(this->impl->contexts);
    }
}

void program::finalize()
{
    auto* mm = this->get_main_module();
    mm->finalize(this->impl->contexts);
}

template <class T>
std::string classify(T x)
{
    switch(std::fpclassify(static_cast<double>(x)))
    {
    case FP_INFINITE: return "inf";
    case FP_NAN: return "nan";
    case FP_NORMAL: return "normal";
    case FP_SUBNORMAL: return "subnormal";
    case FP_ZERO: return "zero";
    default: return "unknown";
    }
}

void print_statistics(std::ostream& os, const argument& a)
{
    a.visit(
        [&](auto t) {
            os << "Min value: " << *std::min_element(t.begin(), t.end()) << ", ";
            os << "Max value: " << *std::max_element(t.begin(), t.end()) << ", ";
            double num_elements = t.size();
            auto mean           = std::accumulate(t.begin(), t.end(), 0.0) / num_elements;
            auto stddev         = std::sqrt(
                std::accumulate(t.begin(),
                                t.end(),
                                0.0,
                                [&](auto r, auto v) { return r + std::pow((v - mean), 2.0); }) /
                num_elements);
            os << "Mean: " << mean << ", ";
            os << "StdDev: " << stddev << "\n";
        },
        [&](const auto& xs) {
            for(const auto& x : xs)
            {
                print_statistics(os, x);
            }
        });
}

std::unordered_set<std::string> classify_argument(const argument& a)
{
    std::unordered_set<std::string> result;
    a.visit(
        [&](auto t) {
            for(const auto& x : t)
                result.insert(classify(x));
        },
        [&](const auto& xs) {
            for(const auto& x : xs)
            {
                auto r = classify_argument(x);
                result.insert(r.begin(), r.end());
            }
        });
    return result;
}

void preview_argument(std::ostream& os, const argument& a)
{
    a.visit(
        [&](auto t) {
            if(t.size() <= 10)
            {
                os << t;
            }
            else
            {
                os << to_string_range(t.begin(), t.begin() + 5);
                os << ", ..., ";
                os << to_string_range(t.end() - 5, t.end());
            }
        },
        [&](const auto& xs) {
            for(const auto& x : xs)
            {
                os << '{';
                preview_argument(os, x);
                os << '}';
            }
        });
}

// This function currently used only in an Assertion.
// "Almost identical" shapes.  To support an MLIR feature, there is a limited
// case where shapes may both be standard but have non-identical strides.
#ifndef NDEBUG
static bool is_compatible_shape(const shape& actual, const shape& expected)
{
    // Check subshapes
    if(expected.type() == shape::tuple_type)
        return equal(actual.sub_shapes().begin(),
                     actual.sub_shapes().end(),
                     expected.sub_shapes().begin(),
                     &is_compatible_shape);
    // Only the expected can be dynamic
    if(expected.dynamic())
        return true;
    if(actual == expected)
        return true;
    if(actual.type() != expected.type())
        return false;
    // If both shapes are standard and lens match, they are considered compatible
    // even if strides are different.
    if(actual.standard() and expected.standard())
        return actual.lens() == expected.lens();
    return false;
}
#endif

template <class F>
std::vector<argument> generic_eval(const module* mod,
                                   std::vector<context>& ctx,
                                   std::unordered_map<std::string, argument> params,
                                   std::unordered_map<instruction_ref, argument> results,
                                   F trace)
{
    assert(mod->validate() == mod->end());
    results.reserve(mod->size() * 2);
    std::vector<argument> values;
    values.reserve(16);
    for(auto ins : iterator_for(*mod))
    {
        assert(results.find(ins) == results.end());
        const auto& name = ins->name();
        if(name == "@literal")
        {
            results.emplace(ins, trace(ins, [&] { return ins->get_literal().get_argument(); }));
        }
        else if(name == "@param")
        {
            results.emplace(
                ins, trace(ins, [&] {
                    auto param_name = any_cast<builtin::param>(ins->get_operator()).parameter;
                    if(not contains(params, param_name))
                        MIGRAPHX_THROW("Parameter not found: " + param_name);
                    auto param = params[param_name];
                    // TODO: may want to check correct number of dimensions and/or was within bounds
                    if(not ins->get_shape().any_of_dynamic() and
                       param.get_shape() != ins->get_shape())
                    {
                        MIGRAPHX_THROW("Incorrect shape {" + to_string(param.get_shape()) +
                                       "} for parameter: " + param_name +
                                       " should be: " + to_string(ins->get_shape()));
                    }
                    return param;
                }));
        }
        else if(name == "@outline")
        {
            results.emplace(ins, trace(ins, [&] { return argument{ins->get_shape(), nullptr}; }));
        }
        else if(name == "@return")
        {
            std::vector<argument> prog_outputs;
            std::transform(ins->inputs().begin(),
                           ins->inputs().end(),
                           std::back_inserter(prog_outputs),
                           [&](instruction_ref i) {
                               assert(results.find(i) != results.end());
                               return results[i];
                           });

            return prog_outputs;
        }
        else
        {
            values.resize(ins->inputs().size());
            std::transform(
                ins->inputs().begin(), ins->inputs().end(), values.begin(), [&](instruction_ref i) {
                    assert(results.find(i) != results.end());
                    return results[i];
                });
            const auto& mod_args = ins->module_inputs();
            auto module_eval     = [&](module_ref smod,
                                   const std::unordered_map<std::string, argument>& inputs) {
                return generic_eval(smod, ctx, inputs, results, trace);
            };

            results.emplace(
                ins, trace(ins, [&] {
                    auto op = ins->normalized_operator();
                    if(op.is_context_free())
                        return op.compute(ins->get_shape(), values, mod_args, module_eval);
                    if(ins->get_target_id() >= ctx.size())
                        MIGRAPHX_THROW("No context available for " + op.name());
                    return op.compute(
                        ctx[ins->get_target_id()], ins->get_shape(), values, mod_args, module_eval);
                }));
        }
        assert(results.find(ins) != results.end());
        assert(is_compatible_shape(results.at(ins).get_shape(), ins->get_shape()));
    }
    return {results.at(std::prev(mod->end()))};
}

template <class F>
std::vector<argument> generic_eval(const program& p,
                                   std::vector<context>& ctx,
                                   std::unordered_map<std::string, argument> params,
                                   F trace)
{
    const module* mm = p.get_main_module();
    return generic_eval(mm, ctx, params, {}, trace);
}

std::vector<argument> program::eval_with_context(std::vector<context>& ctx,
                                                 parameter_map params) const
{
    const module* mm = this->get_main_module();
    return generic_eval(mm, ctx, std::move(params), {}, [](auto&&, auto f) { return f(); });
}

std::vector<argument> program::eval(parameter_map params, execution_environment exec_env) const
{
    auto& contexts = this->impl->contexts;

    auto trace_level = value_of(MIGRAPHX_TRACE_EVAL{});
    std::vector<argument> ret;

    if(exec_env.async)
    {
        assert(contexts.size() == 1);
        contexts.front().wait_for(exec_env.queue);
    }

    if(trace_level > 0)
    {
        std::unordered_map<instruction_ref, std::string> ins_out;
        // get instruction names
        this->print([&](auto x, auto ins_names) {
            std::stringstream ss;
            instruction::print(ss, x, ins_names);
            ins_out[x] = ss.str();
        });
        ret = generic_eval(*this, contexts, std::move(params), [&](instruction_ref ins, auto f) {
            const auto& ctx = contexts[ins->get_target_id()];
            ctx.finish();
            std::cout << "Run instruction: " << ins_out.at(ins) << std::endl;
            timer t{};
            auto result = f();
            double t1   = t.record<milliseconds>();
            ctx.finish();
            double t2 = t.record<milliseconds>();
            std::cout << "Time: " << t1 << "ms, " << t2 << "ms" << std::endl;
            if(trace_level > 1 and ins->name().front() != '@' and ins->name() != "load" and
               not result.empty())
            {
                migraphx::argument buffer;
                try
                {
                    const target& tgt = this->impl->targets.at(ins->get_target_id());
                    buffer            = tgt.copy_from(result);
                }
                catch(const migraphx::exception&)
                {
                    // instruction was run on host then no need to copy buffer from target
                    buffer = result;
                }
                catch(...)
                {
                    MIGRAPHX_THROW("MIGraphX program execution with MIGRAPHX_TRACE_EVAL failed.\n");
                }
                if(trace_level == 2)
                {
                    std::cout << "Output has " << to_string_range(classify_argument(buffer))
                              << std::endl;
                    std::cout << "Output: ";
                    preview_argument(std::cout, buffer);
                    std::cout << std::endl;
                    print_statistics(std::cout, buffer);
                }
                else
                {
                    std::cout << "Output: " << buffer << std::endl;
                }
            }
            return result;
        });
    }
    else
    {
        ret = generic_eval(*this, contexts, std::move(params), [&](auto&&, auto f) { return f(); });
    }

    if(exec_env.async)
    {
        assert(contexts.size() == 1);
        contexts.front().finish_on(exec_env.queue);
    }

    return ret;
}

void program::finish() const
{
    for(const auto& ctx : this->impl->contexts)
        ctx.finish();
}

std::string get_migraphx_version()
{
    std::stringstream ss;
    ss << std::to_string(MIGRAPHX_VERSION_MAJOR) << "." << std::to_string(MIGRAPHX_VERSION_MINOR)
       << "." << std::to_string(MIGRAPHX_VERSION_PATCH);
    return ss.str();
}

/*
program file version is for the data structure or format of the MXR file. Version should be bumped
if any changes occur to the format of the MXR file.
*/
const int program_file_version = 7;

value program::to_value() const
{
    value result;
    result["version"]          = program_file_version;
    result["migraphx_version"] = get_migraphx_version();
    result["targets"]          = migraphx::to_value(this->impl->targets);
    result["contexts"]         = migraphx::to_value(this->impl->contexts);
    value module_vals          = value::object{};
    std::unordered_map<instruction_ref, std::string> names;
    for(auto& mod : this->get_modules())
    {
        value mod_val;
        value nodes;
        mod_val["name"] = mod->name();
        names           = mod->print(
            [&](auto ins, auto ins_names) {
                value node;
                node["output"]     = ins_names.at(ins);
                node["name"]       = ins->name();
                node["shape"]      = migraphx::to_value(ins->get_shape());
                node["normalized"] = ins->is_normalized();
                if(ins->name() == "@literal")
                    node["literal"] = migraphx::to_value(ins->get_literal());
                node["operator"] = ins->get_operator().to_value();
                std::vector<std::string> inputs;
                std::transform(ins->inputs().begin(),
                               ins->inputs().end(),
                               std::back_inserter(inputs),
                               [&](auto i) {
                                   assert(contains(ins_names, i));
                                   return ins_names.at(i);
                               });
                node["inputs"]   = inputs;
                auto module_args = ins->module_inputs();
                if(not module_args.empty())
                {
                    std::vector<std::string> module_inputs;
                    std::transform(module_args.begin(),
                                   module_args.end(),
                                   std::back_inserter(module_inputs),
                                   [&](auto mod_ref) { return mod_ref->name(); });
                    node["module_inputs"] = module_inputs;
                }

                nodes.push_back(node);
            },
            names);
        mod_val["nodes"] = nodes;

        module_vals[mod->name()] = mod_val;
    }

    result["modules"] = module_vals;

    return result;
}

static void mod_from_val(module_ref mod,
                         const value& v,
                         std::unordered_map<std::string, instruction_ref>& instructions,
                         const std::unordered_map<std::string, module_ref>& map_mods)
{
    const auto& module_val = v.at(mod->name());
    for(const value& node : module_val.at("nodes"))
    {
        instruction_ref output;
        auto name       = node.at("name").to<std::string>();
        auto fields     = node.at("operator");
        auto normalized = node.at("normalized").to<bool>();

        if(name == "@param")
        {
            output = mod->insert_parameter(mod->end(),
                                           fields["parameter"].to<std::string>(),
                                           migraphx::from_value<shape>(node.at("shape")));
        }
        else if(name == "@literal")
        {
            output =
                mod->insert_literal(mod->end(), migraphx::from_value<literal>(node.at("literal")));
        }
        else
        {
            auto op = make_op(name, fields);
            std::vector<instruction_ref> inputs;
            std::transform(node.at("inputs").begin(),
                           node.at("inputs").end(),
                           std::back_inserter(inputs),
                           [&](const value& i) {
                               auto i_name = i.to<std::string>();
                               assert(contains(instructions, i_name));
                               return instructions.at(i_name);
                           });

            std::vector<module_ref> module_inputs;
            if(node.contains("module_inputs"))
            {
                std::transform(node.at("module_inputs").begin(),
                               node.at("module_inputs").end(),
                               std::back_inserter(module_inputs),
                               [&](const value& i) { return map_mods.at(i.to<std::string>()); });

                for(const auto& smod : module_inputs)
                {
                    mod_from_val(smod, v, instructions, map_mods);
                }
            }

            if(name == "@return")
            {
                output = mod->add_return(inputs);
            }
            else if(module_inputs.empty())
            {
                output = mod->insert_instruction(mod->end(), op, inputs);
            }
            else
            {
                output = mod->insert_instruction(mod->end(), op, inputs, module_inputs);
            }
        }
        output->set_normalized(normalized);
        instructions[node.at("output").to<std::string>()] = output;
    }
}

void program::from_value(const value& v)
{
    auto version = v.at("version").to<int>();
    if(version != program_file_version)
    {
        MIGRAPHX_THROW(
            "Error: Program version mismatch. MXR file was created using program file version: " +
            std::to_string(version) + ", while installed MIGraphX is using program file version: " +
            std::to_string(program_file_version) +
            ", Try regenerating MXR file using installed MIGraphX and running again.");
    }

    auto migx_version = v.at("migraphx_version").to<std::string>();
    if(migx_version != get_migraphx_version())
    {
        std::cout << "[WARNING]: MXR File was created using MIGraphX version: " << migx_version
                  << ", while installed MIGraphX is at version: " << get_migraphx_version()
                  << ", operators implementation could be mismatched.\n";
    }

    migraphx::from_value(v.at("targets"), this->impl->targets);

    for(auto i : range(this->impl->targets.size()))
    {
        this->impl->contexts.push_back(this->impl->targets[i].get_context());
        this->impl->contexts.back().from_value(v.at("contexts")[i]);
    }

    auto module_vals = v.at("modules");
    for(const auto& vv : module_vals)
    {
        const auto& name = vv.get_key();
        if(name == "main")
            continue;
        impl->modules.emplace(name, name);
    }
    std::unordered_map<std::string, module_ref> map_mods;
    std::transform(impl->modules.begin(),
                   impl->modules.end(),
                   std::inserter(map_mods, map_mods.end()),
                   [&](auto&& pp) { return std::make_pair(pp.first, &pp.second); });

    std::unordered_map<std::string, instruction_ref> map_insts;
    auto* mm = get_main_module();
    mod_from_val(mm, module_vals, map_insts, map_mods);

    // Finalize a compiled model
    if(not this->impl->contexts.empty())
        this->finalize();
}

double common_average(const std::vector<double>& v)
{
    std::size_t n = v.size() / 4;
    double total  = std::accumulate(v.begin() + n, v.end() - n, 0.0);
    return total / std::distance(v.begin() + n, v.end() - n);
}

double mean(const std::vector<double>& v)
{
    double total = std::accumulate(v.begin(), v.end(), 0.0);
    return total / v.size();
}

double median(const std::vector<double>& v)
{
    size_t mid = v.size() / 2;
    if(v.size() % 2 == 0)
    {
        return (v[mid - 1] + v[mid]) / 2.0;
    }
    else
    {
        return v[mid];
    }
}

double percentile(const std::vector<double>& v, double percentile)
{
    size_t index = (percentile * (v.size() - 1));
    return v[index];
}

std::string perf_group(instruction_ref ins, bool detailed)
{
    std::string result;
    auto attr = ins->get_operator().attributes();
    if(attr.contains("group"))
        result = attr.at("group").to<std::string>();
    else
        result = ins->get_operator().name();
    if(detailed)
    {
        result += "<" + ins->get_shape().type_string();
        result += "(" + shape::to_sizes_string(to_shapes(ins->inputs())) + ")>";
    }
    return result;
}

void program::mark(const parameter_map& params, marker m)
{
    auto& ctx = this->impl->contexts;
    // Run once by itself
    eval(params);
    this->finish();
    m.mark_start(*this);
    generic_eval(*this, ctx, params, [&](auto ins, auto f) {
        argument result;
        m.mark_start(ins);
        result = f();
        m.mark_stop(ins);
        return result;
    });
    m.mark_stop(*this);
}

void program::perf_report(
    std::ostream& os, std::size_t n, parameter_map params, std::size_t batch, bool detailed) const
{
    auto& ctx = this->impl->contexts;
    // Run once by itself
    eval(params);
    this->finish();
    // Run and time entire program
    std::vector<double> total_vec;
    total_vec.reserve(n);
    for(std::size_t i = 0; i < n; i++)
    {
        total_vec.push_back(time<milliseconds>([&] {
            eval(params);
            this->finish();
        }));
    }
    std::sort(total_vec.begin(), total_vec.end());
    std::unordered_map<instruction_ref, std::vector<double>> ins_vec;
    // Fill the map
    generic_eval(*this, ctx, params, [&](auto ins, auto) {
        ins_vec[ins].reserve(n);
        return argument{ins->get_shape(), nullptr};
    });

    // Run and time each instruction
    for(std::size_t i = 0; i < n; i++)
    {
        generic_eval(*this, ctx, params, [&](auto ins, auto f) {
            argument result;
            ins_vec[ins].push_back(time<milliseconds>([&] {
                result = f();
                this->impl->contexts[ins->get_target_id()].finish();
            }));
            return result;
        });
    }
    for(auto&& p : ins_vec)
        std::sort(p.second.begin(), p.second.end());
    // Run and time implicit overhead
    std::vector<double> overhead_vec;
    overhead_vec.reserve(n);
    for(std::size_t i = 0; i < n; i++)
    {
        overhead_vec.push_back(time<milliseconds>([&] { dry_run(params); }));
    }
    double total_time             = common_average(total_vec);
    double min_time               = total_vec.front();
    double max_time               = total_vec.back();
    double mean_time              = mean(total_vec);
    double median_time            = median(total_vec);
    double percentile_90_time     = percentile(total_vec, 0.90);
    double percentile_95_time     = percentile(total_vec, 0.95);
    double percentile_99_time     = percentile(total_vec, 0.99);
    double rate                   = 1000.0 / total_time;
    double overhead_time          = common_average(overhead_vec);
    double overhead_percent       = overhead_time * 100.0 / total_time;
    double total_instruction_time = 0.0;
    std::unordered_map<std::string, double> op_times;
    std::unordered_map<std::string, std::size_t> op_n;
    for(auto&& p : ins_vec)
    {
        double avg = common_average(p.second);
        op_times[perf_group(p.first, detailed)] += avg;
        total_instruction_time += avg;
        op_n[perf_group(p.first, detailed)]++;
    }
    double calculate_overhead_time    = total_time - total_instruction_time;
    double calculate_overhead_percent = calculate_overhead_time * 100.0 / total_time;

    std::unordered_map<instruction_ref, std::string> names;
    this->print(names, [&](auto ins, auto ins_names) {
        instruction::print(std::cout, ins, ins_names);

        // skip return instruction
        if(ins->name() == "@return")
            return;

        double avg     = common_average(ins_vec[ins]);
        double percent = std::ceil(100.0 * avg / total_instruction_time);
        os << ": " << avg << "ms, " << percent << "%";
        os << std::endl;
    });

    os << std::endl;
    os << "Summary:" << std::endl;
    std::vector<std::tuple<double, std::size_t, std::string>> op_times_sorted;
    std::transform(
        op_times.begin(), op_times.end(), std::back_inserter(op_times_sorted), [&](auto p) {
            auto&& name = p.first;
            return std::make_tuple(p.second, op_n.at(name), name);
        });
    std::sort(op_times_sorted.begin(), op_times_sorted.end(), std::greater<>{});
    for(auto&& [avg, nn, name] : op_times_sorted)
    {
        double percent = std::ceil(100.0 * avg / total_instruction_time);
        double per_ins = avg / nn;
        os << name << ": " << avg << "ms / " << nn << " = " << per_ins << "ms, " << percent << "%"
           << std::endl;
    }

    os << std::endl;

    os << "Batch size: " << batch << std::endl;
    os << "Rate: " << rate * batch << " inferences/sec" << std::endl;
    os << "Total time: " << total_time << "ms ";
    os << "(Min: " << min_time << "ms, ";
    os << "Max: " << max_time << "ms, ";
    os << "Mean: " << mean_time << "ms, ";
    os << "Median: " << median_time << "ms)" << std::endl;
    os << "Percentiles (90%, 95%, 99%): (";
    os << percentile_90_time << "ms, " << percentile_95_time << "ms, " << percentile_99_time
       << "ms)" << std::endl;
    os << "Total instructions time: " << total_instruction_time << "ms" << std::endl;
    os << "Overhead time: " << overhead_time << "ms"
       << ", " << calculate_overhead_time << "ms" << std::endl;
    os << "Overhead: " << std::round(overhead_percent) << "%"
       << ", " << std::round(calculate_overhead_percent) << "%" << std::endl;
}

void program::debug_print() const { std::cout << *this << std::endl; }
void program::debug_print(instruction_ref ins) const
{
    std::unordered_map<instruction_ref, std::string> names;
    if(std::any_of(this->impl->modules.begin(), this->impl->modules.end(), [&](const auto& pp) {
           return is_end(pp.second.end(), ins);
       }))
    {
        std::cout << "End instruction" << std::endl;
        return;
    }
    else if(std::none_of(this->impl->modules.begin(),
                         this->impl->modules.end(),
                         [&](const auto& pp) { return pp.second.has_instruction(ins); }))
    {
        std::cout << "Instruction not part of program" << std::endl;
        return;
    }

    this->print(names, [&](auto x, auto ins_names) {
        if(x == ins)
        {
            instruction::print(std::cout, x, ins_names);
            std::cout << std::endl;
        }
    });
}

void program::print(
    std::unordered_map<instruction_ref, std::string>& names,
    const std::function<void(instruction_ref, std::unordered_map<instruction_ref, std::string>)>&
        print_func) const
{
    for(const auto& pp : this->impl->modules)
    {
        names = pp.second.print(print_func, names);
    }
}

void program::print(
    const std::function<void(instruction_ref ins,
                             std::unordered_map<instruction_ref, std::string>)>& print_func) const
{
    std::unordered_map<instruction_ref, std::string> names;
    this->print(names, print_func);
}

void program::print_graph(std::ostream& os, bool brief) const
{
    const auto* mm = this->get_main_module();
    mm->print_graph(os, brief);
}

void program::print_py(std::ostream& os) const
{
    auto vec_modules = this->get_modules();
    std::unordered_map<instruction_ref, std::string> names;
    os << "p = migraphx.program()\n";
    for(auto& mod : vec_modules)
    {
        std::string var_name = "m";
        if(mod->name() != "main")
            var_name += mod->name();
        os << var_name << " = ";
        if(mod->name() == "main")
            os << "p.get_main_module()";
        else
            os << "p.create_module(\"" << mod->name() << "\");";
        os << std::endl;
        names = mod->print_py(os, var_name, names);
        os << std::endl;
    }
}

void program::print_cpp(std::ostream& os) const
{
    auto vec_modules = this->get_modules();
    std::unordered_map<instruction_ref, std::string> names;
    os << "migraphx::program p;\n";
    for(auto& mod : vec_modules)
    {
        std::string var_name = "m" + mod->name();
        os << "migraphx::module_ref " << var_name << " = ";
        if(mod->name() == "main")
            os << "p.get_main_module();";
        else
            os << "p.create_module(\"" << mod->name() << "\");";
        os << std::endl;
        names = mod->print_cpp(os, var_name, names);
        os << std::endl;
    }
}

void program::dry_run(std::unordered_map<std::string, argument> params) const
{
    auto& ctx = this->impl->contexts;
    generic_eval(*this, ctx, std::move(params), [](auto ins, auto&&...) {
        return argument{ins->get_shape(), nullptr};
    });
}

void program::annotate(std::ostream& os, const std::function<void(instruction_ref)>& a) const
{
    for(auto& pp : this->impl->modules)
    {
        std::cout << pp.first << ":" << std::endl;
        pp.second.annotate(os, a);
    }
}

const module* program::get_module(const std::string& name) const { return &impl->modules.at(name); }

module* program::create_module(const std::string& name)
{

    assert(not contains(impl->modules, name));
    auto r = impl->modules.emplace(name, name);
    return &(r.first->second);
}

module* program::create_module(const std::string& name, module m)
{
    assert(not contains(impl->modules, name));
    m.set_name(name);
    auto r = impl->modules.emplace(name, std::move(m));
    return &(r.first->second);
}

module* program::get_module(const std::string& name) { return &impl->modules.at(name); }

module* program::get_main_module() { return get_module("main"); }

const module* program::get_main_module() const { return get_module("main"); }

template <class T>
std::vector<T*> generic_get_modules(T* mm)
{
    std::vector<T*> vec_modules;
    vec_modules.push_back(mm);
    auto sub_modules = mm->get_sub_modules();
    vec_modules.insert(vec_modules.end(), sub_modules.begin(), sub_modules.end());
    return vec_modules;
}

template <class Map, class T, class OutputIterator>
void generic_get_unused_modules(Map& m, const std::vector<T*>& mods, OutputIterator out)
{
    std::unordered_set<std::string> used;
    std::transform(mods.begin(), mods.end(), std::inserter(used, used.end()), [](auto&& mod) {
        return mod->name();
    });
    transform_if(
        m.begin(),
        m.end(),
        out,
        [&](auto&& pp) { return not contains(used, pp.first); },
        [](auto&& pp) { return &pp.second; });
}

std::vector<const module*> program::get_modules() const
{
    auto result = generic_get_modules(this->get_main_module());
    generic_get_unused_modules(impl->modules, result, std::back_inserter(result));
    return result;
}

std::vector<module*> program::get_modules()
{
    auto result = generic_get_modules(this->get_main_module());
    generic_get_unused_modules(impl->modules, result, std::back_inserter(result));
    return result;
}

template <class Module, class Map>
void generic_insert_module_tree(Module* pm, Map& m)
{
    for(auto* sm : pm->get_sub_modules(true))
    {
        m.insert(std::make_pair(sm, pm));
        generic_insert_module_tree(sm, m);
    }
}

std::unordered_multimap<module_ref, module_ref> program::get_module_tree()
{
    std::unordered_multimap<module_ref, module_ref> result;
    generic_insert_module_tree(this->get_main_module(), result);
    return result;
}

template <class Map, class T>
bool is_unused_module(Map& m, const std::vector<T*>& mods, const std::string& name)
{
    bool is_unused = false;
    generic_get_unused_modules(m, mods, make_function_output_iterator([&](auto* mod) {
                                   if(mod->name() == name)
                                       is_unused = true;
                               }));
    return is_unused;
}

template <class Map>
bool references_instruction(Map& m, const instruction& ins, const std::string& name)
{
    return std::any_of(m.begin(), m.end(), [&](auto&& p) {
        if(p.first == name)
            return false;
        return std::any_of(p.second.begin(), p.second.end(), [&](auto&& i) {
            return std::any_of(i.inputs().begin(), i.inputs().end(), [&](auto&& j) {
                return std::addressof(*j) == std::addressof(ins);
            });
        });
    });
}

void program::remove_module(const std::string& name)
{
    // cppcheck-suppress assertWithSideEffect
    assert(is_unused_module(impl->modules, generic_get_modules(this->get_main_module()), name) and
           "Module used in program");
    assert(std::none_of(
               impl->modules.at(name).begin(),
               impl->modules.at(name).end(),
               [&](auto&& ins) { return references_instruction(impl->modules, ins, name); }) and
           "Instruction referenced in another module");

    // if an instruction has an input out side of the current module, need to remove
    // the instruction from its input's outputs
    auto& mod = impl->modules.at(name);
    for(auto ins : iterator_for(mod))
    {
        auto inputs = ins->inputs();
        for(auto in : inputs)
        {
            if(not mod.has_instruction(in))
            {
                in->remove_output(ins);
            }
        }
    }

    impl->modules.erase(name);
}

void program::rename_module(const std::string& old_name, const std::string& new_name)
{
    assert(old_name != new_name);
    assert(contains(impl->modules, old_name));
    assert(not contains(impl->modules, new_name));
    auto node  = impl->modules.extract(old_name);
    node.key() = new_name;
    node.mapped().set_name(new_name);
    impl->modules.insert(std::move(node));
}

void program::remove_unused_modules()
{
    std::vector<module*> unused;
    generic_get_unused_modules(
        impl->modules, generic_get_modules(this->get_main_module()), std::back_inserter(unused));
    for(const auto* m : unused)
        this->remove_module(m->name());
}

program& program::sort()
{
    std::queue<migraphx::module_ref> mqueue;
    mqueue.push(get_main_module());
    while(not mqueue.empty())
    {
        module_ref current_mod = mqueue.front();
        current_mod->sort();
        mqueue.pop();
        auto child_mods = current_mod->get_sub_modules(true);
        for(auto& sub_mod : child_mods)
        {
            mqueue.push(sub_mod);
        }
    }
    return *this;
}

bool operator==(const program& x, const program& y) { return to_string(x) == to_string(y); }

std::ostream& operator<<(std::ostream& os, const program& p)
{
    auto vec_modules = p.get_modules();
    std::unordered_map<instruction_ref, std::string> names;
    for(auto& mod : vec_modules)
    {
        os << "module: \"" << mod->name() << "\"" << std::endl;
        names = mod->print(
            [&](auto ins, auto ins_names) {
                instruction::print(os, ins, ins_names);
                os << std::endl;
            },
            names);
        os << std::endl;
    }

    return os;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
