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
#ifndef MIGRAPHX_GUARD_RTGLIB_VALUE_HPP
#define MIGRAPHX_GUARD_RTGLIB_VALUE_HPP

#include <migraphx/config.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/requires.hpp>
#include <migraphx/type_name.hpp>
#include <migraphx/rank.hpp>
#include <algorithm>
#include <cassert>
#include <memory>
#include <cstdint>
#include <sstream>
#include <type_traits>
#include <tuple>
#include <unordered_map>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct value_base_impl;

template <class To, class = void>
struct value_converter
{
    template <class T = To>
    static auto apply(const std::string& x)
        -> decltype((std::declval<std::stringstream&>() >> std::declval<T&>()), To{})
    {
        To result;
        std::stringstream ss;
        ss.str(x);
        ss >> result;
        if(ss.fail())
            throw std::runtime_error("Failed to parse: " + x);
        return result;
    }

    template <class From, MIGRAPHX_REQUIRES(std::is_convertible<From, To>{})>
    static To apply(const From& x)
    {
        return To(x);
    }
};

template <class To>
struct value_converter<To, MIGRAPHX_CLASS_REQUIRES(std::is_enum<To>{})>
{
    template <class From>
    static auto apply(const From& x)
        -> decltype(static_cast<To>(value_converter<std::underlying_type_t<To>>::apply(x)))
    {
        return static_cast<To>(value_converter<std::underlying_type_t<To>>::apply(x));
    }
};

template <>
struct value_converter<std::string>
{
    static const std::string& apply(const std::string& x) { return x; }

    template <class From>
    static auto apply(const From& x)
        -> decltype(std::declval<std::stringstream&>() << x, std::string())
    {
        std::stringstream ss;
        ss << x;
        if(ss.fail())
            throw std::runtime_error("Failed to parse");
        return ss.str();
    }
};

template <class T, class U>
struct value_converter<std::pair<T, U>>
{
    template <class Key, class From>
    static auto apply(const std::pair<Key, From>& x)
        -> decltype(std::pair<T, U>(x.first, value_converter<U>::apply(x.second)))
    {
        return std::pair<T, U>(x.first, value_converter<U>::apply(x.second));
    }
};

template <class To, class From>
To try_convert_value(const From& x);

namespace detail {
template <class To, class Key, class From>
To try_convert_value_impl(rank<1>, const std::pair<Key, From>& x)
{
    return try_convert_value<To>(x.second);
}

template <class To, class From>
auto try_convert_value_impl(rank<2>, const From& x) -> decltype(value_converter<To>::apply(x))
{
    return value_converter<To>::apply(x);
}

template <class To, MIGRAPHX_REQUIRES(not std::is_same<To, std::nullptr_t>{})>
To try_convert_value_impl(rank<3>, std::nullptr_t)
{
    MIGRAPHX_THROW("Incompatible values: null -> " + get_type_name<To>());
}

template <class To, class From>
To try_convert_value_impl(rank<0>, const From& x)
{
    MIGRAPHX_THROW("Incompatible values: " + get_type_name(x) + " -> " + get_type_name<To>());
}
} // namespace detail

template <class To, class From>
To try_convert_value(const From& x)
{
    return detail::try_convert_value_impl<To>(rank<3>{}, x);
}

struct MIGRAPHX_EXPORT value
{
// clang-format off
#define MIGRAPHX_VISIT_VALUE_TYPES(m) \
    m(int64, std::int64_t) \
    m(uint64, std::uint64_t) \
    m(float, double) \
    m(string, std::string) \
    m(bool, bool) \
    m(binary, value::binary)
    // clang-format on
    enum type_t
    {
#define MIGRAPHX_VALUE_GENERATE_ENUM_TYPE(vt, cpp_type) vt##_type,
        MIGRAPHX_VISIT_VALUE_TYPES(MIGRAPHX_VALUE_GENERATE_ENUM_TYPE) object_type,
        array_type,
        null_type
#undef MIGRAPHX_VALUE_GENERATE_ENUM_TYPE
    };
    using iterator        = value*;
    using const_iterator  = const value*;
    using value_type      = value;
    using key_type        = std::string;
    using mapped_type     = value;
    using reference       = value_type&;
    using const_reference = const value_type&;
    using pointer         = value_type*;
    using const_pointer   = const value_type*;
    using array           = std::vector<value>;
    using object          = std::unordered_map<std::string, value>;
    struct binary : std::vector<std::uint8_t>
    {
        using base = std::vector<std::uint8_t>;
        binary() {}
        template <class Container,
                  MIGRAPHX_REQUIRES(sizeof(*std::declval<Container>().begin()) == 1)>
        explicit binary(const Container& c) : base(c.begin(), c.end())
        {
        }
        template <class T>
        binary(T* data, std::size_t s) : base(data, data + s)
        {
        }
        explicit binary(std::size_t s) : base(s) {}

