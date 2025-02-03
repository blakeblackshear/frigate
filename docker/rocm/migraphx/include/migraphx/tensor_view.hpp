/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_TENSOR_VIEW_HPP
#define MIGRAPHX_GUARD_TENSOR_VIEW_HPP

#include <migraphx/shape.hpp>
#include <migraphx/float_equal.hpp>
#include <migraphx/requires.hpp>
#include <migraphx/iota_iterator.hpp>
#include <migraphx/as_number.hpp>

#include <iostream>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class T>
struct tensor_view_iterator_read
{
    T* view;
    auto& operator()(std::size_t n) const
    {
        assert(view != nullptr);
        return (*view)[n];
    }
};

template <class T>
struct tensor_view
{
    using value_type = T;
    using iterator   = basic_iota_iterator<tensor_view_iterator_read<tensor_view<T>>, std::size_t>;
    using const_iterator =
        basic_iota_iterator<tensor_view_iterator_read<const tensor_view<T>>, std::size_t>;
    tensor_view() : m_data(nullptr) {}
    tensor_view(shape s, T* d) : m_data(d), m_shape(std::move(s)) {}

    const shape& get_shape() const { return this->m_shape; }

    bool empty() const { return m_data == nullptr or m_shape.lens().empty(); }

    std::size_t size() const { return m_shape.elements(); }

    T* data() { return this->m_data; }

    const T* data() const { return this->m_data; }

    template <class... Ts, MIGRAPHX_REQUIRES(std::is_integral<Ts>{}...)>
    const T& operator()(Ts... xs) const
    {
        assert(std::vector<std::size_t>{static_cast<std::size_t>(xs)...} < m_shape.lens());
        assert(m_shape.index({static_cast<std::size_t>(xs)...}) < m_shape.bytes() / sizeof(T));
        return m_data[m_shape.index({static_cast<std::size_t>(xs)...})];
    }

    template <class... Ts, MIGRAPHX_REQUIRES(std::is_integral<Ts>{}...)>
    T& operator()(Ts... xs)
    {
        assert(std::vector<std::size_t>{static_cast<std::size_t>(xs)...} < m_shape.lens());
        assert(m_shape.index({static_cast<std::size_t>(xs)...}) < m_shape.bytes() / sizeof(T));
        return m_data[m_shape.index({static_cast<std::size_t>(xs)...})];
    }

    template <class Iterator, MIGRAPHX_REQUIRES(not std::is_integral<Iterator>{})>
    const T& operator()(Iterator start, Iterator last) const
    {
        assert(std::distance(start, last) > 0);
        assert(std::all_of(start, last, [](auto x) { return x >= 0; }));
        return m_data[m_shape.index(start, last)];
    }

    template <class Iterator, MIGRAPHX_REQUIRES(not std::is_integral<Iterator>{})>
    T& operator()(Iterator start, Iterator last)
    {
        assert(std::distance(start, last) > 0);
        assert(std::all_of(start, last, [](auto x) { return x >= 0; }));
        return m_data[m_shape.index(start, last)];
    }

    T& operator[](std::size_t i)
    {
        assert(not this->empty() and i < this->size());
        return m_data[m_shape.index(i)];
    }

    const T& operator[](std::size_t i) const
    {
        assert(not this->empty() and i < this->size());
        return m_data[m_shape.index(i)];
    }

    template <class Range>
    auto operator[](const Range& r) -> decltype((*this)(r.begin(), r.end()))
    {
        return (*this)(r.begin(), r.end());
    }

    template <class Range>
    auto operator[](const Range& r) const -> decltype((*this)(r.begin(), r.end()))
    {
        return (*this)(r.begin(), r.end());
    }

    T& front()
    {
        assert(not this->empty());
        return m_data[0];
    }

    const T& front() const
    {
        assert(not this->empty());
        return m_data[0];
    }

    T& back()
    {
        assert(not this->empty());
        return m_data[m_shape.index(this->size() - 1)];
    }

    const T& back() const
    {
        assert(not this->empty());
        return m_data[m_shape.index(this->size() - 1)];
    }

    iterator begin() { return {0, {this}}; }

    iterator end() { return {this->size(), {this}}; }

    const_iterator begin() const { return {0, {this}}; }

    const_iterator end() const { return {this->size(), {this}}; }

    template <class U = T>
    std::vector<U> to_vector() const
    {
        return std::vector<U>(this->begin(), this->end());
    }

    friend std::ostream& operator<<(std::ostream& os, const tensor_view<T>& x)
    {
        if(not x.empty())
        {
            os << as_number(x.front());
            for(std::size_t i = 1; i < x.m_shape.elements(); i++)
            {
                os << ", " << as_number(x.m_data[x.m_shape.index(i)]);
            }
        }
        return os;
    }

    private:
    T* m_data;
    shape m_shape;
};

template <class T, class U>
bool operator==(const tensor_view<T>& x, const tensor_view<U>& y)
{
    if(x.get_shape() == y.get_shape())
    {
        for(std::size_t i = 0; i < x.get_shape().elements(); i++)
        {
            if(not float_equal(x[i], y[i]))
                return false;
        }
        return true;
    }
    return false;
}

template <class T, class U>
bool operator!=(const tensor_view<T>& x, const tensor_view<U>& y)
{
    return not(x == y);
}

template <class T>
tensor_view<T> make_view(const shape& s, T* data)
{
    return {s, data};
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
