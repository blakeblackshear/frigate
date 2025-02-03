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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_CPU_POINTWISE_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_CPU_POINTWISE_HPP

#include <array>
#include <migraphx/config.hpp>
#include <migraphx/context.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/cpu/context.hpp>
#include <migraphx/reduce_dims.hpp>
#include <migraphx/register_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

struct multi_index
{
    constexpr multi_index() = default;

    multi_index(const shape& s, std::size_t i) : n(s.lens().size())
    {
        assert(n < max_size);
        std::copy(s.lens().begin(), s.lens().end(), dims);
        s.multi_copy(i, index, index + max_size);
    }

    constexpr std::size_t size() const { return n; }

    constexpr std::size_t* begin() { return index; }
    constexpr const std::size_t* begin() const { return index; }

    constexpr std::size_t* end() { return index + size(); }
    constexpr const std::size_t* end() const { return index + size(); }

    std::size_t offset(const shape& s) const { return s.index(begin(), end()); }

    constexpr void carry()
    {
        std::size_t overflow = 0;
        for(std::ptrdiff_t i = size() - 1; i > 0; i--)
        {
            auto z = index[i] + overflow;
            // Reset overflow
            overflow = 0;
            // Compute overflow using while loop instead of mod
            // overflow = z / dims[i];
            // z = z % dims[i];
            while(z >= dims[i])
            {
                z -= dims[i];
                overflow += 1;
            }
            index[i] = z;
            // Exit if there is no overflow
            if(overflow == 0)
                return;
        }
        index[0] += overflow;
    }

    constexpr void increment(std::size_t i)
    {
        index[size() - 1] += i;
        carry();
    }

    constexpr multi_index& operator+=(std::size_t i)
    {
        increment(i);
        return *this;
    }

    constexpr multi_index& operator++()
    {
        increment(1);
        return *this;
    }
    multi_index operator++(int) // NOLINT
    {
        multi_index result = *this;
        increment(1);
        return result;
    }

    private:
    static const std::size_t max_size = 5;
    std::size_t index[max_size]       = {};
    std::size_t dims[max_size]        = {};
    std::size_t n                     = 0;
};

struct reduce_dims_base
{
    std::vector<shape> reduce_shapes;

    void finalize(context&, const shape&, const std::vector<shape>& inputs)
    {
        reduce_shapes = reduce_dims(inputs);
    }

    argument get_arg(const std::vector<argument>& args, std::size_t i) const
    {
        if(reduce_shapes.empty())
            return args[i];
        return args.at(i).reshape(reduce_shapes.at(i));
    }

    argument get_output() const
    {
        argument a{reduce_shapes[0]};
        return a;
    }
};

template <class T, std::size_t N>
struct vec
{
    using array_type                                              = std::array<T, N>;
    using vector_type __attribute__((vector_size(N * sizeof(T)))) = T;
    union
    {
        array_type array;
        vector_type vector;
    };

    static_assert(sizeof(array_type) == sizeof(vector_type), "Not the same size");
};

template <class T>
constexpr std::integral_constant<std::size_t, 0> vec_size(const T&)
{
    return {};
}

template <class T, std::size_t N>
constexpr std::integral_constant<std::size_t, N> vec_size(const vec<T, N>&)
{
    return {};
}

template <class T>
constexpr std::size_t vec_size()
{
    return decltype(vec_size(std::declval<T>())){};
}

template <class F, class V, class... Vs, MIGRAPHX_REQUIRES((vec_size<V>() > 0))>
void vec_apply(F f, V& v, Vs... vs)
{
    assert(all_of({vec_size<Vs>()...}, [&](auto n) { return n == vec_size<V>(); }));
    assert(vec_size<V>() == v.array.size());
    for(std::size_t i = 0; i < vec_size<V>(); i++)
        f(v.array[i], vs.vector[i]...);
}

template <class F, class V, class... Vs, MIGRAPHX_REQUIRES((vec_size<V>() == 0))>
void vec_apply(F f, V& v, Vs&... vs)
{
    f(v, vs...);
}

inline std::size_t find_packed_len(const shape& s)
{
    for(std::size_t i = 0; i < s.lens().size(); i++)
    {
        if(s.lens()[i] > 1 and s.strides()[i] == 1)
        {
            return i;
        }
    }
    return -1;
}

template <std::size_t N>
shape vectorize(const shape& s)
{
    assert(s.standard() or s.broadcasted());
    auto lens = s.lens();
    if(s.broadcasted())
    {
        auto n = find_packed_len(s);
        assert(n != -1);
        assert((lens[n] % N) == 0);
        lens[n] /= N;
        return {s.type(), lens, s.strides()};
    }
    assert((lens.back() % N) == 0);
    lens.back() /= N;
    return {s.type(), lens};
}

template <std::size_t N, class T>
tensor_view<vec<T, N>> vectorize(tensor_view<T> tv)
{
    return {vectorize<N>(tv.get_shape()), reinterpret_cast<vec<T, N>*>(tv.data())};
}

template <class T>
struct is_vector_type : std::false_type
{
};

