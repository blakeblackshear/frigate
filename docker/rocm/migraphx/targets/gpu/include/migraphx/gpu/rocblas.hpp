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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_ROCBLAS_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_ROCBLAS_HPP
#include <migraphx/manage_ptr.hpp>
#include <migraphx/gpu/config.hpp>
#if MIGRAPHX_USE_ROCBLAS
#include <rocblas/rocblas.h>
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
#if MIGRAPHX_USE_ROCBLAS

using rocblas_handle_ptr = MIGRAPHX_MANAGE_PTR(rocblas_handle, rocblas_destroy_handle);

rocblas_handle_ptr create_rocblas_handle_ptr();
rocblas_handle_ptr create_rocblas_handle_ptr(hipStream_t s);
#endif
struct context;

MIGRAPHX_GPU_EXPORT bool get_compute_fp32_flag();

MIGRAPHX_GPU_EXPORT bool rocblas_fp8_available();

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
