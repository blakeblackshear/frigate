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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_SHAPE_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_SHAPE_HPP

#include <vector>
#include <cassert>
#include <ostream>
#include <numeric>
#include <memory>
#include <set>

#include <migraphx/functional.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/half.hpp>
#include <migraphx/bf16.hpp>
#include <migraphx/float8.hpp>
#include <migraphx/serialize.hpp>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct value;
struct shape_impl;

struct MIGRAPHX_EXPORT shape
{

// Add new types here
// clang-format off
#define MIGRAPHX_SHAPE_VISIT_TYPES(m) \
    m(bool_type, bool) \
    m(half_type, half) \
    m(float_type, float) \
    m(double_type, double) \
    m(uint8_type, uint8_t) \
    m(int8_type, int8_t) \
    m(uint16_type, uint16_t) \
    m(int16_type, int16_t) \
    m(int32_type, int32_t) \
    m(int64_type, int64_t) \
    m(uint32_type, uint32_t) \
    m(uint64_type, uint64_t) \
    m(fp8e4m3fnuz_type, migraphx::fp8::fp8e4m3fnuz) \
    m(fp8e4m3fn_type, migraphx::fp8::fp8e4m3fn) \
    m(fp8e5m2_type, migraphx::fp8::fp8e5m2) \
    m(bf16_type, bf16) \
    m(fp8e5m2fnuz_type, migraphx::fp8::fp8e5m2fnuz) // clang-format on

#define MIGRAPHX_SHAPE_GENERATE_ENUM_TYPES(x, t) x,
    enum type_t
    {
        MIGRAPHX_SHAPE_VISIT_TYPES(MIGRAPHX_SHAPE_GENERATE_ENUM_TYPES) tuple_type
    };
#undef MIGRAPHX_SHAPE_GENERATE_ENUM_TYPES

    template <class T, class = void>
    struct get_type;
#define MIGRAPHX_SHAPE_GENERATE_GET_TYPE(x, t)                \
    template <class T>                                        \
    struct get_type<t, T> : std::integral_constant<type_t, x> \
    {                                                         \
    };
    MIGRAPHX_SHAPE_VISIT_TYPES(MIGRAPHX_SHAPE_GENERATE_GET_TYPE)
#undef MIGRAPHX_SHAPE_GENERATE_GET_TYPE

    template <class T>
    struct get_type<const T> : get_type<T>
    {
    };

    struct MIGRAPHX_EXPORT dynamic_dimension
    {
        std::size_t min = 0;
        std::size_t max = 0;
        std::set<std::size_t> optimals{};

        template <class Self, class F>
        static auto reflect(Self& self, F f)
        {
            return pack(f(self.min, "min"), f(self.max, "max"), f(self.optimals, "optimals"));
        }

        bool is_fixed() const;
        bool has_optimal() const;

        /**
         * Return a dynamic_dimension with the intersection of two dynamic_dimension ranges if
         * possible.
         */
        std::optional<dynamic_dimension> intersection(const dynamic_dimension& other) const
        {
            auto left  = std::max(this->min, other.min);
            auto right = std::min(this->max, other.max);
            if(left <= right)
            {
                return dynamic_dimension{left, right};
            }
            return nullopt;
        }

        MIGRAPHX_EXPORT friend bool operator==(const dynamic_dimension& x,
                                               const dynamic_dimension& y);
        MIGRAPHX_EXPORT friend bool operator!=(const dynamic_dimension& x,
                                               const dynamic_dimension& y);
        MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os,
                                                        const dynamic_dimension& x);

        // compare to fixed std::size_t dimension
        MIGRAPHX_EXPORT friend bool operator==(const dynamic_dimension& x, const std::size_t& y);
        MIGRAPHX_EXPORT friend bool operator==(const std::size_t& x, const dynamic_dimension& y);
        MIGRAPHX_EXPORT friend bool operator!=(const dynamic_dimension& x, const std::size_t& y);
        MIGRAPHX_EXPORT friend bool operator!=(const std::size_t& x, const dynamic_dimension& y);

