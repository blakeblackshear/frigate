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
#ifndef MIGRAPHX_GUARD_KERNELS_TENSOR_VIEW_HPP
#define MIGRAPHX_GUARD_KERNELS_TENSOR_VIEW_HPP

#include <migraphx/kernels/shape.hpp>
#include <migraphx/kernels/debug.hpp>
#include <migraphx/kernels/iota_iterator.hpp>
#include <migraphx/kernels/float8.hpp>

namespace migraphx {

template <class T>
struct tensor_view_iterator_read
{
    T* view;
    constexpr auto& operator()(MIGRAPHX_CAPTURE_SOURCE_LOCATION(index_int) n) const
    {
        MIGRAPHX_ASSERT(view != nullptr);
        return (*view)[n];
    }
};

template <class T, class Shape>
struct tensor_view
{
    using type        = T;
    using shape_type  = Shape;
    using index_array = typename Shape::index_array;
    using iterator = basic_iota_iterator<tensor_view_iterator_read<const tensor_view>, index_int>;

    constexpr Shape get_shape() const { return Shape{}; }
    constexpr auto size() const { return get_shape().elements(); }

    struct index_to_offset
    {
        index_int offset;
        template <class U>
        constexpr index_to_offset(U i) : offset(Shape{}.index(i))
        {
        }
    };

    constexpr T& operator[](MIGRAPHX_CAPTURE_SOURCE_LOCATION(index_to_offset) i) const
    {
        index_to_offset ito = i;
        MIGRAPHX_WARN(ito.offset < get_shape().element_space(),
                      i,
                      "Out of bounds access at offset: ",
                      ito.offset);
        return x[ito.offset];
    }

    constexpr T* data() const { return x; }

    constexpr auto begin() const { return iterator{0, {this}}; }
    constexpr auto end() const { return iterator{this->size(), {this}}; }

    constexpr auto begin_at(index_array i) const
    {
        MIGRAPHX_ASSERT(get_shape().single(i) < get_shape().elements());
        MIGRAPHX_ASSERT(get_shape().index(i) < get_shape().element_space());
        return iterator{get_shape().single(i), {this}};
    }

    template <class U>
    constexpr tensor_view<U, Shape> with(U* y) const
    {
        static_assert(sizeof(T) == sizeof(U), "Not the same size");
        return {y};
    }

    T* x;
};

template <class T>
using get_shape_c = typename T::shape_type;

template <class T, class Shape>
constexpr tensor_view<T, Shape> make_tensor_view(T* x, Shape)
{
    return {x};
}

template <class T, class Permutation>
constexpr auto reorder_tensor_view(T x, Permutation perm)
{
    return make_tensor_view(x.data(), reorder_shape(x.get_shape(), perm));
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_TENSOR_VIEW_HPP
