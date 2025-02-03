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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_MODULE_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_MODULE_HPP

#include <list>
#include <unordered_set>
#include <unordered_map>
#include <migraphx/operation.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/builtin.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/target.hpp>
#include <migraphx/module_ref.hpp>
#include <migraphx/compile_options.hpp>
#include <migraphx/env.hpp>
#include <migraphx/config.hpp>
#include <algorithm>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_EXPORT
const operation& get_operation(instruction_ref ins);

struct module_impl;

using parameter_map = std::unordered_map<std::string, argument>;
using ins_dep_map   = std::unordered_map<instruction_ref, std::unordered_set<instruction_ref>>;

struct module_with_inputs;

/**
 * @brief Stores the instruction stream
 */
struct MIGRAPHX_EXPORT module
{
    using inserter = std::function<instruction_ref(module& m,
                                                   instruction_ref ins,
                                                   const operation& op,
                                                   const std::vector<instruction_ref>& inputs,
                                                   const std::vector<module_ref>& mod_args)>;
    module(const std::string& name = "");

    // move constructor
    module(module&&) noexcept;

    // copy constructor
    module(const module&);

    // copy assignment operator
    module& operator=(module);

    ~module() noexcept;

    std::string name() const;

    bool bypass() const;
    void set_bypass(bool b = true);

    template <class... Ts, MIGRAPHX_REQUIRES(std::is_same<Ts, instruction_ref>{}...)>
    instruction_ref add_instruction(operation op, Ts... args)
    {
        return add_instruction(op, {args...});
    }

    instruction_ref add_instruction(const operation& op, std::vector<instruction_ref> args);

    instruction_ref add_instruction(const operation& op,
                                    std::vector<instruction_ref> args,
                                    std::vector<module_ref> module_args);

    template <class... Ts, MIGRAPHX_REQUIRES(std::is_same<Ts, instruction_ref>{}...)>
    instruction_ref insert_instruction(instruction_ref ins, operation op, Ts... args)
    {
        return insert_instruction(ins, op, {args...});
    }
    instruction_ref
    insert_instruction(instruction_ref ins, const operation& op, std::vector<instruction_ref> args);

    instruction_ref insert_instruction(instruction_ref ins,
                                       const operation& op,
                                       std::vector<instruction_ref> args,
                                       std::vector<module_ref> module_args);

    template <class... Ts, MIGRAPHX_REQUIRES(std::is_same<Ts, instruction_ref>{}...)>
    instruction_ref replace_instruction(instruction_ref ins, operation op, Ts... args)
    {
        return replace_instruction(ins, op, {args...});
    }
    instruction_ref replace_instruction(instruction_ref ins,
                                        const operation& op,
                                        std::vector<instruction_ref> args) MIGRAPHX_TIDY_CONST;

    instruction_ref replace_instruction(instruction_ref ins,
                                        const operation& op,
                                        std::vector<instruction_ref> args,
                                        std::vector<module_ref> module_args) MIGRAPHX_TIDY_CONST;

    instruction_ref replace_instruction(instruction_ref ins, instruction_ref rep);

    instruction_ref remove_instruction(instruction_ref ins);
    instruction_ref remove_instructions(instruction_ref first, instruction_ref last);

    instruction_ref move_instruction(instruction_ref src, instruction_ref dst);
    instruction_ref move_instructions(instruction_ref src, instruction_ref dst);

    std::vector<instruction_ref>
    add_instructions(const std::vector<instruction_ref>& instructions,
                     std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
                     inserter insert                                               = nullptr);

    std::vector<instruction_ref>
    add_instructions(const_module_ref m,
                     std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
                     inserter insert                                               = nullptr);

    std::vector<instruction_ref>
    add_instructions(instruction_ref start,
                     instruction_ref last,
                     std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
                     inserter insert                                               = nullptr);

