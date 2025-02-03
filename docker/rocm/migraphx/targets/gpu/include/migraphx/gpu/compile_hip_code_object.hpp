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
#ifndef MIGRAPHX_GUARD_GPU_COMPILE_HIP_CODE_OBJECT_HPP
#define MIGRAPHX_GUARD_GPU_COMPILE_HIP_CODE_OBJECT_HPP

#include <migraphx/gpu/config.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/compile_src.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct context;

struct hip_compile_options
{
    std::size_t global;
    std::size_t local;
    std::vector<shape> inputs;
    shape output;
    std::string kernel_name                    = "kernel";
    std::vector<std::string> params            = {};
    std::vector<shape> virtual_inputs          = {};
    std::vector<src_file> additional_src_files = {};
    std::int64_t output_arg                    = -1;

    /**
     * @brief Set the launch parameters but allow v to override the values
     *
     * @param v A value class which can have a "global" and/or "local" keys to override the default
     * global and local
     * @param compute_global A function used to compute the global based on the local
     * @param default_local The defaul local to use if its missing from the v parameter
     */
    void set_launch_params(const value& v,
                           const std::function<std::size_t(std::size_t local)>& compute_global,
                           std::size_t default_local = 1024);

    void
    set_launch_params(const value& v, std::size_t default_global, std::size_t default_local = 1024)
    {
        set_launch_params(
            v, [=](auto) { return default_global; }, default_local);
    }

    void emplace_param(std::string_view s) { params.emplace_back(s); }
};

/// Compute global for n elements, but max out on target-specific upper limit
MIGRAPHX_GPU_EXPORT std::function<std::size_t(std::size_t local)>
compute_global_for(context& ctx, std::size_t n, std::size_t over = 1);

MIGRAPHX_GPU_EXPORT operation compile_hip_code_object(context& ctx,
                                                      const std::string& content,
                                                      hip_compile_options options);

MIGRAPHX_GPU_EXPORT std::size_t
compute_block_size(context& ctx, std::size_t n, std::size_t max_block_size = 1024);

template <class T>
std::string generate_index_ints(const std::vector<T>& v)
{
    return "index_ints<" + to_string_range(v) + ">{}";
}

MIGRAPHX_GPU_EXPORT std::string generate_make_shape(const shape& s);

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_GPU_COMPILE_HIP_CODE_OBJECT_HPP
