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
#include <iterator>
#include <migraphx/algorithm.hpp>
#include <migraphx/module.hpp>
#include <migraphx/bit_signal.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/target.hpp>
#include <migraphx/env.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/time.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/iterator.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/param_utils.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/json.hpp>
#include <migraphx/fp8_types.hpp>
#include <iostream>
#include <sstream>
#include <algorithm>
#include <array>
#include <set>
#include <utility>
#include <unordered_set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_FINALIZE)

struct module_impl
{
    // A list is used to keep references to an instruction stable
    std::list<instruction> instructions;
    std::unordered_set<instruction*> instruction_set;
    std::string name;
    uint32_t nparams = 0;
    bool bypass      = false;
    bit_signal<64> changed{};

    bool contains(instruction_ref ins) const
    {
        if(is_end(ins, instructions.end()))
            return false;
        return instruction_set.count(std::addressof(*ins)) > 0;
    }

    template <class... Ts>
    instruction_ref emplace(instruction_ref pos, Ts&&... xs)
    {
        changed.notify();
        // cppcheck-suppress redundantInitialization
        auto r = instructions.emplace(pos, std::forward<Ts>(xs)...);
        instruction_set.insert(std::addressof(*r));
        return r;
    }
    instruction_ref insert(instruction_ref pos, const instruction& ins)
    {
        changed.notify();
        return emplace(pos, ins);
    }

    void clear()
    {
        changed.notify();
        instructions.clear();
        instruction_set.clear();
        nparams = 0;
    }

    void push_front(const instruction& ins) { insert(instructions.begin(), ins); }

    void push_back(const instruction& ins) { insert(instructions.end(), ins); }

    template <class... Ts>
    void emplace_front(Ts&&... xs)
    {
        emplace(instructions.begin(), std::forward<Ts>(xs)...);
    }

    template <class... Ts>
    void emplace_back(Ts&&... xs)
    {
        emplace(instructions.end(), std::forward<Ts>(xs)...);
    }

    instruction_ref erase(instruction_ref pos)
    {
        changed.notify();
        instruction_set.erase(std::addressof(*pos));
        return instructions.erase(pos);
    }

    instruction_ref erase(instruction_ref start, instruction_ref last)
    {
        changed.notify();
        std::for_each(start, last, [&](auto& ins) { instruction_set.erase(std::addressof(ins)); });
        return instructions.erase(start, last);
    }
};

const operation& get_operation(instruction_ref ins) { return ins->get_operator(); }

module::module(const std::string& name) : impl(std::make_unique<module_impl>())
{
    impl->name = name;
}

module::module(module&&) noexcept = default;
module::~module() noexcept        = default;

// copy constructor
module::module(const module& m) { assign(m); }

// copy assignment operator
module& module::operator=(module m)
{
    std::swap(m.impl, this->impl);
    return *this;
}

std::string module::name() const { return impl->name; }

void module::set_name(const std::string& name) { impl->name = name; }

bool module::bypass() const { return impl->bypass; }
void module::set_bypass(bool b) { impl->bypass = b; }

void module::assign(const module& m)
{
    // copy the impl
    if(not impl)
        impl = std::make_unique<module_impl>();
    *impl = *m.impl;

    // clear instructions
    if(not impl->instructions.empty())
    {
        impl->clear();
    }

    std::unordered_map<instruction_ref, instruction_ref> ins_map;
    for(auto ins : iterator_for(m))
    {
        instruction_ref copy_ins{};
        if(ins->name() == "@literal")
        {
            auto l   = ins->get_literal();
            copy_ins = impl->insert(impl->instructions.end(), instruction{l});
        }
        else if(ins->name() == "@param")
        {
            auto&& name = any_cast<builtin::param>(ins->get_operator()).parameter;
            auto order  = any_cast<builtin::param>(ins->get_operator()).order;
            auto s      = ins->get_shape();
            copy_ins    = impl->insert(impl->instructions.end(),
                                    {builtin::param{name, order}, std::move(s), {}});
            impl->nparams++;
        }
        else if(ins->name() == "@outline")
        {
            auto s   = ins->get_shape();
            copy_ins = impl->insert(impl->instructions.end(), {builtin::outline{s}, s, {}});
        }
        else
        {
            // if there are sub_module inputs, need to make a copy of the submodule
            auto module_args = ins->module_inputs();
            // retrieve its mapped input
            auto inputs = ins->inputs();
            std::vector<instruction_ref> copy_inputs(inputs.size());
            std::transform(inputs.begin(), inputs.end(), copy_inputs.begin(), [&](auto i) {
                return contains(ins_map, i) ? ins_map[i] : i;
            });
            if(ins->name() == "@return")
            {
                copy_ins = add_return(copy_inputs);
            }
            else
            {
                copy_ins = add_instruction(ins->get_operator(), copy_inputs, module_args);
            }
        }

        ins_map[ins] = copy_ins;
    }
}

template <class Range, class Inserter>
static std::vector<instruction_ref>
insert_generic_instructions_impl(module& m,
                                 instruction_ref ins,
                                 Range&& instructions,
                                 std::unordered_map<instruction_ref, instruction_ref>& map_ins,
                                 Inserter insert)
{
    assert(m.has_instruction(ins) or is_end(ins, m.end()));
    std::vector<instruction_ref> mod_outputs;
    instruction_ref last;
    for(instruction_ref sins : instructions)
    {
        last = sins;
        if(contains(map_ins, sins))
            continue;
        instruction_ref copy_ins;
        if(sins->name() == "@literal")
        {
            auto l   = sins->get_literal();
            copy_ins = m.add_literal(l);
        }
        else if(sins->name() == "@param")
        {
            auto&& name = any_cast<builtin::param>(sins->get_operator()).parameter;
            auto s      = sins->get_shape();
            copy_ins    = m.add_parameter(name, s);
        }
        else if(sins->name() == "@outline")
        {
            auto s   = sins->get_shape();
            copy_ins = m.add_outline(s);
        }
        else
        {
            auto mod_args = sins->module_inputs();
            auto inputs   = sins->inputs();
            std::vector<instruction_ref> copy_inputs(inputs.size());
            std::transform(inputs.begin(), inputs.end(), copy_inputs.begin(), [&](auto i) {
                return contains(map_ins, i) ? map_ins[i] : i;
            });

            if(sins->name() == "@return")
            {
                mod_outputs = copy_inputs;
                break;
            }

            copy_ins = insert(m, ins, sins->get_operator(), copy_inputs, mod_args);
        }
        map_ins[sins] = copy_ins;
    }
    if(mod_outputs.empty() and instructions.begin() != instructions.end())
        mod_outputs = {map_ins.at(last)};
    return mod_outputs;
}

