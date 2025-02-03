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
#ifndef MIGRAPHX_GUARD_KERNELS_CK_GEMM_SOFTMAX_GEMM_HPP
#define MIGRAPHX_GUARD_KERNELS_CK_GEMM_SOFTMAX_GEMM_HPP

#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/algorithm.hpp>
#include <migraphx/kernels/integral_constant.hpp>
#include <migraphx/kernels/tensor_view.hpp>
#include <migraphx/kernels/ck.hpp>
#include <migraphx/kernels/gemm_batcher.hpp>

namespace migraphx {

template <class T>
struct ck_gemm_softmax_gemm_settings
{
    T scale{};
};

template <class... Ts>
constexpr ck_gemm_softmax_gemm_settings<Ts...> make_ck_gemm_softmax_gemm_settings(Ts... xs)
{
    return {xs...};
}

template <class G, class C, class A, class B, class B1, class Settings>
__device__ void ck_gemm_softmax_gemm_matrix(C c, A a, B b, B1 b1, Settings s)
{
    constexpr auto desc = G::make_descriptor(to_ck_tensor<A>(),
                                             to_ck_tensor<ck_transposeb<B>>(),
                                             to_ck_tensor<ck_transposeb<B1>>(),
                                             to_ck_tensor<C>());

    MIGRAPHX_STATIC_ASSERT_FOR(desc.IsValid())
    {
        G::Run(desc,
               s.scale,
               to_ck_const_pointer(a.data()),
               to_ck_const_pointer(b.data()),
               to_ck_const_pointer(b1.data()),
               to_ck_pointer(c.data()));
    }
}

template <class G, index_int BlocksPerBatch, class... Ts, class Settings>
__device__ void ck_gemm_softmax_gemm(Settings s, Ts... xs)
{
    gemm_batch_args(make_index(), _c<BlocksPerBatch>, xs...)(
        [&](auto... ys) { ck_gemm_softmax_gemm_matrix<G>(ys..., s); });
}

} // namespace migraphx
#endif
