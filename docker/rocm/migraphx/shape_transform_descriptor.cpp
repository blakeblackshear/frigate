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
#include <migraphx/shape_transform_descriptor.hpp>
#include <migraphx/permutation.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/output_iterator.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/erase.hpp>
#include <migraphx/common_dims.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/stringutils.hpp>
#include <map>
#include <unordered_set>
#include <deque>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

using dimension = shape_transform_descriptor::dimension;

template <class Iterator, class Projection>
static auto compute_end_dim(Iterator start, Iterator last, std::size_t dim, Projection proj)
{
    std::size_t x = 1;
    auto it       = std::find_if(start, last, [&](auto d) {
        x *= proj(d);
        return x == dim;
    });
    if(it != last)
        return it;
    return start;
}

void debug_print(const std::vector<dimension::sub>& subs)
{
    std::cout << '[' << stream_range(subs) << "]\n";
}
void debug_print(const dimension& dim) { debug_print(dim.subdimensions); }
void debug_print(const std::vector<dimension>& dims)
{
    stream_write_value(std::cout, dims);
    std::cout << std::endl;
}

shape_transform_descriptor::shape_transform_descriptor(const std::vector<std::size_t>& dims)
    : rank(dims.size())
{
    transform(dims,
              range(dims.size()),
              std::back_inserter(dimensions),
              [](std::size_t d, std::size_t a) -> dimension {
                  return {{dimension::sub{d, {a}}}};
              });
}

static std::vector<dimension::sub> get_all_subdimensions(const std::vector<dimension>& dimensions)
{
    std::vector<dimension::sub> result;
    for(const auto& dim : dimensions)
    {
        result.insert(result.end(), dim.subdimensions.begin(), dim.subdimensions.end());
    }
    return result;
}

template <class Dimensions, class Range, class F>
static void for_each_subdimension(Dimensions&& dimensions, Range&& r, F f)
{
    auto start = r.begin();
    auto last  = r.end();
    for(auto& dim : dimensions)
    {
        for(auto& s : dim.subdimensions)
        {
            if(start == last)
                return;
            f(s, *start);
            start++;
        }
    }
}

// Group all axes into a map with a key of the axis and the value is vector of
// all subdimensions that have that axis.
static std::map<std::size_t, std::vector<dimension::sub*>>
group_axes(std::vector<dimension>& dimensions)
{
    std::map<std::size_t, std::vector<dimension::sub*>> axes_map;
    for(auto& d : dimensions)
    {
        for(auto& s : d.subdimensions)
        {
            if(s.origin_axis().empty())
                continue;
            axes_map[s.origin_axis().front()].push_back(&s);
        }
    }
    return axes_map;
}

std::vector<std::size_t> compute_dims(const operation& op, const std::vector<std::size_t>& idims)
{
    shape s{shape::float_type, idims};
    return op.compute_shape({s}).lens();
}

std::vector<std::size_t> compute_dims(const std::vector<operation>& ops,
                                      const std::vector<std::size_t>& idims)
{
    shape s{shape::float_type, idims};
    for(const auto& op : ops)
        s = op.compute_shape({s});
    return s.lens();
}

shape_transform_descriptor shape_transform_descriptor::create(const std::vector<std::size_t>& dims,
                                                              const std::vector<operation>& ops)
{
    shape_transform_descriptor result{dims};
    if(not result.apply(ops))
        return {};
    result.simplify();
    assert(compute_dims(ops, dims) == compute_dims(result.generate(), dims));
    return result;
}

shape_transform_descriptor
shape_transform_descriptor::rebase(const std::vector<std::size_t>& dims) const
{
    auto result   = *this;
    auto axes_map = group_axes(result.dimensions);
    for(auto& [axis, subs] : axes_map)
    {
        assert(axis < dims.size());
        auto dim       = dims[axis];
        auto final_dim = transform_accumulate(subs.begin(),
                                              subs.end(),
                                              std::size_t{1},
                                              std::multiplies<>{},
                                              [](const dimension::sub* s) { return s->len; });
        if(dim == final_dim)
        {
            for(auto* sub : subs)
                sub->expose();
        }
        else if(dim == 1)
        {
            for(auto* sub : subs)
            {
                if(not sub->has_hidden_axis())
                    sub->len = 1;
            }
        }
        else if(subs.size() == 1)
        {
            subs.front()->len = dim;
            subs.front()->expose();
        }
        else
            MIGRAPHX_THROW("Invalid rebase");
    }
    result.simplify();

    return result;
}
static dimension::sub* get_last_subdimension(std::vector<dimension>& dims)
{
    if(dims.empty())
        return {};
    auto& d = dims.back();
    if(d.subdimensions.empty())
        return nullptr;
    return &d.subdimensions.back();
}

