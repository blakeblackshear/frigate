/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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

#ifndef MIGRAPHX_GUARD_RTGLIB_GPU_DEVICE_TYPES_HPP
#define MIGRAPHX_GUARD_RTGLIB_GPU_DEVICE_TYPES_HPP

#include <hip/hip_runtime.h>
#include <migraphx/half.hpp>
#include <migraphx/bf16.hpp>
#include <migraphx/config.hpp>
#include <migraphx/tensor_view.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

using index_int = std::uint32_t;

#define MIGRAPHX_DEVICE_CONSTEXPR constexpr __device__ __host__ // NOLINT

template <class T, index_int N>
using vec = T __attribute__((ext_vector_type(N)));

template <index_int N, class T>
__device__ __host__ T* as_pointer(vec<T, N>* x)
{
    return reinterpret_cast<T*>(x);
}

template <index_int N, class T>
__device__ __host__ vec<T, N>* as_vec(T* x)
{
    return reinterpret_cast<vec<T, N>*>(x);
}

template <index_int N, class T>
tensor_view<vec<T, N>> as_vec(tensor_view<T> x)
{
    return {x.get_shape(), as_vec<N>(x.data())};
}

template <index_int N, class... Ts>
auto pack_vec(Ts... xs)
{
    return [=](auto f, index_int n) { return f(as_vec<N>(xs)[n]...); };
}

using gpu_half = __fp16;
using gpu_bf16 = __bf16;

namespace detail {
template <class T>
struct device_type
{
    using type = T;
};

template <class T, index_int N>
struct device_type<vec<T, N>>
{
    using type = vec<typename device_type<T>::type, N>;
};

template <>
struct device_type<half>
{
    using type = gpu_half;
};

template <>
struct device_type<bf16>
{
    using type = gpu_bf16;
};

template <class T>
struct host_type
{
    using type = T;
};

template <>
struct host_type<gpu_half>
{
    using type = half;
};

template <>
struct host_type<gpu_bf16>
{
    using type = bf16;
};

} // namespace detail

template <class T>
using host_type = typename detail::host_type<T>::type;

template <class T>
using device_type = typename detail::device_type<T>::type;

template <class T>
host_type<T> host_cast(T x)
{
    return reinterpret_cast<const host_type<T>&>(x);
}

template <class T>
host_type<T>* host_cast(T* x)
{
    return reinterpret_cast<host_type<T>*>(x);
}

template <class T>
__device__ __host__ device_type<T> device_cast(const T& x)
{
    return reinterpret_cast<const device_type<T>&>(x);
}

template <class T>
__device__ __host__ device_type<T>* device_cast(T* x)
{
    return reinterpret_cast<device_type<T>*>(x);
}

template <class T>
__device__ __host__ tensor_view<device_type<T>> device_cast(tensor_view<T> x)
{
    return {x.get_shape(), reinterpret_cast<device_type<T>*>(x.data())};
}

template <class T>
__device__ __host__ T to_hip_type(T x)
{
    return x;
}

// Hip doens't support __fp16 and __bf16
inline __device__ __host__ float to_hip_type(gpu_half x) { return x; }
inline __device__ __host__ float to_hip_type(gpu_bf16 x) { return x; }

template <class X>
struct is_floating_point : std::is_floating_point<X>
{
};

template <>
struct is_floating_point<__fp16> : std::true_type
{
};

template <class X>
struct is_signed : std::is_signed<X>
{
};

template <>
struct is_signed<__fp16> : std::true_type
{
};

template <class X>
struct is_arithmetic : std::is_arithmetic<X>
{
};

template <>
struct is_arithmetic<__fp16> : std::true_type
{
};

// Redo for __bf16
template <>
struct is_floating_point<__bf16> : std::true_type
{
};
template <>
struct is_signed<__bf16> : std::true_type
{
};
template <>
struct is_arithmetic<__bf16> : std::true_type
{
};

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
