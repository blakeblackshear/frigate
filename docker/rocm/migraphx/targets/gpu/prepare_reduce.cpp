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
 *
 */
#include <migraphx/gpu/prepare_reduce.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct parallel_reduce
{
    operation op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.op, "op"));
    }

    std::string name() const { return "gpu::parallel_reduce"; }

    shape compute_shape(const std::vector<shape>& inputs) const
    {
        std::vector<shape> result;
        std::transform(inputs.begin(), inputs.end(), std::back_inserter(result), [&](auto input) {
            return op.compute_shape({input});
        });
        return shape{result};
    }
};
MIGRAPHX_REGISTER_OP(parallel_reduce);

namespace {

std::vector<instruction_ref> find_reduce(module& m)
{
    std::vector<instruction_ref> result;
    auto im = iterator_for(m);
    std::copy_if(im.begin(), im.end(), std::back_inserter(result), [](auto ins) {
        if(contains({"gpu::parallel_reduce", "reduce_mean"}, ins->name()))
            return false;
        return contains(ins->name(), "reduce");
    });
    return result;
}

std::vector<instruction_ref> find_parallel_reduce(const std::vector<instruction_ref>& r)
{
    std::vector<instruction_ref> result;
    auto ir = iterator_for(r);
    transform_if(
        ir.begin(),
        ir.end(),
        std::back_inserter(result),
        [&](auto x) {
            return std::none_of(
                std::next(x), r.end(), [&](auto reduce) { return reaches(*x, reduce); });
        },
        [](auto x) { return *x; });
    return result;
}

void fuse_reductions(module& m)
{
    auto rs = find_parallel_reduce(find_reduce(m));
    if(rs.size() < 2)
        return;
    // Only handle the same reduction operator for now
    if(std::any_of(std::next(rs.begin()), rs.end(), [&](auto r) {
           return rs.front()->name() != r->name();
       }))
        return;
    auto last = rs.front();
    auto op   = last->get_operator();
    std::vector<instruction_ref> inputs;
    std::transform(rs.begin(), rs.end(), std::back_inserter(inputs), [&](auto r) {
        return r->inputs().front();
    });
    auto pr = m.insert_instruction(last, parallel_reduce{op}, inputs);
    int i   = 0;
    for(auto r : rs)
    {
        m.replace_instruction(r, make_op("get_tuple_elem", {{"index", i}}), pr);
        i++;
    }
    m.sort();
}

} // namespace

void prepare_reduce::apply(module& m) const { fuse_reductions(m); }

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
