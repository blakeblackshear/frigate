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
//
//     Supporting functions for enum values used in operator parameters.
//     These values are declared as "enum class" and should include << streaming operators
//     to be able to write their values in human-readable format so users can
//     save and edit model files.
//
#include <sstream>
#include <migraphx/op/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

std::ostream& operator<<(std::ostream& os, pooling_mode v)
{
    // the strings for the enum are the same as the values used for onnx parsing
    // but this enum is not onnx-specific:  strings must be converted when parsing tf
    static const std::vector<std::string> pooling_mode_str = {"average", "max", "lpnorm"};
    os << pooling_mode_str[static_cast<std::underlying_type<pooling_mode>::type>(v)];
    return os;
}
std::ostream& operator<<(std::ostream& os, rnn_direction v)
{
    static const std::vector<std::string> rnn_direction_str = {
        "forward", "reverse", "bidirectional"};
    os << rnn_direction_str[static_cast<std::underlying_type<rnn_direction>::type>(v)];
    return os;
}

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
