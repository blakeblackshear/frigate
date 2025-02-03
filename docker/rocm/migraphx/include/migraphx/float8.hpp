/* ************************************************************************
 * Copyright (C) 2015-2024 Advanced Micro Devices, Inc. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell cop-
 * ies of the Software, and to permit persons to whom the Software is furnished
 * to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IM-
 * PLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNE-
 * CTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ************************************************************************ */

#ifndef MIGRAPHX_GUARD_RTGLIB_FLOAT8_HPP
#define MIGRAPHX_GUARD_RTGLIB_FLOAT8_HPP

// We are clipping/saturation in down conversion by default. Unclipped version is not tested and
// shouldn't be used without having enough tests.
// logic is based on clipping table from here : https://onnx.ai/onnx/technical/float8.html#cast
// NOLINTNEXTLINE
#define MIGRAPHX_F8_DOWNCAST_CLIPPING 1

#include <cmath>
#include <cstdint>
#include <climits>
#include <cstring>
#include <iosfwd>
#include <limits>
#include <sstream>
#include <iostream>
#include <string>
#include <utility>
#include <migraphx/config.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/float8_impl.hpp>
#include <migraphx/generic_float.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace fp8 {

enum class rounding_mode
{
    standard, // standard rounding is doing RNE -- round to nearest even
    stochastic
};

enum class f8_type
{
    bf8 = 0, // s1e5m2
    fp8 = 1  // s1e4m3
};

template <typename T, bool FNUZ = true>
class numeric_limits;

template <migraphx::fp8::f8_type T = migraphx::fp8::f8_type::fp8, bool FNUZ = true>
struct float8
{
    uint8_t data = 0x00;
    // default constructor
    constexpr float8() = default;
    // default copy constructor
    constexpr float8(const float8& y) = default;
    struct from_bits_t
    {
    };
    static constexpr from_bits_t from_bits() { return from_bits_t(); }

    explicit constexpr float8(uint8_t bits, from_bits_t) : data(bits) {}

    explicit constexpr float8(
        float v,
        migraphx::fp8::rounding_mode rm = migraphx::fp8::rounding_mode::standard,
        uint32_t rng                    = 0)
    {
        if constexpr(T == migraphx::fp8::f8_type::fp8)
        {
#ifdef MIGRAPHX_F8_DOWNCAST_CLIPPING
            data = migraphx::fp8::impl::
                cast_to_f8<3, 4, float, FNUZ /*negative_zero_nan*/, true /*clip*/>(
                    v, (rm == migraphx::fp8::rounding_mode::stochastic), rng);
#else  // MIGRAPHX_F8_DOWNCAST_CLIPPING
            data = migraphx::fp8::impl::
                cast_to_f8<3, 4, float, FNUZ /*negative_zero_nan*/, false /*clip*/>(
                    v, (rm == migraphx::fp8::rounding_mode::stochastic), rng);
#endif // MIGRAPHX_F8_DOWNCAST_CLIPPING
        }
        else
        {
#ifdef MIGRAPHX_F8_DOWNCAST_CLIPPING
            data = migraphx::fp8::impl::
                cast_to_f8<2, 5, float, FNUZ /*negative_zero_nan*/, true /*clip*/>(
                    v, (rm == migraphx::fp8::rounding_mode::stochastic), rng);
#else  // MIGRAPHX_F8_DOWNCAST_CLIPPING
            data = migraphx::fp8::impl::
                cast_to_f8<2, 5, float, FNUZ /*negative_zero_nan*/, false /*clip*/>(
                    v, (rm == migraphx::fp8::rounding_mode::stochastic), rng);
#endif // rocblas_F8_downcast_clipping}
        }
    }

    inline constexpr operator float() const
    {
        if constexpr(T == migraphx::fp8::f8_type::fp8)
        {
            return migraphx::fp8::impl::cast_from_f8<3, 4, float, FNUZ /*negative_zero_nan*/>(data);
        } // else
        return migraphx::fp8::impl::cast_from_f8<2, 5, float, FNUZ /*negative_zero_nan*/>(data);
    }

    inline explicit constexpr operator bool() const { return not is_zero(); }

    inline constexpr bool is_zero() const
    {
        if constexpr(FNUZ)
        {
            return data == 0x00;
        }
        else
        {
            return (data == 0x00) or (data == 0x80);
        }
    }

