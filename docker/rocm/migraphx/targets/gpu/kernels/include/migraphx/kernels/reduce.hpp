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
#ifndef MIGRAPHX_GUARD_KERNELS_REDUCE_HPP
#define MIGRAPHX_GUARD_KERNELS_REDUCE_HPP

#include <migraphx/kernels/dpp.hpp>
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/tensor_view.hpp>
#include <migraphx/kernels/ops.hpp>
#include <migraphx/kernels/scatter_reduction_modes.hpp>
#include <migraphx/kernels/tuple.hpp>
#include <migraphx/kernels/pp.hpp>

namespace migraphx {

#if MIGRAPHX_HAS_DPP

template <unsigned int SubWaveSize, class T, class Op>
__device__ void dpp_reduce(T& in, Op op)
{
    static_assert(SubWaveSize <= MIGRAPHX_WAVEFRONTSIZE, "Too large subwave size");
    static_assert(is_power_of_2(SubWaveSize), "SubWaveSize is not a power of 2");
    if constexpr(SubWaveSize > 1)
    {
        auto out = dpp_mov<dpp_row_shr(1)>(in);
        in       = op(in, out);
    }
    if constexpr(SubWaveSize > 2)
    {
        auto out = dpp_mov<dpp_row_shr(2)>(in);
        in       = op(in, out);
    }
    if constexpr(SubWaveSize > 4)
    {
        auto out = dpp_mov<dpp_row_shr(4), 0xf, 0xe>(in);
        in       = op(in, out);
    }
    if constexpr(SubWaveSize > 8)
    {
        auto out = dpp_mov<dpp_row_shr(8), 0xf, 0xc>(in);
        in       = op(in, out);
    }
#if MIGRAPHX_WAVEFRONTSIZE == 32
    if constexpr(SubWaveSize > 16)
    {
        auto out = dpp_swizzle<0x1e0>(in);
        in       = op(in, out);
    }
#else
    if constexpr(SubWaveSize > 16)
    {
        auto out = dpp_mov<dpp_row_bcast(15), 0xa>(in);
        in       = op(in, out);
    }
    if constexpr(SubWaveSize > 32)
    {
        auto out = dpp_mov<dpp_row_bcast(31), 0xc>(in);
        in       = op(in, out);
    }
#endif
}

#if defined(MIGRAPHX_USE_CLANG_TIDY) || defined(CPPCHECK)
// NOLINTNEXTLINE
#define MIGRAPHX_DPP_REDUCE_ASM_FUN(type, op, ins)   \
    template <unsigned int SubWaveSize>              \
    __device__ inline void dpp_reduce(type& x, op f) \
    {                                                \
        (void)f;                                     \
        x = 1;                                       \
    }
#else
#define MIGRAPHX_DPP_IIF64(then, ...) then
#define MIGRAPHX_DPP_IIF32(then, ...) __VA_ARGS__
#define MIGRAPHX_DPP_IF_64(x) MIGRAPHX_PP_CAT(MIGRAPHX_DPP_IIF, x)
#define MIGRAPHX_DPP_WHEN_64(x) MIGRAPHX_DPP_IF_64(x)(MIGRAPHX_PP_EXPAND, MIGRAPHX_PP_EAT)

#define MIGRAPHX_DPP_REDUCE_ASM0(ins) #ins " %0 %0 %0 row_shr:1\n"
#define MIGRAPHX_DPP_REDUCE_ASM1(ins) #ins " %0 %0 %0 row_shr:2\n"
#define MIGRAPHX_DPP_REDUCE_ASM2(ins) #ins " %0 %0 %0 row_shr:4 bank_mask:0xe\n"
#define MIGRAPHX_DPP_REDUCE_ASM3(ins) #ins " %0 %0 %0 row_shr:8 bank_mask:0xc\n"
#define MIGRAPHX_DPP_REDUCE_ASM4(ins) #ins " %0 %0 %0 row_bcast:15 row_mask:0xa\n"
#define MIGRAPHX_DPP_REDUCE_ASM5(ins) #ins " %0 %0 %0 row_bcast:31 row_mask:0xc\n"

#define MIGRAPHX_DPP_REDUCE_ASM_REPEAT(i, ins) \
    MIGRAPHX_PP_CAT(MIGRAPHX_DPP_REDUCE_ASM, i)(ins) "s_nop 1\n"
#define MIGRAPHX_DPP_REDUCE_ASM(n, x, ins, ...)                                                 \
    {                                                                                           \
        __asm__ volatile("s_nop 4\n" MIGRAPHX_PP_REPEAT(n, MIGRAPHX_DPP_REDUCE_ASM_REPEAT, ins) \
                         : "=v"(x)                                                              \
                         : "0"(x));                                                             \
        __VA_ARGS__                                                                             \
    }

#if MIGRAPHX_WAVEFRONTSIZE == 64
#define MIGRAPHX_DPP_REDUCE_SWIZZLE(x, f) (void)f;
#else
#define MIGRAPHX_DPP_REDUCE_SWIZZLE(x, f) \
    auto y = dpp_swizzle<0x1e0>(x);       \
    x      = f(x, y);
#endif

#define MIGRAPHX_DPP_REDUCE_ASM_FUN(type, op, ins)                                    \
    template <unsigned int SubWaveSize>                                               \
    __device__ inline void dpp_reduce(type& x, op f)                                  \
    {                                                                                 \
        if constexpr(SubWaveSize == 2)                                                \
            MIGRAPHX_DPP_REDUCE_ASM(0, x, ins, );                                     \
        if constexpr(SubWaveSize == 4)                                                \
            MIGRAPHX_DPP_REDUCE_ASM(1, x, ins, );                                     \
        if constexpr(SubWaveSize == 8)                                                \
            MIGRAPHX_DPP_REDUCE_ASM(2, x, ins, );                                     \
        if constexpr(SubWaveSize == 16)                                               \
            MIGRAPHX_DPP_REDUCE_ASM(3, x, ins, );                                     \
        if constexpr(SubWaveSize == 32)                                               \
            MIGRAPHX_DPP_REDUCE_ASM(MIGRAPHX_DPP_IF_64(MIGRAPHX_WAVEFRONTSIZE)(4, 3), \
                                    x,                                                \
                                    ins,                                              \
                                    MIGRAPHX_DPP_REDUCE_SWIZZLE(x, f));               \
        MIGRAPHX_DPP_WHEN_64(MIGRAPHX_WAVEFRONTSIZE)                                  \
        (if constexpr(SubWaveSize == 64) MIGRAPHX_DPP_REDUCE_ASM(5, x, ins, ));       \
    }
#endif

// Navi21 doesn't support int32 dpp
#if defined(__gfx1030__)
// NOLINTNEXTLINE
#define MIGRAPHX_DPP_REDUCE(op, prefix, sign)              \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(double, op, prefix##_f64); \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(float, op, prefix##_f32);  \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(half, op, prefix##_f16);   \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(uint32_t, op, prefix##_u32);
#else
// NOLINTNEXTLINE
#define MIGRAPHX_DPP_REDUCE(op, prefix, sign)                   \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(double, op, prefix##_f64);      \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(float, op, prefix##_f32);       \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(half, op, prefix##_f16);        \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(int32_t, op, prefix##sign##32); \
    MIGRAPHX_DPP_REDUCE_ASM_FUN(uint32_t, op, prefix##_u32);
#endif

// Note: when max and min are in int32_t, signed version of instruction needs to be used.
MIGRAPHX_DPP_REDUCE(op::sum, v_add, _u)
MIGRAPHX_DPP_REDUCE(op::product, v_mul, _u)
MIGRAPHX_DPP_REDUCE(op::max, v_max, _i)
MIGRAPHX_DPP_REDUCE(op::min, v_min, _i)

template <class T, class Op>
__device__ void dpp_reduce(T& in, Op op)
{
    dpp_reduce<MIGRAPHX_WAVEFRONTSIZE>(in, op);
}

template <unsigned int SubWaveSize, class Op, class T, class Index, class F>
__device__ auto subwave_reduce(index idx, Op op, T init, Index n, F f)
{
    MIGRAPHX_ASSERT(idx.max_nlocal() == idx.nlocal() or (idx.nlocal() % SubWaveSize) == 0);
    using type = decltype(index::invoke_loop(f, 0, _c<0>));
    auto x     = type(init);
    idx.local_subwave_stride<SubWaveSize>(
        n, [&](auto i, auto d) { x = op(x, index::invoke_loop(f, i, d)); });
    dpp_reduce<SubWaveSize>(x, op);
    return readlane<SubWaveSize - 1, SubWaveSize>(x);
}

template <class Op, class T, class Index, class F>
__device__ auto wave_reduce(index idx, Op op, T init, Index n, F f)
{
    return subwave_reduce<MIGRAPHX_WAVEFRONTSIZE>(idx, op, init, n, f);
}

template <class Op, class T, class Index, class F>
__device__ auto block_reduce(index idx, Op op, T init, Index n, F f)
{
    MIGRAPHX_ASSERT(idx.max_nlocal() == idx.nlocal());
#ifdef MIGRAPHX_HAS_CONST_LOCAL
    if constexpr(decltype(idx.nlocal()){} == MIGRAPHX_WAVEFRONTSIZE)
        return wave_reduce(idx, op, init, n, f);
#endif
    constexpr index_int lanes_per_thread = MIGRAPHX_WAVEFRONTSIZE;
    using type = decltype(index::invoke_loop(f, 0, _c<0>));
    __shared__ type buffer[idx.max_nlocal() / lanes_per_thread];
    auto x = type(init);
    idx.local_stride(n, [&](auto i, auto d) { x = op(x, index::invoke_loop(f, i, d)); });
    dpp_reduce(x, op);

    const auto ldsidx = idx.local / lanes_per_thread;
    if((idx.local % lanes_per_thread) == lanes_per_thread - 1)
    {
        buffer[ldsidx] = x;
    }
    __syncthreads();

    type y = type(init);
    for(index_int i = 0; i < idx.nlocal() / lanes_per_thread; i++)
    {
        y = op(y, buffer[i]);
    }
    return y;
}
#else
template <class Op, class T, class Index, class F>
__device__ auto block_reduce(index idx, Op op, T init, Index n, F f)
{
    MIGRAPHX_ASSERT(idx.max_nlocal() == idx.nlocal());
    using type = decltype(index::invoke_loop(f, 0, _c<0>));
    __shared__ type buffer[idx.max_nlocal()];
    auto x = type(init);
    idx.local_stride(n, [&](auto i, auto d) { x = op(x, index::invoke_loop(f, i, d)); });
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
#endif

template <class Output, class Input, class T>
constexpr auto reduce_slice(Input input, T i)
{
    constexpr auto lens = transform(get_shape_c<Input>{}.lens,
                                    get_shape_c<Output>{}.lens,
                                    [](index_int x, index_int y) -> index_int {
                                        if(x == y)
                                            return 1;
                                        return x;
                                    });
    ;
    constexpr auto s = make_shape(lens, get_shape_c<Input>{}.strides);
    MIGRAPHX_ASSERT((input.get_shape().index(i) + s.element_space()) <=
                    input.get_shape().element_space());
    return make_tensor_view(&input[i], s);
}

namespace reduce {

struct inner_storage_tag
{
};

template <class T>
using is_inner_storage = is_base_of<inner_storage_tag, remove_cv_t<remove_reference_t<T>>>;

template <class Size, class F>
struct lazy_inner_storage : inner_storage_tag
{
    using type = remove_reference_t<decltype(declval<F>()(0, _c<0>))>;
    F f;
    constexpr Size rsize() const { return {}; }
    template <class U, class V>
    constexpr auto operator()(U j, V d) const
    {
        return f(j, d);
    }
};

template <class Size, class F>
constexpr lazy_inner_storage<Size, F> make_lazy_inner_storage(Size, F f)
{
    return {{}, f};
}

template <class Size>
constexpr auto make_indices(Size size)
{
    return make_lazy_inner_storage(size, [](auto j, auto) { return j; });
}

template <class R, class F>
struct storage_access : F
{
    using type = R;
};

template <class R, class F>
constexpr storage_access<R, F> make_storage_access(F f)
{
    return {{f}};
}

template <class Slicer, class F>
constexpr auto sliced(Slicer slicer, F f)
{
    return [=](auto x, auto... xs) {
        // TODO: assert all elements are the same
        return f(slicer(x), slicer(xs)...);
    };
}

template <class Input, index_int Axis>
constexpr auto compute_reduce_axis()
{
    constexpr auto lens =
        transform_i(get_shape_c<Input>{}.lens, [](index_int x, index_int i) -> index_int {
            if(i == Axis)
                return 1;
            return x;
        });
    return make_shape(lens, get_shape_c<Input>{}.strides);
}

template <class T, class F>
constexpr auto final_reduce(T x, F f)
{
    return vec_reduce(x, f);
}

template <class T, index_int N, class F>
constexpr auto final_reduce(array<T, N> a, F f)
{
    return a.apply([&](auto x) { return final_reduce(x, f); });
}

template <class Input, index_int Axis>
using with_axis = decltype(compute_reduce_axis<Input, Axis>());

template <class Derived>
struct reducer_base
{
    template <class T>
    __device__ decltype(auto) make_inner_slice(T&& x) const
    {
        if constexpr(is_inner_storage<T>{})
        {
            return x;
        }
        else
        {
            auto&& derived = static_cast<const Derived&>(*this);
            auto t         = derived.slice(x);
            return make_storage_access<typename decltype(t)::type>(
                [=](auto i, auto...) -> auto& { return t[i]; });
        }
    }

    template <class T, class... Ts>
    constexpr auto get_size(T&& x, [[maybe_unused]] Ts&&... xs) const
    {
        MIGRAPHX_ASSERT(get_size(x) == get_size(xs...));
        return get_size(x);
    }

    template <class T, class... Ts>
    constexpr auto get_size(T&& x) const
    {
        if constexpr(is_inner_storage<T>{})
        {
            return x.rsize();
        }
        else
        {
            auto&& derived = static_cast<const Derived&>(*this);
            auto t         = derived.slice(x);
            return t.size();
        }
    }

    template <class F>
    __device__ auto inner_sliced(F f) const
    {
        return [=](auto&&... xs) { return f(get_size(xs...), make_inner_slice(xs)...); };
    }

    template <class T>
    static __device__ typename T::type& decl_inner_storage(const T&);

    template <class F>
    __device__ auto inner(F f) const
    {
        return this->inner_sliced([=](auto n, auto&&... xs) {
            using result_type = decltype(f(decl_inner_storage(xs)...));
            auto&& derived    = static_cast<const Derived&>(*this);
            if constexpr(is_void<result_type>{})
            {
                derived.inner_void_impl(f, n, xs...);
            }
            else
            {
                return derived.template inner_impl<result_type>(f, n, xs...);
            }
        });
    }

    template <class F>
    __device__ auto lazy_inner(F f) const
    {
        return this->inner_sliced([=](auto n, auto&&... xs) {
            return make_lazy_inner_storage(n, [=](auto j, auto d) { return f(xs(j, d)...); });
        });
    }

    template <class Op, class T, class Read>
    __device__ auto reduce(Op op, T init, Read read) const
    {
        return this->inner_sliced([=](auto n, auto&&... xs) {
            auto&& derived = static_cast<const Derived&>(*this);
            return derived.reduce_impl(op, init, read, n, xs...);
        });
    }

    template <class Op, class T>
    __device__ auto reduce(Op op, T init) const
    {
        return this->reduce(op, init, op::id{});
    }

    template <class F>
    __device__ void outer(F f) const
    {
        f();
    }

    template <class Input>
    constexpr auto elements() const
    {
        auto&& derived           = static_cast<const Derived&>(*this);
        using reduce_type        = decltype(derived.slice(Input{}));
        using value_type         = typename Input::type;
        constexpr auto relements = get_shape_c<reduce_type>{}.elements();
        if constexpr(vec_size<value_type>() > 1)
            return relements * vec_size<value_type>();
        else
            return relements;
    }
};

struct block
{
    template <class Slicer>
    struct reducer : reducer_base<reducer<Slicer>>
    {
        index idx;
        Slicer slice;

        template <class T, index_int N, class Size>
        struct inner_storage : inner_storage_tag
        {
            using type = T;
            array<T, N> arr;
            constexpr Size rsize() const { return {}; }
            template <class U, class V>
            constexpr auto& operator()(U, V d) const
            {
                return arr[d];
            }
            template <class U, class V>
            constexpr auto& operator()(U, V d)
            {
                return arr[d];
            }
        };

        template <class Op, class T, class Read, class N, class... Ts>
        __device__ auto reduce_impl(Op op, T init, Read read, N n, Ts&&... xs) const
        {
            return block_reduce(idx, op, init, n, [&](auto j, auto d) {
                return final_reduce(read(xs(j, d)...), op);
            });
        }

        template <class F>
        __device__ void outer(F f) const
        {
            if(idx.local == 0)
                f();
        }

        template <class F, class N, class... Ts>
        __device__ void inner_void_impl(F f, N n, Ts&&... xs) const
        {
            idx.local_stride(n, [&](auto j, auto d) { f(xs(j, d)...); });
        }

        template <class R, class F, class N, class... Ts>
        __device__ auto inner_impl(F f, N n, Ts&&... xs) const
        {
            using max_iterations = decltype(idx.max_local_stride_iterations(n));
            inner_storage<R, max_iterations{}, N> storage;
            idx.local_stride(n, [&](auto j, auto d) { storage(j, d) = R{f(xs(j, d)...)}; });
            return storage;
        }
    };

    template <class Slicer>
    static __device__ auto make(index idx, Slicer slicer)
    {
        return reducer<Slicer>{{}, idx, slicer};
    }

    template <class Output, class F>
    static __device__ void run(F f)
    {
        auto idx                 = make_index();
        constexpr auto nelements = get_shape_c<Output>{}.elements();
        idx.global_stride(nelements * idx.nlocal(), [&](auto i) {
            const auto out_idx = get_shape_c<Output>{}.multi(i / idx.nlocal());
            f(out_idx, make(idx, [&](auto input) { return reduce_slice<Output>(input, out_idx); }));
        });
    }
};

struct block_large
{
    template <class Slicer>
    struct reducer : reducer_base<reducer<Slicer>>
    {
        index idx;
        Slicer slice;

        template <class Op, class T, class Read, class N, class... Ts>
        __device__ auto reduce_impl(Op op, T init, Read read, N n, Ts&&... xs) const
        {
            return block_reduce(idx, op, init, index_int{n}, [&](auto j, auto d) {
                return final_reduce(read(xs(j, d)...), op);
            });
        }

        template <class F>
        __device__ void outer(F f) const
        {
            if(idx.local == 0)
                f();
        }

        template <class F, class N, class... Ts>
        __device__ void inner_void_impl(F f, N n, Ts&&... xs) const
        {
            idx.local_stride(index_int{n}, [&](auto j, auto d) { f(xs(j, d)...); });
        }

        template <class R, class F, class N, class... Ts>
        __device__ auto inner_impl(F f, N n, Ts&&... xs) const
        {
            return make_lazy_inner_storage(n, [=](auto j, auto d) { return f(xs(j, d)...); });
        }
    };

    template <class Slicer>
    static __device__ auto make(index idx, Slicer slicer)
    {
        return reducer<Slicer>{{}, idx, slicer};
    }

    template <class Output, class F>
    static __device__ void run(F f)
    {
        auto idx                 = make_index();
        constexpr auto nelements = get_shape_c<Output>{}.elements();
        idx.global_stride(nelements * idx.nlocal(), [&](auto i) {
            const auto out_idx = get_shape_c<Output>{}.multi(i / idx.nlocal());
            f(out_idx, make(idx, [&](auto input) { return reduce_slice<Output>(input, out_idx); }));
        });
    }
};

template <unsigned int SubWaveSize>
struct subwave
{
    template <class Slicer>
    struct reducer : reducer_base<reducer<Slicer>>
    {
        index idx;
        Slicer slice;

        template <class T, index_int N, class Size>
        struct inner_storage : inner_storage_tag
        {
            using type = T;
            array<T, N> arr;
            constexpr Size rsize() const { return {}; }
            template <class U, class V>
            constexpr auto& operator()(U, V d) const
            {
                return arr[d];
            }
            template <class U, class V>
            constexpr auto& operator()(U, V d)
            {
                return arr[d];
            }
        };

        template <class Op, class T, class Read, class N, class... Ts>
        __device__ auto reduce_impl(Op op, T init, Read read, N n, Ts&&... xs) const
        {
            return subwave_reduce<SubWaveSize>(idx, op, init, n, [&](auto j, auto d) {
                return final_reduce(read(xs(j, d)...), op);
            });
        }

        template <class F>
        __device__ void outer(F f) const
        {
            if(idx.local_subwave<SubWaveSize>() == 0)
                f();
        }

        template <class F, class N, class... Ts>
        __device__ void inner_void_impl(F f, N n, Ts&&... xs) const
        {
            idx.local_subwave_stride<SubWaveSize>(n, [&](auto j, auto d) { f(xs(j, d)...); });
        }

        template <class R, class F, class N, class... Ts>
        __device__ auto inner_impl(F f, N n, Ts&&... xs) const
        {
            using max_iterations =
                decltype(idx.max_local_subwave_stride_iterations<SubWaveSize>(n));
            inner_storage<R, max_iterations{}, N> storage;
            idx.local_subwave_stride<SubWaveSize>(
                n, [&](auto j, auto d) { storage(j, d) = f(xs(j, d)...); });
            return storage;
        }
    };

    template <class Slicer>
    static __device__ auto make(index idx, Slicer slicer)
    {
        return reducer<Slicer>{{}, idx, slicer};
    }

    template <class Output, class F>
    static __device__ void run(F f)
    {
        auto idx                 = make_index();
        constexpr auto nelements = get_shape_c<Output>{}.elements();
        idx.global_stride(nelements * idx.nlocal_subwave<SubWaveSize>(), [&](auto i) {
            const auto out_idx = get_shape_c<Output>{}.multi(i / idx.nlocal_subwave<SubWaveSize>());
            f(out_idx, make(idx, [&](auto input) { return reduce_slice<Output>(input, out_idx); }));
        });
    }
};

using wave = subwave<MIGRAPHX_WAVEFRONTSIZE>;

struct lane
{
    template <class Slicer>
    struct reducer : reducer_base<reducer<Slicer>>
    {
        index idx;
        Slicer slice;

        template <class Op, class T, class Read, class N, class U, class... Us>
        __device__ auto reduce_impl(Op op, T init, Read read, N n, U&& x, Us&&... xs) const
        {
            using type = remove_reference_t<decltype(read(x(0, _c<0>), xs(0, _c<0>)...))>;
            type r     = type(init);
            for(index_int j = 0; j < n; j++)
            {
                r = op(r, read(x(j, _c<0>), xs(j, _c<0>)...));
            }
            return r;
        }

        template <class F>
        __device__ void outer(F f) const
        {
            f();
        }

        template <class F, class N, class... Ts>
        __device__ void inner_void_impl(F f, N n, Ts&&... xs) const
        {
            for(index_int j = 0; j < n; j++)
            {
                f(xs(j, _c<0>)...);
            }
        }

        template <class R, class F, class N, class... Ts>
        __device__ auto inner_impl(F f, N n, Ts&&... xs) const
        {
            return make_lazy_inner_storage(n, [=](auto j, auto d) { return f(xs(j, d)...); });
        }
    };
    template <class Slicer>
    static __device__ auto make(index idx, Slicer slicer)
    {
        return reducer<Slicer>{{}, idx, slicer};
    }

    template <class Output, class F>
    static __device__ void run(F f)
    {
        auto idx                 = make_index();
        constexpr auto nelements = get_shape_c<Output>{}.elements();
        idx.global_stride(nelements, [&](auto i) {
            const auto out_idx = get_shape_c<Output>{}.multi(i);
            f(out_idx, make(idx, [&](auto input) { return reduce_slice<Output>(input, out_idx); }));
        });
    }
};

// TODO: Remove these in the future when they can be selected in the compiler class
template <index_int RElements>
constexpr auto pick_block()
{
    using nlocal = decltype(index{}.max_nlocal());
    if constexpr(RElements < nlocal{} * 256)
        return block{};
    else
        return block_large{};
}
template <index_int RElements>
using auto_block = decltype(pick_block<RElements>());

template <class Input, index_int Axis>
constexpr auto reduce_elements_with_axis()
{
    constexpr auto s = get_shape_c<Input>{};
    return s.lens[Axis];
}

} // namespace reduce

template <class Algo,
          class Op,
          class T,
          class Input,
          class Output,
          class ReadInput,
          class WriteOuput>
__device__ void
simple_reduce(Op op, T init, Input input, Output output, ReadInput read, WriteOuput write)
{
    Algo::template run<Output>([&](auto out_idx, auto r) {
        auto x = r.reduce(op, init, read)(input);
        r.outer([&] { output[out_idx] = write(x); });
    });
}

template <class Algo, class Reduced, class Output, class Assign, class F>
__device__ void fused_reduce(Output output_pack, Assign assign, F f)
{
    Algo::template run<Reduced>([&](auto out_idx, auto r) {
        auto result_tuple = f(r, out_idx);
        unpack_each(
            [&](auto output, auto result) {
                if constexpr(reduce::is_inner_storage<decltype(result)>{})
                {
                    r.inner([&](auto& y, auto x) { assign(y, x); })(output, result);
                }
                else
                {
                    r.outer([&] { assign(output[out_idx], implicit_conversion(result)); });
                }
            },
            output_pack,
            result_tuple);
    });
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_REDUCE_HPP
