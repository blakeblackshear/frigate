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
#ifndef MIGRAPHX_GUARD_RTGLIB_CHECK_SHAPES_HPP
#define MIGRAPHX_GUARD_RTGLIB_CHECK_SHAPES_HPP

#include <migraphx/permutation.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/config.hpp>
#include <algorithm>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

// Check that deduced type is incrementable, dereferencable, and comparable
template <class, class = void>
struct is_iterator
{
};

template <class T>
struct is_iterator<T,
                   std::void_t<decltype(++std::declval<T&>()),
                               decltype(*std::declval<T&>()),
                               decltype(std::declval<T&>() == std::declval<T&>())>> : std::true_type
{
};

template <class Iterator>
struct check_shapes
{
    static_assert(is_iterator<Iterator>{}, "CHECK_SHAPES: Deduced type must be an iterator");
    Iterator begin;
    Iterator end;
    std::string name;
    bool dynamic_allowed;

    check_shapes(Iterator b, Iterator e, const std::string& n, const bool d = false)
        : begin(b), end(e), name(n), dynamic_allowed(d)
    {
        check_dynamic();
    }

    template <class Op>
    check_shapes(Iterator b, Iterator e, const Op& op, const bool d = false)
        : begin(b), end(e), name(op.name()), dynamic_allowed(d)
    {
        check_dynamic();
    }

    template <class Op, MIGRAPHX_REQUIRES(not std::is_convertible<Op, std::string>{})>
    check_shapes(const std::vector<shape>& s, const Op& op, const bool d = false)
        : begin(s.begin()), end(s.end()), name(op.name()), dynamic_allowed(d)
    {
        check_dynamic();
    }

    check_shapes(const std::vector<shape>& s, const std::string& n, const bool d = false)
        : begin(s.begin()), end(s.end()), name(n), dynamic_allowed(d)
    {
        check_dynamic();
    }

    void check_dynamic() const
    {
        if(not dynamic_allowed and this->any_of([&](const shape& s) { return s.dynamic(); }))
        {
            MIGRAPHX_THROW(prefix() + "Dynamic shapes not supported");
        }
    }

    std::string prefix() const
    {
        if(name.empty())
            return "";
        else
            return name + ": ";
    }

    std::size_t size() const
    {
        if(begin == end)
            return 0;
        return end - begin;
    }

    /*!
     * Require the number of shape objects to equal to one of the
     * given sizes.
     * \param ns template parameter pack of sizes to check against
     */
    template <class... Ts>
    const check_shapes& has(Ts... ns) const
    {
        if(migraphx::none_of({ns...}, [&](auto i) { return this->size() == i; }))
            MIGRAPHX_THROW(prefix() + "Wrong number of arguments: expected " +
                           to_string_range({ns...}) + " but given " + std::to_string(size()));
        return *this;
    }

    /*!
     * Require the number of shape objects to equal at least a given amount.  Use this
     * method for ops that can take any number (variadic) of inputs.
     * \param n min. number of shapes
     */
    const check_shapes& has_at_least(std::size_t n) const
    {
        if(this->size() < n)
            MIGRAPHX_THROW(prefix() + "Wrong number of arguments: expected at least " +
                           to_string(n) + " but given " + std::to_string(size()));
        return *this;
    }

    /*!
     * Require all shapes to have the same number of elements.
     * \param n  number of
     */
    const check_shapes& nelements(std::size_t n) const
    {
        if(not this->all_of([&](const shape& s) { return s.elements() == n; }))
            MIGRAPHX_THROW(prefix() + "Shapes must have only " + std::to_string(n) + " elements");
        return *this;
    }

    /*!
     * Check that the first shape has exactly n dimensions.
     * Do nothing if the container is empty.
     * \param n number of dimensions
     */
    const check_shapes& only_dims(std::size_t n) const
    {
        if(begin != end)
        {
            if(begin->ndim() != n)
                MIGRAPHX_THROW(prefix() + "Only " + std::to_string(n) + "d supported");
        }
        return *this;
    }

