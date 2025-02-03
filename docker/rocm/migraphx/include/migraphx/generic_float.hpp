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

#ifndef MIGRAPHX_GUARD_MIGRAPHX_GENERIC_FLOAT_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_GENERIC_FLOAT_HPP

#include <migraphx/config.hpp>
#include <migraphx/bit_cast.hpp>
#include <algorithm>
#include <limits>
#include <iostream>
#include <tuple>
#include <cstdint>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <unsigned int N>
constexpr unsigned int all_ones() noexcept
{
    return (1u << N) - 1u;
}

template <typename T>
constexpr int countl_zero(T value)
{
    unsigned int r = 0;
    for(; value != 0u; value >>= 1u)
        r++;
    return 8 * sizeof(value) - r;
}

constexpr std::size_t bit_ceil(std::size_t v)
{
    if(v <= 1)
        return 1;
    v--;
    v |= v >> 1u;
    v |= v >> 2u;
    v |= v >> 4u;
    v |= v >> 8u;
    v |= v >> 16u;
    v |= v >> 32u;
    return v + 1;
}

constexpr std::size_t integer_divide_ceil(std::size_t x, std::size_t y)
{
    return (x + y - std::size_t{1}) / y;
}

template <unsigned int Bytes>
struct unsigned_type
{
};

template <>
struct unsigned_type<1>
{
    using type = std::uint8_t;
};

template <>
struct unsigned_type<2>
{
    using type = std::uint16_t;
};

template <>
struct unsigned_type<4>
{
    using type = std::uint32_t;
};

template <>
struct unsigned_type<8>
{
    using type = std::uint64_t;
};

struct float32_parts
{
    unsigned int mantissa : 23;
    unsigned int exponent : 8;
    unsigned int sign : 1;

    static constexpr unsigned int exponent_width() { return 8; }

    static constexpr unsigned int mantissa_width() { return 23; }

    static constexpr unsigned int max_exponent() { return all_ones<8>(); }

    static constexpr int exponent_bias() { return all_ones<7>(); }

    constexpr float to_float() const noexcept { return migraphx::bit_cast<float>(*this); }
};

constexpr float32_parts get_parts(float f) { return migraphx::bit_cast<float32_parts>(f); }

template <unsigned int MantissaSize, unsigned int ExponentSize, unsigned int Flags = 0>
struct __attribute__((packed, may_alias)) generic_float
{
    using type = typename unsigned_type<bit_ceil(
        integer_divide_ceil(MantissaSize + ExponentSize + 1, 8))>::type;

    type mantissa : MantissaSize;
    type exponent : ExponentSize;
    type sign : 1;

    static constexpr int exponent_bias() { return all_ones<ExponentSize - 1>(); }

    explicit constexpr generic_float(float f = 0.0) noexcept { from_float(get_parts(f)); }

    constexpr generic_float& operator=(float f) noexcept
    {
        from_float(get_parts(f));
        return *this;
    }

    constexpr generic_float operator-() const noexcept
    {
        generic_float result = *this;
        result.sign          = not this->sign;
        return result;
    }

    constexpr generic_float operator+() const noexcept { return *this; }

    constexpr float to_float() const noexcept
    {
        float32_parts f{};
        f.sign = sign;

        if(exponent == 0 and ExponentSize != float32_parts::exponent_width()) // subnormal fps
        {

            if(mantissa == 0)
            {
                f.exponent = 0;
                f.mantissa = 0;
            }
            else
            {
                type shift = 0;
                f.mantissa = mantissa;

                if(MantissaSize < float32_parts::mantissa_width())
                {
                    shift = MantissaSize - ((sizeof(type) * 8) - countl_zero(mantissa));
                    f.mantissa <<= (shift + 1u);
                }

                f.exponent = float32_parts::exponent_bias() - exponent_bias() - shift;
                f.mantissa = f.mantissa << (float32_parts::mantissa_width() - MantissaSize);
            }
        }
        else if(exponent == all_ones<ExponentSize>())
        {
            f.mantissa = mantissa << (float32_parts::mantissa_width() - MantissaSize);
            f.exponent = float32_parts::max_exponent();
        }
        else
        {
            f.mantissa               = mantissa << (float32_parts::mantissa_width() - MantissaSize);
            constexpr const int diff = float32_parts::exponent_bias() - exponent_bias();
            f.exponent               = int(exponent) + diff;
        }

        return f.to_float();
    }