bool shape_transform_descriptor::apply(const std::vector<operation>& ops)
{
    std::vector<std::size_t> dims;
    std::transform(dimensions.begin(),
                   dimensions.end(),
                   std::back_inserter(dims),
                   [](const dimension& d) { return d.len(); });
    for(const auto& op : ops)
    {
        auto v = op.to_value();
        if(contains({"reshape", "squeeze", "unsqueeze", "flatten"}, op.name()))
        {
            dims = compute_dims(op, dims);
            if(not apply_reshape(dims))
                return false;
        }
        else if(op.name() == "transpose")
        {
            dims = compute_dims(op, dims);
            if(not apply_transpose(v["permutation"].to_vector<std::int64_t>()))
                return false;
        }
        else if(op.name() == "multibroadcast")
        {
            dims = compute_dims(op, dims);
            // cppcheck-suppress knownConditionTrueFalse
            if(not apply_broadcast(dims))
                return false;
        }
        else if(op.name() == "broadcast")
        {
            dims = compute_dims(op, dims);
            // cppcheck-suppress knownConditionTrueFalse
            if(not apply_broadcast(dims, v["axis"].to<std::size_t>()))
                return false;
        }
        else if(op.name() != "contiguous")
        {
            return false;
        }
    }
    return true;
}
bool shape_transform_descriptor::apply_reshape(const std::vector<std::size_t>& rdims)
{
    std::vector<std::size_t> idims;
    transform(get_all_subdimensions(dimensions),
              std::back_inserter(idims),
              std::mem_fn(&dimension::sub::len));
    auto cdims = common_dims::compute(idims, rdims).dims;
    if(not cdims.empty() and not apply_reshape_impl(cdims))
        return false;
    return apply_reshape_impl(rdims);
}
bool shape_transform_descriptor::apply_reshape_impl(const std::vector<std::size_t>& rdims)
{
    assert(migraphx::elements(rdims) == this->elements());
    if(migraphx::equal(
           dimensions, rdims, [](const dimension& d, std::size_t rdim) { return d.len() == rdim; }))
        return true;
    std::vector<dimension> new_dims;
    auto subs     = get_all_subdimensions(dimensions);
    std::size_t i = 0;
    std::size_t r = 0;
    while(i < subs.size() and r < rdims.size())
    {
        const auto& sub = subs[i];
        auto idim       = sub.len;
        auto rdim       = rdims[r];
        if(idim == rdim)
        {
            new_dims.push_back({{sub}});
        }
        // squeeze
        else if(rdim > idim)
        {
            auto start = subs.begin() + i;
            auto it = compute_end_dim(start, subs.end(), rdim, std::mem_fn(&dimension::sub::len));
            if(it == start)
                return false;
            assert(it != subs.end());
            auto n = it - start;
            i += n;
            new_dims.push_back({{start, it + 1}});
        }
        // unsqueeze
        else // if(rdim < idim)
        {
            auto start = rdims.begin() + r;
            auto it    = compute_end_dim(start, rdims.end(), idim, id{});
            if(it == start)
                return false;
            assert(it != rdims.end());
            auto n = it - start;
            r += n;
            transform(range(n + 1), std::back_inserter(new_dims), [&](auto j) -> dimension {
                auto new_sub = sub;
                new_sub.add_split_axis(j);
                new_sub.len = start[j];
                return {{new_sub}};
            });
        }
        r++;
        i++;
    }

    // Handle trailing 1s
    if(new_dims.size() < rdims.size() and not new_dims.empty())
    {
        auto* sub          = get_last_subdimension(new_dims);
        auto axis          = sub == nullptr ? std::vector<std::size_t>{} : sub->axis;
        auto trailing_dims = range(rdims.begin() + new_dims.size(), rdims.end());
        if(any_of(trailing_dims, [](auto d) { return d != 1; }))
            return false;
        if(distance(trailing_dims) > 1)
            sub->add_split_axis(0);
        transform(range(distance(trailing_dims)),
                  std::back_inserter(new_dims),
                  [&](std::size_t j) -> dimension {
                      dimension::sub s{1, axis};
                      s.add_split_axis(j + 1);
                      return {{s}};
                  });
    }
    assert(rdims.size() == new_dims.size());
    if(rdims.size() != new_dims.size())
        return false;
    dimensions = new_dims;
    return true;
}

bool shape_transform_descriptor::apply_transpose(const std::vector<std::int64_t>& permutation)
{
    if(permutation.size() != dimensions.size())
        return false;
    dimensions = reorder_dims(dimensions, permutation);
    return true;
}

