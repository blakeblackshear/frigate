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
#ifndef MIGRAPHX_GUARD_KERNELS_CK_HPP
#define MIGRAPHX_GUARD_KERNELS_CK_HPP

#include <migraphx/kernels/debug.hpp>
#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/tensor_view.hpp>
#include <ck/utility/common_header.hpp>
#include <ck/tensor_description/tensor_descriptor.hpp>
#include <ck/tensor_description/tensor_descriptor_helper.hpp>
#include <ck/tensor_operation/gpu/device/tensor_layout.hpp>

namespace migraphx {

namespace detail {
template <class T>
struct to_ck_type_impl
{
    using type = T;
};
template <>
struct to_ck_type_impl<migraphx::half>
{
    using type = ck::half_t;
};

template <class T>
struct to_ck_type_impl<const T>
{
    using type = const typename to_ck_type_impl<T>::type;
};

template <class Shape>
constexpr bool is_row_major()
{
    constexpr auto strides = Shape{}.strides;
    MIGRAPHX_ASSERT(strides.size() >= 2);
    if(strides.back() == 1)
    {
        MIGRAPHX_ASSERT(not Shape{}.is_transposed());
        return true;
    }
    MIGRAPHX_ASSERT(strides[strides.size() - 2] == 1);

    return false;
}

} // namespace detail

template <class T>
using to_ck_type = typename detail::to_ck_type_impl<T>::type;

template <class T>
constexpr auto to_ck_pointer(T* x)
{
    return static_cast<to_ck_type<T>*>(x);
}

template <class T>
constexpr auto to_ck_const_pointer(const T* x)
{
    return static_cast<const to_ck_type<T>*>(x);
}

template <class Shape>
using to_ck_gemm_layout = conditional_t<detail::is_row_major<get_shape_c<Shape>>(),
                                        ck::tensor_layout::gemm::RowMajor,
                                        ck::tensor_layout::gemm::ColumnMajor>;

template <class Tensor>
constexpr auto to_ck_tensor()
{
    constexpr auto s = get_shape_c<Tensor>{};
    return sequence(s.lens.size(), [&](auto... is) {
        return ck::make_naive_tensor_descriptor(ck::make_tuple(s.lens[is]...),
                                                ck::make_tuple(s.strides[is]...));
    });
}

template <class F>
struct ck_function_adaptor : F
{
    template <class... Ts>
    constexpr ck_function_adaptor(Ts&&... xs) : F(static_cast<Ts&&>(xs)...)
    {
    }

    template <class T, class... Ts>
    constexpr void operator()(T& out, Ts&&... xs) const
    {
        out = static_cast<const F&>(*this)(static_cast<Ts&&>(xs)...);
    }
};

struct ck_nop
{
    template <class T>
    constexpr void operator()(T&) const
    {
    }
};

struct ck_passthrough
{
    template <class T, class U>
    constexpr void operator()(T& y, U x) const
    {
        y = x;
    }
};

struct ck_scale
{
    constexpr ck_scale(float s) : scale(s) {}

    template <class T, class U>
    constexpr void operator()(T& y, U x) const
    {
        y = x * static_cast<U>(scale);
    }

    float scale;
};

struct ck_add
{
    template <class T, class U>
    constexpr void operator()(T& y, U x) const
    {
        y += x;
    }
};

// In CK, the B matrix is ordered as N,K instead of K,N
template <class Dims>
constexpr auto ck_transposeb_dims(Dims dims)
{
    return unpack(dims, [](auto k, auto n) { return make_const_array(n, k); });
}

template <class Tensor>
using ck_transposeb = decltype(make_shape(ck_transposeb_dims(get_shape_c<Tensor>{}.lens),
                                          ck_transposeb_dims(get_shape_c<Tensor>{}.strides)));

#ifdef MIGRAPHX_CK_CHECK
#define MIGRAPHX_CK_STATIC_ASSERT static_assert
#else
#define MIGRAPHX_CK_STATIC_ASSERT(...)
#endif

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_CK_HPP
