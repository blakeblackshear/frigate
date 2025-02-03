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
#ifndef MIGRAPHX_GUARD_RTGLIB_QUANTIZATION_HPP
#define MIGRAPHX_GUARD_RTGLIB_QUANTIZATION_HPP

#include <string>
#include <vector>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/config.hpp>
#include <migraphx/target.hpp>
#include <migraphx/program.hpp>
#include <migraphx/env.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct program;

MIGRAPHX_EXPORT void quantize_fp16(program& prog,
                                   const std::vector<std::string>& ins_names = {"all"});

MIGRAPHX_EXPORT void quantize_int8(program& prog,
                                   const target& t,
                                   const std::vector<parameter_map>& calibration,
                                   const std::unordered_set<std::string>& ins_names = {
                                       "dot", "convolution"});
MIGRAPHX_EXPORT void
quantize_fp8(program& prog, const target& t, const std::vector<parameter_map>& calibration);

MIGRAPHX_EXPORT void quantize_int4_weights(program& prog);

MIGRAPHX_EXPORT void quantize_bf16(program& prog,
                                   const std::vector<std::string>& ins_names = {"all"});

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