bool shape_transform_descriptor::apply_broadcast(const std::vector<std::size_t>& out_lens,
                                                 optional<std::size_t> axis)
{
    auto offset = axis.value_or(out_lens.size() - dimensions.size());

    std::vector<dimension> new_dims;
    std::transform(out_lens.begin(),
                   out_lens.begin() + offset,
                   std::back_inserter(new_dims),
                   [&](auto len) -> dimension {
                       return {{dimension::sub{len, {}}}};
                   });
    std::transform(dimensions.begin(),
                   dimensions.end(),
                   out_lens.begin() + offset,
                   std::back_inserter(new_dims),
                   [&](const dimension& dim, auto len) -> dimension {
                       if(len == dim.len())
                           return dim;
                       if(dim.len() != 1)
                           MIGRAPHX_THROW("Wrong out_lens for broadcast");
                       auto new_subs = dim.subdimensions;
                       if(not new_subs.empty())
                       {
                           new_subs.front().len = len;
                       }
                       for(auto& s : new_subs)
                       {
                           s.hide();
                       }
                       return {new_subs};
                   });
    std::transform(out_lens.begin() + offset + dimensions.size(),
                   out_lens.end(),
                   std::back_inserter(new_dims),
                   [&](auto len) -> dimension {
                       return {{dimension::sub{len, {}}}};
                   });
    assert(out_lens.size() == new_dims.size());
    dimensions = new_dims;
    return true;
}

// Remove subdimensions of 1
void remove_1_sub_dims(std::vector<dimension::sub>& subdimensions)
{
    subdimensions.erase(std::remove_if(subdimensions.begin(),
                                       subdimensions.end(),
                                       [&](const dimension::sub& d) { return d.len == 1; }),
                        subdimensions.end());
}

void dimension::simplify()
{
    if(subdimensions.size() < 2)
        return;
    remove_1_sub_dims(subdimensions);
    // Flatten adjacent dimensions
    adjacent_for_each(subdimensions.begin(), subdimensions.end(), [&](sub& d1, sub& d2) {
        if(d1.origin_axis().size() < 2)
            return;
        if(d2.origin_axis().size() < 2)
            return;
        if(d1.has_hidden_axis() != d2.has_hidden_axis())
            return;
        if(not std::equal(d1.origin_axis().begin(),
                          d1.origin_axis().end() - 1,
                          d2.origin_axis().begin(),
                          d2.origin_axis().end() - 1))
            return;
        auto a1 = d1.origin_axis().back();
        auto a2 = d2.origin_axis().back();
        assert(a2 != a1);
        if(a2 <= a1)
            return;
        if((a2 - a1) != 1)
            return;
        d2.len = d1.len * d2.len;
        d1.len = 1;
    });
    remove_1_sub_dims(subdimensions);
}

// Search all subdimensions and return the subdimensions vector, an iterator
// to the subdimension found and an optional iterator to the previous
// subdimension if available.
template <class Predicate>
static auto find_subdimension(shape_transform_descriptor& td, Predicate p)
{
    dimension* prev_dim = nullptr;
    for(auto& d : td.dimensions)
    {
        auto it = std::find_if(d.subdimensions.begin(), d.subdimensions.end(), p);
        if(it != d.subdimensions.end())
        {
            decltype(std::make_optional(it)) prev = nullopt;
            if(it == d.subdimensions.begin())
            {
                if(prev_dim != nullptr and not prev_dim->subdimensions.empty())
                {
                    prev = std::prev(prev_dim->subdimensions.end());
                }
            }
            else
            {
                prev = std::prev(it);
            }
            return std::make_tuple(&d.subdimensions, it, prev);
        }
        prev_dim = &d;
    }
    MIGRAPHX_THROW("Searching for non-existent subdimension");
}

static bool is_broadcast_dim(const dimension& d)
{
    if(d.len() == 1)
        return false;
    assert(not d.subdimensions.empty());
    if(d.subdimensions.size() != 1)
        return false;
    const auto& sub = d.subdimensions.front();
    return sub.axis.empty();
}

static bool missing_leading_axis(const dimension& d)
{
    if(d.subdimensions.empty())
        return true;
    const auto& sub = d.subdimensions.front();
    return sub.origin_axis().empty();
}

static void set_broadcast_dim(dimension& d, std::size_t axis)
{
    if(d.subdimensions.empty())
        d.subdimensions.push_back({1, {axis}});
    else
    {
        assert(d.subdimensions.front().hidden_axis.empty());
        d.subdimensions.front().hidden_axis = {axis};
    }
}

static void set_origin_axis(dimension::sub& s, const std::vector<std::size_t>& axis)
{
    if(s.has_hidden_axis())
        s.hidden_axis = axis;
    else
        s.axis = axis;
}

// If an axis is split and some dimensions are hidden and others are not, then
// remove the hidden axis so only the non-hidden axis is used in
// simplificaiton
static void remove_split_hidden_axes(std::map<std::size_t, std::vector<dimension::sub*>>& axes_map)
{
    for(auto&& p : axes_map)
    {
        auto& subs = p.second;
        if(std::all_of(subs.begin(), subs.end(), [](const dimension::sub* s) {
               return s->has_hidden_axis();
           }))
            continue;
        for(auto* sub : subs)
        {
            if(not sub->has_hidden_axis())
                continue;
            sub->hidden_axis.clear();
        }
        // Remove the subdimesions that no longer have an axis
        subs.erase(std::remove_if(subs.begin(),
                                  subs.end(),
                                  [](const dimension::sub* s) {
                                      return s->axis.empty() and s->hidden_axis.empty();
                                  }),
                   subs.end());
    }
    // Remove axis from group if empty
    erase_if(axes_map, [](auto&& p) { return p.second.empty(); });
}

