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

#include <migraphx/auto_contiguous.hpp>
#include <migraphx/adjust_allocation.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/eliminate_allocation.hpp>
#include <migraphx/eliminate_common_subexpression.hpp>
#include <migraphx/eliminate_concat.hpp>
#include <migraphx/eliminate_contiguous.hpp>
#include <migraphx/eliminate_data_type.hpp>
#include <migraphx/eliminate_identity.hpp>
#include <migraphx/eliminate_pad.hpp>
#include <migraphx/eliminate_convert.hpp>
#include <migraphx/memory_coloring.hpp>
#include <migraphx/propagate_constant.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/replace_allocate.hpp>
#include <migraphx/rewrite_pooling.hpp>
#include <migraphx/rewrite_quantization.hpp>
#include <migraphx/rewrite_rnn.hpp>
#include <migraphx/schedule.hpp>
#include <migraphx/simplify_algebra.hpp>
#include <migraphx/simplify_reshapes.hpp>
#include <migraphx/preallocate_param.hpp>
#include <migraphx/cpu/fuse_ops.hpp>
#include <migraphx/cpu/write_literals.hpp>
#include <migraphx/cpu/allocation_model.hpp>
#include <migraphx/cpu/target.hpp>
#include <migraphx/cpu/context.hpp>
#include <migraphx/cpu/lowering.hpp>
#include <migraphx/pass.hpp>
#include <migraphx/generate.hpp>
#include <migraphx/normalize_ops.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

std::string target::name() const { return "cpu"; }

// cppcheck-suppress constParameterReference
std::vector<pass> target::get_passes(migraphx::context& gctx, const compile_options&) const
{
    auto& ctx = any_cast<context>(gctx);
    std::set<shape::type_t> unsupported_types(shape::types().begin(), shape::types().end());
    std::set<std::string> unsupported_ops{
        "all", "scatternd_add", "scatternd_mul", "scatternd_none"};
    unsupported_types.erase(shape::type_t::float_type);
    return {normalize_ops{},
            rewrite_quantization{},
            dead_code_elimination{},
            eliminate_data_type{unsupported_types, shape::type_t::float_type, unsupported_ops},
            dead_code_elimination{},
            simplify_reshapes{},
            eliminate_convert{},
            eliminate_identity{},
            eliminate_pad{},
            dead_code_elimination{},
            rewrite_rnn{},
            dead_code_elimination{},
            eliminate_common_subexpression{},
            dead_code_elimination{},
            simplify_algebra{},
            simplify_reshapes{},
            eliminate_convert{},
            dead_code_elimination{},
            simplify_reshapes{},
            eliminate_convert{},
            dead_code_elimination{},
            simplify_algebra{},
            simplify_reshapes{},
            eliminate_convert{},
            dead_code_elimination{},
            propagate_constant{},
            dead_code_elimination{},
            auto_contiguous{},
            lowering{},
            eliminate_contiguous{"dnnl::reorder"},
            dead_code_elimination{},
            replace_allocate{cpu_allocation_model{}},
            dead_code_elimination{},
            adjust_allocation{cpu_allocation_model{}},
            dead_code_elimination{},
            fuse_ops{&ctx},
            dead_code_elimination{},
            write_literals{},
            dead_code_elimination{},
            memory_coloring{"cpu::allocate"},
            dead_code_elimination{},
            preallocate_param{"scratch", cpu_allocation_model{}},
            dead_code_elimination{}};
}

argument target::allocate(const shape& s) const { return fill_argument(s, 0); }

MIGRAPHX_REGISTER_TARGET(target);

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
