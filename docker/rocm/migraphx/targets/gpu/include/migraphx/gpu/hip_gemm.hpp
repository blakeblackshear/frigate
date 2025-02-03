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
#ifndef MIGRAPHX_GUARD_RTGLIB_GPU_HIP_GEMM_HPP
#define MIGRAPHX_GUARD_RTGLIB_GPU_HIP_GEMM_HPP

#include <migraphx/errors.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/value.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/reflect.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/hip_gemm_impl.hpp>
#include <migraphx/op/quant_dot.hpp>
#include <migraphx/op/dot.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct context;
void blas_shape_hip(const shape& s);
shape transpose_batch_hip(const shape& s, unsigned trans_batch);

template <class Op>
struct hip_gemm
{
    Op op;
    float alpha          = 1;
    float beta           = 0;
    unsigned trans_batch = 0;
    int32_t solution_idx = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack_join(migraphx::reflect(self.op, f),
                         pack(f(self.alpha, "alpha"),
                              f(self.beta, "beta"),
                              f(self.trans_batch, "trans_batch"),
                              f(self.solution_idx, "solution_idx")));
    }

    std::string name() const
    {
        if(contains(op.name(), "quant_"))
        {
            return "gpu::hip_quant_gemm";
        }
        return "gpu::hip_gemm";
    }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        std::vector<shape> in_shapes(inputs);
        in_shapes.pop_back();
        in_shapes.pop_back();
        // When input shapes are A, B, C the GEMM equation is  C  =  α AB+ β C   where α, β are
        // scalars
        check_shapes{in_shapes, *this}.has(2, 3);
        blas_shape_hip(inputs[0]);
        blas_shape_hip(inputs[1]);
        // if gemm and add are fused
        if(in_shapes.size() > 2)
        {
            auto cmat_shape = in_shapes.back();
            check_shapes{{cmat_shape}, *this}.not_transposed().not_broadcasted();
            in_shapes.pop_back();
            blas_shape_hip(cmat_shape);
            auto op_out_shape = op.compute_shape(in_shapes);
            if(cmat_shape.lens() != op_out_shape.lens())
            {
                MIGRAPHX_THROW(this->name() + " : dimension mismatch, operand C: {" +
                               to_string_range(cmat_shape.lens()) +
                               "}, cannot add to operand A * B: {" +
                               to_string_range(op_out_shape.lens()) + "}");
            }
            if(cmat_shape.type() != op_out_shape.type())
            {
                MIGRAPHX_THROW(this->name() + " : operand C type mismatch, operand C is of type: " +
                               to_string(cmat_shape.type()) +
                               ", it must be: " + to_string(op_out_shape.type()));
            }
            return transpose_batch_hip(op_out_shape, trans_batch);
        }

        return transpose_batch_hip(op.compute_shape(in_shapes), trans_batch);
    }

    argument
    compute(context& ctx, const shape& output_shape, const std::vector<argument>& args) const
    {
        hip_gemm_compute(ctx, output_shape, args, alpha, beta, solution_idx);
        return args.back();
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }

    void finalize(context& ctx, const shape& output_shape, const std::vector<shape>& input_shapes)
    {
        if(solution_idx == 0)
            solution_idx = hip_gemm_default_solution(ctx, output_shape, input_shapes);
        if(enabled(MIGRAPHX_ENABLE_HIP_GEMM_TUNING{}) or ctx.get_exhaustive_tune_flag())
        {
            solution_idx =
                hip_gemm_finalize(ctx, output_shape, input_shapes, alpha, beta, solution_idx);
        }
    }

    value
    compile(migraphx::context& ctx, const shape& output, const std::vector<shape>& input_shapes)
    {
        finalize(any_cast<migraphx::gpu::context>(ctx), output, input_shapes);
        size_t ws = hip_gemm_workspace_size(
            any_cast<migraphx::gpu::context>(ctx), output, input_shapes, alpha, beta, solution_idx);
        return {{"workspace", ws}};
    }
};
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_RTGLIB_GPU_HIP_GEMM_HPP