template <>
struct is_vector_type<float> : std::true_type
{
};

template <class... Ts>
struct is_vector_tensor_view : and_<is_vector_type<typename Ts::value_type>{}...>
{
};

template <std::size_t N, class... Xs>
bool is_vectorizable(const Xs&... xs)
{
    return all_of({xs...}, [](const auto& s) {
        if(s.standard() and (s.lens().back() % N) == 0)
            return true;
        if(s.broadcasted())
        {
            auto n = std::inner_product(s.lens().begin(),
                                        s.lens().end(),
                                        s.strides().begin(),
                                        0,
                                        std::plus<>{},
                                        [&](auto len, auto stride) -> std::size_t {
                                            if(stride > 0 and len == 1)
                                                return 0;
                                            return stride;
                                        });
            if(n == 1)
            {
                auto i = find_packed_len(s);
                assert(i != -1);
                return (s.lens()[i] % N) == 0;
            }
        }
        return false;
    });
}

template <class... Ts, MIGRAPHX_REQUIRES(is_vector_tensor_view<Ts...>{})>
auto auto_vectorize(const shape& base_shape, Ts... xs)
{
    return [=](auto f) {
        if(is_vectorizable<32>(base_shape, xs.get_shape()...))
            f(vectorize<32>(base_shape), vectorize<32>(xs)...);
        else if(is_vectorizable<8>(base_shape, xs.get_shape()...))
            f(vectorize<8>(base_shape), vectorize<8>(xs)...);
        else
            f(base_shape, xs...);
    };
}

template <class... Ts, MIGRAPHX_REQUIRES(not is_vector_tensor_view<Ts...>{})>
auto auto_vectorize(const shape& base_shape, Ts... xs)
{
    return [=](auto f) { f(base_shape, xs...); };
}

template <class X, class... Xs>
bool is_standard_offset(const X& x, const Xs&... xs)
{
    if(all_of({x, xs...}, [](const auto& s) { return s.standard(); }))
        return true;
    if(all_of({x, xs...}, [](const auto& s) { return s.packed(); }) and
       all_of({xs...}, [&](const auto& s) { return s == x; }))
        return true;
    return false;
}

template <class... Ts>
auto pointwise_apply(Ts... ts)
{
    return [=](context& ctx, const shape& base_shape, std::size_t min_grain, auto f) mutable {
        if(is_standard_offset(ts.get_shape()...))
        {
            ctx.bulk_execute(base_shape.elements(), min_grain, [=](auto start, auto end) mutable {
                for(auto i = start; i < end; i++)
                {
                    vec_apply(f, ts.data()[i]...);
                }
            });
        }
        else
        {
            assert(base_shape.lens().size() <= 6);
            ctx.bulk_execute(base_shape.elements(), min_grain, [=](auto start, auto end) mutable {
                multi_index mi(base_shape, start);
                for(auto i = start; i < end; i++)
                {
                    vec_apply(f, ts.data()[mi.offset(ts.get_shape())]...);
                    ++mi;
                }
            });
        }
    };
}

template <class... Ts>
auto pointwise(Ts... ts)
{
    return [=](context& ctx, const shape& base_shape, std::size_t min_grain, auto f) mutable {
        auto_vectorize(base_shape, ts...)(
            [&](auto bs, auto... xs) { pointwise_apply(xs...)(ctx, bs, min_grain, f); });
    };
}

template <class Op>
struct cpu_unary : reduce_dims_base, auto_register_op<cpu_unary<Op>>
{
    Op op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return migraphx::reflect(self.op, f);
    }
    std::string name() const { return "cpu::" + op.name(); }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(2);
        const auto& s = inputs.at(0);
        return {s.type(), s.lens()};
    }
    argument
    compute(context& ctx, const shape& output_shape, const std::vector<argument>& args) const
    {
        argument result = get_arg(args, args.size() - 1);

        visit_all(result, get_arg(args, 0))([&](auto output, auto input) {
            auto op2 = op;
            pointwise(output, input)(
                ctx, output.get_shape(), 1024, [op2](auto& y, auto x) { y = op2.apply()(x); });
        });

        return result.reshape(output_shape);
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }
};

template <class Op>
struct cpu_binary : reduce_dims_base, auto_register_op<cpu_binary<Op>>
{
    Op op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return migraphx::reflect(self.op, f);
    }
    std::string name() const { return "cpu::" + op.name(); }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(3);
        const auto& s = inputs.at(0);
        return {s.type(), s.lens()};
    }

    argument
    compute(context& ctx, const shape& output_shape, const std::vector<argument>& args) const
    {
        argument result = get_arg(args, args.size() - 1);

        visit_all(result, get_arg(args, 0), get_arg(args, 1))(
            [&](auto output, auto input1, auto input2) {
                auto op2 = op;
                pointwise(output, input1, input2)(
                    ctx, output.get_shape(), 1024, [op2](auto& z, auto x, auto y) {
                        z = op2.apply()(x, y);
                    });
            });

        return result.reshape(output_shape);
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }
};

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