    inline constexpr bool is_nan() const
    {
        if constexpr(FNUZ)
        {
            return data == 0x80;
        }
        else
        {
            if(T == migraphx::fp8::f8_type::bf8)
            {
                return (data == 0x7D) or (data == 0x7E) or (data == 0x7F) or (data == 0xFD) or
                       (data == 0xFE) or (data == 0xFF);
            }
            else
            {
                return (data == 0x7F) or (data == 0xFF);
            }
        }
    }

    inline constexpr bool is_inf() const
    {
        if constexpr(FNUZ)
        {
            return data == 0x80;
        }
        else
        {
            if(T == migraphx::fp8::f8_type::bf8)
            {
                return (data == 0x7C) or (data == 0xFC);
            }
            else
            {
                // no infinities in e4m3fn, represent them as NaNs
                return (data == 0x7F) or (data == 0xFF);
            }
        }
    }

// NOLINTNEXTLINE
#define MIGRAPHX_FP8_UNARY_OP(unary_op, binary_op)                                    \
    constexpr float8& operator unary_op(const float8& rhs)                            \
    {                                                                                 \
        const auto tmp = static_cast<float>(*this) binary_op static_cast<float>(rhs); \
        *this          = static_cast<float8>(tmp);                                    \
        return *this;                                                                 \
    }                                                                                 \
    constexpr float8& operator unary_op(const float& rhs)                             \
    {                                                                                 \
        const auto tmp = static_cast<float>(*this) binary_op static_cast<float>(rhs); \
        *this          = static_cast<float8>(tmp);                                    \
        return *this;                                                                 \
    }

    MIGRAPHX_FP8_UNARY_OP(*=, *)
    MIGRAPHX_FP8_UNARY_OP(-=, -)
    MIGRAPHX_FP8_UNARY_OP(+=, +)
    MIGRAPHX_FP8_UNARY_OP(/=, /)

    inline constexpr float8& operator=(const float8& rhs)     = default;
    inline constexpr float8& operator=(float8&& rhs) noexcept = default;

    inline constexpr float8& operator=(float rhs)
    {
        *this = static_cast<float8>(rhs);
        return *this;
    }

    inline constexpr bool operator==(const float8& rhs) const
    {
        if(rhs.is_nan() or rhs.is_inf() or this->is_nan() or this->is_inf())
            return false;
        else if((rhs.is_zero() and this->is_zero()) or (this->data == rhs.data))
            return true;
        return false;
    }

    inline constexpr bool operator<(const float8& rhs) const
    {
        const auto we   = static_cast<float>(*this);
        const auto them = static_cast<float>(rhs);
        return we < them;
    }

    inline constexpr bool operator>(const float8& rhs) const
    {
        const auto we   = static_cast<float>(*this);
        const auto them = static_cast<float>(rhs);
        return we > them;
    }
};

// https://onnx.ai/onnx/technical/float8.html
using fp8e4m3fn   = float8<migraphx::fp8::f8_type::fp8, false>;
using fp8e5m2     = float8<migraphx::fp8::f8_type::bf8, false>;
using fp8e4m3fnuz = float8<migraphx::fp8::f8_type::fp8, true>;
using fp8e5m2fnuz = float8<migraphx::fp8::f8_type::bf8, true>;
/*
// NOLINTNEXTLINE
#define MIGRAPHX_FP8_BINARY_OP(binary_op, T, U)                                     \
    inline constexpr U operator binary_op(const T& lhs, const T& rhs)               \
    {                                                                               \
        return U(static_cast<float>(lhs) binary_op static_cast<float>(rhs)); \
    }

// TODO: these should return floats for binary ops
// NOLINTNEXTLINE
#define MIGRAPHX_FP8_BINARY_OP_GEN_FOR(T) \
    MIGRAPHX_FP8_BINARY_OP(*, T, T)       \
    MIGRAPHX_FP8_BINARY_OP(-, T, T)       \
    MIGRAPHX_FP8_BINARY_OP(/, T, T)       \
    MIGRAPHX_FP8_BINARY_OP(+, T, T)       \
    MIGRAPHX_FP8_BINARY_OP(==, T, bool)   \
    MIGRAPHX_FP8_BINARY_OP(>=, T, bool)   \
    MIGRAPHX_FP8_BINARY_OP(<=, T, bool)   \
    MIGRAPHX_FP8_BINARY_OP(>, T, bool)    \
    MIGRAPHX_FP8_BINARY_OP(<, T, bool)    \
    MIGRAPHX_FP8_BINARY_OP(!=, T, bool)

MIGRAPHX_FP8_BINARY_OP_GEN_FOR(fp8e5m2)
MIGRAPHX_FP8_BINARY_OP_GEN_FOR(fp8e4m3fn)
MIGRAPHX_FP8_BINARY_OP_GEN_FOR(fp8e5m2fnuz)
MIGRAPHX_FP8_BINARY_OP_GEN_FOR(fp8e4m3fnuz)
*/