// If this is scalar, then remove all axes
static void remove_scalar_axis(std::vector<dimension>& dimensions)
{
    dimension::sub* s = nullptr;
    for(auto& d : dimensions)
    {
        auto has_axis = [](const dimension::sub& x) { return not x.origin_axis().empty(); };
        auto it       = std::find_if(d.subdimensions.begin(), d.subdimensions.end(), has_axis);
        if(it == d.subdimensions.end())
            continue;
        if(s != nullptr)
            return;
        if(std::count_if(std::next(it), d.subdimensions.end(), has_axis) > 0)
            return;
        s = &*it;
    }
    if(s != nullptr)
    {
        if(s->has_hidden_axis())
            s->hidden_axis.clear();
        if(s->len == 1)
            s->axis.clear();
    }
}

// Renumber all axes while preserving the order of the axes
static void renumber_axes(std::map<std::size_t, std::vector<dimension::sub*>>& axes_map)
{
    for(auto&& p : axes_map)
    {
        const auto& axis = p.first;
        auto& subs       = p.second;
        if(subs.size() == 1)
        {
            set_origin_axis(*subs[0], {axis});
        }
        else
        {
            std::sort(subs.begin(), subs.end(), by(std::less<>{}, [](const dimension::sub* s) {
                          return s->origin_axis();
                      }));
            for(std::size_t i : range(subs.size()))
                set_origin_axis(*subs[i], {axis, i});
        }
    }
}
static void renumber_axes(std::vector<dimension>& dimensions)
{
    auto axes_map = group_axes(dimensions);
    renumber_axes(axes_map);
}
static void collapse_1_dims(std::vector<dimension>& dimensions)
{
    // Find a dimension that ends with a subdimension of 1 with a single axis,
    // and is followed by subdimension in the next dimension of 1 that has a
    // split axis. It will remove the trailing subdimension and update the
    // leading subdimension to use the axis from the trailing subdimension.
    adjacent_for_each(dimensions.begin(), dimensions.end(), [&](dimension& d1, dimension& d2) {
        if(d1.subdimensions.size() < 2)
            return;
        if(d2.subdimensions.empty())
            return;
        if(d2.len() != 1)
            return;
        const auto& sub1 = d1.subdimensions.back();
        auto& sub2       = d2.subdimensions.front();
        if(sub1.axis.size() != 1)
            return;
        if(sub2.axis.size() < 2)
            return;
        if(sub1.len != 1)
            return;
        if(sub2.len != 1)
            return;
        sub2.axis = sub1.axis;
        d1.subdimensions.pop_back();
    });

    renumber_axes(dimensions);
}

void shape_transform_descriptor::simplify()
{
    for(auto& d : dimensions)
        d.simplify();

    remove_scalar_axis(dimensions);

    std::map<std::size_t, std::size_t> missing_axes;
    std::vector<std::size_t> last_axis;
    {
        // Group axes
        auto axes_map = group_axes(dimensions);
        if(axes_map.empty())
            return;

        remove_split_hidden_axes(axes_map);
        renumber_axes(axes_map);

        // Find last axis
        last_axis = std::prev(axes_map.end())->second.back()->axis;

        // Find missing axes. This will store a mapping between the missing
        // axis and the next available axis.
        for(auto axis : range(rank))
        {
            if(contains(axes_map, axis))
                continue;
            auto it            = axes_map.upper_bound(axis);
            missing_axes[axis] = it == axes_map.end() ? rank : it->first;
        }
    }

    // Find broadcasted dimensions. This will store a map from the next axis
    // to the indices of the previous dimensions that are being broadcasted.
    std::map<std::size_t, std::deque<std::size_t>> broadcast_dims_map;
    group_find(
        dimensions.begin(), dimensions.end(), &missing_leading_axis, [&](auto start, auto last) {
            auto axis = rank;
            if(last != dimensions.end())
            {
                assert(not last->subdimensions.empty());
                const auto& sub = last->subdimensions.front();
                assert(not sub.origin_axis().empty());
                axis = sub.origin_axis().front();
            }
            std::deque<std::size_t> dims(std::distance(start, last));
            std::iota(dims.begin(), dims.end(), std::distance(dimensions.begin(), start));
            broadcast_dims_map[axis] = dims;
        });

    // Reinsert removed axis of 1. This tries to insert the missing axis next
    // to an adjacent axis or used as one of the broadcasted axes in order to
    // minimize transposition.
    for(auto&& p : missing_axes)
    {
        auto missing_axis = p.first;
        auto next_axis    = p.second;
        auto missing_sub  = dimension::sub{1, {missing_axis}};
        // If next_axis is the rank that means there isnt another axis to
        // search for, so instead try to insert the axis at the end.
        if(next_axis == rank)
        {
            auto [sub, it, prev] = find_subdimension(
                *this, [&](const dimension::sub& s) { return s.axis == last_axis; });
            // Check if we can insert it at the end
            auto bdims = broadcast_dims_map.find(rank);
            if(bdims != broadcast_dims_map.end() and not bdims->second.empty())
            {
                auto bdim = bdims->second.front();
                bdims->second.pop_front();
                set_broadcast_dim(dimensions[bdim], missing_axis);
            }
            else
            {
                auto next = std::find_if(std::next(it), sub->end(), [&](const dimension::sub& s) {
                    if(s.len != 1)
                        return true;
                    if(s.axis.empty())
                        return true;
                    return s.axis.front() > missing_axis;
                });
                sub->insert(next, missing_sub);
            }
        }
        else
        {
            // Search for the subdimension that has the next axis and try to
            // insert the axis before it will be in order.
            auto [sub, it, prev] = find_subdimension(*this, [&](const dimension::sub& s) {
                if(s.origin_axis().empty())
                    return false;
                if(s.origin_axis().front() != next_axis)
                    return false;
                if(s.origin_axis().size() == 1)
                    return true;
                assert(s.origin_axis().size() == 2);
                return s.origin_axis().back() == 0;
            });
            bool in_order        = false;
            if(prev.has_value() and not(*prev)->origin_axis().empty())
                in_order = (*prev)->origin_axis().front() == missing_axis - 1;
            // If the axis is not inorder then see if we can find a broadcast axis to place it
            auto bdims =
                in_order ? broadcast_dims_map.end() : broadcast_dims_map.upper_bound(missing_axis);
            if(bdims != broadcast_dims_map.end() and not bdims->second.empty())
            {
                auto bdim = bdims->second.front();
                bdims->second.pop_front();
                set_broadcast_dim(dimensions[bdim], missing_axis);
            }
            else
            {
                sub->insert(it, missing_sub);
            }
        }
    }

    collapse_1_dims(dimensions);
}

