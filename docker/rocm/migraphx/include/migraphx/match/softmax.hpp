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
#ifndef MIGRAPHX_GUARD_MATCH_SOFTMAX_HPP
#define MIGRAPHX_GUARD_MATCH_SOFTMAX_HPP

#include <migraphx/config.hpp>
#include <migraphx/matcher.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace match {

namespace detail {
template <class F>
struct softmax_matcher
{
    F f;

    auto exp_x_minus_max() const
    {
        auto x_minus_max =
            f("sub")(arg(0)(any().bind("x")), arg(1)(skip_broadcasts(f("reduce_max"))));
        return f("exp")(arg(0)(x_minus_max));
    }

    auto softmax_base_ops() const
    {
        auto sum_exp_x_minus_max = f("reduce_sum")(arg(0)(exp_x_minus_max()));
        return f("div")(arg(0)(exp_x_minus_max()), arg(1)(skip_broadcasts(sum_exp_x_minus_max)));
    }

    auto matcher() const { return softmax_base_ops(); }
};
} // namespace detail

template <class F>
auto softmax(F f)
{
    return detail::softmax_matcher<F>{f}.matcher();
}

inline auto softmax()
{
    return softmax([](auto x) { return name(x); });
}

} // namespace match
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
