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
 *
 */
#include <migraphx/fuse_pointwise_reduce.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/fuse_pointwise.hpp>
#include <migraphx/fuse_reduce.hpp>
#include <migraphx/split_reduce.hpp>
#include <migraphx/env.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_SPLIT_REDUCE_SIZE);

static std::size_t get_split_size(std::size_t default_split)
{
    std::string value = string_value_of(MIGRAPHX_SPLIT_REDUCE_SIZE{});
    if(value.empty())
        return default_split;
    return std::stoul(value);
}

void fuse_pointwise_reduce::apply(module_pass_manager& mpm) const
{
    mpm.run_pass(fuse_pointwise{.enable_rewrite_reshapes = false});
    mpm.run_pass(fuse_reduce{.enable_rewrite_reshapes = false});
    mpm.run_pass(fuse_pointwise{.enable_rewrite_reshapes = true});
    mpm.run_pass(fuse_reduce{.enable_rewrite_reshapes = true});
    mpm.run_pass(split_reduce{.split_size = get_split_size(split_size)});
    mpm.run_pass(fuse_pointwise{.enable_rewrite_broadcasts = true});
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