static std::size_t get_len(const dimension::sub& s, const std::vector<std::size_t>& input_dims)
{
    if(input_dims.empty())
        return s.len;
    if(s.axis.empty())
        return s.len;
    auto dim = input_dims.at(s.axis.front());
    if(dim == 0)
        return s.len;
    if(dim == 1)
        return 1;
    if(s.axis.size() == 1)
        return dim;
    return s.len;
}

static operation make_reshape_squeeze(const std::vector<dimension>& new_dims)
{
    // Can use squeeze
    if(std::all_of(new_dims.begin(), new_dims.end(), [](const dimension& d) {
           if(d.subdimensions.size() < 2)
               return true;
           auto n = std::count_if(d.subdimensions.begin(),
                                  d.subdimensions.end(),
                                  [&](const dimension::sub& s) { return s.len == 1; });
           return n >= (d.subdimensions.size() - 1);
       }))
    {
        std::vector<std::size_t> base_axes = {0};
        transform_partial_sum(
            new_dims.begin(),
            std::prev(new_dims.end()),
            std::back_inserter(base_axes),
            std::plus<>{},
            [](const dimension& d) { return std::max<std::size_t>(1, d.subdimensions.size()); });
        auto get_squeezed_axes = [](const dimension& d, std::size_t base_axis) {
            std::vector<std::size_t> result;
            if(d.subdimensions.size() < 2)
                return result;
            auto idx = range(d.subdimensions.size());
            transform_if(
                idx.begin(),
                idx.end(),
                std::back_inserter(result),
                [&](std::size_t i) { return d.subdimensions[i].len == 1; },
                [&](std::size_t i) { return base_axis + i; });
            if(result.size() == d.subdimensions.size())
                result.pop_back();
            return result;
        };
        std::vector<std::size_t> axes;
        std::transform(new_dims.begin(),
                       new_dims.end(),
                       base_axes.begin(),
                       join_back_inserter(axes),
                       get_squeezed_axes);
        return make_op("squeeze", {{"axes", axes}});
    }
    else
    {
        std::vector<std::size_t> dims;
        std::transform(new_dims.begin(),
                       new_dims.end(),
                       std::back_inserter(dims),
                       [](const dimension& d) -> std::size_t {
                           if(is_broadcast_dim(d))
                               return 1;
                           return d.len();
                       });
        return make_op("reshape", {{"dims", dims}});
    }
}

static void flatten_broadcasted_dim(dimension::sub& s)
{
    if(s.axis.empty())
    {
        s.len = 1;
        s.expose();
    }
}

