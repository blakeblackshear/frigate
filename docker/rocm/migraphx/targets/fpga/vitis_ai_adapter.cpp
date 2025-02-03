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

#include "migraphx/fpga/vitis_ai_adapter.hpp"

#include "migraphx/module.hpp"

#include "migraphx/stringutils.hpp"
namespace vitis_ai {

migraphx::shape x_model::get_shape() const { return shape; };

void x_model::set_shape(migraphx::shape s) { shape = s; }

x_model create_xmodel(migraphx::const_module_ref mod)
{
    std::cout << "Calling an external function: create_xmodel!\n";
    x_model xmodel;
    xmodel.set_shape(migraphx::shape(mod->get_output_shapes()));
    return xmodel;
}

migraphx::argument execute(const x_model& xmodel,
                           const migraphx::shape& output_shape,
                           std::vector<migraphx::argument>& args)
{
    (void)xmodel;

    std::cout << "Calling an external function: execute!\n";

    std::cout << "Output Shape: " << output_shape << std::endl;
    std::cout << "Args: " << args.size() << std::endl;
    for(const auto& arg : args)
    {
        std::cout << "  " << arg.get_shape() << std::endl;
    }
    std::cout << std::endl;

    migraphx::argument result{output_shape};

    return result;
}

} // namespace vitis_ai
