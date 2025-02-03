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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_MATCH_LAYERNORM_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_MATCH_LAYERNORM_HPP

#include <migraphx/config.hpp>
#include <migraphx/matcher.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace match {

namespace detail {
template <class F>
struct layernorm_matcher
{
    F f;

    auto last_axis() const
    {
        return make_basic_pred_matcher([](instruction_ref ins) {
            auto v = ins->get_operator().to_value();
            if(not v.contains("axes"))
                return false;
            auto axes = v["axes"].to_vector<std::size_t>();
            if(axes.size() != 1)
                return false;
            return axes.front() == ins->inputs().front()->get_shape().lens().size() - 1;
        });
    }

    auto reduce_mean() const { return f("reduce_mean")(last_axis()); }

    auto x_minus_mean() const
    {
        return f("sub")(arg(0)(any().bind("x")), arg(1)(skip_broadcasts(reduce_mean())));
    }

    auto variance() const
    {
        return reduce_mean()(arg(0)(any_of(
            f("pow")(arg(0)(x_minus_mean()), arg(1)(has_value(2.0f))),
            f("mul")(arg(0)(x_minus_mean()), arg(1)(x_minus_mean())),
            f("sqdiff")(either_arg(0, 1)(any().bind("x"), skip_broadcasts(reduce_mean()))))));
    }

    auto sqrt_add_eps(const std::string& name) const
    {
        auto add_eps = f("add")(either_arg(0, 1)(variance(), is_constant().bind("eps")));
        return skip_broadcasts(f(name)(arg(0)(any_of(add_eps, variance()))));
    }

    auto layernorm_onnx() const
    {
        auto div_sqrt  = f("div")(arg(0)(x_minus_mean()), arg(1)(sqrt_add_eps("sqrt")));
        auto mul_rsqrt = f("mul")(either_arg(0, 1)(x_minus_mean(), sqrt_add_eps("rsqrt")));
        return any(any_of(div_sqrt, mul_rsqrt));
    }

    auto matcher() const { return layernorm_onnx(); }
};
} // namespace detail

template <class F>
auto layernorm(F f)
{
    return detail::layernorm_matcher<F>{f}.matcher();
}

inline auto layernorm()
{
    return layernorm([](auto x) { return name(x); });
}

} // namespace match
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