    constexpr void from_float(float32_parts f) noexcept
    {
        sign = f.sign;

        if(f.exponent == 0)
        {
            exponent = 0;
            mantissa = f.mantissa >> (float32_parts::mantissa_width() - MantissaSize);
        }
        else if(f.exponent == float32_parts::max_exponent())
        {
            exponent = all_ones<ExponentSize>();
            mantissa = f.mantissa >> (float32_parts::mantissa_width() - MantissaSize);
        }
        else
        {
            constexpr const int diff = float32_parts::exponent_bias() - exponent_bias();
            auto e                   = int(f.exponent) - diff;

            if(e >= static_cast<int>(all_ones<ExponentSize>()))
            {
                exponent = all_ones<ExponentSize>();
                mantissa = 0;
            }
            else if(e < 1)
            {
                exponent = 0;

                auto shift        = diff - int(f.exponent);
                auto shift_amount = shift + (float32_parts::mantissa_width() - MantissaSize) + 1;

                if(shift_amount < (sizeof(unsigned int) * 8))
                {
                    mantissa = (f.mantissa | (1u << float32_parts::mantissa_width())) >>
                               (shift + (float32_parts::mantissa_width() - MantissaSize) + 1);
                }
                else
                {
                    mantissa = 0;
                }
            }
            else
            {
                exponent = int(f.exponent) - diff;
                mantissa = f.mantissa >> (float32_parts::mantissa_width() - MantissaSize);
            }
        }

        exponent = std::min<type>(exponent, all_ones<ExponentSize>());
    }

    constexpr bool is_normal() const noexcept
    {
        return exponent != all_ones<ExponentSize>() and exponent != 0;
    }

    constexpr bool is_inf() const noexcept
    {
        return exponent == all_ones<ExponentSize>() and mantissa == 0;
    }

    constexpr bool is_nan() const noexcept
    {
        return exponent == all_ones<ExponentSize>() and mantissa != 0;
    }

    constexpr bool is_finite() const noexcept { return exponent != all_ones<ExponentSize>(); }

    constexpr operator float() const noexcept { return this->to_float(); }

    static constexpr generic_float infinity()
    {
        generic_float x{};
        x.exponent = all_ones<ExponentSize>();
        return x;
    }

    static constexpr generic_float snan()
    {
        generic_float x{};
        x.exponent = all_ones<ExponentSize>();
        x.mantissa = 1u << (MantissaSize - 2u);
        return x;
    }

    static constexpr generic_float qnan()
    {
        generic_float x{};
        x.exponent = all_ones<ExponentSize>();
        x.mantissa = 1u << (MantissaSize - 1u);
        return x;
    }

    static constexpr generic_float min()
    {
        generic_float x{};
        x.exponent = 1;
        x.mantissa = 0;
        return x;
    }

    static constexpr generic_float denorm_min()
    {
        generic_float x{};
        x.exponent = 0;
        x.mantissa = 1;
        x.sign     = 0;
        return x;
    }

    static constexpr generic_float lowest()
    {
        generic_float x{};
        x.exponent = all_ones<ExponentSize>() - 1;
        x.mantissa = all_ones<MantissaSize>();
        x.sign     = 1;
        return x;
    }

    static constexpr generic_float max()
    {
        generic_float x{};
        x.exponent = all_ones<ExponentSize>() - 1;
        x.mantissa = all_ones<MantissaSize>();
        x.sign     = 0;
        return x;
    }

