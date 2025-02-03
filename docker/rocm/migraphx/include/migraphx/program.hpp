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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_PROGRAM_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_PROGRAM_HPP

#include <list>
#include <unordered_map>
#include <migraphx/operation.hpp>
#include <migraphx/module.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/builtin.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/target.hpp>
#include <migraphx/compile_options.hpp>
#include <migraphx/target_assignments.hpp>
#include <migraphx/assignment_options.hpp>
#include <migraphx/env.hpp>
#include <migraphx/config.hpp>
#include <migraphx/execution_environment.hpp>
#include <algorithm>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_COMPILE)
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_EVAL)

struct program_impl;

struct marker;

/**
 * @brief Stores the instruction stream
 */
struct MIGRAPHX_EXPORT program
{
    program();

    explicit program(module m);

    // move constructor
    program(program&&) noexcept;

    // copy constructor
    program(const program&);

    // copy assignment operator
    program& operator=(program);

    ~program() noexcept;

    std::vector<std::string> get_parameter_names() const;

    shape get_parameter_shape(std::string name) const;

    instruction_ref get_parameter(std::string name) const;

    std::unordered_map<std::string, shape> get_parameter_shapes() const;

    std::vector<argument> eval(parameter_map params,
                               execution_environment exec_env = execution_environment{}) const;

    std::vector<argument> eval_with_context(std::vector<context>& ctx, parameter_map params) const;

    void finish() const;

    std::size_t size() const;

    std::vector<shape> get_output_shapes() const;

    context& get_context() const;

    instruction_ref validate() const;

    target_assignments get_target_assignments(const std::vector<target>& targets,
                                              assignment_options options = assignment_options{});

    void compile(const target& t, compile_options options = compile_options{});

    void compile(const std::vector<target>& targets,
                 std::vector<compile_options> compile_opts = {});

    bool is_compiled() const;

    void finalize();

    void perf_report(std::ostream& os,
                     std::size_t n,
                     parameter_map params,
                     std::size_t batch = 1,
                     bool detailed     = false) const;

    void mark(const parameter_map& params, marker m);

    value to_value() const;
    void from_value(const value& v);

    void debug_print() const;
    void debug_print(instruction_ref ins) const;
    void print(std::unordered_map<instruction_ref, std::string>& names,
               const std::function<void(instruction_ref,
                                        std::unordered_map<instruction_ref, std::string>)>&
                   print_func) const;
    void print(const std::function<void(instruction_ref ins,
                                        std::unordered_map<instruction_ref, std::string>)>&
                   print_func) const;

    void print_graph(std::ostream& os, bool brief = false) const;
    void print_py(std::ostream& os) const;
    void print_cpp(std::ostream& os) const;

    void dry_run(parameter_map params) const;

    void annotate(std::ostream& os, const std::function<void(instruction_ref)>& a) const;

    program& sort();

    MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os, const program& p);
    MIGRAPHX_EXPORT friend bool operator==(const program& x, const program& y);
    friend bool operator!=(const program& x, const program& y) { return not(x == y); }

    // module related api
    module* create_module(const std::string& name);
    module* create_module(const std::string& name, module m);
    module* get_module(const std::string& name);
    const module* get_module(const std::string& name) const;

    module* get_main_module();
    const module* get_main_module() const;

    std::vector<const module*> get_modules() const;
    std::vector<module*> get_modules();

    std::unordered_multimap<module_ref, module_ref> get_module_tree();

    void remove_module(const std::string& name);
    void rename_module(const std::string& old_name, const std::string& new_name);
    void remove_unused_modules();

    private:
    void assign(const program& p);
    std::unique_ptr<program_impl> impl;
};
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
