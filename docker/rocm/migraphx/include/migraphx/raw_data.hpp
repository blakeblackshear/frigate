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

#ifndef MIGRAPHX_GUARD_RAW_DATA_HPP
#define MIGRAPHX_GUARD_RAW_DATA_HPP

#include <migraphx/tensor_view.hpp>
#include <migraphx/requires.hpp>
#include <migraphx/config.hpp>
#include <sstream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct raw_data_base
{
};

/**
 * @brief Provides a base class for common operations with raw buffer
 *
 * For classes that handle a raw buffer of data, this will provide common operations such as equals,
 * printing, and visitors. To use this class the derived class needs to provide a `data()` method to
 * retrieve a raw pointer to the data, and `get_shape` method that provides the shape of the data.
 *
 */
template <class Derived>
struct raw_data : raw_data_base
{
    template <class Stream>
    friend Stream& operator<<(Stream& os, const Derived& d)
    {
        if(not d.empty())
            d.visit([&](auto x) { os << x; },
                    [&](auto&& xs) {
                        for(auto&& x : xs)
                        {
                            os << "{ ";
                            os << x;
                            os << " }, ";
                        }
                    });
        return os;
    }

    /**
     * @brief Visits a single data element at a certain index.
     *
     * @param v A function which will be called with the type of data
     * @param n The index to read from
     */
    template <class Visitor>
    void visit_at(Visitor v, std::size_t n = 0) const
    {
        auto&& derived = static_cast<const Derived&>(*this);
        if(derived.empty())
            MIGRAPHX_THROW("Visiting empty data!");
        auto&& s = derived.get_shape();
        s.visit_type([&](auto as) { v(*(as.from(derived.data()) + s.index(n))); });
    }

    template <class Visitor, class TupleVisitor>
    void visit(Visitor v, TupleVisitor tv) const
    {
        auto&& derived = static_cast<const Derived&>(*this);
        if(derived.empty())
            MIGRAPHX_THROW("Visiting empty data!");
        auto&& s = derived.get_shape();
        s.visit_type([&](auto as) { v(make_view(s, as.from(derived.data()))); },
                     [&] { tv(derived.get_sub_objects()); });
    }

    /**
     * @brief Visits the data
     *
     *  This will call the visitor function with a `tensor_view<T>` based on the shape of the data.
     *
     * @param v A function to be called with `tensor_view<T>`
     */
    template <class Visitor>
    void visit(Visitor v) const
    {
        visit(v, [&](const auto&) { MIGRAPHX_THROW("Invalid tuple type"); });
    }

    /// Returns true if the raw data is only one element
    bool single() const
    {
        auto&& s = static_cast<const Derived&>(*this).get_shape();
        return s.elements() == 1;
    }

    /**
     * @brief Retrieves a single element of data
     *
     * @param n The index to retrieve the data from
     * @tparam T The type of data to be retrieved
     * @return The element as `T`
     */
    template <class T>
    T at(std::size_t n = 0) const
    {
        T result;
        this->visit_at([&](auto x) { result = x; }, n);
        return result;
    }

    struct auto_cast
    {
        const Derived* self;
        template <class T>
        operator T()
        {
            assert(self->single());
            return self->template at<T>();
        }

        template <class T>
        using is_data_ptr =
            bool_c<(std::is_void<T>{} or std::is_same<char, std::remove_cv_t<T>>{} or
                    std::is_same<unsigned char, std::remove_cv_t<T>>{})>;

        template <class T>
        using get_data_type = std::conditional_t<is_data_ptr<T>{}, float, T>;

        template <class T>
        bool matches() const
        {
            return is_data_ptr<T>{} or
                   self->get_shape().type() == migraphx::shape::get_type<get_data_type<T>>{};
        }

        template <class T>
        operator T*()
        {
            using type = std::remove_cv_t<T>;
            assert(matches<T>());
            return reinterpret_cast<type*>(self->data());
        }
    };

    /// Implicit conversion of raw data pointer
    auto_cast implicit() const { return {static_cast<const Derived*>(this)}; }

    /// Get a tensor_view to the data
    template <class T>
    tensor_view<T> get() const
    {
        auto&& s      = static_cast<const Derived&>(*this).get_shape();
        auto&& buffer = static_cast<const Derived&>(*this).data();
        if(s.type() != migraphx::shape::get_type<T>{})
            MIGRAPHX_THROW("Incorrect data type for raw data");
        return make_view(s, reinterpret_cast<T*>(buffer));
    }

