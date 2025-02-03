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

#ifndef MIGRAPHX_GUARD_FPGA_TARGET_HPP
#define MIGRAPHX_GUARD_FPGA_TARGET_HPP

#include <migraphx/program.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/compile_options.hpp>
#include <migraphx/fpga/context.hpp>
#include <migraphx/config.hpp>
#include <migraphx/supported_segments.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
struct pass;
namespace fpga {

struct target
{
    std::string name() const;
    std::vector<pass> get_passes(migraphx::context& ctx, const compile_options&) const;
    migraphx::context get_context() const { return context{}; }
    supported_segments find_supported(const_module_ref mod, support_metric m) const;
    argument copy_to(const argument& arg) const { return arg; }
    argument copy_from(const argument& arg) const { return arg; }
    argument allocate(const shape& s) const;
};

} // namespace fpga
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif // MIGRAPHX_GUARD_FPGA_TARGET_HPP
