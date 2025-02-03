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
#ifndef MIGRAPHX_GUARD_KERNELS_SCATTER_REDUCTION_MODES_HPP
#define MIGRAPHX_GUARD_KERNELS_SCATTER_REDUCTION_MODES_HPP

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/atomic.hpp>

namespace migraphx {

struct assign_none
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR void operator()(T& x, U y) const
    {
        x = y;
    }
};

struct assign_add
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR void operator()(T& x, U y) const
    {
        atomic_assign(x, y, op::sum{});
    }
};

struct assign_mul
{
    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR void operator()(T& x, U y) const
    {
        atomic_assign(x, y, op::product{});
    }
};

struct assign_max
{
    template <typename T, typename U>
    MIGRAPHX_DEVICE_CONSTEXPR void operator()(T& x, U y) const
    {
        atomic_assign(x, y, op::max{});
    }
};

struct assign_min
{
    template <typename T, typename U>
    MIGRAPHX_DEVICE_CONSTEXPR void operator()(T& x, U y) const
    {
        atomic_assign(x, y, op::min{});
    }
};

} // namespace migraphx
#endif