static operation make_reshape_unsqueeze(const std::vector<dimension::sub>& subs,
                                        const std::vector<std::size_t>& input_dims = {})
{
    bool use_reshape = false;
    std::unordered_set<std::size_t> all_1s;
    // Check if split dimensions are all additional 1s
    if(std::any_of(
           subs.begin(), subs.end(), [](const dimension::sub& s) { return s.axis.size() > 1; }))
    {
        auto subs2   = subs;
        auto by_axis = by(std::equal_to<>{}, [](const dimension::sub& s) -> int64_t {
            if(s.axis.empty())
                return -1;
            return s.axis.front();
        });
        group_by(
            subs2.begin(),
            subs2.end(),
            [&](auto start, auto last) {
                if(use_reshape)
                    return;
                // Number of elements
                auto n = std::distance(start, last);
                if(n < 2)
                    return;
                // Number of elements that are 1
                auto n1 = std::count_if(start, last, [&](const dimension::sub& s) {
                    return get_len(s, input_dims) == 1;
                });
                if(n == n1 and not start->axis.empty())
                    all_1s.insert(start->axis.front());
                use_reshape |= std::max<int64_t>(0, n - n1 - 1) > 0;
            },
            by_axis);
    }
    if(use_reshape)
    {
        std::vector<std::size_t> dims;
        std::transform(subs.begin(),
                       subs.end(),
                       std::back_inserter(dims),
                       [&](const dimension::sub& s) -> std::size_t {
                           if(s.axis.empty())
                               return 1;
                           return get_len(s, input_dims);
                       });
        return make_op("reshape", {{"dims", dims}});
    }
    else
    {
        std::vector<std::size_t> axes;
        for(auto i : range(subs.size()))
        {
            const auto& sub = subs[i];
            if(sub.axis.size() == 1)
                continue;
            if(get_len(sub, input_dims) != 1 and not sub.axis.empty())
                continue;
            if(not sub.axis.empty() and contains(all_1s, sub.axis.front()) and sub.axis.back() == 0)
                continue;
            axes.push_back(i);
        }
        return make_op("unsqueeze", {{"axes", axes}});
    }
}

namespace {
struct operation_list
{
    std::vector<operation> ops;

    void push_back(const operation& op) { ops.push_back(op); }

    std::vector<operation> to_vector() &&
    {
        std::reverse(ops.begin(), ops.end());
        return std::move(ops);
    }
};

} // namespace

static bool has_no_axes(const dimension& d)
{
    return std::all_of(d.subdimensions.begin(), d.subdimensions.end(), [](const dimension::sub& s) {
        return s.axis.empty() and s.hidden_axis.empty();
    });
}
static bool has_axes(const dimension& d)
{
    return std::any_of(d.subdimensions.begin(), d.subdimensions.end(), [](const dimension::sub& s) {
        return not s.axis.empty();
    });
}

static void generate_from_subdimensions(operation_list& result,
                                        std::vector<dimension::sub> subs,
                                        const std::vector<std::size_t>& input_dims = {})
{
    // Need multibroadcast
    if(std::any_of(subs.begin(), subs.end(), [&](const dimension::sub& s) {
           return s.axis.empty() and get_len(s, input_dims) != 1;
       }))
    {
        std::vector<std::size_t> out_lens;
        std::transform(subs.begin(),
                       subs.end(),
                       std::back_inserter(out_lens),
                       [&](const dimension::sub& s) { return get_len(s, input_dims); });
        result.push_back(make_op("multibroadcast", {{"out_lens", out_lens}}));
    }

    // Flatten broadcasted subdimensions
    std::for_each(subs.begin(), subs.end(), &flatten_broadcasted_dim);

    auto tsubs = subs;
    // Inject additonal axis to compute transpose permutation better
    auto is_empty_axis = [](const auto& s) { return s.axis.empty(); };
    group_find(tsubs.begin(), tsubs.end(), is_empty_axis, [&](auto start, auto last) {
        if(start == tsubs.begin())
            return;
        auto base = std::prev(start);
        auto axis = base->axis;
        axis.push_back(0);
        std::for_each(start, last, [&](auto& s) {
            s.axis = axis;
            axis.back()++;
        });
    });

    auto compare_sub = [](auto f) {
        return by(f, [](const dimension::sub& s) -> const auto& { return s.axis; });
    };
    // Need transpose
    if(not std::is_sorted(tsubs.begin(), tsubs.end(), compare_sub(std::less<>{})))
    {
        auto permutation = sort_permutation(tsubs, compare_sub(std::less<>{}));
        result.push_back(make_op("transpose", {{"permutation", invert_permutation(permutation)}}));
        subs = reorder_dims(subs, permutation);
    }
    // Need reshape unsqueeze
    if(std::any_of(
           subs.begin(), subs.end(), [](const dimension::sub& s) { return s.axis.size() != 1; }))
    {
        result.push_back(make_reshape_unsqueeze(subs, input_dims));
    }
}

