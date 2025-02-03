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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_REGISTER_OP_PARSER_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_REGISTER_OP_PARSER_HPP

#include <migraphx/config.hpp>
#include <migraphx/auto_register.hpp>
#include <migraphx/onnx/onnx_parser.hpp>
#include <cstring>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct op_desc
{
    std::string onnx_name = "";
    std::string op_name   = "";
};

void register_op_parser(const std::string& name, onnx_parser::op_func f);
onnx_parser::op_func get_op_parser(const std::string& name);
std::vector<std::string> get_op_parsers();

inline std::vector<instruction_ref> implicit_multi_op(std::vector<instruction_ref> inss)
{
    return inss;
}

inline std::vector<instruction_ref> implicit_multi_op(instruction_ref ins) { return {ins}; }

template <class T>
void register_op_parser()
{
    T parser;
    for(auto&& opd : parser.operators())
        register_op_parser(opd.onnx_name, [opd, parser](auto&&... xs) {
            return implicit_multi_op(parser.parse(opd, xs...));
        });
}

struct register_op_parser_action
{
    template <class T>
    static void apply()
    {
        register_op_parser<T>();
    }
};

template <class T>
using op_parser = auto_register<register_op_parser_action, T>;

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
