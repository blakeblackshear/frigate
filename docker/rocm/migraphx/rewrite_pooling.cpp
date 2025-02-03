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
#include <migraphx/rewrite_pooling.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/op/reshape.hpp>
#include <migraphx/op/reduce_mean.hpp>
#include <migraphx/op/reduce_max.hpp>
#include <migraphx/make_op.hpp>

#include <migraphx/program.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

static void replace_with_reduce(module& m, instruction_ref ins)
{
    auto&& s  = ins->inputs().front()->get_shape();
    auto&& op = any_cast<op::pooling>(ins->get_operator());
    auto lens = s.lens();
    std::vector<std::int64_t> axes(lens.size() - 2);
    std::iota(axes.begin(), axes.end(), 2);

    // average pooling
    if(op.mode == op::pooling_mode::average)
    {
        m.replace_instruction(ins, make_op("reduce_mean", {{"axes", axes}}), ins->inputs());
    }
    // max pooling
    else
    {
        m.replace_instruction(ins, make_op("reduce_max", {{"axes", axes}}), ins->inputs());
    }
}

static void replace_dilations_with_gather_pooling(module& m, instruction_ref ins)
{
    // TODO remove this when MIOpen supports dilated pooling
    auto&& s  = ins->inputs().front()->get_shape();
    auto&& op = any_cast<op::pooling>(ins->get_operator());
    // Ignore N, C axes
    std::vector<size_t> dims = {s.lens().cbegin() + 2, s.lens().cend()};

    bool default_padding =
        std::all_of(op.padding.cbegin(), op.padding.cend(), [](auto i) { return i == 0; });

    if(not default_padding)
    {
        for(size_t idx{0}; idx < op.padding.size(); ++idx)
        {
            // We need to pad both ends
            dims[idx] += op.padding.at(idx) * 2;
        }
    }
    std::vector<size_t> kernels   = op.lengths;
    std::vector<size_t> strides   = op.stride;
    std::vector<size_t> dilations = op.dilations;

    std::vector<std::vector<int>> axis_indices;
    axis_indices.resize(dims.size());

    for(auto idx{0}; idx < dims.size(); ++idx)
    {
        // Only consider if iw fits into the window
        for(size_t stride{0}; stride < dims.at(idx) - dilations.at(idx) * (kernels.at(idx) - 1);
            stride += strides.at(idx))
        {
            for(size_t step{0}; step < kernels.at(idx); ++step)
            {
                axis_indices.at(idx).push_back(stride + dilations.at(idx) * step);
            }
        }
    }

    auto elements = ins->inputs().front();
    if(not default_padding)
    {
        // Pad supports asym, we need to provide both ends
        std::vector<size_t> padding(2 * s.lens().size(), 0);
        // Format will be e.g {N, C, P1, P2, N, C, P1, P2}
        for(size_t idx{0}; idx < op.padding.size(); ++idx)
        {
            // Ignore N, C axes
            padding.at(2 + idx)                   = op.padding.at(idx);
            padding.at(2 + idx + s.lens().size()) = op.padding.at(idx);
        }

        // Default value needed for Max pooling
        elements = m.insert_instruction(
            ins,
            make_op("pad", {{"pads", padding}, {"value", std::numeric_limits<float>::lowest()}}),
            elements);
    }

    for(auto idx{0}; idx < axis_indices.size(); ++idx)
    {
        migraphx::shape s_indices{migraphx::shape::int32_type, {axis_indices.at(idx).size()}};
        auto indices = m.add_literal(migraphx::literal{s_indices, axis_indices.at(idx)});
        elements     = m.insert_instruction(
            ins, make_op("gather", {{"axis", idx + 2 /*ignore N,C*/}}), elements, indices);
    }

    // Ignore padding
    std::vector<size_t> new_padding(kernels.size(), 0);
    // The kernel window elements are places next to each other. E.g. {x1, y1, x2, y2, ...}
    // We need to skip them to not overlap
    std::vector<size_t> new_strides(kernels);
    // Ignore dilations
    std::vector<size_t> new_dilations(kernels.size(), 1);
    m.replace_instruction(ins,
                          make_op("pooling",
                                  {{"mode", op.mode},
                                   {"padding", new_padding},
                                   {"stride", new_strides},
                                   {"lengths", kernels},
                                   {"dilations", new_dilations}}),
                          elements);
}

void rewrite_pooling::apply(module& m) const
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "pooling")
            continue;
        if(ins->inputs().empty())
            continue;
        auto&& s                  = ins->inputs().front()->get_shape();
        auto&& op                 = any_cast<op::pooling>(ins->get_operator());
        bool same_kernel_as_shape = std::equal(
            s.lens().cbegin() + 2, s.lens().cend(), op.lengths.cbegin(), op.lengths.cend());
        bool default_strides =
            std::all_of(op.stride.cbegin(), op.stride.cend(), [](auto i) { return i == 1; });
        bool default_padding =
            std::all_of(op.padding.cbegin(), op.padding.cend(), [](auto i) { return i == 0; });
        bool default_dilations =
            std::all_of(op.dilations.cbegin(), op.dilations.cend(), [](auto i) { return i == 1; });
        if(same_kernel_as_shape and default_strides and default_padding and default_dilations)
        {
            replace_with_reduce(m, ins);
        }
        else if(not default_dilations)
        {
            // Dilated AvgPool with padding is not supported
            if(not default_padding and op.mode == op::pooling_mode::average)
            {
                continue;
            }
            auto size =
                std::accumulate(s.lens().cbegin(), s.lens().cend(), 1, std::multiplies<size_t>());
            // Can't handle too much size because of literal size
            if(size > 100000)
            {
                continue;
            }

            replace_dilations_with_gather_pooling(m, ins);
        }
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