    /// Cast the data pointer
    template <class T>
    T* cast() const
    {
        auto&& buffer = static_cast<const Derived&>(*this).data();
        assert(static_cast<const Derived&>(*this).get_shape().type() ==
               migraphx::shape::get_type<T>{});
        return reinterpret_cast<T*>(buffer);
    }

    std::string to_string() const
    {
        std::stringstream ss;
        ss.precision(std::numeric_limits<double>::max_digits10);
        ss << static_cast<const Derived&>(*this);
        return ss.str();
    }

    template <class T>
    std::vector<T> to_vector() const
    {
        std::vector<T> result(static_cast<const Derived&>(*this).get_shape().elements());
        this->visit([&](auto x) { result.assign(x.begin(), x.end()); });
        return result;
    }
};

namespace detail {
template <class V1, class V2, class... Ts>
void visit_all_flatten(const shape& s, V1&& v1, V2&& v2, Ts&&... xs)
{
    s.visit_type([&](auto as) { v1(make_view(xs.get_shape(), as.from(xs.data()))...); },
                 [&] { v2(xs.get_sub_objects()...); });
}

template <class V1, class V2, class... Ts>
auto visit_all_pack(const shape& s, V1&& v1, V2&& v2)
{
    return [&](auto&&... xs) {
        // Workaround for https://gcc.gnu.org/bugzilla/show_bug.cgi?id=70100
        visit_all_flatten(s, v1, v2, xs...);
    };
}

template <class V1, class... Ts>
auto visit_all_pack(const shape& s, V1&& v1)
{
    return visit_all_pack(s, v1, [](auto&&...) { MIGRAPHX_THROW("Invalid tuple type"); });
}
} // namespace detail

/**
 * @brief Visits every object together
 * @details This will visit every object, but assumes each object is the same type. This can reduce
 * the deeply nested visit calls. Returns a function that takes the visitor callback.
 * Calling syntax is `visit_all(xs...)([](auto... ys) {})` where `xs...` and `ys...` are the
 * same number of parameters.
 *
 * @param x A raw data object
 * @param xs Many raw data objects.
 * @return A function to be called with the visitor
 */
template <class T, class... Ts>
auto visit_all(T&& x, Ts&&... xs)
{
    auto&& s                                   = x.get_shape();
    std::initializer_list<shape::type_t> types = {xs.get_shape().type()...};
    if(not std::all_of(types.begin(), types.end(), [&](shape::type_t t) { return t == s.type(); }))
        MIGRAPHX_THROW("Types must be the same");
    return [&](auto... vs) { detail::visit_all_pack(s, vs...)(x, xs...); };
}

/**
 * @brief Visits every object together
 * @details This will visit every object, but assumes each object is the same type. This can reduce
 * the deeply nested visit calls. Returns a function that takes the visitor callback.
 *
 * @param x A vector of raw data objects.  Types must all be the same.
 * @return A function to be called with the visitor
 */
template <class T>
auto visit_all(const std::vector<T>& x)
{
    auto&& s = x.front().get_shape();
    if(not std::all_of(
           x.begin(), x.end(), [&](const T& y) { return y.get_shape().type() == s.type(); }))
        MIGRAPHX_THROW("Types must be the same");
    return [&](auto v) {
        s.visit_type([&](auto as) {
            using type = typename decltype(as)::type;
            std::vector<tensor_view<type>> result;
            std::transform(x.begin(), x.end(), std::back_inserter(result), [&](const auto& y) {
                return make_view(y.get_shape(), as.from(y.data()));
            });
            v(result);
        });
    };
}

template <class T,
          class U,
          MIGRAPHX_REQUIRES(std::is_base_of<raw_data_base, T>{} and
                            std::is_base_of<raw_data_base, U>{})>
bool operator==(const T& x, const U& y)
{
    auto&& xshape = x.get_shape();
    auto&& yshape = y.get_shape();
    bool result   = x.empty() and y.empty();
    if(not result and xshape == yshape)
    {
        visit_all(x, y)([&](auto xview, auto yview) { result = xview == yview; },
                        [&](auto&& xs, auto&& ys) {
                            result = std::equal(xs.begin(), xs.end(), ys.begin(), ys.end());
                        });
    }
    return result;
}

template <class T,
          class U,
          MIGRAPHX_REQUIRES(std::is_base_of<raw_data_base, T>{} and
                            std::is_base_of<raw_data_base, U>{})>
bool operator!=(const T& x, const U& y)
{
    return not(x == y);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
