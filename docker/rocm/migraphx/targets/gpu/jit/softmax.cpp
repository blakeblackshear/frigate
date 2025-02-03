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
#include <migraphx/gpu/compiler.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/gpu/compile_hip.hpp>
#include <migraphx/gpu/compile_gen.hpp>
#include <migraphx/reduce_dims.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_USE_FAST_SOFTMAX)

using namespace migraphx::gpu::gen; // NOLINT

static const char* const softmax_kernel = R"__migraphx__(
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/softmax.hpp>
#include <migraphx/kernels/vectorize.hpp>
#include <args.hpp>

namespace migraphx {

extern "C" {
MIGRAPHX_GLOBAL void softmax_kernel(void* input_p, void* output_p) 
{
    transform_args(make_tensors(), ${transformers})(input_p, output_p)([](auto input, auto output) {
        softmax<${axis}>(input, output);
    });
}
    
}

} // namespace migraphx

)__migraphx__";

struct softmax_compiler : compiler<softmax_compiler>
{
    std::vector<std::string> names() const { return {"softmax"}; }

    operation compile_op(context& ctx, const std::vector<shape>& inputs, const value& v) const
    {
        // TODO: Use reduce_dims
        auto axis  = v.at("axis").to<int64_t>();
        auto faxis = find_fast_axis({inputs.front()});
        vectorize vec{};
        // Vectorize if the axis is a reduction axis
        if(faxis == axis)
        {
            vec = vectorize::elements(ctx, faxis, inputs);
        }
        auto relements  = inputs[0].lens()[axis] / vec.size;
        auto nelements  = (inputs.back().elements() / inputs[0].lens()[axis]);
        auto block_size = compute_block_size(ctx, relements, 256);
        hip_compile_options options;
        options.set_launch_params(
            v, compute_global_for(ctx, nelements * block_size, 256), block_size);
        options.output      = inputs.back();
        options.inputs      = inputs;
        options.kernel_name = "softmax_kernel";

        if(enabled(MIGRAPHX_USE_FAST_SOFTMAX{}))
            options.emplace_param("-DMIGRAPHX_USE_FAST_SOFTMAX");

        auto src = interpolate_string(
            softmax_kernel,
            {{"transformers", make_transformer_args(vec)}, {"axis", to_string(axis)}});

        return compile_hip_code_object(ctx, src, options);
    }

    compiler_replace compile(context& ctx, instruction_ref ins, const operation& op) const
    {
        return compile_op(ctx, to_shapes(ins->inputs()), op.to_value());
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
