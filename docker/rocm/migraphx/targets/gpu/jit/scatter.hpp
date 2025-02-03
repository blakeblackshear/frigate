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
#ifndef MIGRAPHX_GUARD_JIT_SCATTER_HPP
#define MIGRAPHX_GUARD_JIT_SCATTER_HPP

#include <migraphx/gpu/compiler.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/gpu/compile_hip.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

template <typename Derived>
struct scatter_compiler : compiler<Derived>
{
    compiler_replace compile(context& ctx, instruction_ref ins, const operation& op) const
    {
        const auto inputs =
            to_shapes(std::vector<instruction_ref>{ins->inputs().begin() + 1, ins->inputs().end()});

        hip_compile_options options;
        options.set_launch_params(op.to_value(), compute_global_for(ctx, inputs.at(1).elements()));
        options.inputs         = inputs;
        options.output         = inputs.back();
        options.kernel_name    = derived().get_kernel_name(op);
        options.virtual_inputs = inputs;
        options.emplace_param("-DMIGRAPHX_ALLOW_ATOMIC_CAS=1");

        const auto src = derived().make_interpolated_string(op);
        return prepend_copy_data_to_output(compile_hip_code_object(ctx, src, options));
    }

    // ONNX spec states the following for ScatterElements and ScatterND:
    // "The output of the operation is produced by creating a copy of the input data, ..."
    // The sole responsibility of the MIGraphX Scatter operator implementations being to perform the
    // update operations as specified by ONNX, it is necessary to place the copying of the input
    // data before the MIGraphX operator in the graph.
    compiler_replace prepend_copy_data_to_output(const operation& co) const
    {
        return {co, [](module& m, instruction_ref ins, const operation& op) {
                    auto args = ins->inputs();
                    args.back() =
                        m.insert_instruction(ins, make_op("hip::copy"), args.front(), args.back());
                    args.erase(args.begin());
                    return m.replace_instruction(ins, op, args);
                }};
    }

    std::string get_kernel_name(const operation& op) const { return op.name() + "_kernel"; }

    const Derived& derived() const { return static_cast<const Derived&>(*this); }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif
