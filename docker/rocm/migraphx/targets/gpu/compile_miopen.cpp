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
#include <migraphx/gpu/compile_miopen.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/module.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/op/identity.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct miopen_op
{
    operation op = op::identity{};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.op, "op"));
    }

    std::string name() const { return "gpu::miopen_op"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        inputs.push_back(inputs.back());
        return op.compute_shape(inputs);
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }
};
MIGRAPHX_REGISTER_OP(miopen_op);

std::size_t compile_miopen::compile(operation& op, instruction_ref ins) const
{
    auto v = op.compile(*ctx, ins->get_shape(), to_shapes(ins->inputs()));
    return v.get<std::size_t>("workspace", 0);
}

void compile_miopen::apply(module& m) const
{
    assert(ctx);
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "gpu::miopen_op")
            continue;
        auto op        = any_cast<miopen_op>(ins->get_operator()).op;
        std::size_t ws = 0;
        ws             = compile(op, ins);
        auto inputs    = ins->inputs();
        auto alloc     = m.insert_instruction(
            ins, make_op("allocate", {{"shape", to_value(shape{shape::int8_type, {ws}})}}));
        inputs.insert(std::prev(inputs.end()), alloc);

        m.replace_instruction(ins, op, inputs);
    }
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