// Special operator overloading
inline std::ostream& operator<<(std::ostream& os, const fp8e4m3fnuz& rhs)
{
    return os << static_cast<float>(rhs);
}

inline fp8e4m3fnuz fabs(fp8e4m3fnuz v)
{
    v.data = v.data & 0x7F; // NOLINT
    return v;
}

// Special operator overloading
inline std::ostream& operator<<(std::ostream& os, const fp8e4m3fn& rhs)
{
    return os << static_cast<float>(rhs);
}

inline fp8e4m3fn fabs(fp8e4m3fn v)
{
    v.data = v.data & 0x7F; // NOLINT
    return v;
}

// Special operator overloading
inline std::ostream& operator<<(std::ostream& os, const fp8e5m2fnuz& rhs)
{
    return os << static_cast<float>(rhs);
}

inline fp8e5m2fnuz fabs(fp8e5m2fnuz v)
{
    v.data = v.data & 0x7F; // NOLINT
    return v;
}
// Special operator overloading
inline std::ostream& operator<<(std::ostream& os, const fp8e5m2& rhs)
{
    return os << static_cast<float>(rhs);
}

inline fp8e5m2 fabs(fp8e5m2 v)
{
    v.data = v.data & 0x7F; // NOLINT
    return v;
}
template <>
class numeric_limits<fp8e4m3fnuz>
{
    public:
    static constexpr bool has_infinity = false;
    static constexpr fp8e4m3fnuz epsilon() { return fp8e4m3fnuz(0x28, fp8e4m3fnuz::from_bits()); }
    // NOLINTNEXTLINE
    static constexpr fp8e4m3fnuz quiet_NaN() { return fp8e4m3fnuz(0x80, fp8e4m3fnuz::from_bits()); }

    static constexpr fp8e4m3fnuz max() { return fp8e4m3fnuz(0x7F, fp8e4m3fnuz::from_bits()); }
    // this is min value that is not DeNorm. DeNorm min is 0x01
    static constexpr fp8e4m3fnuz min() { return fp8e4m3fnuz(0x08, fp8e4m3fnuz::from_bits()); }

    static constexpr fp8e4m3fnuz lowest() { return fp8e4m3fnuz(0xFF, fp8e4m3fnuz::from_bits()); }
};

template <>
class numeric_limits<fp8e4m3fn>
{
    public:
    static constexpr bool has_infinity = false;
    static constexpr fp8e4m3fn epsilon() { return fp8e4m3fn(0x20, fp8e4m3fn::from_bits()); }
    // NOLINTNEXTLINE
    static constexpr fp8e4m3fn quiet_NaN() { return fp8e4m3fn(0x7F, fp8e4m3fn::from_bits()); }

    static constexpr fp8e4m3fn max() { return fp8e4m3fn(0x7E, fp8e4m3fn::from_bits()); }
    // this is min value that is not DeNorm. DeNorm min is 0x01
    static constexpr fp8e4m3fn min() { return fp8e4m3fn(0x08, fp8e4m3fn::from_bits()); }

    static constexpr fp8e4m3fn lowest() { return fp8e4m3fn(0xFE, fp8e4m3fn::from_bits()); }
};

template <>
class numeric_limits<fp8e5m2fnuz>
{
    public:
    static constexpr bool has_infinity = false;
    static constexpr fp8e5m2fnuz epsilon() { return fp8e5m2fnuz(0x34, fp8e5m2fnuz::from_bits()); }

    static constexpr fp8e5m2fnuz quiet_NaN() // NOLINT
    {
        return fp8e5m2fnuz(0x80, fp8e5m2fnuz::from_bits());
    }

    static constexpr fp8e5m2fnuz max() { return fp8e5m2fnuz(0x7F, fp8e5m2fnuz::from_bits()); }
    // this is min value that is not DeNorm. DeNorm min is 0x01. I am not sure if we want to make
    // this distinction. For the floating points we would end up using lowest most of the times.
    static constexpr fp8e5m2fnuz min() { return fp8e5m2fnuz(0x4, fp8e5m2fnuz::from_bits()); }

