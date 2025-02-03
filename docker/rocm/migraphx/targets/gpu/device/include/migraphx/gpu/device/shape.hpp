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

#ifndef MIGRAPHX_GUARD_RTGLIB_DEVICE_SHAPE_HPP
#define MIGRAPHX_GUARD_RTGLIB_DEVICE_SHAPE_HPP

#include <migraphx/gpu/device/array.hpp>
#include <migraphx/gpu/device/fast_div.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

template <index_int N>
struct hip_shape
{
    using hip_index                  = hip_array<index_int, N>;
    hip_index lens                   = {};
    hip_index strides                = {};
    hip_array<std::uint64_t, N> divs = {};
    bool standard                    = false;

    __device__ __host__ hip_shape() = default;

    hip_shape(const shape& s) : standard(s.standard())
    {
        assert(s.lens().size() == N);
        assert(s.strides().size() == N);
        std::copy(s.lens().begin(), s.lens().end(), lens.begin());
        std::copy(s.strides().begin(), s.strides().end(), strides.begin());
        assert(std::all_of(s.lens().begin(), s.lens().end(), &is_divisor_encodable));
        std::transform(s.lens().begin(), s.lens().end(), divs.begin(), &encode_divisor);
    }

    MIGRAPHX_DEVICE_CONSTEXPR index_int elements() const { return lens.product(); }

    MIGRAPHX_DEVICE_CONSTEXPR index_int index(hip_index x) const { return x.dot(strides); }

    MIGRAPHX_DEVICE_CONSTEXPR index_int index(std::initializer_list<index_int> x) const
    {
        index_int idx = 0;
        for(index_int i = 0; i < x.size(); i++)
            idx += *(x.begin() + i) * strides[i];
        return idx;
    }

    MIGRAPHX_DEVICE_CONSTEXPR index_int index(index_int i) const
    {
        if(this->standard)
            return i;
        else
        {
            const index_int rank = this->lens.size();
            index_int s          = 1;
            index_int result     = 0;
            for(index_int j = 0; j < this->lens.size(); j++)
            {
                const index_int k      = rank - j - 1;
                const index_int stride = this->strides[k];
                const index_int len    = this->lens[k];
                const index_int slen   = s * len;
                const index_int idx    = (i % slen) / s;
                result += stride * idx;
                s = slen;
            }
            return result;
        }
    }

    MIGRAPHX_DEVICE_CONSTEXPR hip_index multi(index_int idx) const
    {
        hip_index result;
        index_int tidx = idx;
        for(std::ptrdiff_t is = result.size() - 1; is > 0; is--)
        {
            // result[is] = tidx % lens[is];
            // tidx = tidx / lens[is];
            auto q     = fast_div(tidx, divs[is]);
            result[is] = remainder(q, tidx, lens[is]);
            tidx       = q;
        }
        result[0] = tidx;
        return result;
    }
};

template <index_int N>
hip_shape<N> make_hip_shape(const shape& x)
{
    return x;
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
