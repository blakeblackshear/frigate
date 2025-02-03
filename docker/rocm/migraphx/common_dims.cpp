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
#include <migraphx/common_dims.hpp>
#include <migraphx/ranges.hpp>
#include <algorithm>
#include <cassert>
#include <numeric>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class Iterator>
static auto compute_end_dim(Iterator start, Iterator last, std::size_t dim)
{
    std::size_t x = 1;
    auto it       = std::find_if(start, last, [&](auto i) {
        x *= i;
        return x > dim;
    });
    if(x < dim)
        return start;
    return it;
}

struct common_dim_state
{
    common_dim_state(const std::vector<std::size_t>& pdims,
                     std::vector<std::vector<std::size_t>>& paxes_map)
        : dims(&pdims), axes_map(&paxes_map), it(dims->begin())
    {
    }
    const std::vector<std::size_t>* dims            = nullptr;
    std::vector<std::vector<std::size_t>>* axes_map = nullptr;
    std::vector<std::size_t>::const_iterator it{};
    std::size_t rem = 1;
    std::size_t get() const { return *it / rem; }
    bool is_end() const { return it == dims->end(); }
    void next(std::size_t i = 1) { it += i; }
    auto dims_for(std::size_t d) const
    {
        auto dim_end = compute_end_dim(it, dims->end(), d);
        return range(it, dim_end);
    }
    void add_axes(std::size_t naxes, std::size_t start) MIGRAPHX_TIDY_CONST
    {
        auto axes = compute_axes(naxes, start);
        axes_map->push_back(std::move(axes));
    }

    void add_multi_axes(std::size_t naxes, std::size_t start) MIGRAPHX_TIDY_CONST
    {
        auto axes = compute_axes(naxes, start);
        std::transform(axes.begin(),
                       axes.end(),
                       std::back_inserter(*axes_map),
                       [&](auto axis) -> std::vector<std::size_t> { return {axis}; });
    }
    std::vector<std::size_t> compute_axes(std::size_t naxes, std::size_t start) const
    {
        if(rem != 1)
        {
            assert(start > 0);
            naxes++;
            start--;
        }
        std::vector<std::size_t> axes(naxes);
        std::iota(axes.begin(), axes.end(), start);
        return axes;
    }
};

static bool compute_common_dim(std::vector<std::size_t>& cd_dims,
                               common_dim_state& state1,
                               common_dim_state& state2)
{
    assert(state1.get() < state2.get());
    auto d2    = state2.get();
    auto dims  = state1.dims_for(d2);
    auto n     = elements(dims);
    auto naxes = distance(dims);
    if(naxes == 0)
        return false;
    // If not divisible then we can't compute a common dim
    if((d2 % n) != 0)
        return false;
    auto rem = d2 / n;
    state1.add_multi_axes(naxes, cd_dims.size());
    state2.add_axes(rem == 1 ? naxes : naxes + 1, cd_dims.size());

    state1.rem = rem;
    state2.rem = 1;

    cd_dims.insert(cd_dims.end(), dims.begin(), dims.end());
    if(state1.rem != 1)
        cd_dims.push_back(state1.rem);
    state1.next(distance(dims));
    state2.next();
    return true;
}

common_dims common_dims::compute(const std::vector<std::size_t>& dims1,
                                 const std::vector<std::size_t>& dims2)
{
    assert(elements(dims1) > 0);
    assert(elements(dims1) == elements(dims2));
    common_dims cd;
    common_dim_state state1{dims1, cd.axes_map1};
    common_dim_state state2{dims2, cd.axes_map2};
    while(not state1.is_end() and not state2.is_end())
    {
        auto d1 = state1.get();
        auto d2 = state2.get();
        if(d1 == d2)
        {
            state1.add_axes(1, cd.dims.size());
            state2.add_axes(1, cd.dims.size());
            state1.rem = 1;
            state2.rem = 1;
            cd.dims.push_back(d1);
            state1.next();
            state2.next();
        }
        else if(d1 < d2)
        {
            if(not compute_common_dim(cd.dims, state1, state2))
                return {};
        }
        else // if(d1 > d2)
        {
            if(not compute_common_dim(cd.dims, state2, state1))
                return {};
        }
    }
    assert(elements(dims1) == elements(cd.dims));
    return cd;
}

const std::vector<std::vector<std::size_t>>* common_dims::get_axes_map(std::size_t n) const
{
    if(axes_map1.size() == n)
        return &axes_map1;
    if(axes_map2.size() == n)
        return &axes_map2;
    return nullptr;
}

std::vector<std::size_t>
common_dims::get_dimensions_for(const std::vector<std::size_t>& idims) const
{
    if(dims.size() == idims.size())
        return idims;
    if(elements(dims) == elements(idims))
        return dims;
    // Bail for now since its ambiguous which axes map can be used
    // TODO: Check for similiarity
    if(axes_map1.size() == axes_map2.size())
        return {};
    const auto* axes_map = get_axes_map(idims.size());
    if(axes_map == nullptr)
        return {};
    auto xdims = dims;
    for(auto i : range(axes_map->size()))
    {
        auto dim         = idims[i];
        const auto& axes = (*axes_map)[i];
        if(axes.size() == 1)
        {
            xdims[axes.front()] = dim;
        }
        else if(dim == 1)
        {
            for(auto axis : axes)
                xdims[axis] = 1;
        }
    }
    if(elements(xdims) == elements(idims))
        return xdims;
    return {};
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