// This will generate the operators to apply the shape transformation that is
// represented by this class. This is the order of operators that will be
// generated if needed:
//
// 1. Reshape/unsqueeze
// 2. Transpose
// 3. Broadcast
// 4. Reshape/squeeze
// 5. Broadcast
//
// This will generate operators backwards starting at 5 and going up. Steps 1-3
// are generated from the subdimensions and steps 4-5 are generated with the
// dimensions.
std::vector<operation> shape_transform_descriptor::generate() const
{
    operation_list result;
    std::vector<dimension> new_dims = dimensions;
    // Need broadcast
    if(std::any_of(new_dims.begin(), new_dims.end(), &is_broadcast_dim))
    {
        std::vector<std::size_t> out_lens;
        std::transform(new_dims.begin(),
                       new_dims.end(),
                       std::back_inserter(out_lens),
                       [](const dimension& d) { return d.len(); });
        auto startb     = std::find_if_not(new_dims.begin(), new_dims.end(), &has_no_axes);
        auto trailb     = std::find_if_not(startb, new_dims.end(), &has_axes);
        auto axis       = std::distance(new_dims.begin(), startb);
        auto extra_dims = axis + std::distance(trailb, new_dims.end());
        // Use broadcast instead of multibroadcast
        if(std::all_of(trailb, new_dims.end(), &has_no_axes) and extra_dims > 0 and
           axis < new_dims.size())
        {
            result.push_back(make_op("broadcast", {{"axis", axis}, {"out_lens", out_lens}}));
            new_dims.erase(trailb, new_dims.end());
            new_dims.erase(new_dims.begin(), new_dims.begin() + axis);
        }
        else
        {
            result.push_back(make_op("multibroadcast", {{"out_lens", out_lens}}));
        }
    }
    // If all the dimensions have no axes then there isnt anthing else to do
    // so just clear the new_dims
    if(std::all_of(new_dims.begin(), new_dims.end(), &has_no_axes))
        new_dims.clear();
    // Flatten broadcasted dimensions
    for(auto& d : new_dims)
    {
        if(d.subdimensions.size() != 1)
            continue;
        flatten_broadcasted_dim(d.subdimensions.front());
    }
    // Need squeeze reshape
    if(std::any_of(new_dims.begin(), new_dims.end(), [](const dimension& d) {
           if(d.subdimensions.size() != 1)
               return true;
           return is_broadcast_dim(d);
       }))
    {
        result.push_back(make_reshape_squeeze(new_dims));
    }

    auto subs = get_all_subdimensions(new_dims);
    generate_from_subdimensions(result, subs);
    return std::move(result).to_vector();
}

bool shape_transform_descriptor::has_broadcast() const
{
    return std::any_of(dimensions.begin(), dimensions.end(), [&](const dimension& d) {
        return std::any_of(d.subdimensions.begin(),
                           d.subdimensions.end(),
                           [&](const dimension::sub& s) { return s.axis.empty() and s.len != 1; });
    });
}
void shape_transform_descriptor::flatten_broadcast()
{
    for(auto& d : dimensions)
        std::for_each(d.subdimensions.begin(), d.subdimensions.end(), &flatten_broadcasted_dim);
}

std::vector<operation> shape_transform_descriptor::generate_common_from_src(
    const std::vector<std::size_t>& input_dims) const
{
    operation_list result;
    auto subs = get_all_subdimensions(dimensions);
    generate_from_subdimensions(result, subs, input_dims);
    return std::move(result).to_vector();
}
std::vector<operation> shape_transform_descriptor::generate_common_from_dst(
    const std::vector<std::size_t>& input_dims) const
{
    // Need reshape
    if(std::all_of(dimensions.begin(), dimensions.end(), [](const dimension& d) {
           return d.subdimensions.size() == 1;
       }))
        return {};
    std::vector<dimension::sub> subs;
    // Update axes to point to the destination
    for(std::size_t i : range(dimensions.size()))
    {
        const auto& d = dimensions[i];
        std::transform(d.subdimensions.begin(),
                       d.subdimensions.end(),
                       range(d.subdimensions.size()).begin(),
                       std::back_inserter(subs),
                       [&](dimension::sub s, auto j) {
                           s.axis = {i};
                           if(d.subdimensions.size() > 1)
                               s.axis.push_back(j);
                           return s;
                       });
    }
    return {make_reshape_unsqueeze(subs, input_dims)};
}
std::vector<operation> shape_transform_descriptor::generate_dst_from_common(
    const std::vector<std::size_t>& input_dims) const
{
    std::vector<operation> result;
    std::vector<dimension> new_dims = dimensions;
    for_each_subdimension(new_dims, input_dims, [&](auto& s, auto dim) { s.len = dim; });

    // Remove broadcasted dimensions
    for(auto& d : new_dims)
    {
        if(d.subdimensions.size() != 1)
            continue;
        auto& s = d.subdimensions.front();
        s.expose();
    }
    // Need squeeze reshape
    if(std::any_of(new_dims.begin(), new_dims.end(), [](const dimension& d) {
           if(d.subdimensions.size() != 1)
               return true;
           return is_broadcast_dim(d);
       }))
    {
        result.push_back(make_reshape_squeeze(new_dims));
    }
    return result;
}