template <class Range>
static std::vector<instruction_ref>
insert_generic_instructions(module& m,
                            instruction_ref ins,
                            Range&& instructions,
                            std::unordered_map<instruction_ref, instruction_ref>& map_ins,
                            module::inserter insert)
{
    if(insert == nullptr)
        return insert_generic_instructions_impl(
            m, ins, static_cast<Range&&>(instructions), map_ins, [](module& mm, auto&&... xs) {
                return mm.insert_instruction(std::forward<decltype(xs)>(xs)...);
            });
    return insert_generic_instructions_impl(
        m, ins, static_cast<Range&&>(instructions), map_ins, insert);
}

instruction_ref module::add_instruction(const operation& op, std::vector<instruction_ref> args)
{
    return insert_instruction(impl->instructions.end(), op, std::move(args));
}
instruction_ref module::insert_instruction(instruction_ref ins,
                                           const operation& op,
                                           std::vector<instruction_ref> args)
{
    assert(has_instruction(ins) or is_end(ins, this->end()));
    assert(not starts_with(op.name(), "@"));
    shape r     = compute_shape(op, args);
    auto result = impl->insert(ins, {op, r, std::move(args)});
    instruction::backreference(result);
    assert(result->valid(begin()));
    return result;
}

instruction_ref module::add_instruction(const operation& op,
                                        std::vector<instruction_ref> args,
                                        std::vector<module_ref> module_args)
{
    return insert_instruction(
        impl->instructions.end(), op, std::move(args), std::move(module_args));
}

instruction_ref module::insert_instruction(instruction_ref ins,
                                           const operation& op,
                                           std::vector<instruction_ref> args,
                                           std::vector<module_ref> module_args)
{
    assert(has_instruction(ins) or is_end(ins, this->end()));
    assert(not starts_with(op.name(), "@"));
    auto out_shape = compute_shape(op, args, module_args);
    auto result    = impl->insert(ins, {op, out_shape, std::move(args), std::move(module_args)});
    instruction::backreference(result);
    assert(result->valid(begin()));
    return result;
}

instruction_ref module::replace_instruction(instruction_ref ins,
                                            const operation& op,
                                            std::vector<instruction_ref> args) MIGRAPHX_TIDY_CONST
{
    impl->changed.notify();
    assert(has_instruction(ins));
    assert(not starts_with(op.name(), "@"));

    shape r = compute_shape(op, args);
    instruction::replace(ins, op, r, std::move(args));
    assert(ins->valid(begin()));
    return ins;
}

instruction_ref module::replace_instruction(instruction_ref ins,
                                            const operation& op,
                                            std::vector<instruction_ref> args,
                                            std::vector<module_ref> module_args) MIGRAPHX_TIDY_CONST
{
    impl->changed.notify();
    assert(has_instruction(ins));
    assert(not starts_with(op.name(), "@"));
    auto out_shape = compute_shape(op, args, module_args);
    instruction::replace(ins, op, out_shape, std::move(args), std::move(module_args));
    assert(ins->valid(begin()));
    return ins;
}

instruction_ref module::replace_instruction(instruction_ref ins, instruction_ref rep)
{
    impl->changed.notify();
    assert(has_instruction(ins));
    assert(ins != rep);

    if(ins == std::prev(this->end()))
    {
        // "rep" instruction could be used earlier in the program and moving it at the end
        // may cause invalid program, therefore make an identity operation in this case.
        return replace_instruction(ins, make_op("identity"), rep);
    }

    // TODO: Should it be an error if the output is empty?
    if(ins->outputs().empty())
    {
        return rep;
    }
    // Make a copy of outputs which can be changed when calling replace_argument
    auto outputs = ins->outputs();
    for(auto out : outputs)
    {
        // TODO: Check for possible cycles
        if(out != rep)
        {
            instruction::replace_argument(out, ins, rep);
        }
        assert(out->valid(begin()));
    }
    // Replacement should not be dead code unless its the last instruction
    assert(not rep->outputs().empty() or rep == std::prev(end()));
    // Output of the original instruction should only be the replacement or empty
    assert(ins->outputs().empty() or std::all_of(ins->outputs().begin(),
                                                 ins->outputs().end(),
                                                 [&](auto i) { return i == rep; }));
    assert(ins->valid(begin()));
    assert(rep->valid(begin()));
    return rep;
}

instruction_ref module::remove_instruction(instruction_ref ins)
{
    assert(has_instruction(ins));
    assert(ins->outputs().empty());
    ins->clear_arguments();
    return impl->erase(ins);
}

instruction_ref module::remove_instructions(instruction_ref first, instruction_ref last)
{
    if(first == last)
        return first;
    // TODO: Check every element
    assert(has_instruction(first));
    std::for_each(first, last, [&](instruction& ins) { ins.clear_arguments(); });
    assert(std::all_of(first, last, [&](const instruction& ins) { return ins.outputs().empty(); }));
    return impl->erase(first, last);
}

