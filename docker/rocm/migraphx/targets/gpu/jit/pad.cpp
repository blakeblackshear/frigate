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
#include <migraphx/float_equal.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

using namespace migraphx::gpu::gen; // NOLINT

static const char* const pointwise_kernel = R"__migraphx__(
#include <migraphx/kernels/pad.hpp>
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/ops.hpp>
#include <args.hpp>

namespace migraphx {

extern "C" {
MIGRAPHX_GLOBAL void pad_kernel(void* input_p, void* output_p) 
{
    auto offsets = index_ints<${offsets}>{};
    auto idx     = make_index();
    make_tensors()(input_p, output_p)([&](auto input, auto output) {
        pad(idx, offsets, input, output, ${pad_val});
    });
}
    
}

} // namespace migraphx

)__migraphx__";

struct pad_compiler : compiler<pad_compiler>
{
    std::vector<std::string> names() const { return {"pad"}; }

    operation compile_op(context& ctx, const std::vector<shape>& inputs, const value& v) const
    {
        auto padding    = v.at("pads").to_vector<int64_t>();
        auto input_lens = inputs.front().lens();
        std::vector<size_t> offsets(input_lens.size());
        std::copy(padding.begin(), padding.begin() + offsets.size(), offsets.begin());

        auto offset_lens = input_lens;
        std::transform(input_lens.begin(),
                       input_lens.end(),
                       offsets.begin(),
                       offset_lens.begin(),
                       [&](auto input, auto offset) { return input + offset; });

        auto vinputs = inputs;
        vinputs.push_back(inputs.front().with_lens(offset_lens));
        auto rinputs = reduce_dims(normalize_permutation(vinputs));

        auto rinput_lens  = rinputs.front().lens();
        auto roffset_lens = rinputs.back().lens();
        std::vector<size_t> roffsets(roffset_lens.size());
        std::transform(rinput_lens.begin(),
                       rinput_lens.end(),
                       roffset_lens.begin(),
                       roffsets.begin(),
                       [](auto input, auto offset_dim) { return offset_dim - input; });
        rinputs.pop_back();

        hip_compile_options options;
        options.inputs         = inputs;
        options.output         = inputs.back();
        options.virtual_inputs = rinputs;
        options.kernel_name    = "pad_kernel";
        options.set_launch_params(v, compute_global_for(ctx, inputs.at(1).elements()));

        auto pad_val        = v.get("value", 0.f);
        auto pad_val_string = to_string(pad_val);
        if(float_equal(pad_val, std::numeric_limits<float>::lowest()))
            pad_val_string = "lowest{}";
        if(float_equal(pad_val, std::numeric_limits<float>::max()))
            pad_val_string = "highest{}";

        auto src = interpolate_string(
            pointwise_kernel,
            {{"pad_val", to_string(pad_val_string)}, {"offsets", to_string_range(roffsets)}});
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