std::vector<std::vector<std::size_t>> shape_transform_descriptor::common_axes_map_from_src() const
{
    std::vector<std::vector<std::size_t>> result;
    auto subs = get_all_subdimensions(dimensions);
    std::map<std::size_t, std::vector<const dimension::sub*>> axes_map;
    for(const auto& s : subs)
    {
        if(not s.origin_axis().empty())
            axes_map[s.origin_axis().front()].push_back(&s);
    }
    for(auto&& p : axes_map)
    {
        std::sort(p.second.begin(), p.second.end(), by(std::less<>{}, [](const dimension::sub* s) {
                      return s->axis;
                  }));
    }
    assert(not axes_map.empty());
    auto max_axis = std::prev(axes_map.end())->first;
    result.resize(max_axis + 1);
    for(auto&& p : axes_map)
    {
        assert(p.first < result.size());
        std::transform(p.second.begin(),
                       p.second.end(),
                       std::back_inserter(result[p.first]),
                       [&](const dimension::sub* s) { return s - subs.data(); });
    }
    return result;
}
std::vector<std::vector<std::size_t>> shape_transform_descriptor::common_axes_map_from_dst() const
{
    std::vector<std::vector<std::size_t>> result;
    std::size_t start = 0;
    for(const auto& d : dimensions)
    {
        auto& v = result.emplace_back(d.subdimensions.size());
        std::iota(v.begin(), v.end(), start);
        start += d.subdimensions.size();
    }
    return result;
}

bool shape_transform_descriptor::empty() const { return dimensions.empty(); }

std::vector<std::size_t> shape_transform_descriptor::lens() const
{
    std::vector<std::size_t> result;
    std::transform(dimensions.begin(),
                   dimensions.end(),
                   std::back_inserter(result),
                   [](const dimension& d) { return d.len(); });
    return result;
}

std::size_t dimension::len() const
{
    return transform_accumulate(subdimensions.begin(),
                                subdimensions.end(),
                                std::size_t{1},
                                std::multiplies<>{},
                                [](const auto& s) { return s.len; });
}

std::size_t shape_transform_descriptor::elements() const
{
    return transform_accumulate(dimensions.begin(),
                                dimensions.end(),
                                std::size_t{1},
                                std::multiplies<>{},
                                [](const auto& s) { return s.len(); });
}
std::vector<std::size_t>
shape_transform_descriptor::common_dims(const std::vector<std::size_t>& input_dims) const
{
    std::vector<std::size_t> result;
    for(const auto& d : dimensions)
    {
        std::transform(d.subdimensions.begin(),
                       d.subdimensions.end(),
                       std::back_inserter(result),
                       [&](const dimension::sub& s) { return get_len(s, input_dims); });
    }
    return result;
}

const std::vector<std::size_t>& shape_transform_descriptor::dimension::sub::origin_axis() const
{
    return axis.empty() ? hidden_axis : axis;
}
bool shape_transform_descriptor::dimension::sub::has_hidden_axis() const
{
    return axis.empty() and not hidden_axis.empty();
}

void shape_transform_descriptor::dimension::sub::add_split_axis(std::size_t i)
{
    if(not axis.empty())
        axis.push_back(i);
    if(not hidden_axis.empty())
        hidden_axis.push_back(i);
}

void shape_transform_descriptor::dimension::sub::expose()
{
    if(has_hidden_axis())
    {
        axis = hidden_axis;
        hidden_axis.clear();
    }
}

void shape_transform_descriptor::dimension::sub::hide()
{
    if(not has_hidden_axis())
    {
        hidden_axis = axis;
        axis.clear();
    }
}

bool operator==(const dimension::sub& x, const dimension::sub& y)
{
    return by(std::equal_to<>{},
              [](const dimension::sub& s) { return std::tie(s.len, s.axis, s.hidden_axis); })(x, y);
}
bool operator!=(const dimension::sub& x, const dimension::sub& y) { return not(x == y); }
std::ostream& operator<<(std::ostream& os, const dimension::sub& x)
{
    os << x.len << ":" << to_string_range(x.axis, "x");
    if(not x.hidden_axis.empty())
        os << "$" << to_string_range(x.hidden_axis, "x");
    return os;
}
bool operator==(const dimension& x, const dimension& y)
{
    return x.subdimensions == y.subdimensions;
}
bool operator!=(const dimension& x, const dimension& y) { return not(x == y); }
std::ostream& operator<<(std::ostream& os, const dimension& x)
{
    os << '[' << stream_range(x.subdimensions) << ']';
    return os;
}
bool operator==(const shape_transform_descriptor& x, const shape_transform_descriptor& y)
{
    return by(std::equal_to<>{}, [](const shape_transform_descriptor& sd) {
        return std::tie(sd.dimensions, sd.rank);
    })(x, y);
}
bool operator!=(const shape_transform_descriptor& x, const shape_transform_descriptor& y)
{
    return not(x == y);
}
std::ostream& operator<<(std::ostream& os, const shape_transform_descriptor& x)
{
    stream_write_value(os, x.dimensions);
    return os;
}

std::vector<operation> optimize_shape_transforms(const std::vector<std::size_t>& dims,
                                                 const std::vector<operation>& ops)
{
    auto sd = shape_transform_descriptor::create(dims, ops);
    if(sd.empty())
        return ops;
    return sd.generate();
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
