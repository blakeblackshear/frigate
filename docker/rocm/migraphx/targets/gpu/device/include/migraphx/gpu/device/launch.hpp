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
#ifndef MIGRAPHX_GUARD_RTGLIB_DEVICE_LAUNCH_HPP
#define MIGRAPHX_GUARD_RTGLIB_DEVICE_LAUNCH_HPP

#include <hip/hip_runtime.h>
#include <migraphx/config.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/gpu/device/types.hpp>
#include <migraphx/gpu/device/targets.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

struct index
{
    index_int global = 0;
    index_int local  = 0;
    index_int group  = 0;

    __device__ index_int nglobal() const { return blockDim.x * gridDim.x; } // NOLINT

    __device__ index_int nlocal() const { return blockDim.x; }              // NOLINT

    template <class F>
    __device__ void global_stride(index_int n, F f) const
    {
        const auto stride = nglobal();
        for(index_int i = global; i < n; i += stride)
        {
            f(i);
        }
    }

    template <class F>
    __device__ void local_stride(index_int n, F f) const
    {
        const auto stride = nlocal();
        for(index_int i = local; i < n; i += stride)
        {
            f(i);
        }
    }
};

template <class F>
__global__ void launcher(F f)
{
    index idx{blockIdx.x * blockDim.x + threadIdx.x, threadIdx.x, blockIdx.x}; // NOLINT
    f(idx);
}

inline auto launch(hipStream_t stream, index_int global, index_int local)
{
    return [=](auto f) {
        assert(local > 0);
        assert(global > 0);
        using f_type = decltype(f);
        dim3 nblocks(global / local);
        dim3 nthreads(local);
        /*
        hipGetLastError() returns error for the first failed HIP call that happened previously.
        MIGraphX calls into various backend libraries and failed HIP calls can also happen there.
        Calling hipGetLastError() would reset error code to hipSuccess, so that inside MIGraphX
        failed call to hipLaunchKernelGGL() can be captured.
        */
        hipError_t flush_call = hipGetLastError();
        (void)(flush_call);
        // cppcheck-suppress migraphx-UseDeviceLaunch
        hipLaunchKernelGGL((launcher<f_type>), nblocks, nthreads, 0, stream, f);
        hipError_t kernel_launch_status = hipGetLastError();
        if(kernel_launch_status != hipSuccess)
        {
            std::string message = hipGetErrorString(kernel_launch_status);
            if(not contains(get_targets(), get_device_name()))
            {
                message += ". Trying to run a kernel for " + get_device_name() +
                           " but MIGraphX was built for targets " + get_targets_as_string() +
                           ". Please rebuild MIGraphX with -DGPU_TARGETS='" + get_device_name() +
                           "'.";
            }
            MIGRAPHX_THROW("MIGraphX device kernel failed to launch with error: " + message);
        }
    };
}

template <class F>
MIGRAPHX_DEVICE_CONSTEXPR auto gs_invoke(F&& f, index_int i, index idx) -> decltype(f(i, idx))
{
    return f(i, idx);
}

template <class F>
MIGRAPHX_DEVICE_CONSTEXPR auto gs_invoke(F&& f, index_int i, index) -> decltype(f(i))
{
    return f(i);
}

inline auto gs_launch(hipStream_t stream, index_int n, index_int local = 1024)
{
    index_int groups = (n + local - 1) / local;
    // max possible number of blocks is set to 1B (1,073,741,824)
    index_int nglobal = std::min<index_int>(1073741824, groups) * local;

    return [=](auto f) {
        launch(stream, nglobal, local)([=](auto idx) __device__ {
            idx.global_stride(n, [&](auto i) { gs_invoke(f, i, idx); });
        });
    };
}

#ifdef MIGRAPHX_USE_CLANG_TIDY
#define MIGRAPHX_DEVICE_SHARED
#else
#define MIGRAPHX_DEVICE_SHARED __shared__
#endif

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