instruction_ref module::move_instruction(instruction_ref src, instruction_ref dst)
{
    impl->changed.notify();
    assert(has_instruction(src));
    assert(has_instruction(dst) or is_end(dst, this->end()));
    impl->instructions.splice(dst, impl->instructions, src);
    return src;
}

instruction_ref module::move_instructions(instruction_ref src, instruction_ref dst)
{
    for(auto ins : src->inputs())
    {
        if(not contains(this->impl->instructions, ins))
            continue;
        this->move_instructions(ins, dst);
    }
    this->move_instruction(src, dst);
    return src;
}

std::vector<instruction_ref>
module::add_instructions(const std::vector<instruction_ref>& instructions,
                         std::unordered_map<instruction_ref, instruction_ref>* map_ins,
                         module::inserter insert)
{
    return this->insert_instructions(this->end(), instructions, map_ins, std::move(insert));
}

std::vector<instruction_ref>
module::add_instructions(const_module_ref m,
                         std::unordered_map<instruction_ref, instruction_ref>* map_ins,
                         module::inserter insert)
{
    return this->insert_instructions(this->end(), m, map_ins, std::move(insert));
}

std::vector<instruction_ref>
module::add_instructions(instruction_ref start,
                         instruction_ref last,
                         std::unordered_map<instruction_ref, instruction_ref>* map_ins,
                         module::inserter insert)
{
    return this->insert_instructions(this->end(), start, last, map_ins, std::move(insert));
}

std::vector<instruction_ref>
module::insert_instructions(instruction_ref ins,
                            const std::vector<instruction_ref>& instructions,
                            std::unordered_map<instruction_ref, instruction_ref>* map_ins,
                            module::inserter insert)
{
    std::unordered_map<instruction_ref, instruction_ref> default_map_ins;
    return insert_generic_instructions(*this,
                                       ins,
                                       instructions,
                                       map_ins == nullptr ? default_map_ins : *map_ins,
                                       std::move(insert));
}

std::vector<instruction_ref>
module::insert_instructions(instruction_ref ins,
                            const_module_ref m,
                            std::unordered_map<instruction_ref, instruction_ref>* map_ins,
                            module::inserter insert)
{
    std::unordered_map<instruction_ref, instruction_ref> default_map_ins;
    return insert_generic_instructions(*this,
                                       ins,
                                       iterator_for(*m),
                                       map_ins == nullptr ? default_map_ins : *map_ins,
                                       std::move(insert));
}

std::vector<instruction_ref>
module::insert_instructions(instruction_ref ins,
                            instruction_ref start,
                            instruction_ref last,
                            std::unordered_map<instruction_ref, instruction_ref>* map_ins,
                            module::inserter insert)
{
    auto r = range(start, last);
    std::unordered_map<instruction_ref, instruction_ref> default_map_ins;
    return insert_generic_instructions(*this,
                                       ins,
                                       iterator_for(r),
                                       map_ins == nullptr ? default_map_ins : *map_ins,
                                       std::move(insert));
}

instruction_ref module::add_literal(literal l) { return insert_literal(begin(), std::move(l)); }

instruction_ref module::add_outline(const shape& s)
{
    impl->push_front({builtin::outline{s}, s, {}});
    return impl->instructions.begin();
}

instruction_ref module::add_parameter(std::string name, shape s)
{
    return insert_parameter(begin(), std::move(name), std::move(s));
}

instruction_ref module::add_return(std::vector<instruction_ref> args)
{
    shape instr_shape = compute_shape(builtin::returns{}, args);
    impl->push_back({builtin::returns{}, instr_shape, std::move(args)});
    auto result = std::prev(impl->instructions.end());
    instruction::backreference(result);
    assert(result->valid(begin()));
    return result;
}

instruction_ref module::insert_literal(instruction_ref ins, literal l)
{
    impl->emplace(ins, std::move(l));
    return std::prev(ins);
}

instruction_ref module::insert_parameter(instruction_ref ins, std::string name, shape s)
{
    assert(get_parameter_shape(name) == shape{});
    impl->insert(ins, {builtin::param{std::move(name), impl->nparams}, std::move(s), {}});
    impl->nparams++;
    return std::prev(ins);
}

instruction_ref module::replace_return(std::vector<instruction_ref> args)
{
    impl->changed.notify();
    auto last = std::prev(this->end());
    // If there is no return then add a return
    if(last->name() != "@return")
        return this->add_return(args);

    shape r = compute_shape(last->get_operator(), args);
    instruction::replace(last, last->get_operator(), r, std::move(args));
    assert(last->valid(begin()));

    return last;
}

shape module::get_parameter_shape(std::string name) const
{
    auto ins = std::find_if(
        impl->instructions.begin(), impl->instructions.end(), [&](const instruction& x) {
            if(x.name() == "@param")
            {
                return any_cast<builtin::param>(x.get_operator()).parameter == name;
            }
            else
            {
                return false;
            }
        });
    if(ins != this->end())
        return ins->get_shape();
    else
        return {};
}

std::vector<std::string> module::get_parameter_names() const
{
    std::vector<std::string> result;
    std::vector<builtin::param> params;
    for(auto&& ins : impl->instructions)
    {
        if(ins.name() == "@param")
        {
            auto&& param = any_cast<builtin::param>(ins.get_operator());
            params.push_back(param);
        }
    }
    std::stable_sort(
        params.begin(), params.end(), by(std::less<>{}, [](auto&& p) { return p.order; }));
    std::transform(params.begin(), params.end(), std::back_inserter(result), [&](auto&& p) {
        return p.parameter;
    });
    return result;
}

instruction_ref module::get_parameter(std::string name) const
{
    auto ins = std::find_if(
        impl->instructions.begin(), impl->instructions.end(), [&](const instruction& x) {
            if(x.name() == "@param")
            {
                return any_cast<builtin::param>(x.get_operator()).parameter == name;
            }
            else
            {
                return false;
            }
        });
    if(ins != this->end())
        return ins;
    else
        return this->end();
}

