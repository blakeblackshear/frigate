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
#ifndef MIGRAPHX_GUARD_KERNELS_IOTA_ITERATOR_HPP
#define MIGRAPHX_GUARD_KERNELS_IOTA_ITERATOR_HPP

#include <migraphx/kernels/debug.hpp>
#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/type_traits.hpp>

namespace migraphx {

template <class F, class Iterator = diff_int>
struct basic_iota_iterator
{
    Iterator index;
    F f;

    using difference_type = diff_int;
    using reference       = decltype(f(declval<Iterator>()));
    using value_type      = remove_reference_t<reference>;
    using pointer         = add_pointer_t<value_type>;

    constexpr basic_iota_iterator& operator+=(diff_int n)
    {
        index += n;
        return *this;
    }

    constexpr basic_iota_iterator& operator-=(diff_int n)
    {
        index -= n;
        return *this;
    }

    constexpr basic_iota_iterator& operator++()
    {
        index++;
        return *this;
    }

    constexpr basic_iota_iterator& operator--()
    {
        index--;
        return *this;
    }

    constexpr basic_iota_iterator operator++(int) // NOLINT
    {
        basic_iota_iterator it = *this;
        index++;
        return it;
    }

    constexpr basic_iota_iterator operator--(int) // NOLINT
    {
        basic_iota_iterator it = *this;
        index--;
        return it;
    }
    // TODO: operator->
    constexpr reference operator*() const { return f(index); }

    constexpr reference operator[](MIGRAPHX_CAPTURE_SOURCE_LOCATION(index_int) x) const
    {
        return f(capture_transform(x, [&](auto y) { return index + y; }));
    }
};

template <class T, class F>
constexpr basic_iota_iterator<F, T> make_basic_iota_iterator(T x, F f)
{
    return basic_iota_iterator<F, T>{x, f};
}

template <class F, class Iterator>
constexpr basic_iota_iterator<F, Iterator> operator+(basic_iota_iterator<F, Iterator> x, diff_int y)
{
    return x += y;
}

template <class F, class Iterator>
constexpr basic_iota_iterator<F, Iterator> operator+(diff_int x, basic_iota_iterator<F, Iterator> y)
{
    return y + x;
}

template <class F, class Iterator>
constexpr diff_int operator-(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index - y.index;
}

template <class F, class Iterator>
constexpr basic_iota_iterator<F, Iterator> operator-(basic_iota_iterator<F, Iterator> x, diff_int y)
{
    return x -= y;
}

template <class F, class Iterator>
constexpr bool operator==(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index == y.index;
}

template <class F, class Iterator>
constexpr bool operator!=(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index != y.index;
}

template <class F, class Iterator>
constexpr bool operator<(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index < y.index;
}

template <class F, class Iterator>
constexpr bool operator>(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index > y.index;
}

template <class F, class Iterator>
constexpr bool operator>=(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index >= y.index;
}

template <class F, class Iterator>
constexpr bool operator<=(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index <= y.index;
}

struct defaul_iota_iterator
{
    template <class T>
    constexpr auto operator()(T x) const
    {
        return x;
    }
};

using iota_iterator = basic_iota_iterator<defaul_iota_iterator>;

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_IOTA_ITERATOR_HPP
