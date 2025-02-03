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
#ifndef MIGRAPHX_GUARD_RTGLIB_SIMPLE_PAR_FOR_HPP
#define MIGRAPHX_GUARD_RTGLIB_SIMPLE_PAR_FOR_HPP

#include <thread>
#include <cmath>
#include <algorithm>
#include <vector>
#include <cassert>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct joinable_thread : std::thread
{
    template <class... Xs>
    joinable_thread(Xs&&... xs) : std::thread(std::forward<Xs>(xs)...) // NOLINT
    {
    }

    joinable_thread& operator=(joinable_thread&& other) = default;
    joinable_thread(joinable_thread&& other)            = default;

    ~joinable_thread()
    {
        if(this->joinable())
            this->join();
    }
};

template <class F>
auto thread_invoke(std::size_t i, std::size_t tid, F f) -> decltype(f(i, tid))
{
    f(i, tid);
}

template <class F>
auto thread_invoke(std::size_t i, std::size_t, F f) -> decltype(f(i))
{
    f(i);
}

template <class F>
void simple_par_for_impl(std::size_t n, std::size_t threadsize, F f)
{
    if(threadsize <= 1)
    {
        for(std::size_t i = 0; i < n; i++)
            thread_invoke(i, 0, f);
    }
    else
    {
        std::vector<joinable_thread> threads(threadsize);
// Using const here causes gcc 5 to ICE
#if(!defined(__GNUC__) || __GNUC__ != 5)
        const
#endif
            std::size_t grainsize = std::ceil(static_cast<double>(n) / threads.size());

        std::size_t work = 0;
        std::size_t tid  = 0;
        std::generate(threads.begin(), threads.end(), [=, &work, &tid] {
            auto result = joinable_thread([=] {
                std::size_t start = work;
                std::size_t last  = std::min(n, work + grainsize);
                for(std::size_t i = start; i < last; i++)
                {
                    thread_invoke(i, tid, f);
                }
            });
            work += grainsize;
            ++tid;
            return result;
        });
        assert(work >= n);
    }
}

template <class F>
void simple_par_for(std::size_t n, std::size_t min_grain, F f)
{
    const auto threadsize = std::min<std::size_t>(std::thread::hardware_concurrency(),
                                                  n / std::max<std::size_t>(1, min_grain));
    simple_par_for_impl(n, threadsize, f);
}

template <class F>
void simple_par_for(std::size_t n, F f)
{
    const int min_grain = 8;
    simple_par_for(n, min_grain, f);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