    /*!
     * Check that the first shape has a maximum of n dimensions.
     * Do nothing if the container is empty.
     * \param n number of dimensions
     */
    const check_shapes& max_ndims(std::size_t n) const
    {
        if(begin != end)
        {
            if(begin->ndim() > n)
                MIGRAPHX_THROW(prefix() + "Shape must have at most " + std::to_string(n) +
                               " dimensions");
        }
        return *this;
    }

    /*!
     * Check that the first shape has a minimum of n dimensions.
     * Do nothing if the container is empty.
     * \param n number of dimensions
     */
    const check_shapes& min_ndims(std::size_t n) const
    {
        if(begin != end)
        {
            if(begin->ndim() < n)
                MIGRAPHX_THROW(prefix() + "Shape must have at least " + std::to_string(n) +
                               " dimensions");
        }
        return *this;
    }

    /*!
     * Check all shapes have the same shape.
     */
    const check_shapes& same_shape() const
    {
        if(not this->same([](const shape& s) { return s; }))
            MIGRAPHX_THROW(prefix() + "Shapes do not match");
        return *this;
    }

    /*!
     * Check all shapes have the same type.
     */
    const check_shapes& same_type() const
    {
        if(not this->same([](const shape& s) { return s.type(); }))
            MIGRAPHX_THROW(prefix() + "Types do not match");
        return *this;
    }

    /*!
     * Check all shapes have the same lens.
     */
    const check_shapes& same_dims() const
    {
        if(not this->same([](const shape& s) { return s.max_lens(); }))
            MIGRAPHX_THROW(prefix() + "Dimensions do not match");
        if(this->any_of([&](const shape& s) { return s.dynamic(); }))
            if(not this->same([](const shape& s) { return s.min_lens(); }))
                MIGRAPHX_THROW(prefix() + "Min dynamic dimensions do not match");
        return *this;
    }

    /*!
     * Check all shapes have the same number of dimensions.
     */
    const check_shapes& same_ndims() const
    {
        if(not this->same([](const shape& s) { return s.ndim(); }))
            MIGRAPHX_THROW(prefix() + "Number of dimensions do not match");
        return *this;
    }

    /*!
     * Check all shapes have the same layout.
     */
    const check_shapes& same_layout() const
    {
        if(not this->same([](const shape& s) { return find_permutation(s); }))
            MIGRAPHX_THROW(prefix() + "Layouts do not match");
        return *this;
    }

    /*!
     * Check all shapes are standard.
     */
    const check_shapes& standard() const
    {
        if(not this->all_of([](const shape& s) { return s.standard(); }))
            MIGRAPHX_THROW(prefix() + "Shapes are not in standard layout");
        return *this;
    }

    /*!
     * Check all shapes are scalar.
     */
    const check_shapes& scalar() const
    {
        if(not this->all_of([](const shape& s) { return s.scalar(); }))
            MIGRAPHX_THROW(prefix() + "Shapes are not a scalar");
        return *this;
    }

    /*!
     * Check all shapes are standard or scalar.
     */
    const check_shapes& standard_or_scalar() const
    {
        if(not this->all_of([](const shape& s) { return s.standard() or s.scalar(); }))
            MIGRAPHX_THROW(prefix() + "Shapes are not a scalar or in standard layout");
        return *this;
    }

    /*!
     * Check all shapes are packed.
     */
    const check_shapes& packed() const
    {
        if(not this->all_of([](const shape& s) { return s.packed(); }))
            MIGRAPHX_THROW(prefix() + "Shapes are not packed");
        return *this;
    }

    /*!
     * Check all shapes are packed with certain layouts
     */
    const check_shapes&
    packed_layouts(const std::initializer_list<std::vector<int64_t>>& layouts) const
    {
        if(not this->all_of([&](const shape& s) {
               return s.packed() and contains(layouts, find_permutation(s));
           }))
            MIGRAPHX_THROW(prefix() + "Shapes are not packed with correct layout");
        return *this;
    }

