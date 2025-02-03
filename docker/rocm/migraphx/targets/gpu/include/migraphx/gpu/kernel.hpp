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
#ifndef MIGRAPHX_GUARD_RTGLIB_KERNEL_HPP
#define MIGRAPHX_GUARD_RTGLIB_KERNEL_HPP

#include <migraphx/gpu/config.hpp>
#include <migraphx/gpu/pack_args.hpp>
#include <hip/hip_runtime_api.h>
#include <memory>
#include <string>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct kernel_impl;

struct MIGRAPHX_GPU_EXPORT kernel
{
    kernel() = default;
    kernel(const char* image, const std::string& name);
    template <class T, MIGRAPHX_REQUIRES(sizeof(T) == 1)>
    kernel(const std::vector<T>& image, const std::string& name)
        : kernel(reinterpret_cast<const char*>(image.data()), name)
    {
    }

    void launch(hipStream_t stream,
                std::size_t global,
                std::size_t local,
                const std::vector<kernel_argument>& args,
                hipEvent_t start = nullptr,
                hipEvent_t stop  = nullptr) const;

    void launch(hipStream_t stream,
                std::size_t global,
                std::size_t local,
                std::vector<void*> args,
                hipEvent_t start = nullptr,
                hipEvent_t stop  = nullptr) const;

    template <class... Ts>
    auto launch(hipStream_t stream, std::size_t global, std::size_t local, Ts... zs) const
    {
        return [=](auto&&... xs) {
            launch(stream, global, local, std::vector<kernel_argument>{xs...}, zs...);
        };
    }

    private:
    std::shared_ptr<kernel_impl> impl;
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
