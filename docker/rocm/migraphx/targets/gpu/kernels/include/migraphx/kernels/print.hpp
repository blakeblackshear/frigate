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
#ifndef MIGRAPHX_GUARD_KERNELS_PRINT_HPP
#define MIGRAPHX_GUARD_KERNELS_PRINT_HPP

#include <migraphx/kernels/hip.hpp>
#include <migraphx/kernels/index.hpp>
#include <migraphx/kernels/functional.hpp>
#include <migraphx/kernels/algorithm.hpp>

namespace migraphx {

template <class F, class G>
struct on_exit
{
    F f;
    G g;
    template <class T>
    __host__ __device__ auto operator()(T x) const
    {
        return f(x);
    }

    __host__ __device__ ~on_exit() { f(g); }
};

template <class PrivateMIGraphXTypeNameProbe>
constexpr auto print_type_name_probe()
{
    constexpr auto name                = __PRETTY_FUNCTION__;
    constexpr auto size                = sizeof(__PRETTY_FUNCTION__);
    constexpr auto parameter_name      = "PrivateMIGraphXTypeNameProbe = ";
    constexpr auto parameter_name_size = sizeof("PrivateMIGraphXTypeNameProbe = ") - 1;
    constexpr auto begin =
        search(name, name + size, parameter_name, parameter_name + parameter_name_size);
    static_assert(begin < name + size, "Type probe not found.");
    constexpr auto start = begin + parameter_name_size;
    constexpr auto last  = find_if(start, name + size, [](auto c) { return c == ']' or c == ';'; });
    return [=](const auto& s) { s.print_string(start, last - start); };
}

template <class T>
struct type_printer
{
    template <class Stream>
    friend constexpr const Stream& operator<<(const Stream& s, type_printer)
    {
        print_type_name_probe<T>()(s);
        return s;
    }
};

template <class T>
constexpr type_printer<T> type_of()
{
    return {};
}

template <class T>
constexpr type_printer<T> type_of(T)
{
    return {};
}

template <class T>
constexpr type_printer<typename T::type> sub_type_of()
{
    return {};
}

template <class T>
constexpr type_printer<typename T::type> sub_type_of(T)
{
    return {};
}

template <class F>
struct basic_printer
{
    F f;
    __host__ __device__ const basic_printer& print_long(long value) const
    {
        f([&] { printf("%li", value); });
        return *this;
    }
    __host__ __device__ const basic_printer& print_ulong(unsigned long value) const
    {
        f([&] { printf("%lu", value); });
        return *this;
    }
    __host__ __device__ const basic_printer& print_char(char value) const
    {
        f([&] { printf("%c", value); });
        return *this;
    }
    __host__ __device__ const basic_printer& print_string(const char* value) const
    {
        f([&] { printf("%s", value); });
        return *this;
    }
    __host__ __device__ const basic_printer& print_string(const char* value, int size) const
    {
        f([&] { printf("%.*s", size, value); });
        return *this;
    }
    __host__ __device__ const basic_printer& print_double(double value) const
    {
        f([&] { printf("%f", value); });
        return *this;
    }
    __host__ __device__ const basic_printer& print_bool(bool value) const
    {
        f([&] {
            if(value)
                printf("true");
            else
                printf("false");
        });
        return *this;
    }
    __host__ __device__ const basic_printer& operator<<(short value) const
    {
        return print_long(value);
    }
    __host__ __device__ const basic_printer& operator<<(unsigned short value) const
    {
        return print_ulong(value);
    }
    __host__ __device__ const basic_printer& operator<<(int value) const
    {
        return print_long(value);
    }
    __host__ __device__ const basic_printer& operator<<(unsigned int value) const
    {
        return print_ulong(value);
    }
    __host__ __device__ const basic_printer& operator<<(long value) const
    {
        return print_long(value);
    }
    __host__ __device__ const basic_printer& operator<<(unsigned long value) const
    {
        return print_ulong(value);
    }
    __host__ __device__ const basic_printer& operator<<(migraphx::half value) const
    {
        return print_double(value);
    }
    __host__ __device__ const basic_printer& operator<<(float value) const
    {
        return print_double(value);
    }
    __host__ __device__ const basic_printer& operator<<(double value) const
    {
        return print_double(value);
    }
    __host__ __device__ const basic_printer& operator<<(bool value) const
    {
        return print_bool(value);
    }
    __host__ __device__ const basic_printer& operator<<(char value) const
    {
        return print_char(value);
    }
    __host__ __device__ const basic_printer& operator<<(unsigned char value) const
    {
        return print_char(value);
    }
    __host__ __device__ const basic_printer& operator<<(const char* value) const
    {
        return print_string(value);
    }
};

template <class F>
constexpr basic_printer<F> make_printer(F f)
{
    return {f};
}

template <class F, class G>
constexpr basic_printer<on_exit<F, G>> make_printer(F f, G g)
{
    return {{f, g}};
}

inline __device__ auto cout()
{
    return make_printer([](auto f) { f(); });
}

inline __device__ auto coutln()
{
    return make_printer([](auto f) { f(); }, [] { printf("\n"); });
}

template <class Stream, class T, class... Ts>
__device__ void unsafe_print_each(Stream s, T x, Ts... xs)
{
    s << x;
    each_args([&](auto xx) { s << ' ' << xx; }, xs...);
}

template <class Stream, class... Ts>
__device__ void print_each(Stream s, Ts... xs)
{
    auto idx = make_index();
    for(auto i = 0; i < idx.nglobal(); i++)
    {
        if(i == idx.global)
            unsafe_print_each(s, xs...);
        __syncthreads();
    }
}

template <class Stream, class... Ts>
__device__ void print_each_once(Stream s, Ts... xs)
{
    auto idx = make_index();
    if(idx.global == 0)
        unsafe_print_each(s, xs...);
}

template <class... Ts>
__device__ void print(Ts... xs)
{
    print_each(cout(), xs...);
}

template <class... Ts>
__device__ void print_once(Ts... xs)
{
    print_each_once(cout(), xs...);
}

template <class... Ts>
__device__ void println(Ts... xs)
{
    print_each(cout(), xs..., '\n');
}

template <class... Ts>
__device__ void println_once(Ts... xs)
{
    print_each_once(cout(), xs..., '\n');
}

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_PRINT_HPP
