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
#ifndef MIGRAPHX_GUARD_OPERATORS_ROIALIGN_HPP
#define MIGRAPHX_GUARD_OPERATORS_ROIALIGN_HPP

#include <limits>
#include <migraphx/check_shapes.hpp>
#include <migraphx/op/common.hpp>
#include <migraphx/config.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/dfor.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/shape_for_each.hpp>
#include <array>
#include <cmath>
#include <numeric>
#include <utility>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct roialign
{
    std::string coord_trans_mode = "half_pixel";
    pooling_mode mode            = {pooling_mode::average};
    int64_t output_height        = 1;
    int64_t output_width         = 1;
    int64_t sampling_ratio       = 0;
    float spatial_scale          = 1.0f;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.coord_trans_mode, "coordinate_transformation_mode"),
                    f(self.mode, "mode"),
                    f(self.output_height, "output_height"),
                    f(self.output_width, "output_width"),
                    f(self.sampling_ratio, "sampling_ratio"),
                    f(self.spatial_scale, "spatial_scale"));
    }

    std::string name() const { return "roialign"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(3);
        auto x_lens   = inputs.at(0).lens();
        auto roi_lens = inputs.at(1).lens();
        auto bi_lens  = inputs.at(2).lens();
        auto type     = inputs.at(0).type();

        // check input correct
        if(bi_lens.size() != 1)
        {
            MIGRAPHX_THROW("ROIALIGN: batch indices should be 1 dimension!");
        }

        if(roi_lens.size() != 2 or roi_lens.at(1) != 4)
        {
            MIGRAPHX_THROW(
                "ROIALIGN: rois should be 2 dimensions, and the second dim should be 4!");
        }

        if(roi_lens.front() != bi_lens.front())
        {
            MIGRAPHX_THROW("ROIALIGN: rois and batch indices inputs should have the same number!");
        }

        std::vector<std::size_t> out_lens = x_lens;
        out_lens[0]                       = roi_lens[0];
        out_lens[2]                       = output_height;
        out_lens[3]                       = output_width;

        return {type, out_lens};
    }

    struct pos_weight
    {
        // neighbor indices for the bilinear interpolation
        std::array<std::size_t, 4> pos = {0, 0, 0, 0};
        // neighbor weights for the bilinear interpolation
        std::array<float, 4> w = {0.0f, 0.0f, 0.0f, 0.0f};
    };

    auto calc_pos_weight(const std::array<std::size_t, 2>& dims,
                         const shape& comp_s,
                         const std::array<float, 2>& roi_start,
                         const std::array<float, 2>& bin_size,
                         const std::array<std::size_t, 2>& bin_grid_size) const
    {
        std::vector<pos_weight> results(bin_grid_size[0] * bin_grid_size[1] * output_height *
                                        output_width);
        shape_for_each(comp_s, [&](const auto& idx_v, size_t index) {
            std::array<std::size_t, 2> p = {idx_v[0], idx_v[1]};
            std::array<std::size_t, 2> i = {idx_v[2], idx_v[3]};

            std::array<float, 2> xy{};
            std::array<int64_t, 2> low{};
            std::array<int64_t, 2> high{};
            for(auto ii : range(p.size()))
            {
                xy[ii] = roi_start[ii] + p[ii] * bin_size[ii] +
                         (i[ii] + .5f) * bin_size[ii] / bin_grid_size[ii];
                xy[ii] = (coord_trans_mode == "half_pixel") ? (xy[ii] - 0.5f) : xy[ii];
                if(xy[ii] < -1.0 or xy[ii] > dims[ii])
                {
                    results[index] = pos_weight{};
                    return;
                }

                xy[ii]   = std::max(xy[ii], 0.0f);
                low[ii]  = xy[ii];
                high[ii] = low[ii] + 1;
                if(low[ii] >= dims[ii] - 1)
                {
                    xy[ii] = high[ii] = low[ii] = dims[ii] - 1;
                }
            }

            results[index].pos = {low[0] * dims[1] + low[1],
                                  low[0] * dims[1] + high[1],
                                  high[0] * dims[1] + low[1],
                                  high[0] * dims[1] + high[1]};

            float ly = xy[0] - low[0];
            float lx = xy[1] - low[1];
            float hy = 1.0f - ly;
            float hx = 1.0f - lx;

            // save weights and indeces
            results[index].w = {hy * hx, hy * lx, ly * hx, ly * lx};
        });

        return results;
    }

    struct max_pool
    {
        double init() { return std::numeric_limits<double>::lowest(); }

        double operator()(double x, double y) { return std::max(x, y); }

        double final(double x, std::size_t) { return (x); }
    };

    struct avg_pool
    {
        double init() { return 0.0; }

        double operator()(double x, double y) { return x + y; }

        double final(double x, std::size_t y) { return (y == 0) ? 0.0 : (x / y); }
    };

    template <class T, class Op>
    std::tuple<double, int64_t> calc_pooling(const T& data,
                                             const std::array<std::size_t, 2>& bin_grid_size,
                                             const std::vector<pos_weight>& pos_weights,
                                             int64_t index,
                                             Op op) const
    {
        double output_val   = op.init();
        const int64_t count = bin_grid_size[0] * bin_grid_size[1];
        dfor(bin_grid_size[0], bin_grid_size[1])([&](auto, auto) {
            const auto& pc = pos_weights[index];
            std::array<double, 4> wv;
            std::transform(
                pc.w.begin(), pc.w.end(), pc.pos.begin(), wv.begin(), [&](auto w, auto pos) {
                    return *(data + pos) * w;
                });
            output_val = std::accumulate(wv.begin(), wv.end(), output_val, op);
            index += 1;
        });

        output_val = op.final(output_val, count);

        return {output_val, index};
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        const auto& out_lens = output_shape.lens();
        int64_t n_rois       = out_lens[0];
        std::size_t channels = out_lens[1];
        // output dims of height and width, in all 2-dim arrays, the first dim
        // is for height and second dim is for width
        std::array<std::size_t, 2> out_dims = {out_lens[2], out_lens[3]};
        const auto& x_lens                  = args.at(0).get_shape().lens();
        // input dims of height and width
        std::array<std::size_t, 2> in_dims = {x_lens[2], x_lens[3]};
        auto roi_s                         = args.at(1).get_shape();

        visit_all(result, args.at(0), args.at(1))([&](auto output, auto x, auto roi) {
            const auto* batch_indices = args.at(2).cast<int64_t>();
            par_for(n_rois, [&](auto n) {
                const auto bottom_data   = x.begin();
                const auto roi_batch_ind = batch_indices[n];
                // Do not using rounding; this implementation detail is critical
                std::array<float, 2> roi_starts = {
                    static_cast<float>(roi[roi_s.index({n, 1})] * spatial_scale),
                    static_cast<float>(roi[roi_s.index({n, 0})] * spatial_scale)};
                std::array<float, 2> roi_ends = {
                    static_cast<float>(roi[roi_s.index({n, 3})] * spatial_scale),
                    static_cast<float>(roi[roi_s.index({n, 2})] * spatial_scale)};

                // Force malformed ROIs to be 1x1
                std::array<float, 2> roi_size{};
                std::array<float, 2> bin_size{};
                std::array<std::size_t, 2> bin_grid_size{};

                for(auto ii : range(roi_size.size()))
                {
                    roi_size[ii] = roi_ends[ii] - roi_starts[ii];
                    roi_size[ii] = std::max(roi_size[ii], 1.0f);

                    bin_size[ii]      = roi_size[ii] / out_dims[ii];
                    bin_grid_size[ii] = (sampling_ratio > 0)
                                            ? sampling_ratio
                                            : std::ceil(roi_size[ii] / out_dims[ii]);
                }

                // we want to precalculate indices and weights shared by all channels,
                // this is the key point of optimization
                std::vector<std::size_t> comp_lens = {
                    out_dims[0], out_dims[1], bin_grid_size[0], bin_grid_size[1]};
                shape comp_s{shape::float_type, comp_lens};
                auto pre_calc =
                    this->calc_pos_weight(in_dims, comp_s, roi_starts, bin_size, bin_grid_size);

                std::vector<std::size_t> comp_lens1 = {channels, out_dims[0], out_dims[1]};
                shape comp_s1{migraphx::shape::float_type, comp_lens1};
                std::vector<int64_t> vec_index(channels, 0);
                shape_for_each(comp_s1, [&](const auto& idx) {
                    auto c  = idx[0];
                    auto ph = idx[1];
                    auto pw = idx[2];

                    const auto offset_bottom_data =
                        bottom_data + static_cast<int64_t>((roi_batch_ind * channels + c) *
                                                           in_dims[0] * in_dims[1]);
                    double output_val;
                    std::tie(output_val, vec_index[c]) =
                        (mode == migraphx::op::pooling_mode::average)
                            ? this->calc_pooling(offset_bottom_data,
                                                 bin_grid_size,
                                                 pre_calc,
                                                 vec_index[c],
                                                 avg_pool{})
                            : this->calc_pooling(offset_bottom_data,
                                                 bin_grid_size,
                                                 pre_calc,
                                                 vec_index[c],
                                                 max_pool{});
                    output(n, c, ph, pw) = output_val;
                });
            });
        });

        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