    static constexpr fp8e5m2fnuz lowest() { return fp8e5m2fnuz(0xFF, fp8e5m2fnuz::from_bits()); }
};

template <>
class numeric_limits<fp8e5m2>
{
    public:
    static constexpr bool has_infinity = true;
    static constexpr fp8e5m2 epsilon() { return fp8e5m2(0x34, fp8e5m2::from_bits()); }
    // 7D, 7E, 7F are positive NaNs and FD, FE, FF are negative NaNs
    static constexpr fp8e5m2 quiet_NaN() { return fp8e5m2(0xFF, fp8e5m2::from_bits()); } // NOLINT

    static constexpr fp8e5m2 max() { return fp8e5m2(0x7B, fp8e5m2::from_bits()); }
    // this is min value that is not DeNorm. DeNorm min is 0x01. I am not sure if we want to make
    // this distinction. For the floating points we would end up using lowest most of the times.
    static constexpr fp8e5m2 min() { return fp8e5m2(0x4, fp8e5m2::from_bits()); }

    static constexpr fp8e5m2 lowest() { return fp8e5m2(0xFB, fp8e5m2::from_bits()); }
    // 7C and FC both are infinity
    static constexpr fp8e5m2 infinity() { return fp8e5m2(0x7C, fp8e5m2::from_bits()); }
};
} // namespace fp8
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

// =================================================================================================
// define numeric limits for the new data type
// NOLINTBEGIN(cert-dcl58-cpp)
namespace std {

template <migraphx::fp8::f8_type T, bool FNUZ>
inline bool isfinite(migraphx::fp8::float8<T, FNUZ> x)
{
    return not x.is_inf() and not x.is_nan();
}

template <migraphx::fp8::f8_type T, bool FNUZ>
inline bool isnan(migraphx::fp8::float8<T, FNUZ> x)
{
    return x.is_nan();
}

template <migraphx::fp8::f8_type T, bool FNUZ>
class numeric_limits<migraphx::fp8::float8<T, FNUZ>>
    : public migraphx::fp8::numeric_limits<migraphx::fp8::float8<T, FNUZ>>
{
};
template <migraphx::fp8::f8_type T, bool FNUZ, class U>
struct common_type<migraphx::fp8::float8<T, FNUZ>, U> : std::common_type<float, U>
{
};
template <migraphx::fp8::f8_type T, bool FNUZ, class U>
struct common_type<U, migraphx::fp8::float8<T, FNUZ>> : std::common_type<U, float>
{
};
template <migraphx::fp8::f8_type T, bool FNUZ>
struct common_type<migraphx::fp8::float8<T, FNUZ>, migraphx::fp8::float8<T, FNUZ>>
{
    using type = migraphx::fp8::float8<T, FNUZ>;
};

template <migraphx::fp8::f8_type T1, bool FNUZ1, migraphx::fp8::f8_type T2, bool FNUZ2>
struct common_type<migraphx::fp8::float8<T1, FNUZ1>, migraphx::fp8::float8<T2, FNUZ2>>
{
    using type = float;
};

template <unsigned int E, unsigned int M, unsigned int F, bool FNUZ>
struct common_type<migraphx::generic_float<E, M, F>,
                   migraphx::fp8::float8<migraphx::fp8::f8_type::fp8, FNUZ>>
{
    using type = float;
};

template <unsigned int E, unsigned int M, unsigned int F, bool FNUZ>
struct common_type<migraphx::fp8::float8<migraphx::fp8::f8_type::fp8, FNUZ>,
                   migraphx::generic_float<E, M, F>>
{
    using type = float;
};

template <unsigned int E, unsigned int M, unsigned int F, migraphx::fp8::f8_type T, bool FNUZ>
struct common_type<migraphx::generic_float<E, M, F>, migraphx::fp8::float8<T, FNUZ>>
    : std::common_type<float, float>
{
};

template <unsigned int E, unsigned int M, unsigned int F, migraphx::fp8::f8_type T, bool FNUZ>
struct common_type<migraphx::fp8::float8<T, FNUZ>, migraphx::generic_float<E, M, F>>
    : std::common_type<float, float>
{
};

} // namespace std
// NOLINTEND(cert-dcl58-cpp)
// =================================================================================================
#endif // MIGRAPHX_GUARD_RTGLIB_FLOAT8_HPP
