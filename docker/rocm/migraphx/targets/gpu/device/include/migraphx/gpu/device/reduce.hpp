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

#ifndef MIGRAPHX_GUARD_RTGLIB_DEVICE_REDUCE_HPP
#define MIGRAPHX_GUARD_RTGLIB_DEVICE_REDUCE_HPP

#include <migraphx/gpu/device/launch.hpp>
#include <migraphx/gpu/device/visit.hpp>
#include <migraphx/gpu/device/multi_index.hpp>
#include <migraphx/gpu/device/reduce_ops.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

#ifdef MIGRAPHX_NO_DPP

template <index_int N,
          class Op,
          class T,
          class ForStride,
          class F,
          MIGRAPHX_REQUIRES(not std::is_integral<ForStride>{})>
__device__ auto block_reduce(index idx, Op op, T init, ForStride fs, F f)
{
    using type = decltype(f(deduce_for_stride(fs)));
    MIGRAPHX_DEVICE_SHARED type buffer[N];
    type x = init;
    fs([&](auto i) { x = op(x, f(i)); });
    buffer[idx.local] = x;
    __syncthreads();

    for(index_int s = 1; s < idx.nlocal(); s *= 2)
    {
        const index_int index = 2 * s * idx.local;
        if(index + s < idx.nlocal())
        {
            buffer[index] = op(buffer[index], buffer[index + s]);
        }
        __syncthreads();
    }
    return buffer[0];
}

#else
constexpr unsigned int dpp_row_shr(unsigned int x) { return 0x110u | x; }

constexpr unsigned int dpp_row_bcast(unsigned int x)
{
    unsigned int y = 0;
    switch(x)
    {
    case 15: y = 0x142; break;
    case 31: y = 0x143; break;
    default: throw std::runtime_error("Unknown bcast");
    }
    return y;
}

template <unsigned int DppCtrl,
          unsigned int RowMask  = 0xf,
          unsigned int BankMask = 0xf,
          bool BoundCtrl        = false,
          class T>
__device__ T dpp_mov(T& x)
{
    static const index_int n = sizeof(T) < 4 ? 1 : sizeof(T) / 4;
    union type
    {
        uint32_t reg[n];
        T data;
    };
    type output{};
    type input{};
    // cppcheck-suppress unreadVariable
    input.data = x;
    for(index_int i = 0; i < n; i++)
    {
        output.reg[i] = __hip_move_dpp(input.reg[i], DppCtrl, RowMask, BankMask, BoundCtrl);
    }
    return output.data;
}

template <class T, class Op>
__device__ void dpp_reduce(T& in, Op op)
{
    T out{};
    out = dpp_mov<dpp_row_shr(1)>(in);
    in  = op(in, out);
    out = dpp_mov<dpp_row_shr(2)>(in);
    in  = op(in, out);
    out = dpp_mov<dpp_row_shr(4), 0xf, 0xe>(in);
    in  = op(in, out);
    out = dpp_mov<dpp_row_shr(8), 0xf, 0xc>(in);
    in  = op(in, out);
#if __AMDGCN_WAVEFRONT_SIZE == 64
    out = dpp_mov<dpp_row_bcast(15), 0xa>(in);
    in  = op(in, out);
    out = dpp_mov<dpp_row_bcast(31), 0xc>(in);
    in  = op(in, out);
#endif
}

__device__ inline void dpp_reduce(float& x, sum)
{
#if defined(MIGRAPHX_USE_CLANG_TIDY) || defined(CPPCHECK)
    x = 1;
#else
    __asm__ volatile("s_nop 4\n"
                     "v_add_f32 %0 %0 %0 row_shr:1\n"
                     "s_nop 1\n"
                     "v_add_f32 %0 %0 %0 row_shr:2\n"
                     "s_nop 1\n"
                     "v_add_f32 %0 %0 %0 row_shr:4 bank_mask:0xe\n"
                     "s_nop 1\n"
                     "v_add_f32 %0 %0 %0 row_shr:8 bank_mask:0xc\n"
                     "s_nop 1\n"
#if __AMDGCN_WAVEFRONT_SIZE == 64
                     "v_add_f32 %0 %0 %0 row_bcast:15 row_mask:0xa\n"
                     "s_nop 1\n"
                     "v_add_f32 %0 %0 %0 row_bcast:31 row_mask:0xc\n"
#endif
                     "s_nop 1\n"
                     : "=v"(x)
                     : "0"(x));
#endif
}

template <index_int N,
          class Op,
          class T,
          class ForStride,
          class F,
          MIGRAPHX_REQUIRES(not std::is_integral<ForStride>{})>
