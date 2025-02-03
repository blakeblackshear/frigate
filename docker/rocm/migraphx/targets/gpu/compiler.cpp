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
#include <migraphx/gpu/compiler.hpp>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

namespace {
struct compiler_handle
{
    compiler_compile compile;
    compiler_compile_op compile_op;
    compiler_tuning_config get_tuning_config;
};
} // namespace

auto& compiler_map()
{
    static std::unordered_map<std::string, compiler_handle> m; // NOLINT
    return m;
}

void register_compiler(const std::string& name,
                       compiler_compile c,
                       compiler_compile_op cop,
                       compiler_tuning_config ctg)
{
    compiler_map()[name] = {std::move(c), std::move(cop), std::move(ctg)};
}

bool has_compiler_for(const std::string& name) { return compiler_map().count(name) > 0; }
compiler_replace
compile(context& ctx, instruction_ref ins, const operation& op, const value& solution)
{
    return compiler_map().at(op.name()).compile(ctx, ins, op, solution);
}
operation
compile_op(const std::string& name, context& ctx, const std::vector<shape>& inputs, const value& v)
{
    return compiler_map().at(name).compile_op(ctx, inputs, v);
}

optional<tuning_config>
get_tuning_config(context& ctx, instruction_ref ins, const operation& op, bool exhaustive)
{
    return compiler_map().at(op.name()).get_tuning_config(ctx, ins, op, exhaustive);
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
