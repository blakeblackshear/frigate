/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_RTGLIB_DEAVICE_TENSOR_HPP
#define MIGRAPHX_GUARD_RTGLIB_DEAVICE_TENSOR_HPP

#include <migraphx/gpu/device/visit.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

template <index_int NDim>
using hip_tensor_index = hip_array<index_int, NDim>;

template <index_int NDim>
struct hip_tensor_descriptor
{
    __device__ __host__ hip_tensor_descriptor() = default;

    hip_tensor_descriptor(const shape& s)
    {
        std::copy(s.lens().begin(), s.lens().end(), lens);
        std::copy(s.strides().begin(), s.strides().end(), strides);
    }

    __device__ __host__ hip_tensor_index<NDim> multi(index_int idx) const
    {
        hip_tensor_index<NDim> result{};
        index_int tidx = idx;
        for(index_int is = 0; is < NDim; is++)
        {
            result[is] = tidx / strides[is];
            tidx       = tidx % strides[is];
        }

        return result;
    }
    __device__ __host__ index_int linear(hip_tensor_index<NDim> s) const
    {
        index_int idx = 0;
        for(index_int i = 0; i < NDim; i++)
            idx += s[i] * strides[i];
        return idx;
    }
    index_int lens[NDim]    = {};
    index_int strides[NDim] = {};
};

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
