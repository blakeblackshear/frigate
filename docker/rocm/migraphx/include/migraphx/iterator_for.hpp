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
#ifndef MIGRAPHX_GUARD_RTGLIB_ITERATOR_FOR_HPP
#define MIGRAPHX_GUARD_RTGLIB_ITERATOR_FOR_HPP

#include <cassert>
#include <type_traits>
#include <iterator>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct iterator_for_select
{
    template <class T>
    static T deref(T x)
    {
        return x;
    }

    template <class T>
    static auto begin(T* x)
    {
        return x->begin();
    }

    template <class T>
    static auto end(T* x)
    {
        return x->end();
    }
};

struct iterator_for_select_reverse
{
    template <class T>
    static auto deref(T x)
    {
        return std::prev(x.base());
    }

    template <class T>
    static auto begin(T* x)
    {
        return std::make_reverse_iterator(x->end());
    }

    template <class T>
    static auto end(T* x)
    {
        return std::make_reverse_iterator(x->begin());
    }
};

template <class T, class Selector = iterator_for_select>
struct iterator_for_range
{
    T* base;
    using base_iterator = std::remove_reference_t<decltype(Selector::begin(base))>;

    struct iterator
    {
        using difference_type   = std::ptrdiff_t;
        using reference         = decltype(std::declval<base_iterator>());
        using value_type        = std::remove_reference_t<reference>;
        using pointer           = std::add_pointer_t<value_type>;
        using iterator_category = std::input_iterator_tag;
        base_iterator i;
        auto operator*() const { return Selector::deref(i); }
        base_iterator operator++() { return ++i; }
        bool operator==(const iterator& rhs) const { return i == rhs.i; }
        bool operator!=(const iterator& rhs) const { return i != rhs.i; }
    };

    iterator begin() const
    {
        assert(base != nullptr);
        return {Selector::begin(base)};
    }
    iterator end() const
    {
        assert(base != nullptr);
        return {Selector::end(base)};
    }
};
template <class T>
iterator_for_range<T> iterator_for(T& x)
{
    return {&x};
}

template <class T>
iterator_for_range<T, iterator_for_select_reverse> reverse_iterator_for(T& x)
{
    return {&x};
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