        friend std::ostream& operator<<(std::ostream& os, const binary& obj)
        {
            os << "{binary_object: " << obj.size() << "}";
            return os;
        }
    };

    value() = default;

    value(const value& rhs);
    value& operator=(value rhs);
    value(const std::string& pkey, const value& rhs);

    value(const std::initializer_list<value>& i);
    value(const std::vector<value>& v, bool array_on_empty = true);
    value(const std::unordered_map<std::string, value>& m);
    value(const std::string& pkey, const std::vector<value>& v, bool array_on_empty = true);
    value(const std::string& pkey, const std::unordered_map<std::string, value>& m);
    value(const std::string& pkey, std::nullptr_t);
    value(std::nullptr_t);

    value(const char* i);
    value(const std::string& pkey, const char* i);

#define MIGRAPHX_VALUE_GENERATE_DECL_METHODS(vt, cpp_type) \
    value(cpp_type i);                                     \
    value(const std::string& pkey, cpp_type i);            \
    value& operator=(cpp_type rhs);                        \
    bool is_##vt() const;                                  \
    const cpp_type& get_##vt() const;                      \
    const cpp_type* if_##vt() const;
    MIGRAPHX_VISIT_VALUE_TYPES(MIGRAPHX_VALUE_GENERATE_DECL_METHODS)

    template <class T>
    using literal_to_string = std::conditional_t<(std::is_convertible<T, const char*>{} and
                                                  std::is_convertible<T, std::string>{}),
                                                 std::string,
                                                 T>;

    template <class T>
    using pick_numeric = std::conditional_t<
        std::is_floating_point<T>{},
        double,
        std::conditional_t<std::is_signed<T>{},
                           std::int64_t,
                           std::conditional_t<std::is_unsigned<T>{}, std::uint64_t, T>>>;

    template <class T>
    using pick = pick_numeric<typename std::conditional_t<std::is_enum<T>{},
                                                          std::underlying_type<T>,
                                                          std::enable_if<true, T>>::type>;

    template <class T>
    using is_pickable =
        bool_c<((std::is_arithmetic<T>{} or std::is_enum<T>{}) and not std::is_pointer<T>{})>;

    template <class T>
    using range_value = std::decay_t<decltype(std::declval<T>().end(), *std::declval<T>().begin())>;

    template <class T>
    using is_generic_range =
        bool_c<(std::is_convertible<range_value<T>, value>{} and
                not std::is_convertible<T, array>{} and not std::is_convertible<T, object>{})>;

    template <class T, MIGRAPHX_REQUIRES(is_generic_range<T>{})>
    value(const T& r) : value(from_values(r))
    {
    }

    template <class T, MIGRAPHX_REQUIRES(is_generic_range<T>{})>
    value(const std::string& pkey, const T& r) : value(pkey, from_values(r))
    {
    }

    template <class T, MIGRAPHX_REQUIRES(is_pickable<T>{})>
    value(T i) : value(static_cast<pick<T>>(i))
    {
    }
    template <class T, MIGRAPHX_REQUIRES(is_pickable<T>{})>
    value(const std::string& pkey, T i) : value(pkey, static_cast<pick<T>>(i))
    {
    }
    template <class T, class U, class = decltype(value(T{}, U{}))>
    value(const std::pair<T, U>& p) : value(p.first, p.second)
    {
    }
    template <class T, MIGRAPHX_REQUIRES(is_pickable<T>{})>
    value& operator=(T rhs)
    {
        return *this = static_cast<pick<T>>(rhs); // NOLINT
    }
    template <class T, MIGRAPHX_REQUIRES(is_generic_range<T>{})>
    value& operator=(T rhs)
    {
        return *this = from_values(rhs); // NOLINT
    }

    value& operator=(const char* c);
    value& operator=(std::nullptr_t);
    value& operator=(const std::initializer_list<value>& i);

    bool is_array() const;
    const std::vector<value>& get_array() const;
    const std::vector<value>* if_array() const;

    bool is_object() const;
    const std::vector<value>& get_object() const;
    const std::vector<value>* if_object() const;

    bool is_null() const;

    const std::string& get_key() const;
    value* find(const std::string& pkey);
    const value* find(const std::string& pkey) const;
    bool contains(const std::string& pkey) const;
    std::size_t size() const;
    bool empty() const;
    const value* data() const;
    value* data();
    value* begin();
    const value* begin() const;
    value* end();
    const value* end() const;

    value& front();
    const value& front() const;
    value& back();
    const value& back() const;
    value& at(std::size_t i);
    const value& at(std::size_t i) const;
    value& at(const std::string& pkey);
    const value& at(const std::string& pkey) const;
    value& operator[](std::size_t i);
    const value& operator[](std::size_t i) const;
    value& operator[](const std::string& pkey);

    void clear();
    void resize(std::size_t n);
    void resize(std::size_t n, const value& v);

    std::pair<value*, bool> insert(const value& v);
    value* insert(const value* pos, const value& v);

