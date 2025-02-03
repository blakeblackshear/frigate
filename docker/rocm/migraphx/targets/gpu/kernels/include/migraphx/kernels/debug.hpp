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
#ifndef MIGRAPHX_GUARD_KERNELS_DEBUG_HPP
#define MIGRAPHX_GUARD_KERNELS_DEBUG_HPP

#include <migraphx/kernels/hip.hpp>

namespace migraphx {

#define MIGRAPHX_STRINGIZE_1(...) #__VA_ARGS__
#define MIGRAPHX_STRINGIZE(...) MIGRAPHX_STRINGIZE_1(__VA_ARGS__)

// Workaround hip's broken abort on device code
#ifdef __HIP_DEVICE_COMPILE__
// NOLINTNEXTLINE
#define MIGRAPHX_HIP_NORETURN
#else
// NOLINTNEXTLINE
#define MIGRAPHX_HIP_NORETURN [[noreturn]]
#endif

namespace debug {
struct swallow
{
    template <class... Ts>
    constexpr swallow(Ts&&...)
    {
    }
};

template <size_t N>
struct print_buffer
{
    char buffer[N + 1] = {0};
    char* pos          = buffer;

    constexpr void append(char c)
    {
        if(c == 0)
            return;
        if(pos < buffer + N)
        {
            *pos = c;
            pos++;
        }
    }
    static constexpr void reverse(char* first, char* last)
    {
        if(first == last)
            return;
        last--;
        while(first < last)
        {
            char tmp = *first;
            *first   = *last;
            *last    = tmp;
            first++;
            last--;
        }
    }

    template <class T, class = decltype(T{} % 10, -T{})>
    constexpr void append(T i)
    {
        if(i < 0)
        {
            append('-');
            i = -i;
        }
        if(i == 0)
        {
            append('0');
            return;
        }
        char* start = pos;
        while(i != 0)
        {
            char c = (i % 10) + '0';
            append(c);
            i = i / 10;
        }
        reverse(start, pos);
    }

    constexpr void append(const char* str)
    {
        if(str == nullptr)
            return;
        int i = 512;
        while(*str != 0 and i > 0)
        {
            append(*str);
            str++;
            i--;
        }
    }

    template <size_t M>
    constexpr void append(const char (&array)[M])
    {
        for(int i = 0; i < M; i++)
            append(array[i]);
    }
};

template <class... Ts>
__host__ __device__ void print(const Ts&... xs)
{
    print_buffer<1024> buffer;
    swallow{(buffer.append(xs), 0)...};
    printf("%s", buffer.buffer);
}

} // namespace debug

struct source_location
{
    int line             = __builtin_LINE();
    const char* file     = __builtin_FILE();
    const char* function = __builtin_FUNCTION();
};

template <class T>
struct source_location_capture
{
    T x;
    source_location loc;
    // declval is a workaround since default constructor for "U" is not working with rocm-5.6
    template <class U>
    static U&& declval();
    template <class U, class = decltype(T(declval<U>()))>
    constexpr source_location_capture(U px, source_location ploc = source_location{})
        : x(px), loc(ploc)
    {
    }
    template <class U, class = decltype(T(declval<U>()))>
    constexpr source_location_capture(source_location_capture<U> slc) : x(slc.x), loc(slc.loc)
    {
    }

    constexpr operator source_location() const { return loc; }

    constexpr operator T() const { return x; }
};

template <class T, class F>
constexpr auto capture_transform(source_location_capture<T> slc, F f)
{
    auto r = f(slc.x);
    return source_location_capture<decltype(r)>(r, slc.loc);
}

template <class T, class F>
constexpr auto capture_transform(T x, F f)
{
    return f(x);
}

// noreturn cannot be used on this function because abort in hip is broken
template <class T1, class T2, class T3, class T4>
MIGRAPHX_HIP_NORETURN inline __host__ __device__ void
assert_fail(const T1& assertion, const T2& file, const T3& line, const T4& function)
{
    // printf is broken on hip with more than one argument, so use a simple print functions instead
    debug::print(file, ":", line, ": ", function, ": assertion '", assertion, "' failed.\n");
    // printf("%s:%s: %s: assertion '%s' failed.\n", file, line, function, assertion);
    abort();
}

template <class... Ts>
MIGRAPHX_HIP_NORETURN inline __host__ __device__ void assert_fail(const source_location& loc,
                                                                  Ts... xs)
{
    debug::print(loc.file, ":", loc.line, ": ", loc.function, ": error: ", xs..., "\n");
    abort();
}

// NOLINTNEXTLINE
#define MIGRAPHX_ASSERT_FAIL(cond, ...)                     \
    ((cond) ? void(0) : [](auto&&... private_migraphx_xs) { \
        assert_fail(private_migraphx_xs...);                \
    }(__VA_ARGS__))

// NOLINTNEXTLINE
#define MIGRAPHX_CHECK(cond) \
    MIGRAPHX_ASSERT_FAIL(cond, #cond, __FILE__, __LINE__, __PRETTY_FUNCTION__)

#ifdef MIGRAPHX_DEBUG
// NOLINTNEXTLINE
#define MIGRAPHX_CAPTURE_SOURCE_LOCATION(T) source_location_capture<T>
#define MIGRAPHX_WARN(cond, loc, ...) MIGRAPHX_ASSERT_FAIL(cond, loc, __VA_ARGS__)
#define MIGRAPHX_ASSERT MIGRAPHX_CHECK
#define MIGRAPHX_ASSUME MIGRAPHX_CHECK
#define MIGRAPHX_UNREACHABLE() MIGRAPHX_ASSERT(false)
#else
// NOLINTNEXTLINE
#define MIGRAPHX_CAPTURE_SOURCE_LOCATION(T) T
#define MIGRAPHX_ASSUME __builtin_assume
#define MIGRAPHX_UNREACHABLE __builtin_unreachable
#define MIGRAPHX_ASSERT(cond)
#define MIGRAPHX_WARN(...)
#endif

#define MIGRAPHX_STATIC_ASSERT_FOR(...) \
    static_assert(__VA_ARGS__);         \
    if constexpr(__VA_ARGS__)

} // namespace migraphx
#endif // MIGRAPHX_GUARD_KERNELS_DEBUG_HPP
