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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_MANAGE_PTR_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_MANAGE_PTR_HPP

#include <memory>
#include <type_traits>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class F, F f> // NOLINT
struct manage_deleter
{
    template <class T>
    void operator()(T* x) const
    {
        if(x != nullptr)
        {
            (void)f(x);
        }
    }
};

struct null_deleter
{
    template <class T>
    void operator()(T*) const
    {
    }
};

template <class T, class F, F f> // NOLINT
using manage_ptr = std::unique_ptr<T, manage_deleter<F, f>>;

template <class T>
struct element_type
{
    using type = typename T::element_type;
};

template <class T>
using remove_ptr = typename std::
    conditional_t<std::is_pointer<T>{}, std::remove_pointer<T>, element_type<T>>::type;

template <class T>
using shared = std::shared_ptr<remove_ptr<T>>;

template <class T>
shared<T> share(T p)
{
    return shared<T>{std::move(p)};
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#define MIGRAPHX_MANAGE_PTR(T, F) \
    migraphx::manage_ptr<std::remove_pointer_t<T>, decltype(&F), &F> // NOLINT

#endif
