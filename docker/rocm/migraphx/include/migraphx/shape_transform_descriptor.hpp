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
 *
 */
#ifndef MIGRAPHX_GUARD_MIGRAPHX_SHAPE_TRANSFORM_DESCRIPTOR_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_SHAPE_TRANSFORM_DESCRIPTOR_HPP

#include <migraphx/config.hpp>
#include <migraphx/optional.hpp>
#include <cstdint>
#include <iosfwd>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct operation;

// The shape_transform_descriptor class is data structure to simplify shape
// transformations like reshape, transpose, broadcast, etc. This is made up
// of a collection of dimensions which are a collection of subdimensions.
//
// Each subdimension has an axis and a `len`. The `len` is the length of the
// subdimension. The axis represents the axis the dimension originated. It is
// represented as a vector, the first element represents the axis in the
// original dimension and the additional elements are used when such
// dimension is split. The axis is empty when its a broadcasted dimension,
// and a hidden axis can be set if the dimension is associated with a `1`
// dimension in the original shape.
//
// This will first record shape transformations with the `apply` method. This
// will manipulate this data structure to represent how the transformation
// changes the dimensions.
//
// For example, if we start with an initial dimensions as `[x, y, z]` then
// each dimension will have one subdimension that corresponds to each
// original dimension: `[[x:0]], [[y:1]], [[z:2]]`.
//
// When a transpose is applied we would just permutate the dimensions.
//
// When a reshape that would merge dimensions together then the subdimensions
// are copied to the same subdimension. So if we reshape the dimensions as `
// [x*y, z]` then it would become `[[x:0], [y:1]], [[z:2]]`. If the reshape
// splits the dimension then the subdimension is copied to each dimension and
// the axis is updated to maintain the order. So a reshape of `[2, x/2, y,
// z]` would become: `[[2:0,0]], [[x/2:0,1]], [[y:1]], [[z:2]]`.
//
// After recording the operators, `simplify` method is used to simplify the
// data structure such as merging adjacent dimension, etc. The `generate`
// method is called to generate the operators need to do this
// transformation.
struct MIGRAPHX_EXPORT shape_transform_descriptor
{
    shape_transform_descriptor() = default;
    explicit shape_transform_descriptor(const std::vector<std::size_t>& dims);

    static shape_transform_descriptor create(const std::vector<std::size_t>& dims,
                                             const std::vector<operation>& ops);

    shape_transform_descriptor rebase(const std::vector<std::size_t>& dims) const;

    bool apply(const std::vector<operation>& ops);
    bool apply_reshape(const std::vector<std::size_t>& rdims);
    bool apply_reshape_impl(const std::vector<std::size_t>& rdims);
    bool apply_transpose(const std::vector<std::int64_t>& permutation);
    bool apply_broadcast(const std::vector<std::size_t>& out_lens,
                         optional<std::size_t> axis = nullopt);
    void simplify();
    std::size_t elements() const;
    std::vector<operation> generate() const;

    bool has_broadcast() const;
    void flatten_broadcast();

    std::vector<std::size_t> common_dims(const std::vector<std::size_t>& input_dims = {}) const;
    std::vector<operation>
    generate_common_from_src(const std::vector<std::size_t>& input_dims = {}) const;
    std::vector<operation>
    generate_common_from_dst(const std::vector<std::size_t>& input_dims = {}) const;
    std::vector<operation>
    generate_dst_from_common(const std::vector<std::size_t>& input_dims = {}) const;
    std::vector<std::vector<std::size_t>> common_axes_map_from_src() const;
    std::vector<std::vector<std::size_t>> common_axes_map_from_dst() const;

    bool empty() const;
    std::vector<std::size_t> lens() const;

    struct MIGRAPHX_EXPORT dimension
    {
        void simplify();
        std::size_t len() const;
        struct MIGRAPHX_EXPORT sub
        {
            std::size_t len;
            std::vector<std::size_t> axis = {};
            // The hidden axis is used for broadcasted dimensions. The
            // original axis has a length of 1, but this subdimension has a
            // length greater then 1, so it cant be directly associated with
            // the axis. However, it still needs to accounted for. After we
            // generate the broadcast we will set the axis to the hidden
            // axis, and then length to 1.
            std::vector<std::size_t> hidden_axis = {};

            const std::vector<std::size_t>& origin_axis() const;
            bool has_hidden_axis() const;

            void add_split_axis(std::size_t i);

            void expose();
            void hide();

            MIGRAPHX_EXPORT friend bool operator==(const sub& x, const sub& y);
            MIGRAPHX_EXPORT friend bool operator!=(const sub& x, const sub& y);
            MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os, const sub& x);
        };

        MIGRAPHX_EXPORT friend bool operator==(const dimension& x, const dimension& y);
        MIGRAPHX_EXPORT friend bool operator!=(const dimension& x, const dimension& y);
        MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os, const dimension& x);

        std::vector<sub> subdimensions;
    };
    MIGRAPHX_EXPORT friend bool operator==(const shape_transform_descriptor& x,
                                           const shape_transform_descriptor& y);
    MIGRAPHX_EXPORT friend bool operator!=(const shape_transform_descriptor& x,
                                           const shape_transform_descriptor& y);
    MIGRAPHX_EXPORT friend std::ostream& operator<<(std::ostream& os,
                                                    const shape_transform_descriptor& x);
    std::vector<dimension> dimensions;
    // Rank of the original dimensions
    std::size_t rank = 0;
};

MIGRAPHX_EXPORT std::vector<operation>
optimize_shape_transforms(const std::vector<std::size_t>& dims, const std::vector<operation>& ops);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_SHAPE_TRANSFORM_DESCRIPTOR_HPP
