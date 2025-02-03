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

#ifndef MIGRAPHX_GUARD_OPERATORS_RESIZE_HPP
#define MIGRAPHX_GUARD_OPERATORS_RESIZE_HPP

#include <array>
#include <migraphx/check_shapes.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/streamutils.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/config.hpp>
#include <cmath>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

/**
 * The Resize operation mirrors the Onnx Resize operation with some differences.
 * Currently, only Nearest mode is supported.  "Axes" and "ROI" attributes not recognized.
 *
 * Accepts either one or two runtime inputs.
 * Input 0 - data to be resized
 * Input 1 - sizes or scales.  If data type is uint64, Input 1 is interpreted as output sizes;
 *           otherwise as scaling factors.
 *
 * If the second input is not used, either a "sizes" or "scales" attribute must be
 * provided.
 */
struct resize
{
    // Selects one of several integer rounding rules for use with Nearest mode.
    //
    // Returns a lambda that returns size_t.
    static auto& get_nearest_op(const std::string& near_mode)
    {
        using nearest_op = std::function<std::size_t(std::size_t, double)>;
        static std::unordered_map<std::string, nearest_op> const nearest_ops = {
            {"round_prefer_floor",
             [=](std::size_t d_in, double val) {
                 val = std::max(0.0, std::min(d_in - 1.0, val));
                 return static_cast<std::size_t>(std::ceil((val - 0.5)));
             }},
            {"round_prefer_ceil",
             [=](std::size_t d_in, double val) {
                 val = std::max(0.0, std::min(d_in - 1.0, val));
                 return static_cast<std::size_t>(std::round((val)));
             }},
            {"floor",
             [=](std::size_t d_in, double val) {
                 val = std::max(0.0, std::min(d_in - 1.0, val));
                 return static_cast<std::size_t>(std::floor((val)));
             }},
            {"ceil", [=](std::size_t d_in, double val) {
                 val = std::max(0.0, std::min(d_in - 1.0, val));
                 return static_cast<std::size_t>(std::ceil((val)));
             }}};

        if(not contains(nearest_ops, near_mode))
        {
            MIGRAPHX_THROW("RESIZE: nearest_mode " + near_mode + " not supported!");
        }

        return nearest_ops.at(near_mode);
    }

    // Selects one of several rules for converting a coordinate by a scaling factor.
    // These rules differ in how they account for subpixel distances and end
    // values.  They apply to all modes.
    //
    // Returns a lambda that returns double.
    static auto& get_original_idx_op(const std::string& s_mode)
    {
        using original_idx_op =
            std::function<double(std::size_t, std::size_t, std::size_t, double)>;
        static std::unordered_map<std::string, original_idx_op> const idx_ops = {
            {"half_pixel",
             [=](std::size_t, std::size_t, std::size_t idx, double scale) {
                 return (idx + 0.5) / scale - 0.5;
             }},
            {"pytorch_half_pixel",
             [=](std::size_t, std::size_t l_out, std::size_t idx, double scale) {
                 return l_out > 1 ? (idx + 0.5) / scale - 0.5 : 0.0;
             }},
            {"align_corners",
             [=](std::size_t l_in, std::size_t l_out, std::size_t idx, double) {
                 return (l_out == 1) ? 0.0 : (1.0 * idx * (l_in - 1.0) / (l_out - 1.0));
             }},
            {"asymmetric",
             [=](std::size_t, std::size_t, std::size_t idx, double scale) { return idx / scale; }},
            {"tf_half_pixel_for_nn", [=](std::size_t, std::size_t, std::size_t idx, double scale) {
                 return (idx + 0.5) / scale;
             }}};

        if(not contains(idx_ops, s_mode))
        {
            MIGRAPHX_THROW("RESIZE: coordinate_transformation_mode " + s_mode + " not supported!");
        }

        return idx_ops.at(s_mode);
    }

    std::vector<float> scales;
    std::vector<size_t> sizes;
    // what integer rounding rule to use with Nearest mode.
    std::string nearest_mode{"floor"};
    // Resizing modes.  1: nearest 2: bilinear/linear 3: cubic
    // Only "nearest" currently supported.
    std::string mode{"nearest"};
    // What floating-point conversion rule to use (any resizing mode)
    std::string coordinate_transformation_mode;

