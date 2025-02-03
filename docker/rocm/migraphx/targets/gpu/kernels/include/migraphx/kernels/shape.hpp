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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_SHAPE_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_KERNELS_SHAPE_HPP

#include <migraphx/kernels/array.hpp>
#include <migraphx/kernels/algorithm.hpp>
#include <migraphx/kernels/permutation.hpp>
#include <migraphx/kernels/operators.hpp>

namespace migraphx {

template <class Lens, class Strides>
struct shape : equality_comparable<shape<Lens, Strides>>
{
    using shape_type  = shape;
    using index_array = typename Lens::base_array;
    Lens lens         = {};
    Strides strides   = {};

    constexpr shape() = default;

    constexpr shape(Lens l, Strides s) : lens(l), strides(s) {}

    constexpr auto elements() const { return _c<Lens{}.product()>; }

    constexpr auto element_space() const { return _c<Strides{}.dot(Lens{} - 1) + 1>; }

    constexpr auto packed() const { return not skips() and elements() == element_space(); }
    constexpr auto broadcasted() const { return _c<Strides{}.product() == 0>; }
    constexpr auto transposed() const
    {
        return return_c([] {
            auto lstrides = Strides{};
            if(shape{}.broadcasted())
            {
                index_array s{};
                auto out = copy_if(
                    lstrides.begin(), lstrides.end(), s.begin(), [](auto x) { return x != 0; });
                return not is_sorted(s.begin(), out, greater{});
            }
            else
            {
                return not is_sorted(lstrides.begin(), lstrides.end(), greater{});
            }
        });
    }
    constexpr auto skips() const
    {
        return return_c([] {
            auto lstrides = Strides{};
            return none_of(lstrides.begin(), lstrides.end(), [](auto x) { return x == 1; });
        });
    }

    constexpr auto standard() const { return packed() and not transposed(); }

    constexpr index_int index(index_array x) const { return x.dot(strides); }

    constexpr index_int index(index_int i) const
    {
        if(this->standard())
        {
            MIGRAPHX_ASSERT(i == compute_index(i));
            return i;
        }
        else
        {
            return compute_index(i);
        }
    }

    constexpr index_int compute_index(index_int i) const
    {
        const auto rank  = this->lens.size();
        index_int s      = 1;
        index_int result = 0;
        for(index_int j = 0; j < rank; j++)
        {
            const index_int k      = rank - j - 1;
            const index_int stride = this->strides[k];
            const index_int len    = this->lens[k];
            const index_int slen   = s * len;
            const index_int idx    = (i % slen) / s;
            result += stride * idx;
            s = slen;
        }
        return result;
    }

    /// Convert single index into a multi-index
    constexpr index_array multi(index_int idx) const { return lens.multi(idx); }

    /// Convert multi-index into a single index
    constexpr index_int single(index_array idx) const
    {
        if(idx.empty())
            return 0;
        return inner_product(lens.begin() + 1, lens.end(), idx.begin(), idx.back());
    }

    constexpr shape get_shape() const { return *this; }

    template <class... Ts>
    friend constexpr bool operator==(const shape& x, const shape<Ts...>& y)
    {
        return x.lens == y.lens and x.strides == y.strides;
    }

    template <class Stream>
    friend constexpr const Stream& operator<<(const Stream& ss, const shape& s)
    {
        ss << "{" << s.lens << "}, {" << s.strides << "}";
        return ss;
    }
};

template <class Lens>
constexpr auto calculate_strides(Lens)
{
    return return_array_c([] {
        Lens lens{};
        array<typename Lens::value_type, Lens{}.size()> strides{1};
        const auto n     = lens.size() - 1;
        index_int stride = 1;
        for(index_int i = 0; i < n; i++)
        {
            auto ri = n - i;
            stride *= lens[ri];
            strides[ri - 1] = stride;
        }
        return strides;
    });
}

template <class Lens, class Strides>
constexpr shape<Lens, Strides> make_shape(Lens lens, Strides strides)
{
    return {lens, strides};
}

template <class Lens>
constexpr auto make_shape(Lens lens)
{
    return make_shape(lens, calculate_strides(lens));
}

template <class Shape, class Permutation>
constexpr auto reorder_shape(Shape, Permutation)
{
    constexpr auto lens = return_array_c([] { return reorder_dims(Shape{}.lens, Permutation{}); });
    constexpr auto strides =
        return_array_c([] { return reorder_dims(Shape{}.strides, Permutation{}); });
    return make_shape(lens, strides);
}

template <class Lens, class Permutation>
constexpr auto make_shape_from_permutation(Lens, Permutation)
{
    constexpr auto new_lens = reorder_dims(Lens{}, Permutation{});
    return reorder_shape(make_shape(new_lens), invert_permutation(Permutation{}));
}

template <class Shape>
constexpr auto make_packed_shape(Shape)
{
    constexpr auto s = Shape{};
    if constexpr(s.packed())
    {
        return s;
    }
    else
    {
        return make_shape_from_permutation(s.lens, find_permutation(s));
    }
}

} // namespace migraphx

#endif
