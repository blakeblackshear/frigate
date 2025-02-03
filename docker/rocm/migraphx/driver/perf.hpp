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
#ifndef MIGRAPHX_GUARD_RTGLIB_PERF_HPP
#define MIGRAPHX_GUARD_RTGLIB_PERF_HPP

#include <migraphx/program.hpp>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

parameter_map fill_param_map(parameter_map& m,
                             const std::unordered_map<std::string, shape>& param_shapes,
                             const target& t,
                             bool offload = false);
parameter_map create_param_map(const program& p, const target& t, bool offload = false);

parameter_map fill_param_map(parameter_map& m, const program& p, bool gpu);
parameter_map create_param_map(const program& p, bool gpu = true);
target get_target(bool gpu);
/**
 * @brief Checks if MIGraphX program compiled for "GPU" has offload_copy set of not. This is
 intended to print a HINT for the users and would not always correctly classify compiled program as
 with or without offload_copy in all cases.

 * @param p Compiled MIGraphX program for GPU backend
 * @return true if program is classified as compiled with "offload_copy" set
 */
bool is_offload_copy_set(const program& p);

double time_run(const program& p, const parameter_map& m, int n = 100);

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx

#endif
