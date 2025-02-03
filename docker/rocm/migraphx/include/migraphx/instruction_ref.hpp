/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_INSTRUCTION_REF_HPP
#define MIGRAPHX_GUARD_INSTRUCTION_REF_HPP

#include <list>
#include <functional>
#include <migraphx/config.hpp>
#include <migraphx/requires.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct instruction;
#if defined(_WIN32) && !defined(NDEBUG) && !defined(CPPCHECK)
struct instruction_ref : std::list<instruction>::iterator
{
    using instruction_iter       = std::list<instruction>::iterator;
    using instruction_const_iter = std::list<instruction>::const_iterator;

    instruction_ref() = default;
    instruction_ref(const instruction_iter& other) : instruction_iter(other) {}

    template <class T,
              class U,
              MIGRAPHX_REQUIRES(std::is_same<T, instruction_ref>{} or
                                std::is_same<U, instruction_ref>{})>
    friend bool operator==(const T& x, const U& y)
    {
        return x._Unwrapped()._Ptr == y._Unwrapped()._Ptr;
    }

    template <class T,
              class U,
              MIGRAPHX_REQUIRES(std::is_same<T, instruction_ref>{} or
                                std::is_same<U, instruction_ref>{})>
    friend bool operator!=(const T& x, const U& y)
    {
        return not(x == y);
    }
};
#else
using instruction_ref = std::list<instruction>::iterator;
#endif

MIGRAPHX_EXPORT migraphx::instruction* as_address(const instruction_ref& ins) noexcept;

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

namespace std {
template <>
struct hash<migraphx::instruction_ref> // NOLINT
{
    using argument_type = migraphx::instruction_ref;
    using result_type   = std::size_t;
    result_type operator()(const migraphx::instruction_ref& x) const noexcept
    {
        return std::hash<migraphx::instruction*>{}(migraphx::as_address(x));
    }
};

template <>
struct equal_to<migraphx::instruction_ref> // NOLINT
{
    using argument_type = migraphx::instruction_ref;
    using result_type   = bool;
    result_type operator()(const migraphx::instruction_ref& x,
                           const migraphx::instruction_ref& y) const noexcept
    {
        return migraphx::as_address(x) == migraphx::as_address(y);
    }
};

} // namespace std

#ifdef _MSC_VER
#include <migraphx/instruction.hpp>
#endif

#endif
