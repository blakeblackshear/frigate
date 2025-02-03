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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_TYPES_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_TYPES_HPP

#include <migraphx/kernels/hip.hpp>

namespace migraphx {

#if defined(MIGRAPHX_USE_HIPRTC)
using int8_t   = signed char;
using uint8_t  = unsigned char;
using int16_t  = signed short;
using uint16_t = unsigned short;
using int32_t  = signed int;
using uint32_t = unsigned int;
using int64_t  = signed long long;
using uint64_t = unsigned long long;
#elif defined(MIGRAPHX_USE_HIPRTC)
using int8_t   = __hip_int8_t;
using uint8_t  = __hip_uint8_t;
using int16_t  = __hip_int16_t;
using uint16_t = __hip_uint16_t;
using int32_t  = __hip_int32_t;
using uint32_t = __hip_uint32_t;
using int64_t  = __hip_int64_t;
using uint64_t = __hip_uint64_t;
#else
using int8_t   = std::int8_t;
using uint8_t  = std::uint8_t;
using int16_t  = std::int16_t;
using uint16_t = std::uint16_t;
using int32_t  = std::int32_t;
using uint32_t = std::uint32_t;
using int64_t  = std::int64_t;
using uint64_t = std::uint64_t;
#endif // MIGRAPHX_USE_HIPRTC
using index_int = uint32_t;
using diff_int  = int32_t;
using uintptr_t = uint64_t;

static_assert(sizeof(int8_t) == 1, "int8_t must be 1 bytes");
static_assert(sizeof(uint8_t) == 1, "uint8_t must be 1 bytes");
static_assert(sizeof(int16_t) == 2, "int16_t must be 2 bytes");
static_assert(sizeof(uint16_t) == 2, "uint16_t must be 2 bytes");
static_assert(sizeof(int32_t) == 4, "int32_t must be 4 bytes");
static_assert(sizeof(uint32_t) == 4, "uint32_t must be 4 bytes");
static_assert(sizeof(int64_t) == 8, "int64_t must be 8 bytes");
static_assert(sizeof(uint64_t) == 8, "uint64_t must be 8 bytes");

#define MIGRAPHX_DEVICE_CONSTEXPR constexpr __device__ __host__ // NOLINT

template <class T, index_int N>
using vec = T __attribute__((ext_vector_type(N)));

using half  = _Float16;
using half2 = migraphx::vec<half, 2>;
using bf16  = __bf16;

} // namespace migraphx

#endif
