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
#ifndef MIGRAPHX_GUARD_GPU_COMPILER_HPP
#define MIGRAPHX_GUARD_GPU_COMPILER_HPP

#include <migraphx/gpu/config.hpp>
#include <migraphx/auto_register.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/value.hpp>
#include <migraphx/module.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/optional.hpp>
#include <migraphx/rank.hpp>
#include <migraphx/gpu/tuning_config.hpp>
#include <functional>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct context;

struct compiler_replace
{
    compiler_replace() = default;

    compiler_replace(const operation& op) : code_objects{{op}} {}

    template <class F>
    compiler_replace(const operation& op, F f) : code_objects{{op}}, replace_fn(make_replace(f))
    {
    }

    template <class F, class Trace>
    compiler_replace(const operation& op, F f, Trace t)
        : code_objects{{op}}, replace_fn(make_replace(f)), trace_fn(t)
    {
    }

    template <class F>
    compiler_replace(const std::vector<operation>& op, F f)
        : code_objects{op}, replace_fn(make_replace_all(f))
    {
    }

    template <class F, class Trace>
    compiler_replace(const std::vector<operation>& op, F f, Trace t)
        : code_objects{op}, replace_fn(make_replace_all(f)), trace_fn(t)
    {
    }

    std::vector<operation> code_objects = {};
    std::function<void(const compiler_replace& cr, module& m, instruction_ref ins)> replace_fn =
        nullptr;
    std::function<void(std::ostream& os, instruction_ref ins)> trace_fn = nullptr;

    template <class F>
    static auto make_replace(F f)
    {
        return [=](const compiler_replace& cr, module& m, instruction_ref ins) {
            f(m, ins, cr.code_objects.front());
        };
    }

    template <class F>
    static auto make_replace_all(F f)
    {
        return [=](const compiler_replace& cr, module& m, instruction_ref ins) {
            f(m, ins, cr.code_objects);
        };
    }

    void replace(module& m, instruction_ref ins) const
    {
        if(replace_fn)
            replace_fn(*this, m, ins);
        else
        {
            if(code_objects.size() != 1)
            {
                MIGRAPHX_THROW("Provide custom replace function to insert multiple code objects\n");
            }
            m.replace_instruction(ins, code_objects.front(), ins->inputs());
        }
    }

    void trace(std::ostream& os, instruction_ref ins) const
    {
        if(trace_fn)
            trace_fn(os, ins);
    }
};

using compiler_compile =
    std::function<compiler_replace(context&, instruction_ref, operation, const value&)>;
using compiler_compile_op =
    std::function<operation(context&, const std::vector<shape>& inputs, const value&)>;
using compiler_tuning_config =
    std::function<optional<tuning_config>(context&, instruction_ref, const operation&, bool)>;

MIGRAPHX_GPU_EXPORT void register_compiler(const std::string& name,
                                           compiler_compile c,
                                           compiler_compile_op cop,
                                           compiler_tuning_config ctg);

MIGRAPHX_GPU_EXPORT bool has_compiler_for(const std::string& name);
MIGRAPHX_GPU_EXPORT compiler_replace compile(context& ctx,
                                             instruction_ref ins,
                                             const operation& op,
                                             const value& solution);
MIGRAPHX_GPU_EXPORT operation compile_op(const std::string& name,
                                         context& ctx,
                                         const std::vector<shape>& inputs,
                                         const value& v);
MIGRAPHX_GPU_EXPORT optional<tuning_config>
get_tuning_config(context& ctx, instruction_ref ins, const operation& op, bool exhaustive);

template <class T>
void register_compiler()
{
    T c;
    for(auto&& name : c.names())
    {
        register_compiler(
            name,
            [=](auto&&... xs) {
                return c.invoke_compile(rank<1>{}, std::forward<decltype(xs)>(xs)...);
            },
            [=](auto&&... xs) { return c.compile_op(std::forward<decltype(xs)>(xs)...); },
            [=](auto&&... xs) { return c.get_tuning_config(std::forward<decltype(xs)>(xs)...); });
    }
}

struct register_compiler_action
{
    template <class T>
    static void apply()
    {
        register_compiler<T>();
    }
};

template <class T>
using auto_register_compiler = auto_register<register_compiler_action, T>;

template <class Derived>
struct compiler : auto_register_compiler<Derived>
{
    const Derived& derived() const { return static_cast<const Derived&>(*this); }
    optional<tuning_config>
    get_tuning_config(context&, instruction_ref, const operation&, bool) const
    {
        return nullopt;
    }
    operation compile_op(context&, const std::vector<shape>&, const value&) const { return {}; }

    template <class D = Derived>
    auto invoke_compile(
        rank<1>, context& ctx, instruction_ref ins, operation op, const value& solution) const
        -> decltype(std::declval<D>().compile(ctx, ins, std::move(op), solution))
    {
        return derived().compile(ctx, ins, std::move(op), solution);
    }

    template <class D = Derived>
    auto invoke_compile(
        rank<0>, context& ctx, instruction_ref ins, operation op, const value& solution) const
        -> decltype(std::declval<D>().compile(ctx, ins, std::move(op)))
    {
        assert(solution.empty());
        (void)solution;
        return derived().compile(ctx, ins, std::move(op));
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif // MIGRAPHX_GUARD_GPU_COMPILER_HPP
