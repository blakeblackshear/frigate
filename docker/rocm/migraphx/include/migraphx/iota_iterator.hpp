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
#ifndef MIGRAPHX_GUARD_RTGLIB_IOTA_ITERATOR_HPP
#define MIGRAPHX_GUARD_RTGLIB_IOTA_ITERATOR_HPP

#include <migraphx/config.hpp>
#include <migraphx/functional.hpp>
#include <iterator>
#include <type_traits>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class F, class Iterator = std::ptrdiff_t>
struct basic_iota_iterator
{
    Iterator index;
    F f;

    using difference_type   = std::ptrdiff_t;
    using reference         = decltype(f(std::declval<Iterator>()));
    using value_type        = typename std::remove_reference<reference>::type;
    using pointer           = typename std::add_pointer<value_type>::type;
    using iterator_category = std::random_access_iterator_tag;

    basic_iota_iterator& operator+=(int n)
    {
        index += n;
        return *this;
    }

    basic_iota_iterator& operator-=(int n)
    {
        index -= n;
        return *this;
    }

    basic_iota_iterator& operator++()
    {
        index++;
        return *this;
    }

    basic_iota_iterator& operator--()
    {
        index--;
        return *this;
    }

    basic_iota_iterator operator++(int) // NOLINT
    {
        basic_iota_iterator it = *this;
        index++;
        return it;
    }

    basic_iota_iterator operator--(int) // NOLINT
    {
        basic_iota_iterator it = *this;
        index--;
        return it;
    }
    reference operator*() const { return f(index); }
    pointer operator->() const { return &f(index); }
    reference operator[](int n) const { return f(index + n); }
};

template <class T, class F>
inline basic_iota_iterator<F, T> make_basic_iota_iterator(T x, F f)
{
    return basic_iota_iterator<F, T>{x, f};
}

template <class F, class Iterator>
inline basic_iota_iterator<F, Iterator> operator+(basic_iota_iterator<F, Iterator> x,
                                                  std::ptrdiff_t y)
{
    return x += y;
}

template <class F, class Iterator>
inline basic_iota_iterator<F, Iterator> operator+(std::ptrdiff_t x,
                                                  basic_iota_iterator<F, Iterator> y)
{
    return y + x;
}

template <class F, class Iterator>
inline std::ptrdiff_t operator-(basic_iota_iterator<F, Iterator> x,
                                basic_iota_iterator<F, Iterator> y)
{
    return x.index - y.index;
}

template <class F, class Iterator>
inline basic_iota_iterator<F, Iterator> operator-(basic_iota_iterator<F, Iterator> x,
                                                  std::ptrdiff_t y)
{
    return x -= y;
}

template <class F, class Iterator>
inline bool operator==(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index == y.index;
}

template <class F, class Iterator>
inline bool operator!=(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index != y.index;
}

template <class F, class Iterator>
inline bool operator<(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index < y.index;
}

template <class F, class Iterator>
inline bool operator>(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index > y.index;
}

template <class F, class Iterator>
inline bool operator>=(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index >= y.index;
}

template <class F, class Iterator>
inline bool operator<=(basic_iota_iterator<F, Iterator> x, basic_iota_iterator<F, Iterator> y)
{
    return x.index <= y.index;
}

using iota_iterator = basic_iota_iterator<id>;

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
