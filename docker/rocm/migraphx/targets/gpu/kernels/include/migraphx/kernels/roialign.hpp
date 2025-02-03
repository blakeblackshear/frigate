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
#ifndef MIGRAPHX_GUARD_KERNELS_ROIALIGN_HPP
#define MIGRAPHX_GUARD_KERNELS_ROIALIGN_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/dfor.hpp>
#include <migraphx/kernels/ops.hpp>
#include <migraphx/kernels/math.hpp>
#include <migraphx/kernels/array.hpp>

namespace migraphx {

struct max_pool
{
    MIGRAPHX_DEVICE_CONSTEXPR auto init() { return lowest{}; }

    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR T operator()(T x, T y)
    {
        return max(x, y);
    }

    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR T final(T x, index_int)
    {
        return (x);
    }
};

struct avg_pool
{
    MIGRAPHX_DEVICE_CONSTEXPR auto init() { return 0.0; }

    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR T operator()(T x, T y)
    {
        return x + y;
    }

    template <class T>
    MIGRAPHX_DEVICE_CONSTEXPR T final(T x, index_int y)
    {
        return (y == 0) ? T{0.0} : T{x / y};
    }
};

template <class Iterator, class Op>
MIGRAPHX_DEVICE_CONSTEXPR typename Iterator::value_type bilinear_interpolate(
    const Iterator data, const array<index_int, 2>& dims, array<float, 2> xy, Op pooling)
{
    array<int, 2> low{};
    array<int, 2> high{};
    for(index_int ii = 0; ii < xy.size(); ++ii)
    {
        if(xy[ii] < -1.0f or xy[ii] > dims[ii])
        {
            return implicit_conversion(0);
        }

        xy[ii]   = migraphx::max(xy[ii], 0.0f);
        low[ii]  = xy[ii];
        high[ii] = low[ii] + 1;
        if(low[ii] >= dims[ii] - 1)
        {
            xy[ii] = high[ii] = low[ii] = dims[ii] - 1;
        }
    }
    array<index_int, 4> locs = {low[0] * dims[1] + low[1],
                                low[0] * dims[1] + high[1],
                                high[0] * dims[1] + low[1],
                                high[0] * dims[1] + high[1]};

    float ly = xy[0] - low[0];
    float lx = xy[1] - low[1];
    float hy = 1.0f - ly;
    float hx = 1.0f - lx;
    // do calculations in floating point and convert final result to required type
    array<float, 4> ws = {hy * hx, hy * lx, ly * hx, ly * lx};

    auto v01 = pooling(data[locs[0]] * ws[0], data[locs[1]] * ws[1]);
    auto v23 = pooling(data[locs[2]] * ws[2], data[locs[3]] * ws[3]);
    return implicit_conversion(pooling(v01, v23));
}

template <class Iterator, class Op>
MIGRAPHX_DEVICE_CONSTEXPR auto calc_pooling(const Iterator& data,
                                            const array<float, 2>& roi_starts,
                                            const array<float, 2>& bin_size,
                                            const array<int, 2>& idx,
                                            const array<index_int, 2>& bin_grid_size,
                                            const array<index_int, 2>& dims,
                                            float roi_offset,
                                            Op op)
{
    using in_dtype      = typename Iterator::value_type;
    in_dtype output_val = in_dtype{op.init()};
    const int64_t count = bin_grid_size[0] * bin_grid_size[1];
    dfor(bin_grid_size[0], bin_grid_size[1])([&](auto iy, auto ix) {
        array<index_int, 2> id = {iy, ix};
        array<float, 2> locs =
            roi_starts + idx * bin_size + bin_size * (id + 0.5f) / bin_grid_size + roi_offset;

        auto val   = bilinear_interpolate(data, dims, locs, op);
        output_val = op(output_val, val);
    });
    return op.final(output_val, count);
}

template <class T1, class T2, class T3, class T4>
struct roalign_settings
{
    T1 roi_offset{};
    T2 is_avg_pooling{};
    T3 sampling_ratio{};
    T4 spatial_scale{};
};

template <class... Ts>
constexpr roalign_settings<Ts...> make_roalign_settings(Ts... xs)
{
    return {xs...};
}

template <class T, class U, class V, class W, class Settings>
__device__ void roialign(const T& x_t, const U& rois_t, const V& ind_t, W& y_t, Settings s)
{
    auto index      = make_index();
    const auto x    = x_t.begin();
    const auto rois = rois_t.begin();
    const auto ind  = ind_t.begin();
    // input shape
    auto x_lens      = x_t.get_shape().lens;
    auto channel_num = x_lens[1];
    // input dims of height and width, in all 2-dim arrays, the first dim
    // is for height and second dim is for width
    array<index_int, 2> in_dims = {x_lens[2], x_lens[3]};

    const auto stride   = index.nglobal();
    auto out_s          = y_t.get_shape();
    auto roi_column_num = rois_t.get_shape().lens[1];

    // output dims of height and width, in all 2-dim arrays, the first dim
    // is for height and second dim is for width
    const auto& out_lens         = out_s.lens;
    array<index_int, 2> out_dims = {out_lens[2], out_lens[3]};

    for(index_int i = index.global; i < out_s.elements(); i += stride)
    {
        auto idx = out_s.multi(i);
        int n    = idx[0];
        int c    = idx[1];
        int ph   = idx[2];
        int pw   = idx[3];

        const auto offset_rois = rois + (n * roi_column_num);
        const int batch_ind    = ind[n];

        array<float, 2> roi_starts = {
            static_cast<float>(offset_rois[1]) * static_cast<float>(s.spatial_scale),
            static_cast<float>(offset_rois[0]) * static_cast<float>(s.spatial_scale)};
        array<float, 2> roi_ends = {
            static_cast<float>(offset_rois[3]) * static_cast<float>(s.spatial_scale),
            static_cast<float>(offset_rois[2]) * static_cast<float>(s.spatial_scale)};

        array<float, 2> roi_size{};
        array<float, 2> bin_size{};
        array<index_int, 2> bin_grid_size{};

        for(index_int ii = 0; ii < roi_size.size(); ++ii)
        {
            roi_size[ii] = roi_ends[ii] - roi_starts[ii];
            roi_size[ii] = migraphx::max(roi_size[ii], 1.0f);

            bin_size[ii]      = roi_size[ii] / out_dims[ii];
            bin_grid_size[ii] = (s.sampling_ratio > 0)
                                    ? s.sampling_ratio
                                    : migraphx::ceil(roi_size[ii] / out_dims[ii]);
        }

        const auto offset_x = x + ((batch_ind * channel_num + c) * in_dims[0] * in_dims[1]);
        if constexpr(s.is_avg_pooling)
        {
            y_t[i] = calc_pooling(offset_x,
                                  roi_starts,
                                  bin_size,
                                  {ph, pw},
                                  bin_grid_size,
                                  in_dims,
                                  s.roi_offset,
                                  avg_pool{});
        }
        else
        {
            y_t[i] = calc_pooling(offset_x,
                                  roi_starts,
                                  bin_size,
                                  {ph, pw},
                                  bin_grid_size,
                                  in_dims,
                                  s.roi_offset,
                                  max_pool{});
        }
    }
}

} // namespace migraphx
#endif
