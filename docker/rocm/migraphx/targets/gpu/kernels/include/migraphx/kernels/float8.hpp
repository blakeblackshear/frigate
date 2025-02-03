/* ************************************************************************
 *
 * The MIT License (MIT)
 *
 * Copyright (C) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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

#ifndef MIGRAPHX_GUARD_KERNELS_FLOAT8_HPP
#define MIGRAPHX_GUARD_KERNELS_FLOAT8_HPP
#if defined(__clang__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wfloat-equal"
#pragma clang diagnostic ignored "-Wc++20-extensions" // required for "asm" inside constexpr
#endif                                                // __clang__

// We are clipping in down conversion by default
#define MIGRAPHX_F8_DOWNCAST_CLIPPING 1 // NOLINT

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/type_traits.hpp>
#include <migraphx/kernels/float8_impl.hpp>

namespace migraphx {
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

template <typename T>
class numeric_limits;

template <migraphx::fp8::f8_type T = migraphx::fp8::f8_type::fp8, bool FNUZ = true>
struct float8
{
    uint8_t data;
    // default constructor
    __device__ constexpr float8() = default;
    // default copy constructor
    __device__ constexpr float8(const float8& y) = default;
    struct from_bits_t
    {
    };
    static constexpr __device__ from_bits_t from_bits() { return from_bits_t(); }

    __device__ explicit constexpr float8(uint8_t bits, from_bits_t) : data(bits) {}

#if defined(__gfx940__) || defined(__gfx941__) || defined(__gfx942__)
    // device specific optimized F8 down-conversion code

    template <bool stochastic_rounding = false>
    static __device__ uint8_t cast_to_f8fnuz_from_f32(float v, uint32_t rng = 0)
    {
        uint8_t i8data = 0x00;
        union
        {
            float fval;
            uint32_t i32val;
            uint8_t i8val[4]; // NOTE: not endian independent
        } val;

        uint32_t ival = 0;
        val.fval      = v;

#ifdef MIGRAPHX_F8_DOWNCAST_CLIPPING
        if constexpr(T == migraphx::fp8::f8_type::fp8)
        {
            if((val.i32val & 0x7F800000) != 0x7F800000) /// propagate NAN/INF, no clipping
                val.fval = __builtin_amdgcn_fmed3f(val.fval, 240.0, -240.0);
        }
        else
        {
            if((val.i32val & 0x7F800000) != 0x7F800000) // propagate NAN/INF, no clipping
                val.fval = __builtin_amdgcn_fmed3f(val.fval, 57344.0, -57344.0);
        }
#endif
        if(stochastic_rounding)
        {
            if constexpr(T == migraphx::fp8::f8_type::fp8)
            {
                ival = __builtin_amdgcn_cvt_sr_fp8_f32(val.fval, rng, ival, 0); // 0 pos
            }
            else
            {
                ival = __builtin_amdgcn_cvt_sr_bf8_f32(val.fval, rng, ival, 0); // 0 pos
            }
        }
        else // RNE CVT
        {
            if constexpr(T == migraphx::fp8::f8_type::fp8)
            {
                ival = __builtin_amdgcn_cvt_pk_fp8_f32(
                    val.fval, val.fval, ival, false); // false -> WORD0
            }
            else
            {
                ival = __builtin_amdgcn_cvt_pk_bf8_f32(
                    val.fval, val.fval, ival, false); // false -> WORD0}
            }
        }
        val.i32val = ival;
        i8data     = val.i8val[0]; // little endian

        return i8data;
    }
#endif // __gfx940__

       // constructor from float
#if defined(__gfx940__) || defined(__gfx941__) || defined(__gfx942__)

    // NOTE: ON-DEVICE... always optimal bias
    explicit constexpr __device__
    float8(const float v,
           migraphx::fp8::rounding_mode rm = migraphx::fp8::rounding_mode::standard,
           uint32_t rng                    = 0)
    {
        if(__builtin_is_constant_evaluated() or !FNUZ)
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
#endif // MIGRAPHX_FP8_DOWNCAST_CLIPPING}
            }
        }
        else
        {
            // runtime branch, use cast_to_f8fnuz_from_f32 if want to avoid it
            if(rm == migraphx::fp8::rounding_mode::stochastic)
                data = cast_to_f8fnuz_from_f32<true>(v, rng);
            else
                data = cast_to_f8fnuz_from_f32<false>(v);
        }
    }
#else
    // DEVICE for non-gfx940 using s/w simulation
    explicit constexpr __device__
    float8(const float v,
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
#endif // MIGRAPHX_FP8_DOWNCAST_CLIPPING}
        }
    }
#endif // __gfx940___

    // Constructor from half
    explicit constexpr __device__
    float8(const _Float16 v, rounding_mode rm = rounding_mode::standard, uint32_t rng = 0)
        : float8(static_cast<float>(v), rm, rng)
    {
    }

    // constructor from int
    explicit constexpr __device__
    float8(const int v, rounding_mode rm = rounding_mode::standard, uint32_t rng = 0)
        : float8(static_cast<float>(v), rm, rng)
    {
    }

    // constructor from uint
    explicit constexpr __device__
    float8(const uint32_t v, rounding_mode rm = rounding_mode::standard, uint32_t rng = 0)
        : float8(static_cast<float>(v), rm, rng)
    {
    }

    // constructor from double
    explicit constexpr __device__
    float8(const double v, rounding_mode rm = rounding_mode::standard, uint32_t rng = 0)
        : float8(static_cast<float>(v), rm, rng)
    {
    }

    // constructor from bool
    explicit constexpr __device__
    float8(const bool v, rounding_mode rm = rounding_mode::standard, uint32_t rng = 0)
        : float8(static_cast<float>(v), rm, rng)
    {
    }
    // convert to float
#if defined(__gfx940__) || defined(__gfx941__) || defined(__gfx942__) // NOLINT
    // upcast using device specific intrinsic
    inline constexpr __device__ operator float() const
    {
        if(__builtin_is_constant_evaluated() or !FNUZ)
        {
            if constexpr(T == migraphx::fp8::f8_type::fp8)
            {
                return migraphx::fp8::impl::cast_from_f8<3, 4, float, FNUZ /*negative_zero_nan*/>(
                    data);
            } // else
            return migraphx::fp8::impl::cast_from_f8<2, 5, float, FNUZ /*negative_zero_nan*/>(data);
        }
        else
        {
            float fval      = 0;
            uint32_t i32val = static_cast<uint32_t>(data);

            // upcast
            if constexpr(T == migraphx::fp8::f8_type::fp8)
            {
                __asm__ volatile("v_cvt_f32_fp8 %0, %1 src0_sel:BYTE_0" : "=v"(fval) : "v"(i32val));
            }
            else
            {
                __asm__ volatile("v_cvt_f32_bf8 %0, %1 src0_sel:BYTE_0" : "=v"(fval) : "v"(i32val));
            }

            return fval;
        }
    }

