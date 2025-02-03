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
#ifndef MIGRAPHX_GUARD_KERNELS_POOLING_HPP
#define MIGRAPHX_GUARD_KERNELS_POOLING_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/ops.hpp>
#include <migraphx/kernels/math.hpp>
#include <migraphx/kernels/array.hpp>
#include <migraphx/kernels/reduce.hpp>
#include <migraphx/kernels/tuple.hpp>
#include <migraphx/kernels/vectorize.hpp>

namespace migraphx {

template <class Derived>
struct pool_op
{
    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR T apply(T x) const
    {
        return x;
    }

    MIGRAPHX_DEVICE_CONSTEXPR auto pad() const
    {
        const auto& self = static_cast<const Derived&>(*this);
        return self.init();
    }

    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR T final(T x, U) const
    {
        return x;
    }
};

struct max_pool : pool_op<max_pool>
{
    MIGRAPHX_DEVICE_CONSTEXPR auto init() const { return lowest{}; }

    MIGRAPHX_DEVICE_CONSTEXPR auto reduce() const { return op::max{}; }
};

struct average_pool : pool_op<average_pool>
{
    MIGRAPHX_DEVICE_CONSTEXPR auto init() const { return make_tuple(0.0, 0); }

    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR tuple<T, index_int> apply(T x) const
    {
        return {x, 1};
    }

    MIGRAPHX_DEVICE_CONSTEXPR auto reduce() const { return op::sum{}; }

    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR T final(tuple<T, index_int> t, U) const
    {
        T x         = t[_c<0>];
        index_int y = t[_c<1>];
        return (y == 0) ? T{0.0} : T{x / y};
    }
};

struct average_include_pad_pool : pool_op<average_include_pad_pool>
{
    MIGRAPHX_DEVICE_CONSTEXPR auto init() const { return 0.0; }

    MIGRAPHX_DEVICE_CONSTEXPR auto reduce() const { return op::sum{}; }

    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR T final(T x, U y) const
    {
        if constexpr(y == 0)
            return T{0.0};
        constexpr auto scale = T{1.0} / y;
        return T{x * scale};
    }
};

struct lpnorm_pool_base
{
};

template <index_int P>
struct lpnorm_pool : lpnorm_pool_base, pool_op<lpnorm_pool<P>>
{
    MIGRAPHX_DEVICE_CONSTEXPR auto init() const { return 0.0; }

    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR T apply(T x) const
    {
        if constexpr(P == 0)
            return 1;
        else if constexpr(P == 1)
            return migraphx::abs(x);
        else if constexpr(P == 2)
            return x * x;
        else
            return migraphx::pow(migraphx::abs(x), T(P));
    }

    MIGRAPHX_DEVICE_CONSTEXPR auto pad() const { return apply(init()); }

    MIGRAPHX_DEVICE_CONSTEXPR auto reduce() const { return op::sum{}; }

    template <class T, class U>
    MIGRAPHX_DEVICE_CONSTEXPR T final(T x, U) const
    {
        if constexpr(P == 0)
            return 1;
        else if constexpr(P == 1)
            return x;
        else if constexpr(P == 2)
            return migraphx::sqrt(x);
        else
            return migraphx::pow(x, 1. / P);
    }
};

template <class Window, class Stride, class Padding>
struct window
{
    Window win      = {};
    Stride stride   = {};
    Padding padding = {};

    using rank = decltype(Window{}.size());

    constexpr auto size() const
    {
        return return_c([] { return Window{}.product(); });
    }

    constexpr auto has_padding() const
    {
        return return_c([] { return Padding{} == 0; });
    }

    template <class OutputIndex, class F>
    constexpr auto apply(OutputIndex i, F f) const
    {
        auto win_start = generate_array<diff_int>(rank{}, [&](auto j) {
            diff_int dim = i[j];
            MIGRAPHX_ASSERT(win[j] >= 1);
            diff_int s = stride[j];
            diff_int p = padding[j];
            return (dim * s) - p;
        });
        return [=](auto j) { return f(win_start + win.multi(j)); };
    }

    template <class Index, class F>
    constexpr void visit(Index i, F f) const
    {
        repeat(size(), apply(i, f));
    }
};

template <class Window, class Stride, class Padding>
constexpr window<Window, Stride, Padding> make_window(Window w, Stride s, Padding p)
{
    return {w, s, p};
}

template <class Algo, index_int GroupSize, class Output, class F>
__device__ void pooling_reduce(Output output, F f)
{
    if constexpr(GroupSize < 2)
    {
        Algo::template run<decltype(output)>(
            [&](auto out_idx, auto r) { r.outer([&] { output[out_idx] = f(out_idx, r); }); });
    }
    else
    {
        auto goutput = as_vec<GroupSize>(output, output.get_shape().lens.size() - _c<1>);
        Algo::template run<decltype(goutput)>([&](auto out_idx, auto r) {
            auto i = out_idx;
            i.back() *= GroupSize;
            auto result = vec_generate<GroupSize>([&](auto) {
                i.back()++;
                return f(i, r);
            });
            r.outer([&] { goutput[out_idx] = result; });
        });
    }
}

template <class Algo, index_int GroupSize, class Op, class Window, class Output, class Input>
__device__ void pooling(Op op, Window w, Output output, Input input)
{
    pooling_reduce<Algo, GroupSize>(output, [&](auto out_idx, auto r) {
        auto x = r.reduce(op.reduce(), op.init(), w.apply(out_idx, [&](auto j) {
            using itype = decltype(op.apply(input[j]));

            if(j < input.get_shape().lens)
            {
                return op.apply(input[j]);
            }
            else
            {
                return itype(op.pad());
            }
        }))(reduce::make_indices(w.size()));
        return op.final(x, w.size());
    });
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_POOLING_HPP