std::vector<instruction_ref> module::get_parameters() const
{
    std::vector<instruction_ref> result;
    auto refs = iterator_for(*this);
    std::copy_if(refs.begin(), refs.end(), std::back_inserter(result), [&](instruction_ref ins) {
        return ins->name() == "@param";
    });
    return result;
}

void module::rename_parameter(instruction_ref ins, const std::string& name)
{
    impl->changed.notify();
    assert(ins->name() == "@param");
    auto op      = any_cast<builtin::param>(ins->get_operator());
    op.parameter = name;
    auto outputs = ins->outputs();
    *ins         = instruction{op, ins->get_shape(), {}};
    for(auto output : outputs)
        ins->add_output(output);
}

std::unordered_map<std::string, shape> module::get_parameter_shapes() const
{
    std::unordered_map<std::string, shape> result;
    for(auto&& ins : impl->instructions)
    {
        if(ins.name() == "@param")
        {
            auto&& name  = any_cast<builtin::param>(ins.get_operator()).parameter;
            result[name] = ins.get_shape();
        }
    }
    return result;
}

bool module::has_instruction(instruction_ref ins) const { return impl->contains(ins); }

std::size_t module::size() const { return impl->instructions.size(); }
instruction_ref module::begin() const { return impl->instructions.begin(); }
instruction_ref module::end() const { return impl->instructions.end(); }

std::vector<shape> module::get_output_shapes() const
{
    if(impl->instructions.empty())
        return {};
    auto last_ins = impl->instructions.back();
    if(last_ins.name() == "@return")
    {
        const auto& output_ins = last_ins.inputs();
        std::vector<shape> output_shapes;
        std::transform(output_ins.begin(),
                       output_ins.end(),
                       std::back_inserter(output_shapes),
                       [](auto& ins) { return ins->get_shape(); });

        return output_shapes;
    }
    // The else branch is to provide backward compatibility
    else
    {
        return {last_ins.get_shape()};
    }
}

std::vector<shape> module::compute_shapes(const std::vector<shape>& inputs,
                                          compute_shapes_options options) const
{
    auto params = this->get_parameter_names();
    std::sort(params.begin(), params.end());
    std::unordered_map<instruction_ref, shape> ins_shapes;
    std::unordered_map<std::string, shape> adjusted_param_shapes;
    std::transform(inputs.begin(),
                   inputs.end(),
                   params.begin(),
                   std::inserter(adjusted_param_shapes, adjusted_param_shapes.end()),
                   [](auto ps, auto name) { return std::make_pair(name, ps); });
    for(auto ins : iterator_for(*this))
    {
        if(ins->name() == "@param")
        {
            ins_shapes[ins] =
                adjusted_param_shapes[any_cast<builtin::param>(ins->get_operator()).parameter];
            if(options.strict_type and ins->get_shape().type() != ins_shapes[ins].type())
            {
                MIGRAPHX_THROW(options.name + ": Mismatched type: expected " +
                               ins->get_shape().type_string() + " but passed " +
                               ins_shapes[ins].type_string());
            }
            if(options.strict_lens and ins->get_shape().lens() != ins_shapes[ins].lens())
            {
                MIGRAPHX_THROW(options.name + ": Mismatched lens: expected {" +
                               to_string_range(ins->get_shape().lens()) + "} but passed {" +
                               to_string_range(ins_shapes[ins].lens()) + "}");
            }
        }
        else if(ins->name() == "@literal")
        {
            if(not options.scalar_const_out_lens.empty() and ins->get_shape().scalar())
            {
                std::vector<std::size_t> strides(options.scalar_const_out_lens.size());
                ins_shapes[ins] =
                    shape{ins->get_shape().type(), options.scalar_const_out_lens, strides};
            }
            else
            {
                ins_shapes[ins] = ins->get_shape();
            }
        }
        else
        {
            std::vector<shape> input_shapes;
            input_shapes.resize(ins->inputs().size());
            std::transform(ins->inputs().begin(),
                           ins->inputs().end(),
                           input_shapes.begin(),
                           [&](auto in) { return ins_shapes.at(in); });
            if(ins->name() == "@return")
                return input_shapes;
            ins_shapes[ins] = ins->get_operator().compute_shape(input_shapes, ins->module_inputs());
        }
    }
    MIGRAPHX_THROW("No return found in the submodule");
}

std::vector<shape> module::compute_shapes(const std::vector<shape>& inputs) const
{
    return compute_shapes(inputs, {});
}

std::vector<instruction_ref> module::get_returns() const
{
    auto last = std::prev(this->end());
    if(last->name() == "@return")
        return last->inputs();
    return {last};
}

instruction_ref module::validate() const
{
    return std::find_if(
        impl->instructions.begin(), impl->instructions.end(), [&](const instruction& i) {
            auto inputs      = i.inputs();
            bool check_order = std::all_of(
                inputs.begin(), inputs.end(), [&](auto in) { return has_instruction(in); });
            return not i.valid(impl->instructions.begin(), check_order);
        });
}

bool is_borrowed(instruction_ref ins)
{
    auto alias = instruction::get_output_alias(ins, true);
    if(alias == ins)
        return false;
    lifetime l = alias->get_operator().get_lifetime();
    if(l == lifetime::borrow)
        return true;
    return is_borrowed(alias);
}

bool is_global(instruction_ref ins)
{
    const auto& op = instruction::get_output_alias(ins)->get_operator();
    return op.name() == "@param" or op.get_lifetime() == lifetime::global;
}

bool is_dangling(instruction_ref ins) { return not is_global(ins) and is_borrowed(ins); }

