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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_OUTPUT_ITERATOR_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_OUTPUT_ITERATOR_HPP

#include <migraphx/config.hpp>
#include <migraphx/copy_assignable_function.hpp>
#include <iterator>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class F>
struct function_output_iterator
{
    copy_assignable_function<F> f;

    using self              = function_output_iterator;
    using difference_type   = void;
    using reference         = void;
    using value_type        = void;
    using pointer           = void;
    using iterator_category = std::output_iterator_tag;

    struct output_proxy
    {
        template <class T>
        output_proxy& operator=(const T& value)
        {
            assert(f);
            (*f)(value);
            return *this;
        }
        copy_assignable_function<F>* f;
    };
    output_proxy operator*() { return output_proxy{&f}; }
    self& operator++() { return *this; }
    self& operator++(int) { return *this; } // NOLINT
};

template <class F>
function_output_iterator<F> make_function_output_iterator(F f)
{
    return {std::move(f)};
}

template <class Container>
auto join_back_inserter(Container& c)
{
    return make_function_output_iterator(
        [&](const auto& r) { c.insert(c.end(), r.begin(), r.end()); });
}

template <class Container>
auto push_inserter(Container& c)
{
    return make_function_output_iterator([&](const auto& x) { c.push(x); });
}
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif // MIGRAPHX_GUARD_MIGRAPHX_OUTPUT_ITERATOR_HPP
