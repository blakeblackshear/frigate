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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_SHAPE_FOR_EACH_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_SHAPE_FOR_EACH_HPP

#include <migraphx/shape.hpp>
#include <migraphx/config.hpp>
#include <algorithm>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/**
 * Iterates the given function over the indices from the shape in order.
 */
template <class F>
void shape_for_each(const migraphx::shape& s, F f)
{
    std::vector<std::size_t> indices(s.lens().size());
    const auto& index_const_ref = indices;
    shape ss{s.type(), s.lens()};
    size_t max = ss.elements();
    for(std::size_t i = 0; i < max; i++)
    {
        std::transform(ss.strides().begin(),
                       ss.strides().end(),
                       ss.lens().begin(),
                       indices.begin(),
                       [&](std::size_t stride, std::size_t len) {
                           assert(len > 0 and stride > 0);
                           return (i / stride) % len;
                       });
        if constexpr(std::is_invocable<F, decltype(index_const_ref), decltype(i)>{})
            f(index_const_ref, i);
        else
            f(index_const_ref);
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
