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
#include <migraphx/reduce_dims.hpp>
#include <migraphx/gpu/compiler.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/gpu/compile_hip.hpp>
#include <migraphx/gpu/compile_gen.hpp>
#include <migraphx/gpu/compile_pointwise.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

using namespace migraphx::gpu::gen; // NOLINT

static const char* const pointwise_kernel = R"__migraphx__(
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/pointwise.hpp>
#include <args.hpp>

namespace migraphx {

${preamble}

extern "C" {
MIGRAPHX_GLOBAL void ${kernel}(${params}) 
{
    auto idx = make_index();
    pointwise<${noutputs}, ${tiled}>(idx, ${transformers})(${lambda}, ${args});
}
    
}

} // namespace migraphx

)__migraphx__";

struct pointwise_compiler : compiler<pointwise_compiler>
{
    std::vector<std::string> names() const { return {"pointwise", "contiguous", "layout"}; }

    static std::size_t oversubscribe_if(bool b)
    {
        if(b)
            return 256;
        else
            return 1;
    }
    operation compile_op(context& ctx, const std::vector<shape>& inputs, const value& v) const
    {
        hip_compile_options options;
        options.inputs         = flatten(inputs);
        options.output         = inputs.back();
        options.virtual_inputs = reduce_dims(normalize_permutation(options.inputs));
        options.emplace_param("-Wno-float-equal");
        auto axis              = find_fast_axis(options.virtual_inputs);
        auto vec               = vectorize::elements(ctx, axis, options.virtual_inputs);
        options.kernel_name    = v.get("kernel", "kernel");
        auto noutputs = options.inputs.size() - inputs.size() + 1;
        auto t                 = tile::elements(options.virtual_inputs, noutputs);
        // auto t = tile{};
        if(t.ntiles == 0)
            options.set_launch_params(
                v, compute_global_for(ctx, options.inputs.front().elements() / vec.size, 256));
        else
            options.set_launch_params(
                v, compute_global_for(ctx, t.ntiles * t.block_size, 256), t.block_size);
        auto src =
            interpolate_string(pointwise_kernel,
                               {{"kernel", options.kernel_name},
                                {"params", enum_params(options.inputs.size(), "void * private_p")},
                                {"args", enum_params(options.inputs.size(), "private_p")},
                                {"lambda", v.at("lambda").to<std::string>()},
                                {"transformers", make_transformer_args(t, vec)},
                                {"tiled", t.ntiles > 0 ? "true" : "false"},
                                {"noutputs", std::to_string(noutputs)},
                                {"preamble", v.get("preamble", std::string{})}});
        return compile_hip_code_object(ctx, src, options);
    }

    compiler_replace compile(context& ctx, instruction_ref ins, const operation& op) const
    {
        if(contains({"layout", "contiguous"}, op.name()))
        {
            return compile_op(ctx,
                              to_shapes(ins->inputs()),
                              {{"lambda", "[](auto x) { return make_tuple(x); }"},
                               {"kernel", op.name() + "_kernel"}});
        }
        else
        {
            assert(not ins->module_inputs().empty());
            const_module_ref pm = ins->module_inputs().front();
            return compile_pointwise(ctx, to_shapes(ins->inputs()), pm);
        }
    }
};
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
