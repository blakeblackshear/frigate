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
#ifndef MIGRAPHX_GUARD_OPERATORS_COMMON_HPP
#define MIGRAPHX_GUARD_OPERATORS_COMMON_HPP

#include <ostream>
#include <vector>
#include <migraphx/config.hpp>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

// Specifies where to add the "extra" cell of padding if the
// calculated padding is an odd number.
// Padding mode is default_ for fixed shape padding.
// same_lower and same_upper specify dynamic padding.
// The odd cell goes at the beginning of the dimension
// (same_lower) or end (same_upper).
enum padding_mode_t
{
    default_, // NOLINT
    same_lower,
    same_upper
};

// The pooling modes must correspond 1-1 to the operators defined for struct parse_pooling.
// Used in pooling and roialign operators.
enum class pooling_mode
{
    average,
    max,
    lpnorm
};

// indicate rnn computation direction
enum class rnn_direction
{
    forward,
    reverse,
    bidirectional,
};

MIGRAPHX_EXPORT std::ostream& operator<<(std::ostream& os, pooling_mode v);
MIGRAPHX_EXPORT std::ostream& operator<<(std::ostream& os, rnn_direction v);

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