instruction_ref module::find_dangling_reference() const
{
    auto last = std::prev(end());
    if(last->name() == "@return")
    {
        auto dangling = std::find_if(
            last->inputs().begin(), last->inputs().end(), [](auto x) { return is_dangling(x); });
        if(dangling != last->inputs().end())
            return *dangling;
    }
    else if(is_dangling(last))
    {
        return last;
    }
    return end();
}

void module::finalize(std::vector<context>& contexts)
{
    assert(not contexts.empty());
    const bool trace = enabled(MIGRAPHX_TRACE_FINALIZE{});
    for(auto ins : iterator_for(*this))
    {
        if(trace)
        {
            std::cout << "Finalize: ";
            this->debug_print(ins);
        }
        ins->finalize(contexts[ins->get_target_id()]);
        for(const auto& smod : ins->module_inputs())
        {
            smod->finalize(contexts);
        }
    }

    // Warn when an instruction is not normalized
    auto ins = std::find_if(begin(), end(), [](auto& i) { return i.need_normalization(); });
    if(ins != end())
        std::cerr << "WARNING: Instruction needs normalization, performance may be affected."
                  << std::endl;
}

std::unordered_map<instruction_ref, instruction_ref>
module::get_ins_param_map(const std::vector<instruction_ref>& inputs, bool reverse) const
{
    std::unordered_map<instruction_ref, instruction_ref> result;
    auto params = this->get_parameters();
    assert(params.size() == inputs.size());
    sort_params(params);
    if(reverse)
    {
        std::transform(
            params.begin(),
            params.end(),
            inputs.begin(),
            std::inserter(result, result.end()),
            [&](instruction_ref param, auto input) { return std::make_pair(param, input); });
    }
    else
    {
        std::transform(
            params.begin(),
            params.end(),
            inputs.begin(),
            std::inserter(result, result.end()),
            [&](instruction_ref param, auto input) { return std::make_pair(input, param); });
    }
    return result;
}

std::vector<instruction_ref>
module::get_inputs(const std::unordered_map<instruction_ref, instruction_ref>& map_ins) const
{
    std::vector<instruction_ref> inputs;
    auto params = this->get_parameters();
    sort_params(params);

    std::transform(params.begin(),
                   params.end(),
                   std::back_inserter(inputs),
                   [&](instruction_ref param) { return map_ins.at(param); });

    return inputs;
}

static std::vector<instruction_ref>
select_params(const std::vector<instruction_ref>& instructions,
              const std::unordered_map<instruction_ref, instruction_ref>& param_map)
{
    std::vector<instruction_ref> result;
    std::vector<instruction_ref> params;
    std::copy_if(instructions.begin(),
                 instructions.end(),
                 std::back_inserter(params),
                 [&](instruction_ref ins) { return contains(param_map, ins); });
    sort_params(params);
    std::transform(params.begin(),
                   params.end(),
                   std::back_inserter(result),
                   [&](instruction_ref ins) { return param_map.at(ins); });
    return result;
}

static std::array<module::with_inputs, 2>
generic_split(const module& m,
              const std::vector<instruction_ref>& args,
              const std::vector<instruction_ref>& splits,
              std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr)
{
    std::unordered_map<instruction_ref, instruction_ref> param_map =
        m.get_ins_param_map(args, true);

    std::unordered_set<instruction_ref> selected_instructions;
    fix([&](auto self, const std::vector<instruction_ref>& inputs) {
        for(auto input : inputs)
        {
            if(contains(selected_instructions, input))
                continue;
            selected_instructions.insert(input);
            self(input->inputs());
        }
    })(splits);

    std::vector<instruction_ref> instructions1;
    // TODO: copy_if
    for(auto ins : iterator_for(m))
    {
        if(not contains(selected_instructions, ins))
            continue;
        instructions1.push_back(ins);
    }

    std::vector<instruction_ref> inputs1 = select_params(instructions1, param_map);
    module m1;
    std::unordered_map<instruction_ref, instruction_ref> map_ins1;
    m1.add_instructions(instructions1, &map_ins1);
    std::vector<instruction_ref> outputs;
    std::transform(splits.begin(),
                   splits.end(),
                   std::back_inserter(outputs),
                   [&](instruction_ref ins) { return map_ins1.at(ins); });
    m1.add_return(outputs);

    std::vector<instruction_ref> instructions2;
    for(auto ins : iterator_for(m))
    {
        if(contains(selected_instructions, ins))
            continue;
        // Input params can be used in both modules
        std::vector<instruction_ref> input_params;
        std::copy_if(ins->inputs().begin(),
                     ins->inputs().end(),
                     std::back_inserter(input_params),
                     [&](instruction_ref input) {
                         if(input->name() != "@param")
                             return false;
                         return not contains(instructions2, input);
                     });
        instructions2.insert(instructions2.end(), input_params.begin(), input_params.end());
        instructions2.push_back(ins);
    }

    std::vector<instruction_ref> inputs2 = splits;
    module m2;
    std::size_t n = 0;
    std::unordered_map<instruction_ref, instruction_ref> map_ins2;
    for(auto ins : splits)
        map_ins2[ins] = m2.add_parameter(param_name(n++), ins->get_shape().as_standard());
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "@param")
            continue;
        if(not contains(instructions2, ins))
            continue;
        inputs2.push_back(param_map.at(ins));
        map_ins2[ins] = m2.add_parameter(param_name(n++), ins->get_shape().as_standard());
    }
    auto r = m2.add_instructions(instructions2, &map_ins2);
    m2.add_return(r);
    if(map_ins != nullptr)
        *map_ins = map_ins2;
    return {{{std::move(m1), std::move(inputs1)}, {std::move(m2), std::move(inputs2)}}};
}

std::array<module::with_inputs, 2> module::split(const std::vector<instruction_ref>& args,
                                                 const std::vector<instruction_ref>& splits) const
{
    return generic_split(*this, args, splits);
}

