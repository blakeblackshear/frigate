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

#include <migraphx/permutation.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/algorithm.hpp>
#include <map>
#include <functional>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

shape reorder_shape(const shape& s, const std::vector<int64_t>& permutation)
{
    return {s.type(), reorder_dims(s.lens(), permutation), reorder_dims(s.strides(), permutation)};
}

std::vector<int64_t> invert_permutation(const std::vector<int64_t>& permutation)
{
    return sort_permutation(permutation, std::less<>{});
}

std::vector<int64_t> find_permutation(const shape& s)
{
    std::vector<std::int64_t> result(s.lens().size());
    std::iota(result.begin(), result.end(), 0);
    std::stable_sort(result.begin(), result.end(), by(std::greater<>{}, [&](auto x) {
                         return std::make_tuple(s.strides()[x], s.lens()[x]);
                     }));
    return result;
}

std::vector<int64_t> find_permutation(const std::vector<shape>& shapes)
{
    if(shapes.empty())
        return {};
    std::map<std::vector<int64_t>, std::size_t> count;
    for(auto&& s : shapes)
    {
        if(s.broadcasted())
            continue;
        count[find_permutation(s)]++;
    }
    if(count.empty())
    {
        std::vector<int64_t> r(shapes.front().lens().size());
        std::iota(r.begin(), r.end(), 0);
        return r;
    }
    auto it = std::max_element(
        count.begin(), count.end(), by(std::less<>{}, [](auto&& p) { return p.second; }));
    assert(it != count.end());
    return it->first;
}

std::vector<shape> normalize_permutation(const std::vector<shape>& shapes)
{
    auto result = shapes;
    auto perm   = find_permutation(shapes);
    std::transform(result.begin(), result.end(), result.begin(), [&](auto s) {
        return reorder_shape(s, perm);
    });
    return result;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