    std::vector<instruction_ref>
    insert_instructions(instruction_ref ins,
                        const std::vector<instruction_ref>& instructions,
                        std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
                        inserter insert                                               = nullptr);

    std::vector<instruction_ref>
    insert_instructions(instruction_ref ins,
                        const_module_ref m,
                        std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
                        inserter insert                                               = nullptr);

    std::vector<instruction_ref>
    insert_instructions(instruction_ref ins,
                        instruction_ref start,
                        instruction_ref last,
                        std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
                        inserter insert                                               = nullptr);

    template <class... Ts>
    instruction_ref add_literal(Ts&&... xs)
    {
        return add_literal(literal{std::forward<Ts>(xs)...});
    }

    instruction_ref add_literal(literal l);

    instruction_ref add_outline(const shape& s);

    instruction_ref add_parameter(std::string name, shape s);

    instruction_ref add_return(std::vector<instruction_ref> args);

    instruction_ref replace_return(std::vector<instruction_ref> args);

    instruction_ref insert_literal(instruction_ref ins, literal l);

    instruction_ref insert_parameter(instruction_ref ins, std::string name, shape s);

    std::vector<std::string> get_parameter_names() const;

    shape get_parameter_shape(std::string name) const;

    instruction_ref get_parameter(std::string name) const;

    std::vector<instruction_ref> get_parameters() const;

    void rename_parameter(instruction_ref ins, const std::string& name);

    std::unordered_map<std::string, shape> get_parameter_shapes() const;

    bool has_instruction(instruction_ref ins) const;

    std::vector<instruction_ref> get_returns() const;

    std::size_t size() const;
    instruction_ref begin() const;
    instruction_ref end() const;

    struct compute_shapes_options
    {
        std::string name                               = "compute_shapes";
        bool strict_type                               = false;
        bool strict_lens                               = false;
        std::vector<std::size_t> scalar_const_out_lens = {};
    };

    /// Compute a new ouput shape by replacing each parameter with input
    /// shapes passed in.
    std::vector<shape> compute_shapes(const std::vector<shape>& inputs,
                                      compute_shapes_options options) const;
    std::vector<shape> compute_shapes(const std::vector<shape>& inputs) const;

    std::vector<shape> get_output_shapes() const;

    instruction_ref validate() const;
    instruction_ref find_dangling_reference() const;

    void finalize(std::vector<context>& contexts);

    /// Create a mapping from the input instruction to the corresponding
    /// parameter instruction. Use the `reverse` flag to reverse the lookup
    /// to be from parameter instruction to input instread.
    std::unordered_map<instruction_ref, instruction_ref>
    get_ins_param_map(const std::vector<instruction_ref>& inputs, bool reverse = false) const;

    /// Given a mapping from submodule instructions to parent module instructions
    /// construct a vector of inputs with parent module instructions in the
    /// correct order
    std::vector<instruction_ref>
    get_inputs(const std::unordered_map<instruction_ref, instruction_ref>& map_ins) const;

    using with_inputs = module_with_inputs;

    /// This will split the module into two parts at the instruction splits.
    /// Each split instruction becomes an input parameter in the second
    /// module. As such the inputs instructions to the second module will use
    /// the split instructions as input placeholders that can be replaced
    /// later.
    std::array<with_inputs, 2> split(const std::vector<instruction_ref>& args,
                                     const std::vector<instruction_ref>& splits) const;

    /// This will split the module in 3 parts using different split
    /// instruction for each additional module.
    std::array<with_inputs, 3> split(const std::vector<instruction_ref>& args,
                                     const std::vector<instruction_ref>& splits1,
                                     const std::vector<instruction_ref>& splits2) const;

    // Insert params to module based on given input instructions and add
    // mappings from inputs to corresponding params in instructions map
    void add_params(const std::vector<instruction_ref>& inputs,
                    std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr);