    std::string name() const { return "resize"; }

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.scales, "scales"),
                    f(self.sizes, "sizes"),
                    f(self.nearest_mode, "nearest_mode"),
                    f(self.mode, "mode"),
                    f(self.coordinate_transformation_mode, "coordinate_transformation_mode"));
    }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1, 2);

        if(mode != "nearest")
            MIGRAPHX_THROW("RESIZE: Only Nearest mode is supported");

        // Inputs are X, sizes or scale, ROI and axes not supported.
        if(inputs.size() == 1)
        {
            if(inputs.front().dynamic())
            {
                // Not supported at this point--needs different validity checking
                MIGRAPHX_THROW("RESIZE: Single dynamic input not supported");
            }
            auto input_s = inputs.front();
            // No size/scale input.  Size/scale must be an attribute and so output will be static.
            if((sizes.empty()) == (scales.empty()))
                MIGRAPHX_THROW(
                    "RESIZE: One and only one of sizes or scales attributes must be given");
            if(not sizes.empty())
            {
                if(sizes.size() != input_s.ndim())
                    MIGRAPHX_THROW("RESIZE: sizes attribute's size must match rank of input X");
                return shape{input_s.type(), sizes};
            }
            else
            {
                if(scales.size() != input_s.ndim())
                    MIGRAPHX_THROW("RESIZE: scales attribute's size must match rank of input X");
                std::vector<size_t> lens;
                std::transform(scales.begin(),
                               scales.end(),
                               input_s.lens().begin(),
                               std::back_inserter(lens),
                               [](auto scale_i, size_t in_len) {
                                   return static_cast<size_t>(scale_i * in_len);
                               });
                return shape{input_s.type(), lens};
            }
        }
        else
        {
            // 2 inputs: 2nd sets sizes/scales for output.
            if(inputs.back().ndim() != 1)
                MIGRAPHX_THROW("RESIZE: size/scale input must have rank 1");
            if(inputs.back().dynamic())
                MIGRAPHX_THROW("RESIZE: size/scale input must have static shape");

            if(inputs.front().ndim() != inputs.back().lens()[0])
                MIGRAPHX_THROW("RESIZE: size/scale input's size must match rank of input X");

            // Note:  a shape with {0, max_val} ranges can't really be allocated.  For the reference
            // target, this doesn't matter because the real output shape is determined in the
            // compute() method.  For any other target, there must be a compiler pass that replaces
            // this operation with a fixed-size output at runtime.
            std::size_t max_val = std::numeric_limits<std::size_t>::max();
            std::vector<shape::dynamic_dimension> dyn_dims(inputs.back().lens().at(0),
                                                           shape::dynamic_dimension{0, max_val});
            return {inputs.front().type(), dyn_dims};
        }
    }

    argument compute(const migraphx::shape&, std::vector<argument> args) const
    {
        auto in_lens = args[0].get_shape().lens();
        std::vector<size_t> out_lens(in_lens.size());

        // Scales are either given, or calculated from output shape
        std::vector<float> vec_scale(in_lens.size(), 1.0f);

        if(args.size() == 1)
        {
            // single input argument; sizes or scales is constant.
            // In practice, the input is never a dynamic shape.
            if(not sizes.empty())
            {
                out_lens = sizes;
                // compute scales
                std::transform(out_lens.begin(),
                               out_lens.end(),
                               in_lens.begin(),
                               vec_scale.begin(),
                               [](size_t out_len, size_t in_len) {
                                   return (in_len == 0 ? 1.f
                                                       : static_cast<float>(out_len) / in_len);
                               });
            }
            else
            {
                vec_scale = this->scales;
                // compute output sizes
                std::transform(in_lens.begin(),
                               in_lens.end(),
                               scales.begin(),
                               out_lens.begin(),
                               [](size_t in_len, auto scale_i) {
                                   return static_cast<size_t>(scale_i * in_len);
                               });
            }
        }
        else
        {
            // 2 inputs; 2nd input is either sizes or scales.
            // First input may be dynamic.
            args[1].visit([&](auto input) {
                using type = typename decltype(input)::value_type;
                if constexpr(std::is_integral<type>{})
                {
                    // Copy the output size from args[1].
                    std::copy(input.begin(), input.end(), out_lens.begin());
                    // Deduce the scales for each axis
                    std::transform(
                        input.begin(),
                        input.end(),
                        in_lens.begin(),
                        vec_scale.begin(),
                        [](auto sz, size_t in_len) { return static_cast<float>(sz) / in_len; });
                }
                else
                {
                    // read the scale from args[1]
                    //
                    std::copy(input.begin(), input.end(), vec_scale.begin());
                    // compute the output dimensions from the given scales.  This computation
                    // always rounds down, unlike the internal computation in Nearest mode
                    // which has several options as given in nearest_mode.
                    std::transform(input.begin(),
                                   input.end(),
                                   in_lens.begin(),
                                   out_lens.begin(),
                                   [](auto scale_i, size_t in_len) {
                                       return static_cast<size_t>(scale_i * in_len);
                                   });
                }
            });
        }

        shape output_shape = {args[0].get_shape().type(), out_lens};
        argument result{output_shape};
        auto nearest_op = get_nearest_op(nearest_mode);
        auto idx_op     = get_original_idx_op(coordinate_transformation_mode);

        // Populate each element in output by selecting "nearest" item in input.
        visit_all(result, args[0])([&](auto output, auto data) {
            migraphx::shape out_comp_shape{data.get_shape().type(), out_lens};
            shape_for_each(out_comp_shape, [&](const auto& out_idx_v, size_t out_idx) {
                std::vector<size_t> in_idx(out_idx_v.size());
                for(auto ii = 0; ii < out_idx_v.size(); ++ii)
                {
                    auto idx_val = idx_op(in_lens[ii], out_lens[ii], out_idx_v[ii], vec_scale[ii]);
                    in_idx[ii]   = nearest_op(in_lens[ii], idx_val);
                }
                output[out_idx] = data(in_idx.begin(), in_idx.end());
            });
        });
        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