        // add and subtract fixed std::size_t dimension
        dynamic_dimension& operator+=(const std::size_t& x);
        dynamic_dimension& operator-=(const std::size_t& x);
        MIGRAPHX_EXPORT friend dynamic_dimension operator+(const dynamic_dimension& x,
                                                           const std::size_t& y);
        MIGRAPHX_EXPORT friend dynamic_dimension operator+(const std::size_t& x,
                                                           const dynamic_dimension& y);
        MIGRAPHX_EXPORT friend dynamic_dimension operator-(const dynamic_dimension& x,
                                                           const std::size_t& y);
    };

    static std::string to_sizes_string(const std::vector<shape>& shapes);

    static const std::vector<type_t>& types();

    static std::string name(type_t t);
    static std::string cpp_type(type_t t);

    static bool is_integral(type_t t);
    static bool is_compatible(const shape& actual, const shape& expected);

    static bool is_unsigned(type_t t);

    shape();
    shape(type_t t);
    shape(type_t t, std::vector<std::size_t> l);
    shape(type_t t, std::vector<std::size_t> l, std::vector<std::size_t> s);

    // Force all calls of the format `shape( type_t, { size_t compatibles } )` to map to
    // shape(type_t, std::vector<std::size_t> l)
    shape(type_t t, std::initializer_list<std::size_t> d);

    shape(type_t t, std::vector<dynamic_dimension> dims);

    // Construct a dynamic shape from vectors of mins, maxes, and optimals.
    // optimals_list is a vector of optimals that corresponds to each min and max.
    shape(type_t t,
          std::vector<std::size_t> mins,
          std::vector<std::size_t> maxes,
          std::vector<std::set<std::size_t>> optimals_list);

    template <class Range>
    shape(type_t t, const Range& l) : shape(t, std::vector<std::size_t>(l.begin(), l.end()))
    {
    }

    template <class Range1, class Range2>
    shape(type_t t, const Range1& l, const Range2& s)
        : shape(t,
                std::vector<std::size_t>(l.begin(), l.end()),
                std::vector<std::size_t>(s.begin(), s.end()))
    {
    }

    explicit shape(const std::vector<shape>& subs);

    /**
     * Creates an output shape with dimensions equal to the input lengths and strides determined
     * by the permutation argument such that find_permutation() of the output shape returns the
     * inputted permuation.
     *
     * 2D example:
     *   parameters:
     *     l = [2, 3], perm = [1, 0]
     *   therefore:
     *     "original" shape = {lens = [3, 2], strides = [2, 1]}
     *     output_shape = {lens = [2, 3], strides = [1, 2]
     *
     * 3D example:
     *   parameters:
     *     l = [2, 3, 4], perm = [1, 2, 0]
     *   therefore:
     *     "original" shape = {lens = [3, 4, 2], strides = [8, 2, 1]}
     *     output_shape = {lens = [2, 3, 4], strides = [1, 8, 2]}
     */
    static shape
    from_permutation(type_t t, const std::vector<std::size_t>& l, const std::vector<int64_t>& perm);

    type_t type() const;
    const std::vector<std::size_t>& lens() const;
    const std::vector<std::size_t>& strides() const;

    /*!
     * The number of dimensions in the shape, either static or dynamic.
     * Same as the number of indices required to get a data value.
     */
    std::size_t ndim() const;

    /*!
     * Return the number of elements in the tensor.
     */
    std::size_t elements() const;

    /*!
     * Return the number of total bytes used for storage of the tensor data; includes subshapes.
     * For dynamic shape, returns the maximum number of bytes presuming a packed shape.
     */
    std::size_t bytes() const;

    /*!
     * Return the size of the type of the main shape.
     * Returns 0 if there are subshapes.
     */
    std::size_t type_size() const;

    const std::vector<dynamic_dimension>& dyn_dims() const;

    /*!
     * Minimum lengths for dynamic shape.
     * lens() for static shape.
     */
    std::vector<std::size_t> min_lens() const;

    /*!
     * Maximum lengths for dynamic shape.
     * lens() for static shape.
     */
    std::vector<std::size_t> max_lens() const;

    /*!
     * Optimum lengths for dynamic shape.
     * Empty for static shape.
     */
    std::vector<std::set<std::size_t>> opt_lens() const;

    /// Map multiple indices to space index
    std::size_t index(std::initializer_list<std::size_t> l) const;
    /// Map multiple indices to space index
    std::size_t index(const std::vector<std::size_t>& l) const;

    /// Map multiple indices from a range of iterator to a space index
    template <class Iterator>
    std::size_t index(Iterator start, Iterator last) const
    {
        if(this->dynamic())
        {
            MIGRAPHX_THROW("SHAPE: index() called on dynamic shape");
        }
        assert(std::distance(start, last) <= this->lens().size());
        assert(this->lens().size() == this->strides().size());
        return std::inner_product(start, last, this->strides().begin(), std::size_t{0}); // NOLINT
    }

    /// Map element index to space index
    std::size_t index(std::size_t i) const;

    /// Map element index to multi-dimensional index
    std::vector<std::size_t> multi(std::size_t idx) const;

    /// Map element index to multi-dimensional index and put them them into location provided by
    /// pointers
    void multi_copy(std::size_t idx, std::size_t* start, const std::size_t* end) const;

    /// Check if a multi-dimensional index is within bounds for the shape.
    bool multi_within_bounds(std::vector<std::size_t> multi) const;

    /// Returns true if the shape is packed (number of elements and buffer size the same) with
    /// no padding
    bool packed() const;

    /// Returns true if the shape has been transposed. That is the strides are not in descending
    /// order
    bool transposed() const;

    /// Returns true if the shape is broadcasting a dimension. That is, one of the strides are zero
    bool broadcasted() const;

    /// Returns true if the shape is in its standard format. That is, the shape is both packed and
    /// not transposed.
    bool standard() const;

    /// Returns true if all strides are equal to 0 (scalar tensor)
    bool scalar() const;

    /// Return true if the shape is dynamic
    bool dynamic() const;

    /// Return true if this shape or any of the sub_shapes are dynamic
    bool any_of_dynamic() const;

    shape normalize_standard() const;

    shape as_standard() const;

    shape with_lens(type_t t, const std::vector<std::size_t>& l) const;
    shape with_lens(const std::vector<std::size_t>& l) const;

    shape with_type(type_t t) const;

    // convert the shape to an equivalent dynamic shape with empty optimals
    shape to_dynamic() const;

    // convert the shape to a static one setting any non-fixed dynamic_dimensions to x
    shape to_static(std::size_t x) const;

    MIGRAPHX_EXPORT friend bool operator==(const shape& x, const shape& y);
    MIGRAPHX_EXPORT friend bool operator!=(const shape& x, const shape& y);
    MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os, const shape& x);

    template <class T>
    struct as
    {
        using type = std::conditional_t<std::is_same<T, bool>{}, int8_t, T>;

        type max() const { return std::numeric_limits<type>::max(); }

        type min() const { return std::numeric_limits<type>::lowest(); }

        type nan() const { return std::numeric_limits<type>::quiet_NaN(); }

        template <class U>
        type operator()(U u) const
        {
            return type(u);
        }

        template <class U>
        type* operator()(U* u) const
        {
            return static_cast<type*>(u);
        }

        template <class U>
        const type* operator()(const U* u) const
        {
            return static_cast<type*>(u);
        }

        type operator()() const { return {}; }

        std::size_t size(std::size_t n = 1) const { return sizeof(type) * n; }

        auto is_integral() const { return std::is_integral<type>{}; }
        auto is_signed() const { return std::is_signed<type>{}; }
        auto is_unsigned() const { return std::is_unsigned<type>{}; }

        template <class U>
        type* from(U* buffer, std::size_t n = 0) const
        {
            return reinterpret_cast<type*>(buffer) + n;
        }

        template <class U>
        const type* from(const U* buffer, std::size_t n = 0) const
        {
            return reinterpret_cast<const type*>(buffer) + n;
        }

        type_t type_enum() const { return get_type<type>{}; }
    };

    template <class Visitor, class TupleVisitor>
    static void visit(type_t t, Visitor v, TupleVisitor tv)
    {
        switch(t)
        {
        case tuple_type: {
            tv();
            return;
        }
#define MIGRAPHX_SHAPE_GENERATE_VISITOR_CASE(x, t) \
    case x: v(as<t>()); return;
            MIGRAPHX_SHAPE_VISIT_TYPES(MIGRAPHX_SHAPE_GENERATE_VISITOR_CASE)
#undef MIGRAPHX_SHAPE_GENERATE_VISITOR_CASE
        }
        MIGRAPHX_THROW("Unknown type");
    }

    template <class Visitor>
    static void visit(type_t t, Visitor v)
    {
        return visit(t, v, [] { MIGRAPHX_THROW("Tuple cannot be visited."); });
    }

    template <class... Visitors>
    void visit_type(Visitors... vs) const
    {
        visit(this->type(), vs...);
    }

    template <class Visitor>
    static void visit_types(Visitor v)
    {
#define MIGRAPHX_SHAPE_GENERATE_VISITOR_ALL(x, t) v(as<t>());
        MIGRAPHX_SHAPE_VISIT_TYPES(MIGRAPHX_SHAPE_GENERATE_VISITOR_ALL)
#undef MIGRAPHX_SHAPE_GENERATE_VISITOR_ALL
    }

    std::string type_string() const;
    static type_t parse_type(const std::string& s);

    const std::vector<shape>& sub_shapes() const;

    /*!
     * Returns the number of elements in the data buffer.
     * For a dynamic shape, returns the maximum number of elements of the data buffer and assumes it
     * is packed.
     * Will clip to the maximum of size_t if overflows for dynamic shapes.
     */
    std::size_t element_space() const;

    private:
    shape(std::shared_ptr<shape_impl> pimpl);
    std::shared_ptr<const shape_impl> impl;
};

/// Flatten subshapes to a single vector of non-tuple type of shapes
MIGRAPHX_EXPORT std::vector<shape> flatten(const std::vector<shape>& shapes);

MIGRAPHX_EXPORT void migraphx_to_value(value& v, const shape& s);
MIGRAPHX_EXPORT void migraphx_from_value(const value& v, shape& s);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
