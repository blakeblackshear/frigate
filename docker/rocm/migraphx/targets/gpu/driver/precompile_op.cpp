/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/gpu/driver/action.hpp>
#include <migraphx/gpu/time_op.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/lowering.hpp>
#include <migraphx/gpu/compile_ops.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace driver {

struct precompile_op : action<precompile_op>
{
    static program create_preop_program(const operation& preop, std::vector<shape> inputs)
    {
        program p;
        auto* mm = p.get_main_module();
        std::vector<instruction_ref> args;
        inputs.pop_back();
        transform(inputs, range(inputs.size()), std::back_inserter(args), [&](auto input, auto i) {
            return mm->add_parameter("x" + std::to_string(i), input);
        });
        mm->add_instruction(preop, args);
        return p;
    }

    static operation get_code_object(const program& p)
    {
        MIGRAPHX_TIDY_CONST auto* mm = p.get_main_module();
        auto it                      = std::find_if(mm->begin(), mm->end(), [](const auto& ins) {
            return (ins.name() == "gpu::code_object");
        });
        if(it == mm->end())
            MIGRAPHX_THROW("Failed to create code object");
        return it->get_operator();
    }
    static void apply(const parser& p, const value& v)
    {
        context ctx;
        auto inputs = p.parse_shapes(v.at("inputs"));
        auto name   = v.at("name").to<std::string>();
        auto preop  = make_op(name);
        if(v.contains("fields"))
            preop.from_value(v.at("fields"));
        bool exhaustive = v.get("exhaustive", false);
        auto prog       = create_preop_program(preop, inputs);
        run_passes(prog, {lowering{}, compile_ops{&ctx, exhaustive}});
        auto op = get_code_object(prog);
        auto t  = time_op(ctx, op, inputs, p.get(v, "iterations", 100));
        std::cout << preop << ": " << t << "ms" << std::endl;
    }
};

} // namespace driver
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
