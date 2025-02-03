/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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

#include <migraphx/fpga/lowering.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/stringutils.hpp>
#include <iostream>

#include "migraphx/fpga/vitis_ai_adapter.hpp"

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace fpga {

struct fpga_vitis_op
{
    fpga_vitis_op() = default;
    explicit fpga_vitis_op(vitis_ai::x_model model) : xmodel(std::move(model)){};

    vitis_ai::x_model xmodel;
    int dummy = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        // return pack(f(self.xmodel, "xmodel"));
        return pack(f(self.dummy, "dummy"));
    }

    std::string name() const { return "fpga::vitis_ai"; }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        (void)inputs;
        return xmodel.get_shape();
    }

    argument
    compute(const context& ctx, const shape& output_shape, std::vector<argument> args) const
    {
        std::cout << "The context is " << ctx.id << std::endl;
        return ::vitis_ai::execute(xmodel, output_shape, args);
    }
};
MIGRAPHX_REGISTER_OP(fpga_vitis_op)

void lowering::apply(module& m) const
{
    auto* mod = &m;

    // test modifying the context from a pass
    ctx->id = 2;

    for(auto it : iterator_for(*mod))
    {
        if(it->name() == "fpga::vitis_placeholder")
        {
            assert(it->module_inputs().size() == 1);
            auto xmodel = ::vitis_ai::create_xmodel(it->module_inputs()[0]);
            mod->replace_instruction(it, fpga_vitis_op{xmodel}, it->inputs());
        }
    }
}

} // namespace fpga
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
