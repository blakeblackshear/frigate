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
#include <migraphx/tf/tf_parser.hpp>
#include <migraphx/tf/op_parser.hpp>
#include <iostream>
#include <fstream>
#include <unordered_map>
#include <functional>
#include <array>
#include <utility>
#include <vector>

#include <migraphx/program.hpp>
#include <migraphx/tf.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class... Ts>
program parse_tf_from(const tf_options& options, Ts&&... xs)
{
    tf::tf_parser parser;
    parser.is_nhwc           = options.is_nhwc;
    parser.batch_size        = options.batch_size;
    parser.map_input_dims    = options.map_input_dims;
    parser.output_node_names = options.output_node_names;

#ifndef NDEBUG
    // Log the program when it can't be parsed
    try
    {
        parser.parse_from(std::forward<Ts>(xs)...);
    }
    catch(...)
    {
        std::cerr << parser.prog << std::endl;
        throw;
    }
#else
    parser.parse_from(std::forward<Ts>(xs)...);
#endif
    return std::move(parser.prog);
}

program parse_tf(const std::string& name, const tf_options& options)
{
    std::fstream input(name.c_str(), std::ios::in | std::ios::binary);
    return parse_tf_from(options, input);
}

program parse_tf_buffer(const std::string& buffer, const tf_options& options)
{
    return parse_tf_from(options, buffer.data(), buffer.size());
}

program parse_tf_buffer(const void* data, std::size_t size, const tf_options& options)
{
    return parse_tf_from(options, data, size);
}

std::vector<std::string> get_tf_operators() { return tf::get_op_parsers(); }

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
