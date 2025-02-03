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
#include <migraphx/dom_info.hpp>
#include <migraphx/program.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/erase.hpp>
#include <migraphx/ranges.hpp>
#include <unordered_set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

bool dominator_info::strictly_dominate(instruction_ref ins1, instruction_ref ins2) const
{
    if(ins1 == ins2)
        return false;
    auto iter = ins2idom.find(ins2);
    while(iter != ins2idom.end())
    {
        if(ins1 == iter->second)
            return true;
        assert(iter != ins2idom.find(iter->second));
        iter = ins2idom.find(iter->second);
    }
    return false;
}

struct module_visitor
{
    const module* mm;
    const module& get_nodes() const { return *mm; }

    const std::vector<instruction_ref>& get_children(instruction_ref ins) { return ins->inputs(); }
};

template <class Visitor>
dominator_info compute_dominator_generic(Visitor v)
{
    dominator_info info;
    std::unordered_map<instruction_ref, std::unordered_set<instruction_ref>> instr2_doms;
    for(instruction_ref ins : iterator_for(v.get_nodes()))
    {
        const std::vector<instruction_ref>& children = v.get_children(ins);
        if(children.size() == 1)
        {
            info.ins2idom[ins] = children.front();
            instr2_doms[ins]   = instr2_doms[children.front()];
        }
        else if(children.size() > 1)
        {
            auto&& doms = instr2_doms[ins];

            doms = instr2_doms[children.front()];
            std::for_each(children.begin() + 1, children.end(), [&](instruction_ref child) {
                auto&& child_doms = instr2_doms[child];
                erase_if(doms, [&](auto x) { return not contains(child_doms, x); });
            });
            auto iter = std::find_if(doms.begin(), doms.end(), [&](auto dom1) {
                return std::none_of(doms.begin(), doms.end(), [&](auto dom2) {
                    if(dom1 == dom2)
                        return false;
                    return info.strictly_dominate(dom1, dom2);
                });
            });
            if(iter != doms.end())
                info.ins2idom[ins] = *iter;
        }
        instr2_doms[ins].insert(ins);
    }
    return info;
}

dominator_info compute_dominator(const module& m)
{
    return compute_dominator_generic(module_visitor{&m});
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
