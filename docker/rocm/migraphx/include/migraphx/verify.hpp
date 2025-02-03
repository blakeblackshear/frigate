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
#ifndef MIGRAPHX_GUARD_VERIFY_HPP
#define MIGRAPHX_GUARD_VERIFY_HPP

#include <algorithm>
#include <cmath>
#include <functional>
#include <iostream>
#include <numeric>
#include <assert.h>

#include <migraphx/float_equal.hpp>
#include <migraphx/config.hpp>
#include <migraphx/env.hpp>

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_VERIFY_ENABLE_ALLCLOSE)
namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace verify {

// Compute the value of a range
template <class R>
using range_value = std::decay_t<decltype(*std::declval<R>().begin())>;

struct sum_fn
{
    template <class T, class U>
    auto operator()(T x, U y) const
    {
        return x + y;
    }
};
static constexpr sum_fn sum{};

struct max_fn
{
    template <class T>
    static T id(T x)
    {
        return x;
    }

    template <class T, class U>
    auto operator()(T x, U y) const
    {
        return x > y ? x : y;
    }
};
static constexpr max_fn max{};

namespace abs_diff_detail {
using std::fabs;
struct fn
{
    template <class T, class U>
    auto operator()(T x, U y) const
    {
        return fabs(x - y);
    }
};

} // namespace abs_diff_detail

static constexpr abs_diff_detail::fn abs_diff{};

struct not_finite_fn
{
    template <class T>
    bool operator()(T x) const
    {
        return not std::isfinite(static_cast<double>(x));
    }
};
static constexpr not_finite_fn not_finite{};

struct compare_mag_fn
{
    template <class T, class U>
    bool operator()(T x, U y) const
    {
        return std::fabs(x) < std::fabs(y);
    }
};
static constexpr compare_mag_fn compare_mag{};

struct square_diff_fn
{
    template <class T, class U>
    double operator()(T x, U y) const
    {
        return (x - y) * (x - y);
    }
};
static constexpr square_diff_fn square_diff{};

template <class R1>
bool range_empty(R1&& r1)
{
    return r1.begin() == r1.end();
}

template <class R1>
auto range_distance(R1&& r1)
{
    return std::distance(r1.begin(), r1.end());
}

template <class R1>
bool range_zero(R1&& r1)
{
    return std::all_of(r1.begin(), r1.end(), [](auto x) { return float_equal(x, 0); });
}

template <class R1, class R2, class T, class Reducer, class Product>
T range_product(R1&& r1, R2&& r2, T state, Reducer r, Product p)
{
    return std::inner_product(r1.begin(), r1.end(), r2.begin(), state, r, p);
}

template <class R1, class R2, class Compare>
std::size_t mismatch_idx(R1&& r1, R2&& r2, Compare compare)
{
    auto p = std::mismatch(r1.begin(), r1.end(), r2.begin(), compare);
    return std::distance(r1.begin(), p.first);
}

template <class R1, class Predicate>
long find_idx(R1&& r1, Predicate p)
{
    auto it = std::find_if(r1.begin(), r1.end(), p);
    if(it == r1.end())
        return -1;
    else
        return std::distance(r1.begin(), it);
}

template <class R1, class R2>
double max_diff(R1&& r1, R2&& r2)
{
    return range_product(r1, r2, 0.0, max, abs_diff);
}

template <class R1, class R2, class T>
std::size_t mismatch_diff(R1&& r1, R2&& r2, T diff)
{
    return mismatch_idx(r1, r2, [&](auto x, auto y) {
        auto d = abs_diff(x, y);
        return float_equal(d, diff);
    });
}

template <class R1, class R2>
double rms_range(const R1& r1, const R2& r2)
{
    std::size_t n = range_distance(r1);
    if(n == range_distance(r2))
    {
        double square_difference = range_product(r1, r2, 0.0, sum_fn{}, square_diff);
        double mag1              = *std::max_element(r1.begin(), r1.end(), compare_mag);
        double mag2              = *std::max_element(r2.begin(), r2.end(), compare_mag);
        double mag =
            std::max({std::fabs(mag1), std::fabs(mag2), std::numeric_limits<double>::min()});
        return std::sqrt(square_difference) / (std::sqrt(n) * mag);
    }
    else
        return std::numeric_limits<range_value<R1>>::max();
}

template <class R>
double get_rms_tol(const R&, std::size_t tolerance = 80)
{
    return std::numeric_limits<range_value<R>>::epsilon() * tolerance;
}

/*
C++ doesn't support named arguments, this is just wrapper that helps distinguish between actual
results v/s expected results arguments.
*/
template <class T>
struct expected
{
    expected() = default;
    explicit expected(const T& input) : x(&input) {}
    const T& data() const
    {
        assert(x != nullptr);
        return *x;
    }

    private:
    const T* x = nullptr;
};

// deduction guide for templated expected class
template <class T>
expected(const T&) -> expected<T>;

struct tolerance
{
    double rms_tol = 0.001;
    double atol    = 0.001;
    double rtol    = 0.001;
};

/*
MIGraphX implementation of numpy's np.allclose() which checks if elementwise absolute diff is within
tolerance using this formula:  abs(a - b) < atol + rtol(abs(b))
*/
template <class R1, class R2>
bool allclose(const R1& r1, const R2& r2, tolerance tols)
{
    std::size_t n = range_distance(r1);
    if(n == range_distance(r2))
    {
        auto idx = mismatch_idx(r1, r2, [&](auto x, auto y) {
            return abs_diff(double(x), double(y)) < tols.atol + tols.rtol * std::abs(double(y));
        });
        return idx >= range_distance(r1);
    }
    return false;
}

template <class R1, class R2>
bool verify_rms_range(const R1& r1,
                      const R2& r2,
                      std::size_t tolerance = 80,
                      double* out_rms_error = nullptr)
{
    double threshold = get_rms_tol(r1, tolerance);
    auto error       = rms_range(r1, r2);
    if(out_rms_error != nullptr)
        *out_rms_error = error;
    return error <= threshold;
}

template <class R1, class R2>
bool verify_range_with_tolerance(const R1& r1,
                                 const expected<R2>& r2,
                                 tolerance tols        = tolerance{},
                                 double* out_rms_error = nullptr)
{
    auto rms_error = rms_range(r1, r2.data());
    // disable ewise_verify by default for now, it requires lot of tests to be fixed
    bool ewise_verify = true;
    if(enabled(MIGRAPHX_VERIFY_ENABLE_ALLCLOSE{}))
    {
        ewise_verify = allclose(r1, r2.data(), tols);
    }
    if(out_rms_error != nullptr)
        *out_rms_error = rms_error;
    return rms_error <= tols.rms_tol and ewise_verify;
}

// expected argument should be passed as second, but if it is passed as the first by mistake then
// flip the order
template <class R1, class R2>
bool verify_range_with_tolerance(const expected<R1>& r1,
                                 const R2& r2,
                                 tolerance tols        = tolerance{},
                                 double* out_rms_error = nullptr)
{
    return verify_rms_range(r2, r1, tols, out_rms_error);
}

} // namespace verify
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif
