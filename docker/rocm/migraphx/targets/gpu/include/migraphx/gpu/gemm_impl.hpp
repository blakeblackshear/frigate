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
#ifndef MIGRAPHX_GUARD_RTGLIB_GEMM_IMPL_HPP
#define MIGRAPHX_GUARD_RTGLIB_GEMM_IMPL_HPP

#include <iterator>
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/gpu/context.hpp>

// Set this environment variable to "true" to perform GEMM tuning even when the
// --exhaustive-tune option isn't set.  Can be used to skip slow convolution tuning.
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_GEMM_TUNING);

using milliseconds = std::chrono::duration<double, std::milli>;
using microseconds = std::chrono::duration<double, std::micro>;

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

/**
 * @brief Templated implementations of the compute() and finalize() methods of the Gemm operator.
 *        For each function there are overloads using either float or int32_t for the arguments
 * alpha and beta.
 *
 * @param ctx .
 * @param output_shape .
 * @param args .
 * @param alpha .
 * @param beta .
 * @param compute_fp32 .
 */
void gemm_compute(context& ctx,
                  const shape& output_shape,
                  const std::vector<argument>& args,
                  float alpha,
                  float beta,
                  bool compute_fp32,
                  int32_t solution_idx);

void gemm_compute(context& ctx,
                  const shape& output_shape,
                  const std::vector<argument>& args,
                  int32_t alpha,
                  int32_t beta,
                  bool compute_fp32,
                  int32_t solution_idx);

int32_t gemm_finalize(context& ctx,
                      const shape& output_shape,
                      const std::vector<shape>& input_shapes,
                      float alpha,
                      float beta,
                      bool compute_fp32);

int32_t gemm_finalize(context& ctx,
                      const shape& output_shape,
                      const std::vector<shape>& input_shapes,
                      int32_t alpha,
                      int32_t beta,
                      bool compute_fp32,
                      int32_t solution_idx);

int32_t gemm_default_solution(context& ctx,
                              const shape& output_shape,
                              const std::vector<shape>& input_shapes);

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
