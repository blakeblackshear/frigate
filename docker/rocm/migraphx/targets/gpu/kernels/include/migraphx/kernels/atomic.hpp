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
 *
 */
#ifndef MIGRAPHX_GUARD_KERNELS_ATOMIC_HPP
#define MIGRAPHX_GUARD_KERNELS_ATOMIC_HPP

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/bit_cast.hpp>
#include <migraphx/kernels/vec.hpp>
#include <migraphx/kernels/ops.hpp>
#include <migraphx/kernels/debug.hpp>
#include <migraphx/kernels/rank.hpp>

#ifndef MIGRAPHX_ALLOW_ATOMIC_CAS
// NOLINTNEXTLINE
#define MIGRAPHX_ALLOW_ATOMIC_CAS 0
#endif

// NOLINTNEXTLINE
#define MIGRAPHX_ATOMIC_CAS_WARNING() \
    MIGRAPHX_ASSERT(MIGRAPHX_ALLOW_ATOMIC_CAS and "Using atomicCAS is slow")

namespace migraphx {
namespace atomic {

using cas_rank = rank<1>;

template <class T, class Op, MIGRAPHX_REQUIRES(sizeof(T) == 4 or sizeof(T) == 8)>
MIGRAPHX_DEVICE_CONSTEXPR void cas(rank<1>, T& x, T y, Op op)
{
    MIGRAPHX_ATOMIC_CAS_WARNING();
    using storage    = conditional_t<sizeof(T) == 4, uint32_t, uint64_t>;
    storage* address = reinterpret_cast<storage*>(&x);
    storage expected = __hip_atomic_load(address, __ATOMIC_RELAXED, __HIP_MEMORY_SCOPE_AGENT);
    while(not __hip_atomic_compare_exchange_strong(address,
                                                   &expected,
                                                   bit_cast<storage>(op(bit_cast<T>(expected), y)),
                                                   __ATOMIC_RELAXED,
                                                   __ATOMIC_RELAXED,
                                                   __HIP_MEMORY_SCOPE_AGENT))
    {
    }
}

template <class T, index_int N, class Op>
MIGRAPHX_DEVICE_CONSTEXPR auto cas(rank<0>, vec<T, N>& x, vec<T, N> y, Op op)
    -> decltype(cas(cas_rank{}, x[0], y[0], op), void())
{
    for(index_int i = 0; i < N; i++)
    {
        cas(cas_rank{}, x[i], y[i], op);
    }
}

template <class T>
MIGRAPHX_DEVICE_CONSTEXPR auto builtin_assign(T& x, T y, op::sum)
    MIGRAPHX_RETURNS(unsafeAtomicAdd(&x, y));

__device__ inline void builtin_assign(half2& x, half2 y, op::sum)
{
    __builtin_amdgcn_global_atomic_fadd_v2f16(&x, y);
}

template <class T>
constexpr bool is_aligned(const void* ptr)
{
    auto iptr = bit_cast<uintptr_t>(ptr);
    return (iptr % alignof(T)) == 0;
}

__device__ inline void builtin_assign(half& x, half y, op::sum)
{
    half* address = &x;
    if(is_aligned<float>(address))
    {
        __builtin_amdgcn_global_atomic_fadd_v2f16(address, half2{half(y), half(0)});
    }
    else
    {
        __builtin_amdgcn_global_atomic_fadd_v2f16(address - 1, half2{half(0), half(y)});
    }
}

template <class T>
MIGRAPHX_DEVICE_CONSTEXPR auto builtin_assign(T& x, T y, op::min)
    MIGRAPHX_RETURNS(unsafeAtomicMin(&x, y));

template <class T>
MIGRAPHX_DEVICE_CONSTEXPR auto builtin_assign(T& x, T y, op::max)
    MIGRAPHX_RETURNS(unsafeAtomicMax(&x, y));

template <class T, index_int N, class Op>
MIGRAPHX_DEVICE_CONSTEXPR auto builtin_assign(vec<T, N>& x, vec<T, N> y, Op op)
    -> decltype(builtin_assign(x[0], y[0], op), void())
{
    for(index_int i = 0; i < N; i++)
    {
        builtin_assign(x[i], y[i], op);
    }
}

template <class T, class Op>
MIGRAPHX_DEVICE_CONSTEXPR auto assign(rank<0>, T& x, T y, Op op)
    MIGRAPHX_RETURNS(cas(cas_rank{}, x, y, op));

template <class T, class Op>
MIGRAPHX_DEVICE_CONSTEXPR auto assign(rank<1>, T& x, T y, Op op)
    MIGRAPHX_RETURNS(builtin_assign(x, y, op));

} // namespace atomic

template <class T, class U, class Op>
MIGRAPHX_DEVICE_CONSTEXPR void atomic_assign(T& x, U y, Op op)
{
    atomic::assign(rank<1>{}, x, T(y), op);
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_ATOMIC_HPP
