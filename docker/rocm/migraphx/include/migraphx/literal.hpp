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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_LITERAL_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_LITERAL_HPP

#include <migraphx/shape.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/tensor_view.hpp>
#include <migraphx/raw_data.hpp>
#include <migraphx/make_shared_array.hpp>
#include <migraphx/config.hpp>

#include <memory>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/**
 * @brief Represents a raw literal
 * @details This stores the literal has a raw buffer that is owned by this class
 */
struct literal : raw_data<literal>
{
    literal() {}

    /*!
     * Empty literal with a specific shape type
     */
    explicit literal(shape::type_t shape_type) : m_shape(shape_type, {}) {}

    template <class U, class T = deduce<U>, shape::type_t ShapeType = shape::get_type<T>{}>
    literal(U x) : buffer(make_shared_array<char>(sizeof(T))), m_shape(ShapeType)
    {
        static_assert(std::is_trivially_copyable<T>{}, "Literals can only be trivial types");
        *(reinterpret_cast<T*>(buffer.get())) = x;
    }

    template <class T>
    literal(const shape& s, const std::vector<T>& x)
        : buffer(make_shared_array<char>(s.bytes())), m_shape(s)
    {
        static_assert(std::is_trivially_copyable<T>{}, "Literals can only be trivial types");
        fill(x.begin(), x.end());
    }

    template <class T>
    literal(const shape& s, const std::initializer_list<T>& x)
        : buffer(make_shared_array<char>(s.bytes())), m_shape(s)
    {
        static_assert(std::is_trivially_copyable<T>{}, "Literals can only be trivial types");
        fill(x.begin(), x.end());
    }

    template <class Iterator>
    literal(const shape& s, Iterator start, Iterator end)
        : buffer(make_shared_array<char>(s.bytes())), m_shape(s)
    {
        fill(start, end);
    }

    // Directly copies buffer of x
    template <class T, MIGRAPHX_REQUIRES(sizeof(T) == 1)>
    literal(const shape& s, T* x) : buffer(make_shared_array<char>(s.bytes())), m_shape(s)
    {
        std::copy(x, x + s.bytes(), buffer.get());
    }

    /// Whether data is available
    bool empty() const { return this->buffer == nullptr; }

    /// Provides a raw pointer to the data
    const char* data() const { return this->buffer.get(); }

    const shape& get_shape() const { return this->m_shape; }

    std::vector<literal> get_sub_objects() const { return {}; }

    /// Convert the data to an argument
    argument get_argument() const
    {
        auto b = make_shared_array<char>(buffer.get(), buffer.get() + m_shape.bytes());
        return {m_shape, [b]() { return b.get(); }};
    }

    private:
    std::shared_ptr<char> buffer;
    shape m_shape;

    // Keeps the same data ordering as the given container
    template <class Iterator>
    void fill(Iterator start, Iterator end)
    {
        assert(std::distance(start, end) == m_shape.elements());
        m_shape.visit_type([&](auto as) {
            auto output = make_view(m_shape, as.from(buffer.get()));
            std::copy(start, end, output.begin());
        });
    }
};

template <class F>
literal transform(literal l, F f)
{
    literal result;
    l.visit([&](auto x) {
        using type = std::remove_cv_t<typename decltype(x)::value_type>;
        std::vector<type> output(x.size(), type(0));
        std::transform(x.begin(), x.end(), output.begin(), f);
        result = literal{l.get_shape(), output};
    });
    return result;
}

template <class F>
literal transform(literal l1, literal l2, F f)
{
    assert(l1.get_shape() == l2.get_shape());
    literal result;
    visit_all(l1, l2)([&](auto x, auto y) {
        using type = std::remove_cv_t<typename decltype(x)::value_type>;
        std::vector<type> output(x.size(), type(0));
        std::transform(x.begin(), x.end(), y.begin(), output.begin(), f);
        result = literal{l1.get_shape(), output};
    });
    return result;
}

MIGRAPHX_EXPORT void migraphx_to_value(value& v, const literal& l);
MIGRAPHX_EXPORT void migraphx_from_value(const value& v, literal& l);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
