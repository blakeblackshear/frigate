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
#ifndef MIGRAPHX_GUARD_GPU_GEMM_SOFTMAX_GEMM_HPP
#define MIGRAPHX_GUARD_GPU_GEMM_SOFTMAX_GEMM_HPP

#include <migraphx/make_op.hpp>
#include <migraphx/check_shapes.hpp>
#include <sstream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct gemm_softmax_gemm
{
    operation op = make_op("dot");
    float scale  = 1.0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.op, "op"), f(self.scale, "scale"));
    }

    std::string name() const { return "gpu::gemm_softmax_gemm"; }

    void check_gemm_shape(const shape& s) const
    {
        if(not contains(range(s.strides().rbegin(), s.strides().rbegin() + 3), 1) and
           not s.scalar())
            MIGRAPHX_THROW("Invalid shape for " + name());
    }

    shape compute_shape(std::vector<shape> inputs, const std::vector<module_ref>&) const
    {
        check_shapes{inputs, *this}.same_ndims();
        if(inputs.size() < 3)
            MIGRAPHX_THROW(name() + ": Expected 3 inputs but got " + to_string(inputs.size()));

        const bool is_bias_enabled = inputs.size() == 4;
        const bool is_mul_where    = inputs.size() == 5;
        auto a                     = inputs[0];
        auto b                     = inputs[1];
        auto b1                    = inputs.back();

        for(const auto& input : inputs)
        {
            check_gemm_shape(input);
        }
        auto gemm0_shape = op.compute_shape({a, b});
        if(is_mul_where)
        {
            auto select_cond  = inputs[2];
            auto select_const = inputs[3];
            if(select_cond.lens() != select_const.lens())
            {
                std::stringstream err_msg;
                err_msg << name() << ": has inconsistent where op condition and constant size: "
                        << select_cond << "!=" << select_const;
                MIGRAPHX_THROW(err_msg.str());
            }
            if(select_cond.lens() != gemm0_shape.lens())
            {
                std::stringstream err_msg;
                err_msg << name() << ": has inconsistent where op condition size"
                        << ". Expected: " << gemm0_shape << ". Given: " << select_cond;
                MIGRAPHX_THROW(err_msg.str());
            }
        }
        if(is_bias_enabled)
        {
            auto bias_shape = inputs[2];
            if(bias_shape.lens() != gemm0_shape.lens())
            {
                std::stringstream err_msg;
                err_msg << name() << ": has inconsistent bias size"
                        << ". Expected: " << gemm0_shape << ". Given: " << bias_shape;
                MIGRAPHX_THROW(err_msg.str());
            }
        }

        return op.compute_shape({gemm0_shape, b1});
    }

    static bool is_ck_supported_type(shape::type_t t) { return contains({shape::half_type}, t); }
    static bool is_mlir_supported_type(shape::type_t t)
    {
        return contains({shape::type_t::float_type, shape::half_type}, t);
    }
};

} // namespace gpu

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_GPU_GEMM_SOFTMAX_GEMM_HPP
