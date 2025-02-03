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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_REWRITE_RESHAPES_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_REWRITE_RESHAPES_HPP

#include <migraphx/config.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/common_dims.hpp>
#include <migraphx/simplify_reshapes.hpp>
#include <migraphx/eliminate_common_subexpression.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/shape_transform_descriptor.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct rewrite_reshapes_base
{
    template <class AxesMap>
    static instruction_ref insert(module_pass_manager& mpm,
                                  instruction_ref ins,
                                  const std::vector<instruction_ref>& inputs,
                                  const AxesMap&)
    {
        return mpm.get_module().insert_instruction(
            ins, ins->get_operator(), inputs, ins->module_inputs());
    }

    template <class AxesMap>
    static bool supports(instruction_ref, std::vector<std::size_t>&, const AxesMap&)
    {
        return true;
    }

    static std::vector<std::size_t> base_dims(instruction_ref ins)
    {
        return ins->get_shape().lens();
    }
};

template <class T>
struct rewrite_reshapes
{
    std::string name() const { return "rewrite_reshapes"; }
    struct find_op_reshape_op
    {
        std::string op1;
        std::string op2;

        auto matcher() const
        {
            auto reshapes          = match::name("reshape",
                                        "squeeze",
                                        "unsqueeze",
                                        "flatten",
                                        "transpose",
                                        "contiguous",
                                        "multibroadcast",
                                        "broadcast")(match::used_once());
            auto pointwise         = match::name(op1)(match::used_once());
            auto reshapes_pointwise =
                reshapes(match::arg(0)(match::skip(reshapes())(pointwise.bind("x"))));
            return match::name(op2)(
                match::any_of[match::inputs()](reshapes_pointwise.bind("input")));
        }

        template <class F>
        static instruction_ref find_input_if(instruction_ref start, instruction_ref last, F f)
        {
            while(start != last)
            {
                if(f(start))
                    return start;
                if(start->inputs().size() != 1)
                    return last;
                start = start->inputs().front();
            }
            return last;
        }

        template <class F>
        static bool any_input_of(instruction_ref start, instruction_ref last, F f)
        {
            return find_input_if(start, last, f) != last;
        }

        static bool match_input(instruction_ref ins, instruction_ref x_ins)
        {
            if(ins->inputs().empty())
                return false;
            auto input = ins->inputs().front();
            if(input->name() == "contiguous")
                return match_input(input, x_ins);
            return x_ins == input;
        }

        static std::optional<bool> is_broadcasted(instruction_ref start, instruction_ref last)
        {
            auto broadcast_ins =
                find_input_if(start, last, [&](auto i) { return i->name() == "multibroadcast"; });
            bool result = broadcast_ins != last;
            if(result and not match_input(broadcast_ins, last))
                return nullopt;
            return result;
        }

        static bool is_broadcast(instruction_ref ins) { return ins->name() == "multibroadcast"; }

        void apply(module_pass_manager& mpm, const match::matcher_result& r) const
        {
            auto ins         = r.result;
            auto x_ins       = r.instructions["x"];
            auto input_ins   = r.instructions["input"];

            // If its just a broadcast then skip
            if(not any_input_of(input_ins, x_ins, [](instruction_ref x) {
                   return not contains({"multibroadcast", "broadcast", "contiguous"}, x->name());
               }))
                return;

            auto dims1 = T::base_dims(ins);
            auto dims2 = T::base_dims(x_ins);

            if(elements(dims1) != elements(dims2))
                return;

            std::vector<operation> ops;
            auto next_ins = input_ins;
            while(next_ins != x_ins)
            {
                ops.push_back(next_ins->get_operator());
                next_ins = next_ins->inputs().front();
            }
            assert(next_ins == x_ins);
            std::reverse(ops.begin(), ops.end());

            auto desc =
                shape_transform_descriptor::create(x_ins->get_shape().lens(), ops).rebase(dims2);
            if(desc.empty())
                return;
            auto cdims         = desc.common_dims();
            auto reshape_input = [&](const auto& ins_to_insert, auto generate) {
                return [&, generate](auto input) {
                    auto gops  = std::invoke(generate, desc, input->get_shape().lens());
                    auto start = input;
                    for(const auto& op : gops)
                    {
                        start = mpm.get_module().insert_instruction(ins_to_insert, op, start);
                    }
                    return start;
                };
            };
            auto x_inputs = x_ins->inputs();
            std::transform(
                x_inputs.begin(),
                x_inputs.end(),
                x_inputs.begin(),
                reshape_input(x_ins, &shape_transform_descriptor::generate_common_from_src));
            auto new_x_ins = insert(mpm, x_ins, x_inputs, desc.common_axes_map_from_src());
            if(new_x_ins->get_shape().lens() != cdims)
            {
                new_x_ins = mpm.get_module().insert_instruction(
                    x_ins, make_op("multibroadcast", {{"out_lens", cdims}}), new_x_ins);
            }

            auto inputs = ins->inputs();
            std::transform(inputs.begin(), inputs.end(), inputs.begin(), [&](auto input) {
                if(input == input_ins)
                    return new_x_ins;
                return reshape_input(ins,
                                     &shape_transform_descriptor::generate_common_from_dst)(input);
            });
            auto pw = insert(mpm, ins, inputs, desc.common_axes_map_from_dst());
            auto rins =
                reshape_input(ins, &shape_transform_descriptor::generate_dst_from_common)(pw);
            mpm.get_module().replace_instruction(ins, rins);
        }

        static bool same_dims(instruction_ref ins)
        {
            return all_of(ins->inputs(), [&](auto input) {
                return input->get_shape().lens() == ins->get_shape().lens();
            });
        }

        template <class AxesMap>
        static instruction_ref insert(module_pass_manager& mpm,
                                      instruction_ref ins,
                                      const std::vector<instruction_ref>& inputs,
                                      const AxesMap& am)
        {
            if(ins->name() == "pointwise")
                return mpm.get_module().insert_instruction(
                    ins, ins->get_operator(), inputs, ins->module_inputs());
            return T::insert(mpm, ins, inputs, am);
        }
    };

    void apply(module_pass_manager& mpm) const
    {
        if(T::name() == "pointwise")
        {
            match::find_matches(mpm, find_op_reshape_op{"pointwise", T::name()});
        }
        else
        {
            match::find_matches(mpm,
                                find_op_reshape_op{"pointwise", T::name()},
                                find_op_reshape_op{T::name(), "pointwise"},
                                find_op_reshape_op{T::name(), T::name()});
        }
        mpm.run_pass(simplify_reshapes{1});
        mpm.run_pass(eliminate_common_subexpression{});
        mpm.run_pass(dead_code_elimination{});
    }
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_REWRITE_RESHAPES_HPP
