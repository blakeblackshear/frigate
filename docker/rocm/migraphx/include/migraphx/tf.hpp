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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_TF_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_TF_HPP

#include <migraphx/program.hpp>
#include <migraphx/config.hpp>
#include <migraphx/tf/export.h>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/// struct to pass in tf options to parser
struct tf_options
{
    bool is_nhwc            = false;
    unsigned int batch_size = 1;
    /// Explicitly specify the dims of an input
    std::unordered_map<std::string, std::vector<std::size_t>> map_input_dims = {};
    std::vector<std::string> output_node_names                               = {};
};

/// Create a program from a tf pb file (default is nhwc format)
MIGRAPHX_TF_EXPORT program parse_tf(const std::string& name,
                                    const tf_options& options = tf_options{});

/// Create a program from an tf buffer
MIGRAPHX_TF_EXPORT program parse_tf_buffer(const std::string& buffer,
                                           const tf_options& options = tf_options{});

/// Create a program from tf buffer
MIGRAPHX_TF_EXPORT program parse_tf_buffer(const void* data,
                                           std::size_t size,
                                           const tf_options& options = tf_options{});

MIGRAPHX_TF_EXPORT std::vector<std::string> get_tf_operators();

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
