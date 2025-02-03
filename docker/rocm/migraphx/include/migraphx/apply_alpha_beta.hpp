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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_APPLY_ALPHA_BETA_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_APPLY_ALPHA_BETA_HPP

#include "migraphx/make_op.hpp"
#include "migraphx/normalize_attributes.hpp"
#include "migraphx/operation.hpp"
#include <migraphx/instruction_ref.hpp>
#include <migraphx/module.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_EXPORT
instruction_ref insert_apply_alpha_beta(module& m,
                                        instruction_ref pos,
                                        const std::vector<instruction_ref>& args,
                                        const operation& op,
                                        const literal& alpha,
                                        const literal& beta);

template <typename T = float>
instruction_ref insert_apply_alpha_beta(module& m,
                                        instruction_ref pos,
                                        const std::vector<instruction_ref>& args,
                                        const operation& op,
                                        T alpha = 1,
                                        T beta  = 0)
{
    return insert_apply_alpha_beta(m, pos, args, op, literal{T{alpha}}, literal{T{beta}});
}

template <typename T = float>
instruction_ref add_apply_alpha_beta(module& m,
                                     const std::vector<instruction_ref>& args,
                                     const operation& op,
                                     T alpha = 1,
                                     T beta  = 0)
{
    return insert_apply_alpha_beta(m, m.end(), args, op, alpha, beta);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_APPLY_ALPHA_BETA_HPP
