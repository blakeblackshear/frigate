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
#ifndef MIGRAPHX_GUARD_ERASE_HPP
#define MIGRAPHX_GUARD_ERASE_HPP

#include <algorithm>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/**
 * @brief Erase all elements from a container
 *
 * @param r The container to erase elements from
 * @param value The value to be erased
 * @return Returns iterator to erased element
 */
template <class R, class T>
auto erase(R&& r, const T& value)
{
    return r.erase(std::remove(r.begin(), r.end(), value), r.end());
}

/**
 * @brief Erase all elements from a container
 *
 * @param r The container to erase elements from
 * @param pred Predicate function that selects which elements should be erased.
 */
template <class R, class P>
void erase_if(R&& r, P&& pred)
{
    auto first = r.begin();
    auto last  = r.end();
    while(first != last)
    {
        if(pred(*first))
            first = r.erase(first);
        else
            first++;
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
