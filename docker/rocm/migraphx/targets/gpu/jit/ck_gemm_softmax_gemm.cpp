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
#include <fstream>
#include <migraphx/filesystem.hpp>
#include <migraphx/gpu/compiler.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/gpu/context.hpp>

#include <migraphx/env.hpp>
#include <migraphx/file_buffer.hpp>
#include <migraphx/gpu/ck.hpp>
#include <migraphx/gpu/compile_gen.hpp>
#include <migraphx/gpu/compile_hip.hpp>
#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/module.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/reduce_dims.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace gpu {

using namespace migraphx::gpu::gen; // NOLINT

// NOLINTNEXTLINE
static const char* const ck_gemm_softmax_gemm_kernel = R"__migraphx__(
#include <args.hpp>
#include <migraphx/kernels/ck_gemm_softmax_gemm.hpp>
#include <migraphx/kernels/pointwise.hpp>
#include <migraphx/kernels/ops.hpp>
#include <migraphx/kernels/integral_constant.hpp>
#include <migraphx/kernels/generic_constant.hpp>
#include <${include}>

namespace migraphx {

${preamble}

extern "C" {

MIGRAPHX_GLOBAL void ${kernel}(${params})
{
    transform_args(make_tensors(), rotate_last())(${args})([](auto... xs) {
        auto settings = make_ck_gemm_softmax_gemm_settings(MIGRAPHX_MAKE_CONSTANT(float{SCALE}));
        ck_gemm_softmax_gemm<${solution}, ${blocks_per_batch}>(settings, xs...);
    });
}

}

} // namespace migraphx

)__migraphx__";

struct ck_gemm_softmax_gemm_compiler : compiler<ck_gemm_softmax_gemm_compiler>
{
    std::vector<std::string> names() const
    {
        return {"ck_gemm_softmax_gemm", "gpu::ck_gemm_softmax_gemm"};
    }

    ck::host::device_batched_gemm_softmax_gemm::Problem
    create_problem(const std::vector<shape>& inputs, const value&) const
    {
        const auto& a_shape  = inputs[0];
        const auto& b_shape  = inputs[1];
        const auto& b1_shape = inputs[2];
        const auto& c_shape  = inputs.back();

        // cppcheck-suppress unreadVariable
        auto rank        = a_shape.ndim();
        auto batch_count = get_batch_count(c_shape);
        auto m           = c_shape.lens()[rank - 2];
        m                = can_fold_batch(inputs) ? m * batch_count : m;
        auto n           = c_shape.lens().back();
        auto k           = a_shape.lens().back();
        auto o           = c_shape.lens().back();

        const bool trans_a  = transposed_matrix(a_shape);
        const bool trans_b  = transposed_matrix(b_shape);
        const bool trans_b1 = transposed_matrix(b1_shape);
        const bool trans_c  = transposed_matrix(c_shape);
        const auto a_type   = get_type(a_shape);
        const auto b_type   = get_type(b_shape);
        const auto b1_type  = get_type(b1_shape);
        const auto c_type   = get_type(c_shape);

        std::string ck_passthrough = "ck_passthrough";
        return ck::host::device_batched_gemm_softmax_gemm::Problem{m,
                                                                   n,
                                                                   k,
                                                                   o,
                                                                   trans_a,
                                                                   trans_b,
                                                                   trans_b1,
                                                                   trans_c,
                                                                   a_type,
                                                                   b_type,
                                                                   b1_type,
                                                                   c_type,
                                                                   ck_passthrough,
                                                                   ck_passthrough,
                                                                   ck_passthrough,
                                                                   ck_passthrough};
    }

