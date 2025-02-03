/* ************************************************************************
 * Copyright (C) 2016-2023 Advanced Micro Devices, Inc. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell cop-
 * ies of the Software, and to permit persons to whom the Software is furnished
 * to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IM-
 * PLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNE-
 * CTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ************************************************************************ */
#ifndef MIGRAPHX_GUARD_KERNELS_BITCAST_HPP
#define MIGRAPHX_GUARD_KERNELS_BITCAST_HPP

#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/vec.hpp>

namespace migraphx {

template <typename To,
          typename From,
          MIGRAPHX_REQUIRES(is_trivially_copyable<To>{} and is_trivially_copyable<From>{})>
inline constexpr auto bit_cast(From fr) noexcept
{
    return vec_transform(fr)([](auto x) -> To {
        static_assert(sizeof(To) == sizeof(decltype(x)));
        return __builtin_bit_cast(To, x);
    });
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_BITCAST_HPP