#else // non gfx940
    inline constexpr __device__ operator float() const
    {
        if constexpr(T == migraphx::fp8::f8_type::fp8)
        {
            return migraphx::fp8::impl::cast_from_f8<3, 4, float, FNUZ /*negative_zero_nan*/>(data);
        } // else
        return migraphx::fp8::impl::cast_from_f8<2, 5, float, FNUZ /*negative_zero_nan*/>(data);
    }
#endif

    inline constexpr explicit __device__ operator bool() const { return not is_zero(); }

    // check for zero
    inline __device__ constexpr bool is_zero() const
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

    // check for nan
    inline __device__ constexpr bool is_nan() const
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

    // check for inf
    inline __device__ constexpr bool is_inf() const
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
#define MIGRAPHX_FP8_SHORT_UNARY_OP(unary_op, binary_op)                              \
    constexpr float8& __device__ operator unary_op(const float8& rhs)                 \
    {                                                                                 \
        const auto tmp = static_cast<float>(*this) binary_op static_cast<float>(rhs); \
        *this          = static_cast<float8>(tmp);                                    \
        return *this;                                                                 \
    }                                                                                 \
    constexpr float8& __device__ operator unary_op(const float& rhs)                  \
    {                                                                                 \
        const auto tmp = static_cast<float>(*this) binary_op static_cast<float>(rhs); \
        *this          = static_cast<float8>(tmp);                                    \
        return *this;                                                                 \
    }

    MIGRAPHX_FP8_SHORT_UNARY_OP(*=, *)
    MIGRAPHX_FP8_SHORT_UNARY_OP(-=, -)
    MIGRAPHX_FP8_SHORT_UNARY_OP(+=, +)
    MIGRAPHX_FP8_SHORT_UNARY_OP(/=, /)

    inline __device__ constexpr float8& operator=(const float8& rhs)     = default;
    inline __device__ constexpr float8& operator=(float8&& rhs) noexcept = default;

    inline __device__ constexpr bool operator<(const float8& rhs) const
    {
        const auto we   = static_cast<float>(*this);
        const auto them = static_cast<float>(rhs);
        return we < them;
    }

    inline __device__ constexpr bool operator>(const float8& rhs) const
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