    operation compile_op(context& ctx, const std::vector<shape>& inputs, const value& v) const
    {
        const auto& c_shape = inputs.back();
        auto tuning_value   = v.get("tuning_value", 5);
        auto batch_count    = get_batch_count(c_shape);
        auto problem        = create_problem(inputs, v);

        const auto include_header   = problem.GetIncludeHeader();
        const auto solutions        = problem.GetSolutions(ctx.get_current_device().get_gfx_name());
        const auto& solution        = solutions.at(tuning_value);
        const auto template_str     = solution.template_str;
        const auto blocks_per_batch = solution.grid_size;
        const auto block_size       = solution.block_size;

        hip_compile_options options;
        options.additional_src_files = ck_headers();
        auto grid_size = can_fold_batch(inputs) ? blocks_per_batch : batch_count * blocks_per_batch;
        options.set_launch_params(v, grid_size * block_size, block_size);
        options.inputs         = inputs;
        options.output         = c_shape;
        options.kernel_name    = v.get("kernel", "ck_gemm_softmax_gemm_kernel");
        options.virtual_inputs = inputs;
        if(can_fold_batch(inputs))
        {
            auto vinputs = inputs;
            fold_batch_dims(vinputs[0]);
            remove_batch_dims(vinputs[1]);
            std::for_each(vinputs.begin() + 2, vinputs.end(), fold_batch_dims);
            options.virtual_inputs = vinputs;
        }

        if(v.get("check", false) or enabled(MIGRAPHX_CK_DEBUG{}))
            options.emplace_param("-DMIGRAPHX_CK_CHECK=1");

        // scale
        assert(v.contains("scale"));
        auto scale = v.at("scale").to<float>();
        options.emplace_param("-DSCALE=" + std::to_string(scale));

        auto src = interpolate_string(ck_gemm_softmax_gemm_kernel,
                                      {{"solution", template_str},
                                       {"include", include_header},
                                       {"params", enum_params(inputs.size(), "void * private_p")},
                                       {"args", enum_params(inputs.size(), "private_p")},
                                       {"blocks_per_batch", to_string(blocks_per_batch)},
                                       {"preamble", v.get("preamble", std::string{})},
                                       {"kernel", options.kernel_name}});

        return compile_hip_code_object(ctx, src, options);
    }

    value create_settings(instruction_ref ins, const operation& op) const
    {
        auto v      = op.to_value();
        v["kernel"] = "ck_gemm_softmax_gemm_kernel";
        if(not ins->module_inputs().empty())
        {
            auto* pm      = ins->module_inputs().front();
            v["preamble"] = generate_pointwise(*pm, "post_ck_gemm_softmax_gemm_function") +
                            "\nMIGRAPHX_LIFT_CLASS(post_ck_gemm_softmax_gemm, "
                            "post_ck_gemm_softmax_gemm_function);";
            v["post"]   = "ck_function_adaptor<post_ck_gemm_softmax_gemm>";
            v["kernel"] = "ck_gemm_softmax_gemm_" + generate_name_from_ops(*pm) + "_kernel";
        }
        return v;
    }

    compiler_replace
    compile(context& ctx, instruction_ref ins, const operation& op, const value& solution) const
    {
        auto shapes = to_shapes(ins->inputs());
        auto v      = create_settings(ins, op);
        if(not solution.is_null())
            v["tuning_value"] = solution;
        return {compile_op(ctx, shapes, v),
                [=](module& m, instruction_ref ins2, const operation& code_object) {
                    if(enabled(MIGRAPHX_LOG_CK_GEMM{}))
                    {
                        std::vector<shape> gemm_shapes{
                            shapes[0], shapes[1], shapes.back().with_type(shapes[0].type())};
                        std::cout << "gpu::ck_gemm_softmax_gemm: "
                                  << to_json_string(to_value(gemm_shapes)) << std::endl;
                    }
                    m.replace_instruction(ins2, code_object, ins2->inputs());
                }};
    }

    optional<tuning_config>
    get_tuning_config(context& ctx, instruction_ref ins, const operation& op, bool exhaustive) const
    {
        if(not exhaustive and not enabled(MIGRAPHX_TUNE_CK{}))
            return nullopt;
        tuning_config tc;
        auto shapes    = to_shapes(ins->inputs());
        auto problem   = create_problem(shapes, create_settings(ins, op));
        auto solutions = problem.GetSolutions(ctx.get_current_device().get_gfx_name());
        tc.solutions.resize(solutions.size());
        std::iota(tc.solutions.begin(), tc.solutions.end(), 0);
        std::vector<shape> gemm_shapes{shapes[0], shapes[1], shapes.back()};
        tc.problem = to_value(gemm_shapes);
        return tc;
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