std::array<module::with_inputs, 3> module::split(const std::vector<instruction_ref>& args,
                                                 const std::vector<instruction_ref>& splits1,
                                                 const std::vector<instruction_ref>& splits2) const
{
    std::unordered_map<instruction_ref, instruction_ref> map_ins;
    auto mods1 = generic_split(*this, args, splits1, &map_ins);

    assert(all_of(mods1[0].inputs, [&](auto ins) { return contains(args, ins); }));
    assert(all_of(mods1[1].inputs,
                  [&](auto ins) { return contains(args, ins) or contains(splits1, ins); }));

    std::vector<instruction_ref> new_splits2;
    std::transform(splits2.begin(), splits2.end(), std::back_inserter(new_splits2), [&](auto ins) {
        return map_ins.at(ins);
    });

    auto mods2 = mods1[1].mod.split(mods1[1].inputs, new_splits2);
    // Replace new splits with old splits
    mods2[1].replace(new_splits2, splits2);

    assert(all_of(mods2[0].inputs,
                  [&](auto ins) { return contains(args, ins) or contains(splits1, ins); }));
    assert(all_of(mods2[1].inputs, [&](auto ins) {
        return contains(args, ins) or contains(splits1, ins) or contains(splits2, ins);
    }));

    return {{std::move(mods1[0]), std::move(mods2[0]), std::move(mods2[1])}};
}

// Insert parameters into the module based on the input instructions and then
// update the map_ins to map the input to the parameter.
static void insert_params(module& m,
                          const std::vector<instruction_ref>& inputs,
                          std::unordered_map<instruction_ref, instruction_ref>& map_ins)
{
    auto n = m.get_parameter_shapes().size();
    for(auto input : inputs)
    {
        if(contains(map_ins, input))
            continue;
        map_ins[input] = m.add_parameter(param_name(n++), input->get_shape().as_standard());
    }
}

void module::add_params(const std::vector<instruction_ref>& inputs,
                        std::unordered_map<instruction_ref, instruction_ref>* map_ins)
{
    insert_params(*this, inputs, *map_ins);
}

std::vector<instruction_ref>
module::fuse(const std::vector<instruction_ref>& inss,
             std::unordered_map<instruction_ref, instruction_ref>* map_ins,
             module::inserter insert)
{
    std::unordered_map<instruction_ref, instruction_ref> default_map_ins;
    if(map_ins == nullptr)
        map_ins = &default_map_ins;
    std::vector<instruction_ref> inputs;
    for(auto ins : inss)
    {
        for(auto input : ins->inputs())
        {
            if(contains(inss, input))
                continue;
            if(contains(inputs, input))
                continue;
            inputs.push_back(input);
        }
    }
    insert_params(*this, inputs, *map_ins);
    return this->add_instructions(inss, map_ins, std::move(insert));
}

std::vector<instruction_ref>
module::fuse(const module& m,
             const std::vector<instruction_ref>& inputs,
             std::unordered_map<instruction_ref, instruction_ref>* map_ins,
             module::inserter insert)
{
    std::unordered_map<instruction_ref, instruction_ref> default_map_ins;
    if(map_ins == nullptr)
        map_ins = &default_map_ins;
    insert_params(*this, inputs, *map_ins);
    auto param_map = m.get_ins_param_map(inputs, true);
    for(auto&& [param, input] : param_map)
    {
        (*map_ins)[param] = map_ins->at(input);
    }
    return this->add_instructions(&m, map_ins, std::move(insert));
}

std::vector<instruction_ref>
module::insert_inline(instruction_ref ins,
                      const module& m,
                      const std::vector<instruction_ref>& inputs,
                      std::unordered_map<instruction_ref, instruction_ref>* map_ins,
                      module::inserter insert)
{
    std::unordered_map<instruction_ref, instruction_ref> default_map_ins;
    if(map_ins == nullptr)
        map_ins = &default_map_ins;
    auto param_map = m.get_ins_param_map(inputs, true);
    map_ins->insert(param_map.begin(), param_map.end());
    return this->insert_instructions(ins, &m, map_ins, std::move(insert));
}

void module_with_inputs::replace(instruction_ref ins, instruction_ref rep)
{
    auto it = std::find(inputs.begin(), inputs.end(), ins);
    if(it == inputs.end())
        return;
    assert((*it)->get_shape().lens() == rep->get_shape().lens());
    *it = rep;
}
void module_with_inputs::replace(
    const std::unordered_map<instruction_ref, instruction_ref>& map_ins)
{
    for(auto& ins : inputs)
    {
        if(not contains(map_ins, ins))
            continue;
        assert(ins->get_shape().lens() == map_ins.at(ins)->get_shape().lens());
        ins = map_ins.at(ins);
    }
}
void module_with_inputs::replace(const std::vector<instruction_ref>& keys,
                                 const std::vector<instruction_ref>& values)
{
    for(auto& ins : inputs)
    {
        auto it = std::find(keys.begin(), keys.end(), ins);
        if(it == keys.end())
            continue;
        assert(ins->get_shape().lens() == values[it - keys.begin()]->get_shape().lens());
        ins = values[it - keys.begin()];
    }
}

void module::debug_print() const { std::cout << *this << std::endl; }

void module::debug_print(instruction_ref ins,
                         std::unordered_map<instruction_ref, std::string>& names) const
{
    if(is_end(ins, this->end()))
    {
        std::cout << "End instruction" << std::endl;
        return;
    }
    if(not has_instruction(ins))
    {
        std::cout << "Instruction not part of module" << std::endl;
        return;
    }

    names = this->print(
        [&](auto x, auto ins_names) {
            if(x == ins)
            {
                instruction::print(std::cout, x, ins_names);
                std::cout << std::endl;
            }
        },
        names);
}

void module::debug_print(instruction_ref ins) const
{
    std::unordered_map<instruction_ref, std::string> names;
    this->debug_print(ins, names);
}

