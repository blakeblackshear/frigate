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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_TYPE_TRAITS_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_TYPE_TRAITS_HPP

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/integral_constant.hpp>

namespace migraphx {

template <class...>
using void_t = void;

template <class T, class U = T&&>
U private_declval(int);

template <class T>
T private_declval(long);

template <class T>
auto declval() noexcept -> decltype(private_declval<T>(0));

template <class Void, class F, class... Ts>
struct is_callable_impl : false_type
{
};

template <class F, class... Ts>
struct is_callable_impl<void_t<decltype(declval<F>()(declval<Ts>()...))>, F, Ts...> : true_type
{
};

template <class F, class... Ts>
using is_callable = is_callable_impl<void, F, Ts...>;

template <class T>
struct type_identity
{
    using type = T;
};

template <bool B, class T = void>
struct enable_if
{
};

template <class T>
struct enable_if<true, T>
{
    using type = T;
};

template <bool B, class T = void>
using enable_if_t = typename enable_if<B, T>::type;

template <bool B, class T, class F>
struct conditional
{
    using type = T;
};

template <class T, class F>
struct conditional<false, T, F>
{
    using type = F;
};

template <bool B, class T, class F>
using conditional_t = typename conditional<B, T, F>::type;

// NOLINTNEXTLINE
#define MIGRAPHX_BUILTIN_TYPE_TRAIT1(name)   \
    template <class T>                       \
    struct name : bool_constant<__##name(T)> \
    {                                        \
    }

// NOLINTNEXTLINE
#define MIGRAPHX_BUILTIN_TYPE_TRAIT2(name)      \
    template <class T, class U>                 \
    struct name : bool_constant<__##name(T, U)> \
    {                                           \
    }

// NOLINTNEXTLINE
#define MIGRAPHX_BUILTIN_TYPE_TRAITN(name)       \
    template <class... Ts>                       \
    struct name : bool_constant<__##name(Ts...)> \
    {                                            \
    }

// MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_arithmetic);
// MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_destructible);
// MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_nothrow_destructible);
// MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_pointer);
// MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_scalar);
// MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_signed);
// MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_void);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_abstract);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_aggregate);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_array);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_class);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_compound);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_const);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_empty);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_enum);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_final);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_floating_point);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_function);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_fundamental);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_integral);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_literal_type);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_lvalue_reference);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_member_function_pointer);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_member_object_pointer);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_member_pointer);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_object);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_pod);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_polymorphic);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_reference);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_rvalue_reference);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_standard_layout);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_trivial);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_trivially_copyable);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_trivially_destructible);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_union);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_unsigned);
MIGRAPHX_BUILTIN_TYPE_TRAIT1(is_volatile);
MIGRAPHX_BUILTIN_TYPE_TRAIT2(is_assignable);
MIGRAPHX_BUILTIN_TYPE_TRAIT2(is_base_of);
MIGRAPHX_BUILTIN_TYPE_TRAIT2(is_convertible);
MIGRAPHX_BUILTIN_TYPE_TRAIT2(is_nothrow_assignable);
MIGRAPHX_BUILTIN_TYPE_TRAIT2(is_same);
MIGRAPHX_BUILTIN_TYPE_TRAIT2(is_trivially_assignable);
MIGRAPHX_BUILTIN_TYPE_TRAITN(is_constructible);
MIGRAPHX_BUILTIN_TYPE_TRAITN(is_nothrow_constructible);
MIGRAPHX_BUILTIN_TYPE_TRAITN(is_trivially_constructible);

template <class T>
struct remove_cv
{
    using type = T;
};

template <class T>
struct remove_cv<const T> : remove_cv<T>
{
};

template <class T>
struct remove_cv<volatile T> : remove_cv<T>
{
};

template <class T>
using remove_cv_t = typename remove_cv<T>::type;

template <class T>
struct remove_reference
{
    using type = T;
};
template <class T>
struct remove_reference<T&>
{
    using type = T;
};
template <class T>
struct remove_reference<T&&>
{
    using type = T;
};

template <class T>
using remove_reference_t = typename remove_reference<T>::type;

template <class T>
struct add_pointer : type_identity<typename remove_reference<T>::type*>
{
};

template <class T>
using add_pointer_t = typename add_pointer<T>::type;

template <class T>
struct is_void : is_same<void, remove_cv_t<T>>
{
};

template <class... Ts>
struct common_type;

template <class T>
struct common_type<T>
{
    using type = T;
};

template <class T, class U>
struct common_type<T, U>
{
    using type = decltype(true ? declval<T>() : declval<U>());
};

template <class T, class U, class... Us>
struct common_type<T, U, Us...>
{
    using type = typename common_type<typename common_type<T, U>::type, Us...>::type;
};

template <class... Ts>
using common_type_t = typename common_type<Ts...>::type;

#define MIGRAPHX_REQUIRES(...) enable_if_t<__VA_ARGS__, int> = 0

constexpr unsigned long long int_max(unsigned long n)
{
    // Note, left shift cannot be used to get the maximum value of int64_type or
    // uint64_type because it is undefined behavior to left shift 64 bits for
    // these types
    if(n == sizeof(int64_t))
        return -1;
    return (1ull << (n * 8)) - 1;
}

template <class T,
          MIGRAPHX_REQUIRES(is_integral<T>{} or is_floating_point<T>{} or
                            is_same<T, migraphx::half>{})>
constexpr T numeric_max()
{
    if constexpr(is_integral<T>{})
    {
        if constexpr(is_unsigned<T>{})
            return int_max(sizeof(T));
        else
            return int_max(sizeof(T)) / 2;
    }
    else if constexpr(is_same<T, double>{})
        return __DBL_MAX__;
    else if constexpr(is_same<T, float>{})
        return __FLT_MAX__;
    else if constexpr(is_same<T, migraphx::half>{})
        return __FLT16_MAX__;
    else if constexpr(is_same<T, migraphx::bf16>{})
        return 338953138925153547590470800371487866880.000000;
    else
        return 0;
}

template <class T>
constexpr auto numeric_lowest() -> decltype(numeric_max<T>())
{
    if constexpr(is_integral<T>{})
    {
        if constexpr(is_unsigned<T>{})
            return 0;
        else
            return -numeric_max<T>() - 1;
    }
    else
    {
        return -numeric_max<T>();
    }
}

} // namespace migraphx

#endif
