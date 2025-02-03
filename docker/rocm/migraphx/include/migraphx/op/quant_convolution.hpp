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
#ifndef MIGRAPHX_GUARD_OPERATORS_QUANT_CONVOLUTION_HPP
#define MIGRAPHX_GUARD_OPERATORS_QUANT_CONVOLUTION_HPP

#include <migraphx/op/common.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/config.hpp>
#include <migraphx/convolution.hpp>
#include <migraphx/value.hpp>
#include <migraphx/fp8_types.hpp>
#include <cmath>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct quant_convolution
{
    std::vector<std::size_t> padding  = {0, 0};
    std::vector<std::size_t> stride   = {1, 1};
    std::vector<std::size_t> dilation = {1, 1};

    padding_mode_t padding_mode = default_;
    int group                   = 1;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.padding, "padding"),
                    f(self.stride, "stride"),
                    f(self.dilation, "dilation"),
                    f(self.padding_mode, "padding_mode"),
                    f(self.group, "group"));
    }

    value attributes() const
    {
        return {{"general_data_type", "convolution"}, {"normalize_padding", "padding"}};
    }

    std::string name() const { return "quant_convolution"; }

    void check_attribute_size() const
    {
        if((padding.size() != stride.size() and (padding.size() / 2) != stride.size()) or
           stride.size() != dilation.size())
        {
            MIGRAPHX_THROW("QUANT_CONVOLUTION: inconsistent attribute sizes");
        }
    }

    shape normalize_compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(2).same_type().same_ndims().min_ndims(3);
        check_attribute_size();

        const shape& input   = inputs.at(0);
        const shape& weights = inputs.at(1);
        auto t               = input.type();
        size_t kdims         = input.lens().size() - 2;
        if(kdims != this->kdims())
        {
            MIGRAPHX_THROW("quant_convolution: input k-dims does not match attribute size");
        }

        // all input type must be int8_type or fp8 types
        // output should be float_type
        std::set<migraphx::shape::type_t> supported_types = fp8_types{}.get();
        supported_types.insert(shape::int8_type);
        if(not contains(supported_types, t))
        {
            MIGRAPHX_THROW("QUANT_CONVOLUTION: only accept input and weights of type int8 or fp8");
        }

        std::vector<size_t> output_lens{input.lens()[0], weights.lens()[0]};
        auto padding_size = padding.size();
        for(size_t i = 0; i < kdims; i++)
        {
            auto padding_factor = 2 * padding[i];
            if(padding_size == 2 * kdims)
                padding_factor = padding[i] + padding[i + kdims];
            output_lens.push_back(std::size_t(std::max<std::ptrdiff_t>(
                1,
                (input.lens()[i + 2] - (1 + dilation[i] * (weights.lens()[i + 2] - 1)) +
                 padding_factor) /
                        stride[i] +
                    1)));
        }
        if(t == shape::int8_type)
        {
            return inputs[0].with_lens(shape::int32_type, output_lens);
        } // else fp8 conv
        return inputs[0].with_lens(shape::float_type, output_lens);
    }

    size_t kdims() const
    {
        check_attribute_size();
        return stride.size();
    }

    argument compute(shape output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        result.visit([&](auto output) {
            visit_all(args[0], args[1])([&](auto input, auto weights) {
                migraphx::convolution(output, input, weights, padding, stride, dilation, group);
            });
        });
        return result;
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
