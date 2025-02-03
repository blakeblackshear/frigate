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
#include <migraphx/auto_contiguous.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

void auto_contiguous::apply(module& m) const
{
    std::string key = "require_std_shape";
    for(auto ins : reverse_iterator_for(m))
    {
        auto&& attr = ins->get_operator().attributes();
        if((attr.get(key, false)))
        {
            auto args     = ins->inputs();
            auto new_args = args;
            std::transform(args.begin(), args.end(), new_args.begin(), [&](auto in) {
                if(in->name() == "contiguous")
                {
                    return in;
                }
                return m.insert_instruction(ins, make_op("contiguous"), in);
            });

            if(new_args != args)
            {
                m.replace_instruction(ins, ins->get_operator(), new_args);
            }
        }
    }

    auto last = std::prev(m.end());
    for(auto ins : iterator_for(m))
    {
        if(contains({"layout", "@return"}, ins->name()))
            continue;
        // for last instruction that is NOT a return
        if(ins->outputs().empty() and ins != last)
            continue;
        shape s = ins->get_shape();
        // If s is not standard layout or has out of sequence strides, insert "contiguous" op
        // to make a standard shape
        if(not s.dynamic() and (not s.standard() or s.normalize_standard() != s) and
           s.elements() > 1)
        {
            auto c = m.insert_instruction(std::next(ins), make_op("contiguous"), ins);
            m.replace_instruction(ins, c);
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
