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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_PAR_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_PAR_HPP

#include <migraphx/config.hpp>
#if MIGRAPHX_HAS_EXECUTORS
#include <execution>
#else
#include <migraphx/simple_par_for.hpp>
#endif
#include <algorithm>
#include <mutex>
#include <vector>
#include <exception>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace detail {

struct exception_list
{
    std::vector<std::exception_ptr> exceptions;
    std::mutex m;
    void add_exception()
    {
        std::lock_guard<std::mutex> guard(m);
        exceptions.push_back(std::current_exception());
    }
    template <class F>
    auto collect(F f)
    {
        return [f, this](auto&&... xs) {
            try
            {
                f(std::forward<decltype(xs)>(xs)...);
            }
            catch(...)
            {
                this->add_exception();
            }
        };
    }
    void throw_if_exception() const
    {
        if(not exceptions.empty())
            std::rethrow_exception(exceptions.front());
    }
};

} // namespace detail

template <class InputIt, class OutputIt, class UnaryOperation>
OutputIt par_transform(InputIt first1, InputIt last1, OutputIt d_first, UnaryOperation unary_op)
{
#if MIGRAPHX_HAS_EXECUTORS
    return std::transform(std::execution::par, first1, last1, d_first, std::move(unary_op));
#else
    return std::transform(first1, last1, d_first, std::move(unary_op));
#endif
}

template <class InputIt1, class InputIt2, class OutputIt, class BinaryOperation>
OutputIt par_transform(
    InputIt1 first1, InputIt1 last1, InputIt2 first2, OutputIt d_first, BinaryOperation binary_op)
{
#if MIGRAPHX_HAS_EXECUTORS
    return std::transform(
        std::execution::par, first1, last1, first2, d_first, std::move(binary_op));
#else
    return std::transform(first1, last1, first2, d_first, std::move(binary_op));
#endif
}

template <class InputIt, class UnaryFunction>
void par_for_each(InputIt first, InputIt last, UnaryFunction f)
{
#if MIGRAPHX_HAS_EXECUTORS
    // Propagate the exception
    detail::exception_list ex;
    std::for_each(std::execution::par, first, last, ex.collect(std::move(f)));
    ex.throw_if_exception();
#else
    simple_par_for(last - first, [&](auto i) { f(first[i]); });
#endif
}

template <class... Ts>
auto par_copy_if(Ts&&... xs)
{
#if MIGRAPHX_HAS_EXECUTORS
    return std::copy_if(std::execution::par, std::forward<Ts>(xs)...);
#else
    return std::copy_if(std::forward<Ts>(xs)...);
#endif
}

template <class... Ts>
auto par_sort(Ts&&... xs)
{
#if MIGRAPHX_HAS_EXECUTORS
    return std::sort(std::execution::par, std::forward<Ts>(xs)...);
#else
    return std::sort(std::forward<Ts>(xs)...);
#endif
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_PAR_HPP
