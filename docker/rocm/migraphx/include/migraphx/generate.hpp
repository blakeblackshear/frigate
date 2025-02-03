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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_GENERATE_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_GENERATE_HPP

#include <migraphx/argument.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/type_traits.hpp>
#include <migraphx/config.hpp>
#include <random>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

enum class random_mode
{
    legacy,
    random
};

template <class T, MIGRAPHX_REQUIRES(is_floating_point<T>{})>
constexpr T normalize(unsigned long z, random_mode m)
{
    auto max           = (m == random_mode::legacy) ? 32 : 1ULL << (sizeof(T) * 8 - 1);
    const double range = max / 2.0;
    double result      = -1.0 + (z % max) / range;
    // Expected output: between -1.0 and 1.0
    return T(result);
}

template <class T, MIGRAPHX_REQUIRES(is_signed<T>{} and not is_floating_point<T>{})>
constexpr T normalize(unsigned long z, random_mode m)
{
    const long long max =
        (m == random_mode::legacy) ? 1ULL << (sizeof(T) * 5) : 1ULL << (sizeof(T) * 6 - 1);
    const auto half_max = max / 2;
    auto result         = half_max - (z % max);
    // Expected output: between -half_max and half_max
    return T(result);
}

template <class T,
          MIGRAPHX_REQUIRES(not is_signed<T>{} and std::is_integral<T>{} and
                            not std::is_same<T, bool>{})>
constexpr T normalize(unsigned long z, random_mode m)
{
    const auto max =
        (m == random_mode::legacy) ? 1ULL << (sizeof(T) * 5) : 1ULL << (sizeof(T) * 8 - 1);
    // Expected output: between 0 and max - 1
    return z % max;
}

template <class T, MIGRAPHX_REQUIRES(std::is_same<T, bool>{})>
constexpr bool normalize(unsigned long z, random_mode)
{
    // Expected output: 0 or 1b
    return static_cast<bool>(z % 2);
}

template <class T>
struct xorshf96_generator
{
    unsigned long x = 123456789;
    unsigned long y = 362436069;
    unsigned long z;
    random_mode mode;

    xorshf96_generator(unsigned long seed, random_mode m) : z(521288629ULL ^ seed), mode(m) {}

    constexpr T operator()() noexcept
    {
        x ^= x << 16U;
        x ^= x >> 5U;
        x ^= x << 1U;

        unsigned long t = x;
        x               = y;
        y               = z;
        z               = t ^ x ^ y;

        return normalize<T>(z, mode);
    }
};

template <class T>
struct xorshift_generator
{
    unsigned long x;
    random_mode mode;

    xorshift_generator(unsigned long seed, random_mode m) : x(521288629ULL ^ seed), mode(m) {}

    constexpr T operator()() noexcept
    {
        x ^= x >> 12U;
        x ^= x << 25U;
        x ^= x >> 27U;
        return normalize<T>(x * 0x2545F4914F6CDD1D, mode);
    }
};

template <class T>
auto generate_tensor_data(const migraphx::shape& s,
                          unsigned long seed,
                          random_mode m = random_mode::legacy)
{
    auto result = make_shared_array<T>(s.element_space());
    std::generate(result.get(), result.get() + s.element_space(), xorshf96_generator<T>{seed, m});
    return result;
}

template <class T>
auto fill_tensor_data(const migraphx::shape& s, double value = 0)
{
    auto result = make_shared_array<T>(s.element_space());
    std::generate(result.get(), result.get() + s.element_space(), [=] { return value; });
    return result;
}

MIGRAPHX_EXPORT argument fill_argument(shape s, double value = 0);

MIGRAPHX_EXPORT argument generate_argument(shape s,
                                           unsigned long seed = 0,
                                           random_mode m      = random_mode::legacy);

MIGRAPHX_EXPORT literal generate_literal(shape s, unsigned long seed = 0);

MIGRAPHX_EXPORT literal abs(literal l);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
