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
#ifndef MIGRAPHX_GUARD_OPERATORS_QUANTIZE_LINEAR_HPP
#define MIGRAPHX_GUARD_OPERATORS_QUANTIZE_LINEAR_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/par_for.hpp>
#include <migraphx/value.hpp>
#include <cmath>
#include <fenv.h>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {
struct quantizelinear
{
    std::string name() const { return "quantizelinear"; }
    std::optional<migraphx::shape::type_t> out_type;

    value attributes() const
    {
        // Note: point_op attribute is not used in this op. Instead, in
        // gpu compilation pipeline, rewrite_quantization will be invoked
        // from generate_pointwise() to rewrite this op.
        return {{"pointwise", true}};
    }

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.out_type, "out_type"));
    }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.same_dims().has(2, 3);
        if(inputs[0].type() != inputs[1].type())
        {
            MIGRAPHX_THROW("QUANTIZELINEAR: Scales and input must be the same type");
        }
        if(inputs.size() == 3)
        {
            return inputs[0].with_lens(inputs[2].type(), inputs[0].lens());
        }
        return inputs[0].with_lens(out_type.value_or(shape::uint8_type), inputs[0].lens());
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        auto x       = args.at(0);
        auto y_scale = args.at(1);
        std::vector<int8_t> zeros(output_shape.bytes(), 0);
        argument y_zero_point{output_shape, zeros.data()};
        if(args.size() == 3)
        {
            y_zero_point = args.at(2);
        }
        argument result{output_shape};
        auto rounding_mode = fegetround();
        fesetround(FE_TONEAREST);
        visit_all(result, y_zero_point)([&](auto output, auto zero_pts) {
            visit_all(x, y_scale)([&](auto input, auto scales) {
                using quant_type = typename decltype(output)::value_type;
                auto min_value   = std::numeric_limits<quant_type>::lowest();
                auto max_value   = std::numeric_limits<quant_type>::max();
                par_for(output_shape.elements(), [&](auto i) {
                    double quantized = static_cast<double>(std::nearbyint(input[i] / scales[i])) +
                                       static_cast<double>(zero_pts[i]);
                    output[i] = std::max(static_cast<double>(min_value),
                                         std::min(static_cast<double>(max_value), quantized));
                });
            });
        });
        fesetround(rounding_mode);
        return result;
    }
};
} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
