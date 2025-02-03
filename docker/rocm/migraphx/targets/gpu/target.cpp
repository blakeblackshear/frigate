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
#include <migraphx/adjust_allocation.hpp>
#include <migraphx/auto_contiguous.hpp>
#include <migraphx/check_context.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/eliminate_allocation.hpp>
#include <migraphx/eliminate_concat.hpp>
#include <migraphx/eliminate_contiguous.hpp>
#include <migraphx/eliminate_data_type.hpp>
#include <migraphx/eliminate_identity.hpp>
#include <migraphx/eliminate_pad.hpp>
#include <migraphx/fp8_ocp_to_fnuz.hpp>
#include <migraphx/fuse_concat.hpp>
#include <migraphx/fuse_pointwise_reduce.hpp>
#include <migraphx/inline_module.hpp>
#include <migraphx/insert_pad.hpp>
#include <migraphx/layout_convolution.hpp>
#include <migraphx/memory_coloring.hpp>
#include <migraphx/normalize_ops.hpp>
#include <migraphx/optimize_module.hpp>
#include <migraphx/preallocate_param.hpp>
#include <migraphx/promote_literals.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/replace_allocate.hpp>
#include <migraphx/rewrite_gelu.hpp>
#include <migraphx/rewrite_low_precision.hpp>
#include <migraphx/rewrite_pooling.hpp>
#include <migraphx/rewrite_reduce.hpp>
#include <migraphx/rewrite_quantization.hpp>
#include <migraphx/rewrite_rnn.hpp>
#include <migraphx/schedule.hpp>
#include <migraphx/simplify_dyn_ops.hpp>
#include <migraphx/simplify_qdq.hpp>
#include <migraphx/simplify_reshapes.hpp>
#include <migraphx/split_reduce.hpp>
#include <migraphx/split_single_dyn_dim.hpp>
#include <migraphx/gpu/allocation_model.hpp>
#include <migraphx/gpu/compile_hipblaslt.hpp>
#include <migraphx/gpu/compile_miopen.hpp>
#include <migraphx/gpu/compile_ops.hpp>
#include <migraphx/gpu/concat_gpu_opt.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/device_name.hpp>
#include <migraphx/gpu/fuse_ck.hpp>
#include <migraphx/gpu/fuse_mlir.hpp>
#include <migraphx/gpu/fuse_ops.hpp>
#include <migraphx/gpu/prefuse_ops.hpp>
#include <migraphx/gpu/lowering.hpp>
#include <migraphx/gpu/schedule_model.hpp>
#include <migraphx/gpu/sync_device.hpp>
#include <migraphx/gpu/target.hpp>
#include <migraphx/gpu/write_literals.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_DISABLE_SCHEDULE_PASS)
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_NHWC)
#ifndef _WIN32
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_CK)
#endif
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_HIPBLASLT_GEMM)