// NOLINTNEXTLINE
#define MIGRAPHX_FP8_BINARY_OP(binary_op, T, U)                                  \
    inline constexpr U __device__ operator binary_op(const T& lhs, const T& rhs) \
    {                                                                            \
        return U(static_cast<float>(lhs) binary_op static_cast<float>(rhs));     \
    }

// NOLINTNEXTLINE
#define MIGRAPHX_FP8_OTHER_OPS(T)                                            \
    inline constexpr __device__ T fabs(T v)                                  \
    {                                                                        \
        /*NOLINTNEXTLINE*/                                                   \
        v.data = v.data & 0x7f;                                              \
        return v;                                                            \
    }                                                                        \
    inline __device__ constexpr bool operator==(const T& lhs, const T& rhs)  \
    {                                                                        \
        if(rhs.is_nan() or rhs.is_inf() or lhs.is_nan() or lhs.is_inf())     \
            return false;                                                    \
        else if((rhs.is_zero() and lhs.is_zero()) or (lhs.data == rhs.data)) \
            return true;                                                     \
        return false;                                                        \
    }

// NOLINTNEXTLINE
#define MIGRAPHX_FP8_GEN_OP_OVERLOADS(T) \
    MIGRAPHX_FP8_BINARY_OP(*, T, T)      \
    MIGRAPHX_FP8_BINARY_OP(-, T, T)      \
    MIGRAPHX_FP8_BINARY_OP(/, T, T)      \
    MIGRAPHX_FP8_BINARY_OP(+, T, T)      \
    MIGRAPHX_FP8_BINARY_OP(>=, T, bool)  \
    MIGRAPHX_FP8_BINARY_OP(<=, T, bool)  \
    MIGRAPHX_FP8_BINARY_OP(!=, T, bool)  \
    MIGRAPHX_FP8_OTHER_OPS(T)

MIGRAPHX_FP8_GEN_OP_OVERLOADS(fp8e5m2)
MIGRAPHX_FP8_GEN_OP_OVERLOADS(fp8e5m2fnuz)
MIGRAPHX_FP8_GEN_OP_OVERLOADS(fp8e4m3fn)
MIGRAPHX_FP8_GEN_OP_OVERLOADS(fp8e4m3fnuz)

template <>
class numeric_limits<fp8e4m3fnuz>
{
    public:
    static constexpr bool has_infinity = false;
    static constexpr __device__ fp8e4m3fnuz epsilon()
    {
        return fp8e4m3fnuz(0x28, fp8e4m3fnuz::from_bits());
    }
    // NOLINTNEXTLINE
    static constexpr __device__ fp8e4m3fnuz quiet_NaN()
    {
        return fp8e4m3fnuz(0x80, fp8e4m3fnuz::from_bits());
    }

    static constexpr __device__ fp8e4m3fnuz max()
    {
        return fp8e4m3fnuz(0x7F, fp8e4m3fnuz::from_bits());
    }
    // this is min value that is not DeNormalized(DeNorm). DeNorm min is 0x01
    static constexpr __device__ fp8e4m3fnuz min()
    {
        return fp8e4m3fnuz(0x08, fp8e4m3fnuz::from_bits());
    }

    static constexpr __device__ fp8e4m3fnuz lowest()
    {
        return fp8e4m3fnuz(0xFF, fp8e4m3fnuz::from_bits());
    }
};

template <>
class numeric_limits<fp8e4m3fn>
{
    public:
    static constexpr bool has_infinity = false;
    static constexpr __device__ fp8e4m3fn epsilon()
    {
        return fp8e4m3fn(0x20, fp8e4m3fn::from_bits());
    }
    // NOLINTNEXTLINE
    static constexpr __device__ fp8e4m3fn quiet_NaN()
    {
        return fp8e4m3fn(0x7F, fp8e4m3fn::from_bits());
    }