    template <class... Ts>
    std::pair<value*, bool> emplace(Ts&&... xs)
    {
        return insert(value(std::forward<Ts>(xs)...));
    }

    template <class... Ts>
    value* emplace(const value* pos, Ts&&... xs)
    {
        return insert(pos, value(std::forward<Ts>(xs)...));
    }

    void push_back(const value& v) { insert(end(), v); }

    void push_front(const value& v) { insert(begin(), v); }

    value with_key(const std::string& pkey) const;
    value without_key() const;

    template <class Visitor>
    void visit(Visitor v) const
    {
        switch(this->get_type())
        {
        case null_type: {
            std::nullptr_t null{};
            if(this->key.empty())
                v(null);
            else
                v(std::make_pair(this->get_key(), std::ref(null)));
            return;
        }
#define MIGRAPHX_VALUE_GENERATE_CASE(vt, cpp_type)                          \
    case vt##_type: {                                                       \
        if(this->key.empty())                                               \
            v(this->get_##vt());                                            \
        else                                                                \
            v(std::make_pair(this->get_key(), std::ref(this->get_##vt()))); \
        return;                                                             \
    }
            MIGRAPHX_VISIT_VALUE_TYPES(MIGRAPHX_VALUE_GENERATE_CASE)
            MIGRAPHX_VALUE_GENERATE_CASE(array, )
            MIGRAPHX_VALUE_GENERATE_CASE(object, )
        }
        MIGRAPHX_THROW("Unknown type");
    }

    // Visit value without key
    template <class Visitor>
    void visit_value(Visitor v) const
    {
        switch(this->get_type())
        {
        case null_type: {
            std::nullptr_t null{};
            v(null);
            return;
        }
#define MIGRAPHX_VALUE_GENERATE_CASE_VALUE(vt, cpp_type) \
    case vt##_type: {                                    \
        v(this->get_##vt());                             \
        return;                                          \
    }
            MIGRAPHX_VISIT_VALUE_TYPES(MIGRAPHX_VALUE_GENERATE_CASE_VALUE)
            MIGRAPHX_VALUE_GENERATE_CASE_VALUE(array, )
            MIGRAPHX_VALUE_GENERATE_CASE_VALUE(object, )
        }
        MIGRAPHX_THROW("Unknown type");
    }

    template <class To>
    To to() const
    {
        To result;
        this->visit([&](auto y) { result = try_convert_value<To>(y); });
        return result;
    }

    template <class To>
    literal_to_string<To> value_or(const To& default_value) const
    {
        if(this->is_null())
            return default_value;
        return to<literal_to_string<To>>();
    }

    template <class To>
    std::vector<To> to_vector() const
    {
        std::vector<To> result;
        const auto& values = is_object() ? get_object() : get_array();
        result.reserve(values.size());
        std::transform(values.begin(), values.end(), std::back_inserter(result), [&](auto v) {
            return v.template to<To>();
        });
        return result;
    }

    template <class To>
    literal_to_string<To> get(const std::string& pkey, const To& default_value) const
    {
        const auto* v = find(pkey);
        if(v == this->end())
            return default_value;
        return v->to<literal_to_string<To>>();
    }

    template <class To>
    std::vector<To> get(const std::string& pkey, const std::vector<To>& default_value) const
    {
        const auto* v = find(pkey);
        if(v == this->end())
            return default_value;
        return v->to_vector<To>();
    }

    template <class To>
    std::vector<literal_to_string<To>> get(const std::string& pkey,
                                           const std::initializer_list<To>& default_value) const
    {
        return get(pkey,
                   std::vector<literal_to_string<To>>{default_value.begin(), default_value.end()});
    }

    MIGRAPHX_EXPORT friend bool operator==(const value& x, const value& y);
    MIGRAPHX_EXPORT friend bool operator!=(const value& x, const value& y);
    MIGRAPHX_EXPORT friend bool operator<(const value& x, const value& y);
    MIGRAPHX_EXPORT friend bool operator<=(const value& x, const value& y);
    MIGRAPHX_EXPORT friend bool operator>(const value& x, const value& y);
    MIGRAPHX_EXPORT friend bool operator>=(const value& x, const value& y);

    MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os, const value& d);

    std::size_t hash() const;

    void debug_print(bool show_type = false) const;

    type_t get_type() const;

    private:
    template <class T>
    std::vector<value> from_values(const T& r)
    {
        std::vector<value> v;
        std::transform(
            r.begin(), r.end(), std::back_inserter(v), [&](auto&& e) { return value(e); });
        return v;
    }
    std::shared_ptr<value_base_impl> x;
    std::string key;
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

namespace std {
template <>
struct hash<migraphx::value>
{
    using argument_type = migraphx::value;
    using result_type   = std::size_t;
    result_type operator()(const migraphx::value& x) const { return x.hash(); }
};

} // namespace std

#endif
