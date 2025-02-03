/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_KERNELS_ARGS_HPP
#define MIGRAPHX_GUARD_KERNELS_ARGS_HPP

#include <migraphx/kernels/types.hpp>
#include <migraphx/kernels/functional.hpp>

namespace migraphx {

// Use template specialization since ADL is broken on hcc
template <index_int>
struct make_tensor;

template <class F, index_int... Ns, class... Ts>
__device__ auto make_tensors_impl(F f, detail::seq<Ns...>, Ts*... xs)
{
    return f(make_tensor<Ns>::apply(xs)...);
}

inline __device__ auto make_tensors()
{
    return [](auto*... xs) {
        return [=](auto f) { return make_tensors_impl(f, detail::gens<sizeof...(xs)>{}, xs...); };
    };
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_ARGS_HPP
