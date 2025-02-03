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
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

using namespace migraphx::gpu::gen; // NOLINT

static const char* const layernorm_kernel = R"__migraphx__(
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/layernorm.hpp>
#include <migraphx/kernels/vectorize.hpp>
#include <migraphx/kernels/preload.hpp>
#include <args.hpp>

namespace migraphx {

${preamble}

extern "C" {
MIGRAPHX_GLOBAL void ${kernel}(${params}) 
{
    transform_args(make_tensors(), rotate_last(), ${transformers})(${args})([](auto... xs) {
        ${layernorm}<${axis}>(${post}, ${eps}, xs...);
    });
}
    
}

} // namespace migraphx

)__migraphx__";

struct layernorm_compiler : compiler<layernorm_compiler>
{
    std::vector<std::string> names() const
    {
        return {"layernorm", "gpu::prelayernorm", "gpu::preadd_layernorm"};
    }

    operation compile_op(context& ctx, const std::vector<shape>& inputs, const value& v) const
    {
        // TODO: Use reduce_dims
        auto axis  = inputs.front().lens().size() - 1;
        auto faxis = find_fast_axis({inputs.front()});
        vectorize vec{};
        // Vectorize if the axis is a reduction axis
        if(axis == faxis)
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
        options.kernel_name = v.get("kernel", "layernorm_kernel");
        auto eps            = v.get("epsilon", 1e-12f);

        auto src = interpolate_string(layernorm_kernel,
                                      {{"kernel", options.kernel_name},
                                       {"params", enum_params(inputs.size(), "void * private_p")},
                                       {"args", enum_params(inputs.size(), "private_p")},
                                       {"transformers", make_transformer_args(vec)},
                                       {"post", v.get("post", std::string{"op::id{}"})},
                                       {"preamble", v.get("preamble", std::string{})},
                                       {"layernorm", v.get("layernorm", std::string{"layernorm"})},
                                       {"axis", to_string(axis)},
                                       {"eps", to_string(eps)}});

        return compile_hip_code_object(ctx, src, options);
    }

    compiler_replace compile(context& ctx, instruction_ref ins, const operation& op) const
    {
        auto v         = op.to_value();
        v["layernorm"] = "layernorm";
        v["kernel"]    = "layernorm_kernel";
        if(op.name() == "gpu::preadd_layernorm")
        {
            v["layernorm"] = "add_layernorm";
            v["kernel"]    = "add_layernorm_kernel";
        }
        if(not ins->module_inputs().empty())
        {
            auto* pm      = ins->module_inputs().front();
            v["preamble"] = generate_pointwise(*pm, "post_layernorm");
            v["post"]     = "MIGRAPHX_LIFT(post_layernorm)";
            v["kernel"] =
                v["layernorm"].to<std::string>() + "_" + generate_name_from_ops(*pm) + "_kernel";
        }
        return compile_op(ctx, to_shapes(ins->inputs()), v);
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