    static constexpr __device__ fp8e4m3fn max() { return fp8e4m3fn(0x7E, fp8e4m3fn::from_bits()); }
    // this is min value that is not DeNormalized(DeNorm). DeNorm min is 0x01
    static constexpr __device__ fp8e4m3fn min() { return fp8e4m3fn(0x08, fp8e4m3fn::from_bits()); }

    static constexpr __device__ fp8e4m3fn lowest()
    {
        return fp8e4m3fn(0xFE, fp8e4m3fn::from_bits());
    }
};

template <>
class numeric_limits<fp8e5m2fnuz>
{
    public:
    static constexpr bool has_infinity = false;
    static constexpr __device__ fp8e5m2fnuz epsilon()
    {
        return fp8e5m2fnuz(0x34, fp8e5m2fnuz::from_bits());
    }

    static constexpr __device__ fp8e5m2fnuz quiet_NaN() // NOLINT
    {
        return fp8e5m2fnuz(0x80, fp8e5m2fnuz::from_bits());
    }

    static constexpr __device__ fp8e5m2fnuz max()
    {
        return fp8e5m2fnuz(0x7F, fp8e5m2fnuz::from_bits());
    }
    // this is min value that is not DeNormalized(DeNorm). DeNorm min is 0x01.
    static constexpr __device__ fp8e5m2fnuz min()
    {
        return fp8e5m2fnuz(0x4, fp8e5m2fnuz::from_bits());
    }

    static constexpr __device__ fp8e5m2fnuz lowest()
    {
        return fp8e5m2fnuz(0xFF, fp8e5m2fnuz::from_bits());
    }
};

template <>
class numeric_limits<fp8e5m2>
{
    public:
    static constexpr bool has_infinity = true;
    static constexpr __device__ fp8e5m2 epsilon() { return fp8e5m2(0x34, fp8e5m2::from_bits()); }
    // 7D, 7E, 7F are positive NaNs and FD, FE, FF are negative NaNs
    static constexpr __device__ fp8e5m2 quiet_NaN() // NOLINT
    {
        return fp8e5m2(0xFF, fp8e5m2::from_bits());
    }

    static constexpr __device__ fp8e5m2 max() { return fp8e5m2(0x7B, fp8e5m2::from_bits()); }
    // this is min value that is not DeNormalized(DeNorm). DeNorm min is 0x01.
    static constexpr __device__ fp8e5m2 min() { return fp8e5m2(0x4, fp8e5m2::from_bits()); }

    static constexpr __device__ fp8e5m2 lowest() { return fp8e5m2(0xFB, fp8e5m2::from_bits()); }
    // 7C and FC both are infinity
    static constexpr __device__ fp8e5m2 infinity() { return fp8e5m2(0x7C, fp8e5m2::from_bits()); }
};

} // namespace fp8
template <class T,
          MIGRAPHX_REQUIRES(is_same<T, fp8::fp8e4m3fnuz>{} or is_same<T, fp8::fp8e5m2fnuz>{} or
                            is_same<T, fp8::fp8e4m3fn>{} or is_same<T, fp8::fp8e5m2>{})>
constexpr T numeric_max(migraphx::fp8::f8_type unused = migraphx::fp8::f8_type::fp8)
{
    // unused parameter is added to make this numeric_max different overload definition
    // compared to numeric_max defined in type_traits.hpp
    (void)(unused);
    return fp8::numeric_limits<T>::max();
}
template <class T,
          MIGRAPHX_REQUIRES(is_same<T, fp8::fp8e4m3fnuz>{} or is_same<T, fp8::fp8e5m2fnuz>{} or
                            is_same<T, fp8::fp8e4m3fn>{} or is_same<T, fp8::fp8e5m2>{})>
constexpr T numeric_lowest(migraphx::fp8::f8_type unused = migraphx::fp8::f8_type::fp8)
{
    // unused parameter is added to make this numeric_lowest different overload definition
    // compared to numeric_lowest defined in type_traits.hpp
    (void)(unused);
    return fp8::numeric_limits<T>::lowest();
}
} // namespace migraphx
// =================================================================================================
#if defined(__clang__)
#pragma clang diagnostic pop
#endif // __clang__

#endif // MIGRAPHX_GUARD_KERNELS_FLOAT8_HPP
