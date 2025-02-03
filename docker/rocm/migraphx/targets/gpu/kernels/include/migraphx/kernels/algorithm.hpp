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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_ALGORITHM_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_ALGORITHM_HPP

#include <migraphx/kernels/debug.hpp>

namespace migraphx {

template <class T>
constexpr void swap(T& a, T& b) noexcept
{
    T old = a;
    a     = b;
    b     = old;
}

template <class Iterator1, class Iterator2>
constexpr void iter_swap(Iterator1 a, Iterator2 b)
{
    if(a == b)
        return;
    swap(*a, *b);
}

struct less
{
    template <class T, class U>
    constexpr auto operator()(T x, U y) const
    {
        return x < y;
    }
};

struct greater
{
    template <class T, class U>
    constexpr auto operator()(T x, U y) const
    {
        return x > y;
    }
};

template <class InputIt, class T, class BinaryOperation>
constexpr T accumulate(InputIt first, InputIt last, T init, BinaryOperation op)
{
    for(; first != last; ++first)
    {
        init = op(static_cast<T&&>(init), *first);
    }
    return init;
}

template <class InputIt, class OutputIt>
constexpr OutputIt copy(InputIt first, InputIt last, OutputIt d_first)
{
    while(first != last)
    {
        *d_first++ = *first++;
    }
    return d_first;
}

template <class InputIt, class OutputIt, class UnaryPredicate>
constexpr OutputIt copy_if(InputIt first, InputIt last, OutputIt d_first, UnaryPredicate pred)
{
    for(; first != last; ++first)
    {
        if(pred(*first))
        {
            *d_first = *first;
            ++d_first;
        }
    }
    return d_first;
}

template <class Iterator, class Compare>
constexpr Iterator is_sorted_until(Iterator first, Iterator last, Compare comp)
{
    if(first != last)
    {
        Iterator next = first;
        while(++next != last)
        {
            if(comp(*next, *first))
                return next;
            first = next;
        }
    }
    return last;
}

template <class Iterator, class Compare>
constexpr bool is_sorted(Iterator first, Iterator last, Compare comp)
{
    return is_sorted_until(first, last, comp) == last;
}

template <class Iterator, class F>
constexpr F for_each(Iterator first, Iterator last, F f)
{
    for(; first != last; ++first)
    {
        f(*first);
    }
    return f;
}

template <class Iterator, class Predicate>
constexpr Iterator find_if(Iterator first, Iterator last, Predicate p)
{
    for(; first != last; ++first)
    {
        if(p(*first))
        {
            return first;
        }
    }
    return last;
}

template <class Iterator, class T>
constexpr Iterator find(Iterator first, Iterator last, const T& value)
{
    return find_if(first, last, [&](const auto& x) { return x == value; });
}

template <class InputIt, class UnaryPredicate>
constexpr bool any_of(InputIt first, InputIt last, UnaryPredicate p)
{
    return find_if(first, last, p) != last;
}

template <class InputIt, class UnaryPredicate>
constexpr bool none_of(InputIt first, InputIt last, UnaryPredicate p)
{
    return find_if(first, last, p) == last;
}

template <class InputIt, class UnaryPredicate>
constexpr bool all_of(InputIt first, InputIt last, UnaryPredicate p)
{
    return none_of(first, last, [=](auto&& x) { return not p(x); });
}

template <class Iterator1, class Iterator2>
constexpr Iterator1 search(Iterator1 first, Iterator1 last, Iterator2 s_first, Iterator2 s_last)
{
    for(;; ++first)
    {
        Iterator1 it = first;
        for(Iterator2 s_it = s_first;; ++it, ++s_it)
        {
            if(s_it == s_last)
            {
                return first;
            }
            if(it == last)
            {
                return last;
            }
            if(not(*it == *s_it))
            {
                break;
            }
        }
    }
}

template <class InputIt1, class InputIt2, class T, class BinaryOperation1, class BinaryOperation2>
constexpr T inner_product(InputIt1 first1,
                          InputIt1 last1,
                          InputIt2 first2,
                          T init,
                          BinaryOperation1 op1,
                          BinaryOperation2 op2)
{
    while(first1 != last1)
    {
        init = op1(init, op2(*first1, *first2));
        ++first1;
        ++first2;
    }
    return init;
}

template <class InputIt1, class InputIt2, class T>
constexpr T inner_product(InputIt1 first1, InputIt1 last1, InputIt2 first2, T init)
{
    return inner_product(
        first1,
        last1,
        first2,
        init,
        [](auto x, auto y) { return x + y; },
        [](auto x, auto y) { return x * y; });
}

template <class Iterator1, class Iterator2, class BinaryPred>
constexpr bool equal(Iterator1 first1, Iterator1 last1, Iterator2 first2, BinaryPred p)
{
    for(; first1 != last1; ++first1, ++first2)
        if(not p(*first1, *first2))
        {
            return false;
        }
    return true;
}

template <class Iterator, class T>
constexpr void iota(Iterator first, Iterator last, T value)
{
    for(; first != last; ++first, ++value)
        *first = value;
}

template <class Iterator, class Compare>
constexpr Iterator min_element(Iterator first, Iterator last, Compare comp)
{
    if(first == last)
        return last;

    Iterator smallest = first;

    while(++first != last)
        if(comp(*first, *smallest))
            smallest = first;

    return smallest;
}

template <class Iterator>
constexpr Iterator rotate(Iterator first, Iterator middle, Iterator last)
{
    if(first == middle)
        return last;

    if(middle == last)
        return first;

    Iterator write     = first;
    Iterator next_read = first;

    for(Iterator read = middle; read != last; ++write, ++read)
    {
        if(write == next_read)
            next_read = read;
        iter_swap(write, read);
    }

    rotate(write, next_read, last);
    return write;
}

template <class Iterator, class T, class Compare>
constexpr Iterator upper_bound(Iterator first, Iterator last, const T& value, Compare comp)
{
    auto count = last - first;

    while(count > 0)
    {
        auto it   = first;
        auto step = count / 2;
        it += step;

        if(not comp(value, *it))
        {
            first = ++it;
            count -= step + 1;
        }
        else
            count = step;
    }

    return first;
}

template <class Iterator, class Compare>
constexpr void sort(Iterator first, Iterator last, Compare comp)
{
    if(first == last)
        return;
    for(auto i = first; i != last - 1; ++i)
        iter_swap(i, min_element(i, last, comp));
    MIGRAPHX_ASSERT(is_sorted(first, last, comp));
}

template <class Iterator>
constexpr void sort(Iterator first, Iterator last)
{
    sort(first, last, less{});
}

template <class Iterator, class Compare>
constexpr void stable_sort(Iterator first, Iterator last, Compare comp)
{
    if(first == last)
        return;
    for(auto i = first; i != last; ++i)
        rotate(upper_bound(first, i, *i, comp), i, i + 1);
    MIGRAPHX_ASSERT(is_sorted(first, last, comp));
}

template <class Iterator>
constexpr void stable_sort(Iterator first, Iterator last)
{
    stable_sort(first, last, less{});
}

} // namespace migraphx

#endif
