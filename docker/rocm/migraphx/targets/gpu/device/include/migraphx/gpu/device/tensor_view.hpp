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

#ifndef MIGRAPHX_GUARD_RTGLIB_DEVICE_TENSOR_VIEW_HPP
#define MIGRAPHX_GUARD_RTGLIB_DEVICE_TENSOR_VIEW_HPP

#include <migraphx/gpu/device/shape.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

template <class T, index_int N>
struct hip_tensor_view
{
    using value_type                      = T;
    using hip_index                       = typename hip_shape<N>::hip_index;
    __device__ __host__ hip_tensor_view() = default;
    __host__ hip_tensor_view(tensor_view<T> x) : d(x.data()), s(x.get_shape()) {}
    __host__ hip_tensor_view(T* x, const shape& ss) : d(x), s(ss) {}

    MIGRAPHX_DEVICE_CONSTEXPR const hip_shape<N>& get_shape() const { return s; }

    MIGRAPHX_DEVICE_CONSTEXPR index_int size() const { return s.elements(); }

    MIGRAPHX_DEVICE_CONSTEXPR value_type* data() const { return d; }

    template <class U>
    MIGRAPHX_DEVICE_CONSTEXPR value_type& operator[](U i) const
    {
        return d[s.index(i)];
    }

    MIGRAPHX_DEVICE_CONSTEXPR value_type* begin() const { return d; }

    MIGRAPHX_DEVICE_CONSTEXPR value_type* end() const { return d + size(); }

    private:
    value_type* d = nullptr;
    hip_shape<N> s{};
};

template <index_int N, class T>
hip_tensor_view<T, N> make_hip_view(const shape& s, T* x)
{
    return {x, s};
}

template <index_int N, class T>
hip_tensor_view<T, N> make_hip_view(tensor_view<T> x)
{
    return {x};
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
