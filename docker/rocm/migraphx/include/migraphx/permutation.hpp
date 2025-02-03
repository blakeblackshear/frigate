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
#ifndef MIGRAPHX_GUARD_RTGLIB_PERMUTATION_HPP
#define MIGRAPHX_GUARD_RTGLIB_PERMUTATION_HPP

#include <migraphx/config.hpp>
#include <migraphx/shape.hpp>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class Vector>
inline Vector reorder_dims(const Vector& dims, const std::vector<int64_t>& permutation)
{
    Vector result(dims.size());
    assert(dims.size() == permutation.size());
    for(std::size_t i = 0; i < dims.size(); i++)
    {
        result[i] = dims[permutation[i]];
    }
    return result;
}

MIGRAPHX_EXPORT shape reorder_shape(const shape& s, const std::vector<int64_t>& permutation);

template <class Vector, class Op>
inline std::vector<int64_t> sort_permutation(const Vector& data, Op op)
{
    std::vector<std::int64_t> result(data.size());
    std::iota(result.begin(), result.end(), 0);
    std::stable_sort(
        result.begin(), result.end(), [&](auto x, auto y) { return op(data[x], data[y]); });
    return result;
}

/*!
 * Returns the inverse permutation that could be applied to undo the inputted permutation
 */
MIGRAPHX_EXPORT std::vector<int64_t> invert_permutation(const std::vector<int64_t>& permutation);

/*!
 * Finds the permutation that would make the shape not transposed (refering to shape.transposed())
 */
MIGRAPHX_EXPORT std::vector<int64_t> find_permutation(const shape& s);
MIGRAPHX_EXPORT std::vector<int64_t> find_permutation(const std::vector<shape>& shapes);

/// Normalize the shapes so the order of dimensions will be in the order it is
/// in memory as much as possible.
MIGRAPHX_EXPORT std::vector<shape> normalize_permutation(const std::vector<shape>& shapes);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
