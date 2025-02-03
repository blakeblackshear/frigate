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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_INSTRUCTION_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_INSTRUCTION_HPP

#include <migraphx/literal.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/module_ref.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/erase.hpp>
#include <migraphx/config.hpp>
#include <string>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_EXPORT shape compute_shape(const operation& op, const std::vector<instruction_ref>& args);
MIGRAPHX_EXPORT shape compute_shape(const operation& op,
                                    const std::vector<instruction_ref>& args,
                                    const std::vector<module_ref>& mods);
MIGRAPHX_EXPORT std::vector<shape> to_shapes(const std::vector<instruction_ref>& args);
MIGRAPHX_EXPORT std::vector<shape> try_compute_shape(const operation& op,
                                                     const std::vector<shape>& inputs);

MIGRAPHX_EXPORT bool reaches(instruction_ref start, instruction_ref end);

struct MIGRAPHX_EXPORT instruction
{
    instruction() {}

    instruction(operation o, shape r, std::vector<instruction_ref> args);

    instruction(operation o,
                shape r,
                std::vector<instruction_ref> args,
                std::vector<module_ref> modules);

    instruction(literal l);

    void replace(operation o);

    void recompute_shape();

    void clear_arguments();

    MIGRAPHX_EXPORT friend bool operator==(const instruction& i, instruction_ref ref);

    bool valid(instruction_ref start, bool check_order = false) const;

    bool valid() const;

    shape get_shape() const;
    const literal& get_literal() const;

    const operation& get_operator() const;

    std::string name() const;

    const std::vector<instruction_ref>& inputs() const;

    const std::vector<module_ref>& module_inputs() const;

    /// Where this instruction is used as an input to another instruction
    const std::vector<instruction_ref>& outputs() const;

    MIGRAPHX_EXPORT friend bool operator==(const instruction& x, const instruction& y);

    MIGRAPHX_EXPORT friend bool operator!=(const instruction& x, const instruction& y);

    MIGRAPHX_EXPORT friend bool operator==(instruction_ref ref, const instruction& i);

    MIGRAPHX_EXPORT friend bool operator!=(const instruction& i, instruction_ref ref);

    MIGRAPHX_EXPORT friend bool operator!=(instruction_ref ref, const instruction& i);

    void add_output(instruction_ref ins);

    template <class T>
    void remove_output(const T& ins)
    {
        migraphx::erase(output, ins);
    }

    static void replace_refs(instruction_ref ins,
                             const std::unordered_map<instruction_ref, instruction_ref>& map_insts,
                             const std::unordered_map<module_ref, module_ref>& map_mods);

    static void backreference(instruction_ref ref);

    static void replace_argument(instruction_ref ins, instruction_ref old, instruction_ref new_ins);

    static void replace_mod_argument(instruction_ref ins, module_ref old, module_ref new_mod);

    static void
    replace(instruction_ref ins, operation o, const shape& r, std::vector<instruction_ref> args);

    static void replace(instruction_ref ins,
                        operation o,
                        const shape& r,
                        std::vector<instruction_ref> args,
                        std::vector<module_ref> module_args);

    bool can_eval() const;

    bool is_undefined() const;

    argument eval(bool check_eval = true) const;

    void finalize(context& ctx);

    static instruction_ref get_output_alias(instruction_ref ins, bool shallow = false);

    void set_normalized(bool value = true);
    bool is_normalized() const;

    bool need_normalization() const;

    operation normalized_operator() const;

    std::size_t get_target_id() const;

    void set_target_id(std::size_t tid);

    void debug_print() const;

    static void print(std::ostream& os,
                      instruction_ref ins,
                      const std::unordered_map<instruction_ref, std::string>& names);

    private:
    // internal
    void replace(operation o, const shape& r, std::vector<instruction_ref> args);

    // internal
    void replace(operation o,
                 const shape& r,
                 std::vector<instruction_ref> args,
                 std::vector<module_ref> mdl_args);

    // internal
    void replace(std::vector<instruction_ref> args);

    // internal
    void replace(std::vector<instruction_ref> args, std::vector<module_ref> mdl_args);

    // internal
    void replace_argument(instruction_ref old, instruction_ref new_ins);

    // internal
    void replace_mod_argument(module_ref old, module_ref new_mod);

    void replace(const shape& r);

    operation op;
    shape result{};
    std::vector<instruction_ref> output;
    std::vector<instruction_ref> arguments;
    std::vector<module_ref> module_args;
    literal lit;
    bool normalized       = false;
    std::size_t target_id = 0;
};
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