__device__ auto block_reduce(index idx, Op op, T init, ForStride fs, F f)
{

#if __AMDGCN_WAVEFRONT_SIZE == 32
    constexpr index_int nthreads = 16;
#else
    constexpr index_int nthreads = 64;
#endif
    using type                   = decltype(f(deduce_for_stride(fs)));
    MIGRAPHX_DEVICE_SHARED type buffer[N / nthreads];
    type x = init;
    fs([&](auto i) { x = op(x, f(i)); });
    dpp_reduce(x, op);

    const auto ldsidx = idx.local / nthreads;
    if((idx.local % nthreads) == nthreads - 1)
    {
        buffer[ldsidx] = x;
    }
    __syncthreads();

    type y = init;
    for(index_int i = 0; i < idx.nlocal() / nthreads; i++)
    {
        y = op(y, buffer[i]);
    }
    return y;
}
#endif
template <index_int N, class Op, class T, class F>
__device__ auto block_reduce(index idx, Op op, T init, index_int n, F f)
{
    auto midx = make_multi_index(idx.local, idx.nlocal());
    // Workaround hcc, create a local array
    auto fs = midx.id;
    fs[0]   = n;
    return block_reduce<N>(
        idx, op, init, midx.for_stride(fs), [&](auto mi) __device__ { return f(mi[0]); });
}
constexpr index_int compute_block_size(index_int n, index_int max_block_size)
{
    size_t block_size = 64;
    while(block_size < max_block_size and block_size < n)
        block_size *= 2;
    return block_size;
}

inline std::vector<index_int> get_reduce_lens(const std::vector<size_t>& input_lens,
                                              const std::vector<size_t>& output_lens)
{
    std::vector<index_int> reduce_lens;
    std::transform(output_lens.begin(),
                   output_lens.end(),
                   input_lens.begin(),
                   std::back_inserter(reduce_lens),
                   [](auto x, auto y) -> index_int {
                       if(x == y)
                           return 1;
                       else
                           return y;
                   });
    return reduce_lens;
}

template <class Op, class T, class Input, class Output>
void reduce_multi_impl(hipStream_t stream,
                       const argument& result,
                       const argument& arg,
                       Op op,
                       T init,
                       Input read_input,
                       Output read_output,
                       const shape& reduce_slice)
{
    hip_visit_all(result, arg, reduce_slice)([&](auto output, auto input, auto reduce_shape) {
        auto relements = reduce_slice.elements();

        const index_int max_block_size = 256;
        const index_int block_size     = compute_block_size(relements, max_block_size);
        mi_launch(stream, output.get_shape(), reduce_shape, block_size)(
            [=](auto idx, auto global, auto local) __device__ {
                global([&](auto i) __device__ {
                    auto r =
                        block_reduce<max_block_size>(idx, op, init, local, [&](auto j) __device__ {
                            return read_input(input[i + j]);
                        });
                    if(idx.local == 0)
                        output[i] = read_output(r);
                });
            });
    });
}

template <class Op, class T, class Input, class Output>
void reduce_standard_impl(hipStream_t stream,
                          const argument& result,
                          const argument& arg,
                          Op op,
                          T init,
                          Input read_input,
                          Output read_output,
                          index_int relements)
{
    hip_visit_all(result, arg)([&](auto output, auto input) {
        auto nelements = result.get_shape().elements();

        const index_int max_block_size = 256;
        const index_int block_size     = compute_block_size(relements, max_block_size);
        gs_launch(stream, nelements * block_size, block_size)([=](auto i, auto idx) __device__ {
            const auto out_idx  = i / block_size;
            const auto base_idx = out_idx * relements;
            auto r = block_reduce<max_block_size>(idx, op, init, relements, [&](auto j) __device__ {
                return read_input(input.data()[base_idx + j]);
            });
            if(idx.local == 0)
                output.data()[out_idx] = read_output(r);
        });
    });
}

template <class Op, class T, class Input, class Output>
void reduce(hipStream_t stream,
            const argument& result,
            const argument& arg,
            Op op,
            T init,
            Input read_input,
            Output read_output)
{
    auto&& output_shape = result.get_shape();
    auto&& input_shape  = arg.get_shape();
    auto input_lens     = input_shape.lens();
    auto output_lens    = output_shape.lens();
    assert(output_lens.size() == input_lens.size());
    if(input_shape.standard() and output_shape.standard() and
       output_lens.back() != input_lens.back() and
       std::equal(output_lens.begin(), std::prev(output_lens.end()), input_lens.begin()))
    {
        reduce_standard_impl(
            stream, result, arg, op, init, read_input, read_output, input_lens.back());
    }
    else
    {
        std::vector<index_int> reduce_lens = get_reduce_lens(input_lens, output_lens);
        shape reduce_slice{output_shape.type(), reduce_lens};
        reduce_multi_impl(stream, result, arg, op, init, read_input, read_output, reduce_slice);
    }
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif // MIGRAPHX_NO_DPP
