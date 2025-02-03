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

#include "passes.hpp"

#include <migraphx/auto_contiguous.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/eliminate_allocation.hpp>
#include <migraphx/eliminate_common_subexpression.hpp>
#include <migraphx/eliminate_concat.hpp>
#include <migraphx/eliminate_contiguous.hpp>
#include <migraphx/eliminate_data_type.hpp>
#include <migraphx/eliminate_identity.hpp>
#include <migraphx/eliminate_pad.hpp>
#include <migraphx/fuse_pointwise.hpp>
#include <migraphx/fuse_reduce.hpp>
#include <migraphx/inline_module.hpp>
#include <migraphx/insert_pad.hpp>
#include <migraphx/normalize_ops.hpp>
#include <migraphx/optimize_module.hpp>
#include <migraphx/promote_literals.hpp>
#include <migraphx/propagate_constant.hpp>
#include <migraphx/rewrite_gelu.hpp>
#include <migraphx/rewrite_pooling.hpp>
#include <migraphx/rewrite_quantization.hpp>
#include <migraphx/rewrite_rnn.hpp>
#include <migraphx/simplify_algebra.hpp>
#include <migraphx/simplify_dyn_ops.hpp>
#include <migraphx/simplify_qdq.hpp>
#include <migraphx/simplify_reshapes.hpp>

#include <migraphx/ranges.hpp>
#include <unordered_map>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

std::unordered_map<std::string, pass> create_passes_lookup()
{
    std::unordered_map<std::string, pass> result;
    // clang-format off
    std::initializer_list<pass> passes = {
        auto_contiguous{},
        dead_code_elimination{},
        eliminate_allocation{},
        eliminate_common_subexpression{},
        eliminate_concat{},
        eliminate_contiguous{},
        eliminate_data_type{},
        eliminate_identity{},
        eliminate_pad{},
        fuse_pointwise{},
        fuse_reduce{},
        inline_module{},
        insert_pad{},
        normalize_ops{},
        optimize_module{},
        promote_literals{},
        propagate_constant{},
        rewrite_gelu{},
        rewrite_pooling{},
        rewrite_quantization{},
        rewrite_rnn{},
        simplify_algebra{},
        simplify_dyn_ops{},
        simplify_qdq{},
        simplify_reshapes{},
    };
    // clang-format on
    for(const auto& pass : passes)
        result[pass.name()] = pass;
    result["eliminate_dead_code"] = dead_code_elimination{};
    return result;
}

std::vector<pass> get_passes(const std::vector<std::string>& names)
{
    std::vector<pass> result;
    static const std::unordered_map<std::string, pass> lookup = create_passes_lookup();
    std::transform(
        names.begin(), names.end(), std::back_inserter(result), [](const std::string& name) {
            if(not contains(lookup, name))
                MIGRAPHX_THROW("Unknown pass: " + name);
            return lookup.at(name);
        });
    return result;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx
