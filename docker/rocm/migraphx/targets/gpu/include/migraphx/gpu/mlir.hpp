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
#ifndef MIGRAPHX_GUARD_RTGLIB_GPU_MLIR_HPP
#define MIGRAPHX_GUARD_RTGLIB_GPU_MLIR_HPP

#include <string>
#include <vector>
#include <migraphx/value.hpp>
#include <migraphx/filesystem.hpp>
#include <migraphx/gpu/config.hpp>
#include <migraphx/gpu/code_object_op.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/gpu/tuning_config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
struct module;
namespace gpu {

MIGRAPHX_GPU_EXPORT std::string dump_mlir(module m);
MIGRAPHX_GPU_EXPORT std::string dump_mlir(module m, const std::vector<shape>& inputs);
MIGRAPHX_GPU_EXPORT void
dump_mlir_to_file(module m, const std::vector<shape>& inputs, const fs::path& location);

MIGRAPHX_GPU_EXPORT bool
is_module_fusible(const module& m, const context& migraphx_ctx, const value& solution);

struct MIGRAPHX_GPU_EXPORT mlir_code_object
{
    code_object_op cop;
    std::vector<size_t> prefill_indices = {};
    std::vector<value> prefill_values   = {};
};

MIGRAPHX_GPU_EXPORT bool is_reduce(const instruction& ins);

MIGRAPHX_GPU_EXPORT mlir_code_object compile_mlir(const context& migraphx_ctx,
                                                  module m,
                                                  const std::vector<shape>& in_shapes,
                                                  const value& solution);

MIGRAPHX_GPU_EXPORT instruction_ref insert_mlir(module& m,
                                                instruction_ref ins,
                                                code_object_op co,
                                                const std::vector<instruction_ref>& inputs);

MIGRAPHX_GPU_EXPORT tuning_config get_tuning_config_mlir(const context& migraphx_ctx,
                                                         module m,
                                                         const std::vector<shape>& inputs,
                                                         bool exhaustive);

MIGRAPHX_GPU_EXPORT void
dump_mlir_to_mxr(module m, const std::vector<instruction_ref>& inputs, const fs::path& location);

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
