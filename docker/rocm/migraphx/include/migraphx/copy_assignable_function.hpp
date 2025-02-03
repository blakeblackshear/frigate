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
 *
 */
#ifndef MIGRAPHX_GUARD_MIGRAPHX_COPY_ASSIGNABLE_FUNCTION_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_COPY_ASSIGNABLE_FUNCTION_HPP

#include <migraphx/config.hpp>
#include <migraphx/optional.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class F>
struct copy_assignable_function_wrapper
{
    optional<F> f;

    copy_assignable_function_wrapper(F pf) : f(std::move(pf)) {}
    copy_assignable_function_wrapper(const copy_assignable_function_wrapper& other)     = default;
    copy_assignable_function_wrapper(copy_assignable_function_wrapper&& other) noexcept = default;
    copy_assignable_function_wrapper& operator=(copy_assignable_function_wrapper other)
    {
        f.reset();
        if(other.f.has_value())
            f.emplace(std::move(*other.f));
        return *this;
    }

    template <class... Ts>
    auto operator()(Ts&&... xs) const -> decltype((*f)(std::forward<Ts>(xs)...))
    {
        return (*f)(std::forward<Ts>(xs)...);
    }
};

template <class F>
using copy_assignable_function =
    std::conditional_t<std::is_copy_assignable<F>{}, F, copy_assignable_function_wrapper<F>>;

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_COPY_ASSIGNABLE_FUNCTION_HPP