    // Fuse the instruction into the module by inserting the instructions and
    // parameters for any missing inputs.
    std::vector<instruction_ref>
    fuse(const std::vector<instruction_ref>& inss,
         std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
         inserter insert                                               = nullptr);

    // Fuse another module into this module by inserting the instructions and
    // parameters from the module
    std::vector<instruction_ref>
    fuse(const module& m,
         const std::vector<instruction_ref>& inputs,
         std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
         inserter insert                                               = nullptr);
    /*
    Insert instructions from module `m` to this module at position `ins`
    */
    std::vector<instruction_ref>
    insert_inline(instruction_ref ins,
                  const module& m,
                  const std::vector<instruction_ref>& inputs,
                  std::unordered_map<instruction_ref, instruction_ref>* map_ins = nullptr,
                  inserter insert                                               = nullptr);

    void debug_print() const;
    void debug_print(instruction_ref ins) const;
    void debug_print(instruction_ref ins,
                     std::unordered_map<instruction_ref, std::string>& names) const;
    void debug_print(const std::vector<instruction_ref>& inss) const;

    std::unordered_map<instruction_ref, std::string> print(
        const std::function<void(
            instruction_ref, const std::unordered_map<instruction_ref, std::string>&)>& print_func,
        std::unordered_map<instruction_ref, std::string> names) const;
    void print(const std::function<void(instruction_ref,
                                        const std::unordered_map<instruction_ref, std::string>&)>&
                   print_func) const;

    void print_graph(std::ostream& os, bool brief = false) const;

    void print_py(std::ostream& os) const;
    std::unordered_map<instruction_ref, std::string>
    print_py(std::ostream& os,
             const std::string& mname,
             std::unordered_map<instruction_ref, std::string> names) const;

    void print_cpp(std::ostream& os) const;
    std::unordered_map<instruction_ref, std::string>
    print_cpp(std::ostream& os,
              const std::string& mname,
              std::unordered_map<instruction_ref, std::string> names) const;

    void annotate(std::ostream& os, std::function<void(instruction_ref)> a) const;

    std::vector<module_ref> get_sub_modules(bool shallow = false) const;
    /* sorts the module in topological order aka reverse-post order (RPO) DFS order
       it takes last instruction or @return as the root and walks back the graph and moves inputs
       of the each instruction such that it appears before the instruction itself.
    */
    module& sort();
    /* Any instruction "X" can have module arguments and those modules inside them can use any other
     * instruction "Y" from predecessor modules of the instruction "X". Such instruction "Y" inside
     * module args are not listed as input instructions to "X". But those instructions "Y" must be
     * evaluted before the instruction "X" can. Therefore such "Y" instructions are considered
     * implicit dependency to "X".
     */
    ins_dep_map calc_implicit_deps() const;

    void repeat_while_changes(std::size_t n, const std::function<void()>& f);

    MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os, const module& m);
    MIGRAPHX_EXPORT friend bool operator==(const module& x, const module& y);
    friend bool operator!=(const module& x, const module& y) { return not(x == y); }

    friend struct program;

    private:
    void set_name(const std::string& name);
    void assign(const module& m);
    void calc_implicit_deps(const module& smod,
                            const module& pmod,
                            instruction_ref ins,
                            ins_dep_map& deps) const;

    std::unique_ptr<module_impl> impl;
};

struct MIGRAPHX_EXPORT module_with_inputs
{
    module mod;
    std::vector<instruction_ref> inputs;
    /// Replace the instruction in the inputs with rep
    void replace(instruction_ref ins, instruction_ref rep);
    /// Replace the input instructions using the map_ins to lookup the replacement
    void replace(const std::unordered_map<instruction_ref, instruction_ref>& map_ins);

    /// Replace the input instructions of the keys with the instructions
    /// passed as values. Both vectors should be in the same order.
    void replace(const std::vector<instruction_ref>& keys,
                 const std::vector<instruction_ref>& values);
};

inline module& get_module(module& m) { return m; }

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