    /*!
     * Check all shapes are packed or broadcasted.
     */
    const check_shapes& packed_or_broadcasted() const
    {
        if(not this->all_of([](const shape& s) { return s.packed() or s.broadcasted(); }))
            MIGRAPHX_THROW(prefix() + "Shapes are not packed nor broadcasted");
        return *this;
    }

    /*!
     * Check all shapes are tuples.
     */
    const check_shapes& tuple_type() const
    {
        if(not this->all_of([](const shape& s) { return s.type() == shape::tuple_type; }))
            MIGRAPHX_THROW(prefix() + "Shapes are not tuple!");
        return *this;
    }

    /*!
     * Check all shapes are not transposed.
     */
    const check_shapes& not_transposed() const
    {
        if(not this->all_of([](const shape& s) { return not s.transposed(); }))
            MIGRAPHX_THROW(prefix() + "Shapes are transposed");
        return *this;
    }

    /*!
     * Check all shapes are not broadcasted.
     */
    const check_shapes& not_broadcasted() const
    {
        if(not this->all_of([](const shape& s) { return s.standard() or not s.broadcasted(); }))
            MIGRAPHX_THROW(prefix() + "Shapes are broadcasted");
        return *this;
    }

    /*!
     * Check all shapes have the same n elements.
     * \param n number of elements
     */
    const check_shapes& elements(std::size_t n) const
    {
        if(not this->all_of([&](const shape& s) { return s.elements() == n; }))
            MIGRAPHX_THROW(prefix() + "Wrong number of elements");
        return *this;
    }

    /*!
     * Check the batches of all the shapes do not have transposed strides.
     */
    const check_shapes& batch_not_transposed() const
    {
        if(not this->all_of(
               [&](const shape& s) { return batch_not_transposed_strides(s.strides()); }))
            MIGRAPHX_THROW(prefix() + "Batch size is transposed");
        return *this;
    }

    template <class F>
    bool same(F f) const
    {
        if(begin == end)
            return true;
        auto&& key = f(*begin);
        return this->all_of([&](const shape& s) { return f(s) == key; });
    }

    template <class Predicate>
    bool all_of(Predicate p) const
    {
        if(begin == end)
            return true;
        return std::all_of(begin, end, p);
    }

    template <class Predicate>
    bool any_of(Predicate p) const
    {
        if(begin == end)
            return false;
        return std::any_of(begin, end, p);
    }

    Iterator get(long i) const
    {
        if(i >= size())
            MIGRAPHX_THROW(prefix() + "Accessing shape out of bounds");
        if(i < 0)
            return end - i;
        return begin + i;
    }

    check_shapes slice(long start) const { return {get(start), end, name}; }

    check_shapes slice(long start, long last) const { return {get(start), get(last), name}; }

    private:
    static bool batch_not_transposed_strides(const std::vector<std::size_t>& strides)
    {
        if(strides.size() <= 2)
            return true;
        auto dim_0       = strides.size() - 2;
        auto matrix_size = std::max(strides[dim_0], strides[dim_0 + 1]);
        std::vector<std::size_t> batch(strides.begin(), strides.begin() + dim_0);
        if(std::all_of(batch.begin(), batch.end(), [&](auto i) { return (i < matrix_size); }))
        {
            return false;
        }

        if(std::adjacent_find(batch.begin(), batch.end(), [&](auto i, auto j) {
               return (i < j or i < matrix_size or j < matrix_size);
           }) != batch.end())
        {
            return false;
        }
        return true;
    }
};

// Deduction guide for std::vector constructor
template <class Op>
check_shapes(const std::vector<shape>&, const Op&, bool d = false)
    -> check_shapes<std::vector<shape>::const_iterator>;

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
