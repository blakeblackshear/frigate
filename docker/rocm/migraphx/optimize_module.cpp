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
#include <migraphx/optimize_module.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/simplify_reshapes.hpp>
#include <migraphx/simplify_algebra.hpp>
#include <migraphx/eliminate_common_subexpression.hpp>
#include <migraphx/eliminate_convert.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/propagate_constant.hpp>
#include <migraphx/module.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void optimize_module::apply(module_pass_manager& mpm) const
{
    mpm.get_module().repeat_while_changes(2, [&] {
        // loop to further optimize after initial transformations
        mpm.get_module().repeat_while_changes(4, [&] {
            mpm.run_pass(simplify_reshapes{});
            mpm.run_pass(eliminate_convert{});
            mpm.run_pass(dead_code_elimination{});
            mpm.run_pass(simplify_algebra{});
        });
        mpm.run_pass(eliminate_common_subexpression{});
        mpm.run_pass(dead_code_elimination{});
        mpm.run_pass(propagate_constant{propagate_constant_skip_ops});
        mpm.run_pass(dead_code_elimination{});
    });
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
