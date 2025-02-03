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

#ifndef MIGRAPHX_GUARD_FPGA_VITIS_AI_ADAPTER_HPP
#define MIGRAPHX_GUARD_FPGA_VITIS_AI_ADAPTER_HPP

#include <string>

#include <migraphx/instruction.hpp>
#include <migraphx/pass_manager.hpp>

namespace vitis_ai {

class x_model
{
    migraphx::shape shape;

    public:
    migraphx::shape get_shape() const;
    void set_shape(migraphx::shape);
};

x_model create_xmodel(migraphx::const_module_ref mod);

migraphx::argument execute(const x_model& xmodel,
                           const migraphx::shape& output_shape,
                           std::vector<migraphx::argument>& args);

} // namespace vitis_ai

#endif // MIGRAPHX_GUARD_FPGA_VITIS_AI_ADAPTER_HPP