void module::debug_print(const std::vector<instruction_ref>& inss) const
{
    for(auto ins : inss)
        this->debug_print(ins);
    std::cout << std::endl;
}

std::unordered_map<instruction_ref, std::string> module::print(
    const std::function<void(instruction_ref,
                             const std::unordered_map<instruction_ref, std::string>&)>& print_func,
    std::unordered_map<instruction_ref, std::string> names) const
{
    const bool is_root = names.empty();
    int count = 0;
    for(auto ins : iterator_for(*this))
    {
        std::string var_name;
        if(not this->name().empty() and not is_root)
            var_name = this->name() + ":";
        if(ins->name() == "@param")
        {
            var_name.append(any_cast<builtin::param>(ins->get_operator()).parameter);
        }
        else
        {
            var_name.append("@" + std::to_string(count));
        }
        // count every instruction so index matches loc in the printout program
        count++;
        names.emplace(ins, var_name);

        print_func(ins, names);
    }
    return names;
}

void module::print(const std::function<
                   void(instruction_ref, const std::unordered_map<instruction_ref, std::string>&)>&
                       print_func) const
{
    this->print(print_func, {});
}

static std::string enclose_name(const std::string& name)
{
    return '"' + replace_string(name, "\"", "\\\"") + '"';
}

void module::print_graph(std::ostream& os, bool brief) const
{
    os << "digraph {" << std::endl;
    os << "\trankdir=LR;" << std::endl;
    this->print([&](auto ins, auto ins_names) {
        std::string label;
        if(brief)
            label = ins->name();
        else
            label = to_string(ins->get_operator());
        os << "\t" << enclose_name(ins_names.at(ins)) << "[label=" << enclose_name(label) << "]";
        os << ";" << std::endl;
        if(not ins->inputs().empty())
        {
            for(auto&& arg : ins->inputs())
            {
                os << "\t" << enclose_name(ins_names.at(arg)) << " -> "
                   << enclose_name(ins_names.at(ins));
                if(not brief)
                    os << "[label=" << enclose_name(to_string(ins->get_shape())) << "]";
                os << ";" << std::endl;
            }
        }
    });
    os << "}" << std::endl;
}

static std::string cpp_var_name(const std::string& name)
{
    std::string prefix = "x_";
    if(not contains(name, "@"))
        prefix = "p_";
    return to_c_id(prefix + replace_string(name, ":", "_module_"));
}

static void print_py_op(std::ostream& os, const operation& op)
{
    auto v = op.to_value();
    os << "migraphx.op(" << enclose_name(op.name());

    auto default_values = make_op(op.name()).to_value();
    for(auto&& x : v)
    {
        auto name = x.get_key();
        if(default_values[name] == x)
            continue;
        os << ", " << name << "=" << to_json_string(x.without_key());
    }
    os << ")";
}

static void print_make_op(std::ostream& os, const operation& op)
{
    auto v = op.to_value();
    if(not v.empty())
    {
        os << "migraphx::make_json_op(" << enclose_name(op.name());
        os << ", " << enclose_name(to_json_string(v));
    }
    else
    {
        os << "migraphx::make_op(" << enclose_name(op.name());
    }
    os << ")";
}

static void print_py_shape(std::ostream& os, const migraphx::shape& s)
{
    os << "migraphx.shape(type=" << to_json_string(s.type_string()) << ", lens=["
       << to_string_range(s.lens()) << "]";
    if(not s.standard())
        os << ", strides=[" << to_string_range(s.strides()) << "]";
    os << ")";
}

static void print_cpp_shape(std::ostream& os, const migraphx::shape& s)
{
    os << "migraphx::shape{migraphx::shape::" << s.type_string();
    os << ", {" << to_string_range(s.lens()) << "}";
    if(not s.standard())
        os << ", {" << to_string_range(s.strides()) << "}";
    os << "}";
}

std::unordered_map<instruction_ref, std::string>
module::print_py(std::ostream& os,
                 const std::string& mname,
                 std::unordered_map<instruction_ref, std::string> names) const
{
    // cppcheck-suppress variableScope
    unsigned long seed = names.size();
    auto last          = std::prev(this->end());
    names              = this->print(
        [&](auto ins, auto ins_names) {
            std::vector<std::string> input_vars;
            std::transform(ins->inputs().begin(),
                           ins->inputs().end(),
                           std::back_inserter(input_vars),
                           [&](auto input) { return cpp_var_name(ins_names.at(input)); });
            if(ins != last)
                os << cpp_var_name(ins_names.at(ins)) << " = ";
            if(ins->name() == "@literal")
            {
                os << mname << ".add_literal(";
                if(ins->get_shape().elements() < 10)
                {
                    os << "migraphx.create_argument(";
                    print_py_shape(os, ins->get_shape());
                    os << ", [" << ins->get_literal() << "])";
                }
                else
                {
                    const bool use_abs = false;
                    // Disable abs for now
                    // ins->get_literal().visit([&](auto v) {
                    //     use_abs = std::none_of(v.begin(), v.end(), [](auto x) { return x < 0; });
                    // });
                    if(use_abs)
                        os << "migraphx.abs_literal(";
                    os << "migraphx.generate_argument(";
                    print_py_shape(os, ins->get_shape());
                    os << ", " << seed << ")";
                    if(use_abs)
                        os << ")";
                    seed++;
                }
                os << ")" << std::endl;
            }
            else if(ins->name() == "@param")
            {
                std::string name = any_cast<builtin::param>(ins->get_operator()).parameter;
                os << mname << ".add_parameter(" << enclose_name(name) << ", ";
                print_py_shape(os, ins->get_shape());
                os << ")" << std::endl;
            }
            else if(ins->name() == "@return")
            {
                os << mname << ".add_return([" << join_strings(input_vars, ", ") << "])"
                   << std::endl;
            }
            else
            {
                assert(ins->name().front() != '@');
                os << mname << ".add_instruction(";
                print_py_op(os, ins->get_operator());
                os << ", [" << join_strings(input_vars, ", ") << "]";
                os << ") # ";
                print_py_shape(os, ins->get_shape());
                os << std::endl;
            }
        },
        names);

    return names;
}

