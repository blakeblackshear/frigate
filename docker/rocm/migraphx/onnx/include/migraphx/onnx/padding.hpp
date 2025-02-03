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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_PADDING_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_ONNX_PADDING_HPP

#include <migraphx/config.hpp>
#include <migraphx/onnx/onnx_parser.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

bool is_asym_padding(const std::vector<int64_t>& padding);

void cal_auto_padding_size(onnx_parser::node_info info,
                           value& v,
                           const std::vector<std::size_t>& k_lens,
                           const std::vector<std::size_t>& dilation,
                           const std::vector<std::size_t>& in_lens,
                           std::vector<int64_t>& paddings);

void check_padding_mode(const onnx_parser::node_info& info, const std::string& onnx_name);

void tune_padding_size(const value& v,
                       std::vector<int64_t>& padding,
                       int count_include_pad,
                       std::vector<int64_t>& s_start);

void check_asym_padding(const onnx_parser::node_info& info,
                        instruction_ref& ins,
                        const std::vector<int64_t>& padding,
                        value& v,
                        int count_include_pad = 0,
                        float pad_val         = 0);

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
