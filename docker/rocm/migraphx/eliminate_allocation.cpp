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
#include <migraphx/eliminate_allocation.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/serialize.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void eliminate_allocation::apply(module& m) const
{
    assert(alignment > 0);

    std::size_t n = 0;
    std::vector<std::pair<instruction_ref, std::size_t>> allocs;
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != allocation_op)
            continue;
        allocs.emplace_back(ins, n);
        std::size_t size    = ins->get_shape().bytes();
        std::size_t padding = (alignment - (size % alignment)) % alignment;
        n += size + padding;
    }
    if(n > 0)
    {
        auto mem = m.add_parameter("memory", shape{shape::int8_type, {n}});
        for(auto&& pp : allocs)
        {
            auto ins    = pp.first;
            auto s      = ins->get_shape();
            auto offset = pp.second;
            m.replace_instruction(
                ins, make_op("load", {{"shape", to_value(s)}, {"offset", offset}}), mem);
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
