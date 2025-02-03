/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_KERNELS_MATH_HPP
#define MIGRAPHX_GUARD_KERNELS_MATH_HPP

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/vec.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/hip.hpp>
#include <migraphx/kernels/float8.hpp>
#include <migraphx/kernels/pp.hpp>
#include <migraphx/kernels/bit_cast.hpp>

namespace migraphx {

namespace math {

template <class T>
constexpr auto as_float(T x)
{
    if constexpr(is_integral<T>{})
        return x;
    else
        return float(x);
}

template <class T>
constexpr auto to_native(T x)
{
    return x;
}

constexpr migraphx::half to_native(__half x) { return bit_cast<migraphx::half>(x); }

template <class F, class T, class... Ts, MIGRAPHX_REQUIRES(not is_any_vec<T, Ts...>())>
__device__ auto wrap(F f, T x, Ts... xs)
{
    if constexpr(is_integral<T>{})
    {
        return wrap(f, double(x), double(xs)...);
    }
    else if constexpr(is_callable<F, T, Ts...>{})
    {
        return to_native(f(x, xs...));
    }
    else
    {
        T result = f(as_float(x), as_float(xs)...);
        return result;
    }
}

} // namespace math

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_LIFT_IMPL(type, ...) \
    [](type x, auto... xs) MIGRAPHX_RETURNS((__VA_ARGS__)(x, xs...))

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_LIFT(...) MIGRAPHX_DEVICE_MATH_LIFT_IMPL(__VA_ARGS__)

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_PARSE(x) x,

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_EACH(f) MIGRAPHX_DEVICE_MATH_LIFT(MIGRAPHX_DEVICE_MATH_PARSE f)

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_WRAP(name, ...)                                          \
    namespace math {                                                                  \
    inline static constexpr auto wrap_##name =                                        \
        overload(MIGRAPHX_PP_TRANSFORM_ARGS(MIGRAPHX_DEVICE_MATH_EACH, __VA_ARGS__)); \
    }                                                                                 \
    template <class... Ts>                                                            \
    auto __device__ name(Ts... xs) MIGRAPHX_RETURNS(math::wrap(math::wrap_##name, xs...))

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH(name, fname)                              \
    template <class... Ts, MIGRAPHX_REQUIRES(not is_any_vec<Ts...>())> \
    auto __device__ name(Ts... xs) MIGRAPHX_RETURNS(fname(xs...))

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_VEC(name)                                       \
    template <class... Ts, MIGRAPHX_REQUIRES(is_any_vec<Ts...>())>           \
    auto __device__ name(Ts... xs)                                           \
    {                                                                        \
        return vec_transform(xs...)([](auto... ys) { return name(ys...); }); \
    }

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_FOR(type, name, fname)                    \
    template <class... Ts, MIGRAPHX_REQUIRES(not is_any_vec<Ts...>())> \
    auto __device__ name(type x, Ts... xs) -> type                     \
    {                                                                  \
        return fname(x, xs...);                                        \
    }

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_BINARY_FOR(type, name, fname) \
    inline auto __device__ name(type x, type y) -> type { return fname(x, y); }

// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_HALF2(name, fname)                                           \
    template <class... Ts>                                                                \
    auto __device__ name(migraphx::vec<migraphx::half, 2> x, Ts... xs)                    \
        MIGRAPHX_RETURNS(migraphx::vec<migraphx::half, 2>{fname(x, xs...)});              \
    template <class... Ts, index_int N, MIGRAPHX_REQUIRES(N % 2 == 0 and (N > 2))>        \
    auto __device__ name(migraphx::vec<migraphx::half, N> x, Ts... xs)                    \
    {                                                                                     \
        return vec_packed_transform<2>(x, xs...)(                                         \
            [](auto... ys) -> migraphx::vec<migraphx::half, 2> { return fname(ys...); }); \
    }

// Template with two overloads for math functions, one for half2 type and one for more generic
// <half, N> vectorization where N is 4 or another even number.
// NOLINTNEXTLINE
#define MIGRAPHX_DEVICE_MATH_VEC2(type, name, fname)                               \
    template <class... Ts>                                                         \
    auto __device__ name(migraphx::vec<type, 2> x, Ts... xs)                       \
        MIGRAPHX_RETURNS(migraphx::vec<type, 2>{fname(x, xs...)});                 \
    template <class... Ts, index_int N, MIGRAPHX_REQUIRES(N % 2 == 0 and (N > 2))> \
    auto __device__ name(migraphx::vec<type, N> x, Ts... xs)                       \
    {                                                                              \
        return vec_packed_transform<2>(x, xs...)(                                  \
            [](auto... ys) -> migraphx::vec<type, 2> { return fname(ys...); });    \
    }

MIGRAPHX_DEVICE_MATH_WRAP(acos, (double)::acos, (float)::acosf);
MIGRAPHX_DEVICE_MATH_WRAP(acosh, (double)::acosh, (float)::acoshf);
MIGRAPHX_DEVICE_MATH_WRAP(asin, (double)::asin, (float)::asinf);
MIGRAPHX_DEVICE_MATH_WRAP(asinh, (double)::asinh, (float)::asinh);
MIGRAPHX_DEVICE_MATH_WRAP(atan, (double)::atan, (float)::atan);
MIGRAPHX_DEVICE_MATH_WRAP(atanh, (double)::atanh, (float)::atanh);
MIGRAPHX_DEVICE_MATH_WRAP(ceil, (double)::ceil, (float)::ceilf, (half)::hceil);
MIGRAPHX_DEVICE_MATH_WRAP(cos, (double)::cos, (float)::cosf, (half)::hcos);
MIGRAPHX_DEVICE_MATH_WRAP(cosh, (double)::cosh, (float)::coshf);
MIGRAPHX_DEVICE_MATH_WRAP(erf, (double)::erf, (float)::erff);
MIGRAPHX_DEVICE_MATH_WRAP(exp, (double)::exp, (float)::expf, (half)::hexp);
MIGRAPHX_DEVICE_MATH_WRAP(floor, (double)::floor, (float)::floorf, (half)::hfloor);
MIGRAPHX_DEVICE_MATH_WRAP(isnan, (double)::isnan, (float)::isnan, (half)::__hisnan);
MIGRAPHX_DEVICE_MATH_WRAP(isinf, (double)::isinf, (float)::isinf, (half)::__hisinf);
MIGRAPHX_DEVICE_MATH_WRAP(log, (double)::log, (float)::logf, (half)::hlog);
MIGRAPHX_DEVICE_MATH_WRAP(log2, (double)::log2, (float)::log2f, (half)::hlog2);
MIGRAPHX_DEVICE_MATH_WRAP(nearbyint, (double)::nearbyint, (float)::nearbyintf);
MIGRAPHX_DEVICE_MATH_WRAP(pow, (double)::pow, (float)::powf);
MIGRAPHX_DEVICE_MATH_WRAP(remainder, (double)::remainder, (float)::remainderf);
MIGRAPHX_DEVICE_MATH_WRAP(round, (double)::round, (float)::roundf);
MIGRAPHX_DEVICE_MATH_WRAP(rsqrt, (double)::rsqrt, (float)::rsqrtf, (half)::hrsqrt);
MIGRAPHX_DEVICE_MATH_WRAP(sin, (double)::sin, (float)::sinf, (half)::hsin);
MIGRAPHX_DEVICE_MATH_WRAP(sinh, (double)::sinh, (float)::sinhf);
MIGRAPHX_DEVICE_MATH_WRAP(sqrt, (double)::sqrt, (float)::sqrtf, (half)::hsqrt);
MIGRAPHX_DEVICE_MATH_WRAP(tan, (double)::tan, (float)::tanf);
MIGRAPHX_DEVICE_MATH_WRAP(tanh, (double)::tanh, (float)::tanhf);
MIGRAPHX_DEVICE_MATH_WRAP(fmod, (double)::fmod, (float)::fmodf);

template <class T, class U>
constexpr auto where(bool cond, const T& a, const U& b)
{
    return cond ? a : b;
}

MIGRAPHX_DEVICE_MATH_FOR(float, abs, ::abs)
MIGRAPHX_DEVICE_MATH_FOR(double, abs, ::abs)
MIGRAPHX_DEVICE_MATH_FOR(migraphx::half, abs, ::__habs)
MIGRAPHX_DEVICE_MATH_FOR(migraphx::bf16, abs, ::fabsf)
MIGRAPHX_DEVICE_MATH_BINARY_FOR(float, max, ::fmaxf)
MIGRAPHX_DEVICE_MATH_BINARY_FOR(float, min, ::fminf)
MIGRAPHX_DEVICE_MATH_BINARY_FOR(double, max, ::max)
MIGRAPHX_DEVICE_MATH_BINARY_FOR(double, min, ::min)
MIGRAPHX_DEVICE_MATH_BINARY_FOR(migraphx::half, max, ::__hmax)
MIGRAPHX_DEVICE_MATH_BINARY_FOR(migraphx::half, min, ::__hmin)

template <class T, MIGRAPHX_REQUIRES(not is_any_vec<T>() and is_integral<T>{})>
constexpr auto abs(const T& a)
{
    return where(a < 0, -a, a);
}

template <class T, MIGRAPHX_REQUIRES(not is_any_vec<T>())>
constexpr auto max(const T& a, const T& b)
{
    return where(a < b, b, a);
}

template <class T, MIGRAPHX_REQUIRES(not is_any_vec<T>())>
constexpr auto min(const T& a, const T& b)
{
    return where(a < b, a, b);
}

template <class T, class U, MIGRAPHX_REQUIRES(not is_same<T, U>{} and not is_any_vec<T, U>())>
constexpr auto max(const T& a, const U& b)
{
    return max<common_type_t<T, U>>(a, b);
}

template <class T, class U, MIGRAPHX_REQUIRES(not is_same<T, U>{} and not is_any_vec<T, U>())>
constexpr auto min(const T& a, const U& b)
{
    return min<common_type_t<T, U>>(a, b);
}

template <class T, MIGRAPHX_REQUIRES(not is_any_vec<T>())>
constexpr T mod(const T& a, const T& b)
{
    if constexpr(is_integral<T>{})
        // onnx mod operator requires numpy style modulus
        return ((a % b) + b) % b;
    return static_cast<T>(fmod(remainder(a, b) + b, b));
}

template <class T, class U, MIGRAPHX_REQUIRES(not is_same<T, U>{} and not is_any_vec<T, U>())>
constexpr auto mod(const T& a, const U& b)
{
    return mod<common_type_t<T, U>>(a, b);
}

MIGRAPHX_DEVICE_MATH_VEC(abs)
MIGRAPHX_DEVICE_MATH_VEC(acos)
MIGRAPHX_DEVICE_MATH_VEC(acosh)
MIGRAPHX_DEVICE_MATH_VEC(asin)
MIGRAPHX_DEVICE_MATH_VEC(asinh)
MIGRAPHX_DEVICE_MATH_VEC(atan)
MIGRAPHX_DEVICE_MATH_VEC(atanh)
MIGRAPHX_DEVICE_MATH_VEC(ceil)
MIGRAPHX_DEVICE_MATH_VEC(cos)
MIGRAPHX_DEVICE_MATH_VEC(cosh)
MIGRAPHX_DEVICE_MATH_VEC(erf)
MIGRAPHX_DEVICE_MATH_VEC(exp)
MIGRAPHX_DEVICE_MATH_VEC(floor)
MIGRAPHX_DEVICE_MATH_VEC(fmod)
MIGRAPHX_DEVICE_MATH_VEC(isinf)
MIGRAPHX_DEVICE_MATH_VEC(isnan)
MIGRAPHX_DEVICE_MATH_VEC(log)
MIGRAPHX_DEVICE_MATH_VEC(log2)
MIGRAPHX_DEVICE_MATH_VEC(max)
MIGRAPHX_DEVICE_MATH_VEC(min)
MIGRAPHX_DEVICE_MATH_VEC(mod)
MIGRAPHX_DEVICE_MATH_VEC(nearbyint)
MIGRAPHX_DEVICE_MATH_VEC(pow)
MIGRAPHX_DEVICE_MATH_VEC(remainder)
MIGRAPHX_DEVICE_MATH_VEC(round)
MIGRAPHX_DEVICE_MATH_VEC(rsqrt)
MIGRAPHX_DEVICE_MATH_VEC(sin)
MIGRAPHX_DEVICE_MATH_VEC(sinh)
MIGRAPHX_DEVICE_MATH_VEC(sqrt)
MIGRAPHX_DEVICE_MATH_VEC(tan)
MIGRAPHX_DEVICE_MATH_VEC(tanh)
MIGRAPHX_DEVICE_MATH_VEC(where)

// Map math functions to hip half2 functions
// The half2 type is defined in include/hip/amd_detail/hip_fp16_gcc.h and is 2 16-bit floats
// packed into a 32-bit number.  See include/hip/amd_detail/hip_fp16_math_fwd.h for the HIP names
// Most but not all of these math ops have operators of the same names.
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, abs, ::__habs2)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, ceil, ::h2ceil)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, cos, ::h2cos)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, exp, ::h2exp)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, exp10, ::h2exp10)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, exp2, ::h2exp2)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, floor, ::h2floor)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, isinf, ::__hisinf2)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, isnan, ::__hisnan2)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, log, ::h2log)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, log10, ::h2log10)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, log2, ::h2log2)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, rsqrt, ::h2rsqrt)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, sin, ::h2sin)
MIGRAPHX_DEVICE_MATH_VEC2(migraphx::half, sqrt, ::h2sqrt)

template <class T, class U>
constexpr auto convert(U v)
{
    return vec_transform(v)([](auto x) -> T { return static_cast<T>(x); });
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_MATH_HPP
