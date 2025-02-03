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
#ifndef MIGRAPHX_GUARD_RTGLIB_ALGORITHM_HPP
#define MIGRAPHX_GUARD_RTGLIB_ALGORITHM_HPP

#include <algorithm>
#include <cassert>
#include <numeric>
#include <string>
#include <vector>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class Iterator, class Output, class Predicate, class F>
void transform_if(Iterator start, Iterator last, Output out, Predicate pred, F f)
{
    while(start != last)
    {
        if(pred(*start))
        {
            *out = f(*start);
            ++out;
        }
        ++start;
    }
}

/// Similiar to std::accumulate but a projection can be applied to the elements first
template <class Iterator, class T, class BinaryOp, class UnaryOp>
T transform_accumulate(Iterator first, Iterator last, T init, BinaryOp binop, UnaryOp unaryop)
{
    return std::inner_product(
        first, last, first, init, binop, [&](auto&& x, auto&&) { return unaryop(x); });
}

/// Similiar to std::partial_sum but a projection can be applied to the elements first
template <class Iterator, class OutputIterator, class BinaryOperation, class UnaryOp>
OutputIterator transform_partial_sum(
    Iterator first, Iterator last, OutputIterator d_first, BinaryOperation binop, UnaryOp unaryop)
{
    if(first == last)
        return d_first;

    auto acc = unaryop(*first);
    *d_first = acc;

    while(++first != last)
    {
        acc        = binop(std::move(acc), unaryop(*first));
        *++d_first = acc;
    }

    return ++d_first;
}

template <class Iterator, class Output, class Predicate>
void group_by(Iterator start, Iterator last, Output out, Predicate pred)
{
    while(start != last)
    {
        auto it = std::partition(start, last, [&](auto&& x) { return pred(x, *start); });
        out(start, it);
        start = it;
    }
}

template <class Iterator, class Output, class Predicate>
void group_unique(Iterator start, Iterator last, Output out, Predicate pred)
{
    while(start != last)
    {
        auto it = std::find_if(start, last, [&](auto&& x) { return not pred(*start, x); });
        out(start, it);
        start = it;
    }
}

template <class Iterator, class Predicate, class Output>
void group_find(Iterator start, Iterator last, Predicate pred, Output out)
{
    start = std::find_if(start, last, pred);
    while(start != last)
    {
        auto it = std::find_if_not(start, last, pred);
        out(start, it);
        start = std::find_if(it, last, pred);
    }
}

/// Similiar to std::remove_if but instead pass adjacent pairs to the predicate
template <class Iterator, class Predicate>
Iterator adjacent_remove_if(Iterator first, Iterator last, Predicate p)
{
    first = std::adjacent_find(first, last, p);
    if(first == last)
        return first;
    auto i = first;
    while(std::next(++i) != last)
    {
        if(not p(*i, *std::next(i)))
        {
            *first = std::move(*i);
            ++first;
        }
    }
    *first = std::move(*i);
    ++first;
    return first;
}

/// Similiar to std::for_each but instead pass adjacent pairs to the function
template <class Iterator, class F>
Iterator adjacent_for_each(Iterator first, Iterator last, F f)
{
    if(first == last)
        return last;

    Iterator next = first;
    ++next;

    for(; next != last; ++next, ++first)
        f(*first, *next);

    return last;
}

template <class Iterator1, class Iterator2>
std::ptrdiff_t
levenshtein_distance(Iterator1 first1, Iterator1 last1, Iterator2 first2, Iterator2 last2)
{
    if(first1 == last1)
        return std::distance(first2, last2);
    if(first2 == last2)
        return std::distance(first1, last1);
    if(*first1 == *first2)
        return levenshtein_distance(std::next(first1), last1, std::next(first2), last2);
    auto x1 = levenshtein_distance(std::next(first1), last1, std::next(first2), last2);
    auto x2 = levenshtein_distance(first1, last1, std::next(first2), last2);
    auto x3 = levenshtein_distance(std::next(first1), last1, first2, last2);
    return std::ptrdiff_t{1} + std::min({x1, x2, x3});
}

inline size_t levenshtein_distance(const std::string& s1, const std::string& s2)
{
    const size_t l1 = s1.length();
    const size_t l2 = s2.length();

    if(l1 < l2)
        levenshtein_distance(s2, s1);

    std::vector<size_t> d(l2 + 1);

    std::iota(d.begin(), d.end(), 0);

    for(size_t i = 1; i <= l1; i++)
    {
        size_t prev_cost = d[0];
        d[0]             = i;

        for(size_t j = 1; j <= l2; j++)
        {
            if(s1[i - 1] == s2[j - 1])
            {
                d[j] = prev_cost;
            }
            else
            {
                size_t cost_insert_or_delete = std::min(d[j - 1], d[j]);
                size_t cost_substitute       = prev_cost;
                prev_cost                    = d[j];
                d[j]                         = std::min(cost_substitute, cost_insert_or_delete) + 1;
            }
        }
    }

    return d[l2];
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