std::unordered_map<instruction_ref, std::string>
module::print_cpp(std::ostream& os,
                  const std::string& mname,
                  std::unordered_map<instruction_ref, std::string> names) const
{
    // cppcheck-suppress variableScope
    unsigned long seed = names.size();
    auto last          = std::prev(this->end());
    names              = this->print(
        [&](auto ins, auto ins_names) {
            std::vector<std::string> input_vars;
            std::transform(ins->inputs().begin(),
                           ins->inputs().end(),
                           std::back_inserter(input_vars),
                           [&](auto input) { return cpp_var_name(ins_names.at(input)); });
            if(ins != last)
                os << "auto " << cpp_var_name(ins_names.at(ins)) << " = ";
            if(ins->name() == "@literal")
            {
                os << mname << "->add_literal(";
                bool use_abs = false;
                ins->get_literal().visit([&](auto v) {
                    use_abs = std::none_of(v.begin(), v.end(), [](auto x) { return x < 0; });
                });
                if(use_abs)
                    os << "migraphx::abs(";
                os << "migraphx::generate_literal(";
                print_cpp_shape(os, ins->get_shape());
                os << ", " << seed << ")";
                if(use_abs)
                    os << ")";
                os << ");" << std::endl;
                seed++;
            }
            else if(ins->name() == "@param")
            {
                std::string name = any_cast<builtin::param>(ins->get_operator()).parameter;
                os << mname << "->add_parameter(" << enclose_name(name) << ",";
                print_cpp_shape(os, ins->get_shape());
                os << ");" << std::endl;
            }
            else if(ins->name() == "@return")
            {
                os << mname << "->add_return({";
                os << join_strings(input_vars, ", ");
                os << "});" << std::endl;
            }
            else
            {
                assert(ins->name().front() != '@');
                os << mname << "->add_instruction(";
                print_make_op(os, ins->get_operator());
                os << ", " << join_strings(input_vars, ", ");
                os << ");" << std::endl;
            }
        },
        names);

    return names;
}

void module::print_py(std::ostream& os) const { this->print_py(os, this->name(), {}); }

void module::print_cpp(std::ostream& os) const { this->print_cpp(os, this->name(), {}); }

void module::annotate(std::ostream& os, std::function<void(instruction_ref)> a) const
{
    this->print([&](auto ins, auto ins_names) {
        instruction::print(os, ins, ins_names);
        a(ins);
        os << std::endl;
    });
}

std::vector<module_ref> module::get_sub_modules(bool shallow) const
{
    std::vector<module_ref> vec_modules;
    for(auto ins : iterator_for(*this))
    {
        const auto& mod_args = ins->module_inputs();
        vec_modules.insert(vec_modules.end(), mod_args.begin(), mod_args.end());
        if(not shallow)
        {
            for(const auto& smod : mod_args)
            {
                auto sub_mods = smod->get_sub_modules();
                vec_modules.insert(vec_modules.end(), sub_mods.begin(), sub_mods.end());
            }
        }
    }

    return vec_modules;
}

module& module::sort()
{
    auto implicit_deps = calc_implicit_deps();
    fix([&](auto self, auto ins) {
        this->move_instruction(ins, this->begin());
        auto ins_inputs = ins->inputs();
        if(implicit_deps.find(ins) != implicit_deps.end())
        {
            auto ins_implict_inputs = implicit_deps.at(ins);
            ins_inputs.insert(
                ins_inputs.end(), ins_implict_inputs.begin(), ins_implict_inputs.end());
        }
        for(auto child : ins_inputs)
        {
            if(not contains(this->impl->instructions, child))
            {
                continue;
            }
            self(child);
        }
    })(std::prev(this->end()));
    assert(this->validate() == this->end());
    return *this;
}

void module::calc_implicit_deps(const module& smod,
                                const module& pmod,
                                instruction_ref ins,
                                ins_dep_map& deps) const
{
    const auto& ins_inputs = ins->inputs();
    for(auto ii : iterator_for(smod))
    {
        const auto& ii_inputs = ii->inputs();
        for(auto iii : ii_inputs)
        {
            if(pmod.has_instruction(iii))
            {
                if(not contains(ins_inputs, iii))
                    deps[ins].insert(iii);
            }
        }

        const auto& mod_args = ii->module_inputs();
        for(const auto* ssmod : mod_args)
        {
            calc_implicit_deps(*ssmod, pmod, ins, deps);
        }
    }
}

ins_dep_map module::calc_implicit_deps() const
{
    ins_dep_map mod_implicit_deps;
    for(auto ins : iterator_for(*this))
    {
        const auto& mod_args = ins->module_inputs();
        if(mod_args.empty())
        {
            continue;
        }

        for(const auto* mod : mod_args)
        {
            calc_implicit_deps(*mod, *this, ins, mod_implicit_deps);
        }
    }

    return mod_implicit_deps;
}

void module::repeat_while_changes(std::size_t n, const std::function<void()>& f)
{
    if(n == 0)
        return;
    if(n == 1)
    {
        f();
        return;
    }
    auto has_changed = impl->changed.subscribe();
    for(auto i : range(n))
    {
        f();
        if(not has_changed)
            break;
        (void)i;
    }
}

bool operator==(const module& x, const module& y) { return to_string(x) == to_string(y); }

std::ostream& operator<<(std::ostream& os, const module& m)
{
    m.print([&](auto ins, auto ins_names) {
        instruction::print(os, ins, ins_names);
        os << std::endl;
    });

    return os;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
