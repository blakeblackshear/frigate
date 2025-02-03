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
#include <migraphx/cpu/fuse_ops.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/value.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/context.hpp>
#include <migraphx/env.hpp>
#include <migraphx/cpu/context.hpp>
#include <migraphx/dead_code_elimination.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_DISABLE_DNNL_POST_OPS_WORKAROUND);

MIGRAPHX_PRED_MATCHER(has_post_ops, instruction_ref ins)
{
    auto v = ins->get_operator().to_value();
    return v.contains("post_ops");
}

MIGRAPHX_PRED_MATCHER(without_post_ops, instruction_ref ins)
{
    auto v = ins->get_operator().to_value();
    return v.contains("post_ops") and v["post_ops"].empty();
}

bool workaround_dnnl_broken_post_ops(const operation& op, const operation& post_op)
{
    if(contains({"dnnl::dot", "dnnl::convolution"}, op.name()))
        return true;
    auto pv = post_op.to_value();
    if(not pv.at("post_ops").empty())
        return true;
    auto v         = op.to_value();
    auto last_op   = v.at("post_ops").empty() ? v : v.at("post_ops").back();
    auto algo      = last_op.contains("algo") ? last_op.at("algo").to<std::string>() : op.name();
    auto post_algo = pv["algo"].to<std::string>();
    if(starts_with(algo, "eltwise") and starts_with(post_algo, "eltwise"))
        return true;
    if(algo == post_algo)
        return true;
    return false;
}

operation merge_post_ops(const operation& op, const operation& post_op)
{
    auto pv = post_op.to_value();
    auto v  = op.to_value();
    v["post_ops"].push_back({{"algo", pv["algo"]},
                             {"alpha", pv["alpha"].value_or(0.0f)},
                             {"beta", pv["beta"].value_or(0.0f)}});
    auto post_ops = pv.at("post_ops");
    for(const auto& po : post_ops)
        v["post_ops"].push_back(po);
    return make_op(op.name(), v);
}

struct find_post_ops
{
    context* ctx = nullptr;
    match::any_matcher matcher() const
    {
        if(enabled(MIGRAPHX_DISABLE_DNNL_POST_OPS_WORKAROUND{}))
            return match::name("dnnl::eltwise",
                               "dnnl::binary")(match::arg(0)(has_post_ops(), match::used_once()));
        else
        {
            auto dnnl_binary = match::name("dnnl::binary")(without_post_ops(), match::used_once());
            return match::name("dnnl::eltwise")(without_post_ops(), match::arg(0)(dnnl_binary));
        }
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto x_ins = ins->inputs().front();
        auto x     = x_ins->get_operator();

        if(workaround_dnnl_broken_post_ops(x, ins->get_operator()))
            return;

        auto op       = merge_post_ops(x, ins->get_operator());
        auto inputs   = x_ins->inputs();
        inputs.back() = ins->inputs().back();
        if(ins->name() == "dnnl::binary")
            inputs.insert(std::prev(inputs.end()), ins->inputs().at(1));
        auto input_shapes = to_shapes(inputs);
        auto new_shape    = try_compute_shape(op, input_shapes);
        if(new_shape.empty() or new_shape.front() != ins->get_shape())
            return;
        auto info = compile(op, *ctx, new_shape.front(), input_shapes);
        if(info.contains("impl") and starts_with(info.at("impl").to<std::string>(), "ref:"))
            return;
        m.replace_instruction(ins, op, inputs);
    }
};

void fuse_ops::apply(module& m) const
{
    for(std::size_t i = 0; i < 4; i++)
    {
        match::find_matches(m, find_post_ops{ctx});
        dead_code_elimination{}.apply(m);
    }
}

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
