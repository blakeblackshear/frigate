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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_ARGUMENT_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_ARGUMENT_HPP

#include <migraphx/shape.hpp>
#include <migraphx/raw_data.hpp>
#include <migraphx/config.hpp>
#include <migraphx/make_shared_array.hpp>
#include <functional>
#include <utility>

// clang-format off
namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/**
 * @brief Arguments passed to instructions
 *
 * An `argument` can represent a raw buffer of data that either be referenced from another element
 * or it can be owned by the argument.
 *
 */
struct MIGRAPHX_EXPORT argument : raw_data<argument>
{
    argument() = default;

    explicit argument(const shape& s);

    template <class F, MIGRAPHX_REQUIRES(std::is_pointer<decltype(std::declval<F>()())>{})>
    argument(shape s, F d)
        : m_shape(std::move(s))

    {
        assign_buffer([f = std::move(d)]() mutable { return reinterpret_cast<char*>(f()); });
    }
    template <class T>
    argument(shape s, T* d)
        : m_shape(std::move(s))
    {
        assign_buffer([d] { return reinterpret_cast<char*>(d); });
    }

    template <class T>
    argument(shape s, std::shared_ptr<T> d)
        : m_shape(std::move(s))
    {
        assign_buffer([d] { return reinterpret_cast<char*>(d.get()); });
    }

    argument(shape s, std::nullptr_t);
    
    argument(const std::vector<argument>& args);

    /// Provides a raw pointer to the data
    char* data() const;

    /// Whether data is available
    bool empty() const;

    const shape& get_shape() const;

    argument reshape(const shape& s) const;

    argument copy() const;

    /// Make copy of the argument that is always sharing the data
    argument share() const;

    std::vector<argument> get_sub_objects() const;

    /// Return the ith element
    argument element(std::size_t i) const;

    // Keeps the same data ordering as the given container
    template <class Iterator>
    void fill(Iterator start, Iterator end)
    {
        assert(std::distance(start, end) <= m_shape.elements());
        this->visit([&](auto output) {
            std::copy(start, end, output.begin());
        });
    }

    private:
    void assign_buffer(std::function<char*()> d);
    struct data_t
    {
        std::function<char*()> get = nullptr;
        std::vector<data_t> sub = {};
        data_t share() const;
        static data_t from_args(const std::vector<argument>& args);
    };
    argument(const shape& s, const data_t& d);
    shape m_shape;
    data_t m_data{};
};

MIGRAPHX_EXPORT std::vector<argument> flatten(const std::vector<argument>& args);

MIGRAPHX_EXPORT std::vector<shape> to_shapes(const std::vector<argument>& args);
MIGRAPHX_EXPORT void migraphx_to_value(value& v, const argument& a);
MIGRAPHX_EXPORT void migraphx_from_value(const value& v, argument& a);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
// clang-format on

#endif
