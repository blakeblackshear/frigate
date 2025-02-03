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

#include <migraphx/ref/target.hpp>
#include <migraphx/ref/lowering.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/pass.hpp>
#include <migraphx/auto_contiguous.hpp>
#include <migraphx/rewrite_rnn.hpp>
#include <migraphx/eliminate_convert.hpp>
#include <migraphx/eliminate_pad.hpp>
#include <migraphx/insert_pad.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/generate.hpp>
#include <migraphx/normalize_ops.hpp>
#include <migraphx/eliminate_data_type.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace ref {

std::string target::name() const { return "ref"; }

std::vector<pass> target::get_passes(migraphx::context&, const compile_options&) const
{
    return {normalize_ops{},
            eliminate_pad{},
            dead_code_elimination{},
            insert_pad{},
            dead_code_elimination{},
            rewrite_rnn{},
            dead_code_elimination{},
            auto_contiguous{},
            dead_code_elimination{},
            lowering{},
            dead_code_elimination{}};
}

argument target::allocate(const shape& s) const { return fill_argument(s, 0); }

MIGRAPHX_REGISTER_TARGET(target);

} // namespace ref
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