    static constexpr generic_float epsilon()
    {
        generic_float x{1.0};
        x.mantissa++;
        return generic_float{x.to_float() - 1.0f};
    }
// NOLINTNEXTLINE
#define MIGRAPHX_GENERIC_FLOAT_ASSIGN_OP(op)                        \
    constexpr generic_float& operator op(const generic_float & rhs) \
    {                                                               \
        float self = *this;                                         \
        float frhs = rhs;                                           \
        self op frhs;                                               \
        *this = generic_float(self);                                \
        return *this;                                               \
    }
    MIGRAPHX_GENERIC_FLOAT_ASSIGN_OP(*=)
    MIGRAPHX_GENERIC_FLOAT_ASSIGN_OP(-=)
    MIGRAPHX_GENERIC_FLOAT_ASSIGN_OP(+=)
    MIGRAPHX_GENERIC_FLOAT_ASSIGN_OP(/=)
// NOLINTNEXTLINE
#define MIGRAPHX_GENERIC_FLOAT_BINARY_OP(op)                                                   \
    friend constexpr generic_float operator op(const generic_float& x, const generic_float& y) \
    {                                                                                          \
        return generic_float(float(x) op float(y));                                            \
    }
    MIGRAPHX_GENERIC_FLOAT_BINARY_OP(*)
    MIGRAPHX_GENERIC_FLOAT_BINARY_OP(-)
    MIGRAPHX_GENERIC_FLOAT_BINARY_OP(+)
    MIGRAPHX_GENERIC_FLOAT_BINARY_OP(/)
// NOLINTNEXTLINE
#define MIGRAPHX_GENERIC_FLOAT_COMPARE_OP(op)                                         \
    friend constexpr bool operator op(const generic_float& x, const generic_float& y) \
    {                                                                                 \
        return float(x) op float(y);                                                  \
    }
    MIGRAPHX_GENERIC_FLOAT_COMPARE_OP(<)
    MIGRAPHX_GENERIC_FLOAT_COMPARE_OP(<=)
    MIGRAPHX_GENERIC_FLOAT_COMPARE_OP(>)
    MIGRAPHX_GENERIC_FLOAT_COMPARE_OP(>=)

    friend constexpr bool operator==(const generic_float& x, const generic_float& y)
    {
        if(not x.is_finite() or not y.is_finite())
            return false;

        if((x.mantissa == 0 and x.exponent == 0) and (y.mantissa == 0 and y.exponent == 0))
        {
            return true;
        }

        return std::tie(x.mantissa, x.exponent, x.sign) == std::tie(y.mantissa, y.exponent, y.sign);
    }

    friend constexpr bool operator!=(const generic_float& x, const generic_float& y)
    {
        return not(x == y);
    }

    constexpr generic_float& operator++() noexcept
    {
        *this += generic_float(1.0f);
        return *this;
    }

    const generic_float operator++(int) noexcept // NOLINT(readability-const-return-type)
    {
        generic_float temp = *this;
        *this += generic_float(1.0f);
        return temp;
    }
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

// NOLINTBEGIN(cert-dcl58-cpp)
namespace std {

template <unsigned int E, unsigned int M, unsigned int F>
class numeric_limits<migraphx::generic_float<E, M, F>>
{
    public:
    static constexpr bool has_infinity = true;
    static constexpr migraphx::generic_float<E, M, F> epsilon()
    {
        return migraphx::generic_float<E, M, F>::epsilon();
    }

    static constexpr migraphx::generic_float<E, M, F> quiet_NaN()
    {
        return migraphx::generic_float<E, M, F>::qnan();
    }

    static constexpr migraphx::generic_float<E, M, F> signaling_NaN()
    {
        return migraphx::generic_float<E, M, F>::snan();
    }

    static constexpr migraphx::generic_float<E, M, F> max()
    {
        return migraphx::generic_float<E, M, F>::max();
    }

    static constexpr migraphx::generic_float<E, M, F> min()
    {
        return migraphx::generic_float<E, M, F>::min();
    }

    static constexpr migraphx::generic_float<E, M, F> lowest()
    {
        return migraphx::generic_float<E, M, F>::lowest();
    }

    static constexpr migraphx::generic_float<E, M, F> infinity()
    {
        return migraphx::generic_float<E, M, F>::infinity();
    }

    static constexpr migraphx::generic_float<E, M, F> denorm_min()
    {
        return migraphx::generic_float<E, M, F>::denorm_min();
    }
};

template <unsigned int E, unsigned int M, unsigned int F, class T>
struct common_type<migraphx::generic_float<E, M, F>, T> : std::common_type<float, T>
{
};

template <unsigned int E, unsigned int M, unsigned int F, class T>
struct common_type<T, migraphx::generic_float<E, M, F>> : std::common_type<float, T>
{
};

template <unsigned int E, unsigned int M, unsigned int F>
struct common_type<migraphx::generic_float<E, M, F>, migraphx::generic_float<E, M, F>>
{
    using type = migraphx::generic_float<E, M, F>;
};

template <unsigned int E1,
          unsigned int M1,
          unsigned int F1,
          unsigned int E2,
          unsigned int M2,
          unsigned int F2>
struct common_type<migraphx::generic_float<E1, M1, F1>, migraphx::generic_float<E2, M2, F2>>
{
    using type = float;
};

} // namespace std
// NOLINTEND(cert-dcl58-cpp)

#endif // MIGRAPHX_GUARD_MIGRAPHX_GENERIC_FLOAT_HPP
