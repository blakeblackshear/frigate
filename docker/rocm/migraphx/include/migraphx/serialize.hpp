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
#ifndef MIGRAPHX_GUARD_RTGLIB_SERIALIZE_HPP
#define MIGRAPHX_GUARD_RTGLIB_SERIALIZE_HPP

#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/reflect.hpp>
#include <migraphx/requires.hpp>
#include <migraphx/optional.hpp>
#include <migraphx/rank.hpp>
#include <type_traits>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

// Avoid implicit conversion with ADL lookup
template <class T>
void migraphx_to_value(value&, const T&) = delete;

template <class T>
value to_value(const T& x);

template <class T>
void from_value(const value& v, T& x);

template <class T>
T from_value(const value& v)
{
    T x{};
    from_value(v, x);
    return x;
}

namespace detail {

template <class T, MIGRAPHX_REQUIRES(std::is_empty<T>{})>
value to_value_impl(rank<0>, const T&)
{
    return value::object{};
}

template <class T>
auto to_value_impl(rank<1>, const T& x) -> decltype(std::tuple_size<T>{}, value{})
{
    value result = value::array{};
    repeat_c<std::tuple_size<T>{}>([&](auto i) { result.push_back(to_value(std::get<i>(x))); });
    return result;
}

template <class T>
auto to_value_impl(rank<2>, const T& x) -> decltype(x.begin(), x.end(), value{})
{
    value result = value::array{};
    for(auto&& y : x)
    {
        result.insert(to_value(y));
    }
    return result;
}

template <class T, MIGRAPHX_REQUIRES(is_reflectable<T>{})>
value to_value_impl(rank<3>, const T& x)
{
    value result = value::object{};
    reflect_each(x, [&](auto&& y, std::string name) { result.emplace(name, to_value(y)); });
    return result;
}

template <class T>
auto to_value_impl(rank<4>, const optional<T>& x)
{
    value result{};
    if(x.has_value())
        return to_value(*x);
    return result;
}

template <class T, MIGRAPHX_REQUIRES(std::is_signed<T>{})>
value to_value_impl(rank<5>, const T& x)
{
    return std::int64_t{x};
}

template <class T, MIGRAPHX_REQUIRES(std::is_unsigned<T>{})>
value to_value_impl(rank<6>, const T& x)
{
    return std::uint64_t{x};
}

template <class T, MIGRAPHX_REQUIRES(std::is_floating_point<T>{})>
value to_value_impl(rank<7>, const T& x)
{
    return double{x};
}

template <class T, MIGRAPHX_REQUIRES(std::is_enum<T>{})>
value to_value_impl(rank<8>, const T& x)
{
    return x;
}

inline value to_value_impl(rank<9>, const std::string& x) { return x; }

template <class T>
auto to_value_impl(rank<10>, const T& x) -> decltype(migraphx_to_value(x))
{
    return migraphx_to_value(x);
}

template <class T>
auto to_value_impl(rank<11>, const T& x) -> decltype(x.to_value())
{
    return x.to_value();
}

template <class T>
auto to_value_impl(rank<12>, const T& x)
    -> decltype(migraphx_to_value(std::declval<value&>(), x), value{})
{
    value v;
    migraphx_to_value(v, x);
    return v;
}

template <class T, MIGRAPHX_REQUIRES(std::is_same<T, value>{})>
value to_value_impl(rank<13>, const T& x)
{
    return x;
}

template <class T, MIGRAPHX_REQUIRES(std::is_empty<T>{})>
void from_value_impl(rank<0>, const value& v, T& x)
{
    if(not v.is_object())
        MIGRAPHX_THROW("Expected an object");
    if(not v.get_object().empty())
        MIGRAPHX_THROW("Expected an empty object");
    x = T{};
}

template <class T>
auto from_value_impl(rank<1>, const value& v, T& x) -> decltype(std::tuple_size<T>{}, void())
{
    repeat_c<std::tuple_size<T>{}>(
        [&](auto i) { std::get<i>(x) = from_value<std::tuple_element_t<i, T>>(v[i]); });
}

template <class T>
auto from_value_impl(rank<2>, const value& v, T& x)
    -> decltype(x.insert(x.end(), *x.begin()), void())
{
    x.clear();
    for(auto&& e : v)
        x.insert(x.end(), from_value<typename T::value_type>(e));
}

template <class T, MIGRAPHX_REQUIRES(std::is_arithmetic<typename T::value_type>{})>
auto from_value_impl(rank<3>, const value& v, T& x)
    -> decltype(x.insert(x.end(), *x.begin()), void())
{
    x.clear();
    if(v.is_binary())
    {
        for(auto&& e : v.get_binary())
            x.insert(x.end(), e);
    }
    else
    {
        for(auto&& e : v)
            x.insert(x.end(), from_value<typename T::value_type>(e));
    }
}

template <class T>
auto from_value_impl(rank<4>, const value& v, T& x)
    -> decltype(x.insert(*x.begin()), std::declval<typename T::mapped_type>(), void())
{
    if(v.is_object())
    {
        x.clear();
        for(auto&& e : v)
            x.emplace(from_value<typename T::key_type>(e.get_key()),
                      from_value<typename T::mapped_type>(e));
    }
    else if(v.is_array())
    {
        x.clear();
        for(auto&& e : v)
        {
            if(e.size() != 2)
                MIGRAPHX_THROW("Expected a pair");
            x.emplace(from_value<typename T::key_type>(e[0]),
                      from_value<typename T::mapped_type>(e[1]));
        }
    }
    else
    {
        MIGRAPHX_THROW("Expected object or array");
    }
}

template <class T, MIGRAPHX_REQUIRES(is_reflectable<T>{})>
void from_value_impl(rank<5>, const value& v, T& x)
{
    reflect_each(x, [&](auto& y, const std::string& name) {
        using type = std::decay_t<decltype(y)>;
        if(v.contains(name))
            y = from_value<type>(v.at(name).without_key());
    });
}

template <class T>
void from_value_impl(rank<6>, const value& v, optional<T>& x)
{
    if(not v.is_null())
        x = from_value<T>(v);
}

template <class T, MIGRAPHX_REQUIRES(std::is_arithmetic<T>{} or std::is_enum<T>{})>
void from_value_impl(rank<7>, const value& v, T& x)
{
    x = v.to<T>();
}

inline void from_value_impl(rank<8>, const value& v, std::string& x) { x = v.to<std::string>(); }

template <class T>
auto from_value_impl(rank<9>, const value& v, T& x) -> decltype(x.from_value(v), void())
{
    x.from_value(v);
}

template <class T>
auto from_value_impl(rank<10>, const value& v, T& x) -> decltype(migraphx_from_value(v, x), void())
{
    migraphx_from_value(v, x);
}

template <class T, MIGRAPHX_REQUIRES(std::is_same<T, value>{})>
void from_value_impl(rank<11>, const value& v, T& x)
{
    x = v;
}

} // namespace detail

template <class T>
value to_value(const T& x)
{
    return detail::to_value_impl(rank<13>{}, x);
}

template <class T>
void from_value(const value& v, T& x)
{
    detail::from_value_impl(rank<11>{}, v, x);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