std::vector<pass> target::get_passes(migraphx::context& gctx, const compile_options& options) const
{
    auto& ctx = any_cast<context>(gctx);
    ctx.set_exhaustive_tune_flag(options.exhaustive_tune);
    ctx.load_problem_cache();
    std::set<shape::type_t> unsupported_types(shape::types().begin(), shape::types().end());
    unsupported_types.erase(shape::type_t::float_type);
    unsupported_types.erase(shape::type_t::fp8e4m3fnuz_type);
    unsupported_types.erase(shape::type_t::fp8e5m2fnuz_type);
    unsupported_types.erase(shape::type_t::fp8e4m3fn_type);
    unsupported_types.erase(shape::type_t::fp8e5m2_type);
    unsupported_types.erase(shape::type_t::half_type);
    unsupported_types.erase(shape::type_t::bool_type);
    unsupported_types.erase(shape::type_t::int8_type);
    unsupported_types.erase(shape::type_t::uint8_type);
    unsupported_types.erase(shape::type_t::int32_type);
    unsupported_types.erase(shape::type_t::tuple_type);
    unsupported_types.erase(shape::type_t::bf16_type);

    // whiltelist supported Ops for the FP8 types
    // different between fp8e4m3fnuz and OCP types because rocBLAS only has
    // support for fp8e4m3fnuz
    std::set<std::string> unsupported_fp8e4m3fnuz_ops = {};
    if(not enabled(MIGRAPHX_ENABLE_HIPBLASLT_GEMM{}) and not gpu::rocblas_fp8_available())
    {
        unsupported_fp8e4m3fnuz_ops.insert("dot");
        unsupported_fp8e4m3fnuz_ops.insert("quant_dot");
    }
#if MIGRAPHX_USE_MIOPEN
    // MIOpen doesn't have support for fp8 pooling yet.
    unsupported_fp8e4m3fnuz_ops.insert("pooling");
#endif
    if(not gpu::gfx_has_fp8fnuz_intrinsics())
    {
        unsupported_fp8e4m3fnuz_ops.insert("convolution");
        unsupported_fp8e4m3fnuz_ops.insert("quant_convolution");
    }
    // add all device kernels
    unsupported_fp8e4m3fnuz_ops.insert("logsoftmax");
    unsupported_fp8e4m3fnuz_ops.insert("nonzero");
    unsupported_fp8e4m3fnuz_ops.insert("prefix_scan_sum");
    unsupported_fp8e4m3fnuz_ops.insert("scatter_none");
    unsupported_fp8e4m3fnuz_ops.insert("topk");
    unsupported_fp8e4m3fnuz_ops.insert("rnn_var_sl_shift_output");
    unsupported_fp8e4m3fnuz_ops.insert("multinomial");
    unsupported_fp8e4m3fnuz_ops.insert("argmax");
    unsupported_fp8e4m3fnuz_ops.insert("argmin");

    std::set<std::string> unsupported_fp8e5m2fnuz_ops = unsupported_fp8e4m3fnuz_ops;
    // disable gemm for fp8e5m2fnuz if rocBLAS is being used
    if(not enabled(MIGRAPHX_ENABLE_HIPBLASLT_GEMM{}))
    {
        unsupported_fp8e5m2fnuz_ops.insert("dot");
        unsupported_fp8e5m2fnuz_ops.insert("quant_dot");
    }

    std::set<std::string> unsupported_fp8ocp_ops = {};
    // TODO: remove this when the flag is removed
    if(not enabled(MIGRAPHX_ENABLE_HIPBLASLT_GEMM{}))
    {
        unsupported_fp8ocp_ops.insert("dot");
        unsupported_fp8ocp_ops.insert("quant_dot");
    }
#if MIGRAPHX_USE_MIOPEN
    // MIOpen doesn't have support for fp8 pooling yet.
    unsupported_fp8ocp_ops.insert("pooling");
#endif
    if(not gpu::gfx_has_fp8ocp_intrinsics())
    {
        unsupported_fp8ocp_ops.insert("convolution");
        unsupported_fp8ocp_ops.insert("quant_convolution");
        unsupported_fp8ocp_ops.insert("dot");
        unsupported_fp8ocp_ops.insert("quant_dot");
    }
    // add all device kernels
    unsupported_fp8ocp_ops.insert("logsoftmax");
    unsupported_fp8ocp_ops.insert("nonzero");
    unsupported_fp8ocp_ops.insert("prefix_scan_sum");
    unsupported_fp8ocp_ops.insert("scatter_none");
    unsupported_fp8ocp_ops.insert("topk");
    unsupported_fp8ocp_ops.insert("rnn_var_sl_shift_output");
    unsupported_fp8ocp_ops.insert("multinomial");
    unsupported_fp8ocp_ops.insert("argmax");
    unsupported_fp8ocp_ops.insert("argmin");

    // clang-format off
    return
    {
        split_single_dyn_dim{},
        dead_code_elimination{},
        simplify_dyn_ops{},
        dead_code_elimination{},
        normalize_ops{},
        dead_code_elimination{},
        eliminate_identity{},
        dead_code_elimination{},
        enable_pass(not gpu::gfx_has_fp8ocp_intrinsics() and gpu::gfx_has_fp8fnuz_intrinsics(), fp8_ocp_to_fnuz{}),
        enable_pass(not gpu::gfx_has_fp8ocp_intrinsics() and gpu::gfx_has_fp8fnuz_intrinsics(), dead_code_elimination{}),
        simplify_qdq{},
        enable_pass(not mlir_enabled(), rewrite_quantization{}),
        dead_code_elimination{},
        // workaround for rocBLAS unsupported error when using uint8 in quant_dot, quant_convolution & pooling
        eliminate_data_type{{migraphx::shape::uint8_type}, shape::float_type, {"quant_convolution", "quant_dot", "pooling"}},
        eliminate_data_type{unsupported_types, shape::type_t::float_type},
        simplify_reshapes{},
        eliminate_identity{},
        eliminate_pad{},
        dead_code_elimination{},
        insert_pad{{"convolution"}},
        dead_code_elimination{},
        rewrite_rnn{},
        dead_code_elimination{},
        inline_module{},
        rewrite_pooling{},
        dead_code_elimination{},
        rewrite_gelu{options.fast_math},
        optimize_module{},
        layout_convolution{.channels_last = enabled(MIGRAPHX_ENABLE_NHWC{})},
        dead_code_elimination{},
        prefuse_ops{},
        dead_code_elimination{},
        eliminate_data_type{{migraphx::shape::fp8e4m3fnuz_type}, shape::float_type, unsupported_fp8e4m3fnuz_ops},
        eliminate_data_type{{migraphx::shape::fp8e5m2fnuz_type}, shape::float_type, unsupported_fp8e5m2fnuz_ops},
        eliminate_data_type{{migraphx::shape::fp8e4m3fn_type, migraphx::shape::fp8e5m2_type}, shape::float_type, unsupported_fp8ocp_ops},
        dead_code_elimination{},
        rewrite_reduce{},
        rewrite_low_precision{},
        dead_code_elimination{},
        optimize_module{},
        fuse_pointwise_reduce{},
        dead_code_elimination{},
#ifndef _WIN32
        enable_pass(enabled(MIGRAPHX_ENABLE_CK{}), fuse_ck{}),
#endif
        dead_code_elimination{},
        enable_pass(mlir_enabled(), fuse_mlir{&ctx}),
        dead_code_elimination{},
        fuse_concat{},
        dead_code_elimination{},
        auto_contiguous{},
        dead_code_elimination{},
        lowering{&ctx, options.offload_copy},
        eliminate_contiguous{"gpu::contiguous"},
        dead_code_elimination{},
        eliminate_concat{concat_gpu_optimization{}},
        dead_code_elimination{},
#if MIGRAPHX_USE_MIOPEN
        compile_miopen{&gctx},
        dead_code_elimination{},
#endif
        fuse_ops{&ctx, options.fast_math},
        dead_code_elimination{},
#if MIGRAPHX_USE_HIPBLASLT
        compile_hipblaslt{&gctx},
        dead_code_elimination{},
#endif
        replace_allocate{gpu_allocation_model{}, options.offload_copy},
        dead_code_elimination{},
        adjust_allocation{gpu_allocation_model{}},
        dead_code_elimination{},
        compile_ops{&ctx, options.exhaustive_tune},
        dead_code_elimination{},
        promote_literals{},
        dead_code_elimination{},
        write_literals{&ctx},
        schedule{gpu::schedule_model{ctx.get_current_device().nstreams()}, not enabled(MIGRAPHX_DISABLE_SCHEDULE_PASS{})},
        memory_coloring{"hip::allocate"},
        sync_device{},
        preallocate_param{"scratch", gpu_allocation_model{}},
        dead_code_elimination{},
        eliminate_allocation{"hip::allocate"},
        check_context<context>{},
        normalize_ops{},
        dead_code_elimination{},
        eliminate_identity{}
    };
    // clang-format on
}

std::string target::name() const { return "gpu"; }

migraphx::context target::get_context() const { return context(gpu::get_device_id()); }

argument target::copy_to(const argument& arg) const { return gpu::to_gpu(arg); }

argument target::copy_from(const argument& arg) const { return gpu::from_gpu(arg); }

argument target::allocate(const shape& s) const { return gpu::allocate_gpu(s); }

MIGRAPHX_REGISTER_TARGET(target);

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
