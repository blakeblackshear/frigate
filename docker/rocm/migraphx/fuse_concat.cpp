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
#include <migraphx/fuse_concat.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/module.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/register_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

unsigned int get_noop_counter()
{
    static unsigned int counter = 0;
    return counter++;
}

struct fused_concat
{
    int64_t axis = 0;

    std::string name() const { return "fused_concat"; }

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"));
    }

    shape compute_shape(std::vector<shape> inputs, const std::vector<module_ref>& mods) const
    {
        check_shapes{inputs, *this}.same_ndims();
        // original concat can have multiple inputs. Let's say it has `n` input args.
        // Each of those `n` input args are converted into pointwise modules that take atleast 1
        // input parameter. Fused concat will have `n+1` module arguments. `n+1`th module is the
        // post pointwise module which can take 0 or more input arguments.
        if((inputs.size() + 1) < mods.size())
            MIGRAPHX_THROW("FUSED_CONCAT: Missing fused modules inputs parameters");
        auto input_iter = inputs.begin();
        std::vector<shape> concat_inputs;
        for(module_ref mod : range(mods.begin(), mods.end() - 1))
        {
            concat_inputs.push_back(*input_iter);
            input_iter += mod->get_parameter_names().size();
        }
        module_ref post_mod          = mods.back();
        // post_mod has one input argument that is result of concat and will get generated from
        // pre-mods internally. Therefore deduct 1 from post_mod params while asserting.
        assert(input_iter + post_mod->get_parameter_names().size() - 1 == inputs.end());
        auto type                    = std::prev(post_mod->end())->get_shape().type();
        const auto& first_shape_lens = concat_inputs.front().lens();
        auto mismatch_it =
            std::find_if_not(concat_inputs.begin() + 1, concat_inputs.end(), [&](auto s) {
                const auto& lens = s.lens();
                return std::equal(lens.begin(),
                                  lens.begin() + axis,
                                  first_shape_lens.begin(),
                                  first_shape_lens.begin() + axis) and
                       std::equal(lens.begin() + axis + 1,
                                  lens.end(),
                                  first_shape_lens.begin() + axis + 1,
                                  first_shape_lens.end());
            });
        if(mismatch_it != concat_inputs.end())
            MIGRAPHX_THROW("FUSED_CONCAT: all input dimensions should match along non-axis of " +
                           std::to_string(axis) + ": {" + to_string_range(first_shape_lens) +
                           "} != {" + to_string_range(mismatch_it->lens()) + "}");

        std::size_t new_dim_axis = transform_accumulate(
            concat_inputs.begin(), concat_inputs.end(), 0, std::plus<>{}, [&](const auto& input) {
                return input.lens()[axis];
            });
        auto new_lens  = concat_inputs.front().lens();
        new_lens[axis] = new_dim_axis;
        return shape::from_permutation(type, new_lens, find_permutation(inputs));
    }
};
MIGRAPHX_REGISTER_OP(fused_concat);

namespace {
struct find_concat_pointwise
{
    auto matcher() const
    {
        auto pointwise_used_once = match::name("pointwise")(match::used_once());
        return match::name("concat")(match::used_once(),
                                     match::any_of[match::inputs()](pointwise_used_once));
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto concat_ins = r.result;

        std::vector<instruction_ref> inputs;
        size_t num_noops = 0;
        for(auto input : concat_ins->inputs())
        {
            if(input->name() == "pointwise" and input->outputs().size() == 1)
            {
                inputs.insert(inputs.end(), input->inputs().begin(), input->inputs().end());
            }
            else
            {
                num_noops++;
                inputs.push_back(input);
            }
        }
        if(num_noops > std::max(size_t{1}, concat_ins->inputs().size() / 4))
        {
            return;
        }
        std::vector<module_ref> module_inputs;
        std::transform(concat_ins->inputs().begin(),
                       concat_ins->inputs().end(),
                       std::back_inserter(module_inputs),
                       [&](instruction_ref input) {
                           if(input->name() == "pointwise" and input->outputs().size() == 1)
                           {
                               auto* pm = input->module_inputs().front();
                               return mpm.create_module("concat:" + pm->name(), *pm);
                           }
                           auto* pm = mpm.create_module("concat:noop" +
                                                        std::to_string(get_noop_counter()));
                           auto x   = pm->add_parameter("x0", shape{input->get_shape().type()});
                           pm->add_return({x});
                           return pm;
                       });
        auto* post_pm = mpm.create_module("noop:concat" + std::to_string(get_noop_counter()));
        auto x        = post_pm->add_parameter("!x0", shape{concat_ins->get_shape().type()});
        post_pm->add_return({x});
        module_inputs.push_back(post_pm);
        mpm.get_module().replace_instruction(
            concat_ins,
            make_op("fused_concat", concat_ins->normalized_operator().to_value()),
            inputs,
            module_inputs);
    }
};

struct find_pointwise_concat_pointwise
{
    auto matcher() const
    {
        auto pointwise = match::name("pointwise")(match::used_once());
        auto concat =
            match::name("concat")(match::used_once(), match::any_of[match::inputs()](pointwise));
        return match::name("pointwise")(match::any_of[match::inputs()](concat.bind("concat")));
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto ins        = r.result;
        auto concat_ins = r.instructions["concat"];

        auto concat_arg = std::find(ins->inputs().begin(), ins->inputs().end(), concat_ins) -
                          ins->inputs().begin();
        std::vector<instruction_ref> inputs;
        for(auto input : concat_ins->inputs())
        {
            if(input->name() == "pointwise" and input->outputs().size() == 1)
                inputs.insert(inputs.end(), input->inputs().begin(), input->inputs().end());
            else
                inputs.push_back(input);
        }
        std::copy_if(ins->inputs().begin(),
                     ins->inputs().end(),
                     std::back_inserter(inputs),
                     [&](auto input) { return input != concat_ins; });

        std::vector<module_ref> module_inputs;
        std::transform(concat_ins->inputs().begin(),
                       concat_ins->inputs().end(),
                       std::back_inserter(module_inputs),
                       [&](instruction_ref input) {
                           if(input->name() == "pointwise" and input->outputs().size() == 1)
                           {
                               auto* pm = input->module_inputs().front();
                               return mpm.create_module("concat:" + pm->name(), *pm);
                           }
                           auto* pm = mpm.create_module("concat:noop" +
                                                        std::to_string(get_noop_counter()));
                           auto x  = pm->add_parameter("x0", shape{input->get_shape().type()});
                           pm->add_return({x});
                           return pm;
                       });

        auto* post_pm                  = ins->module_inputs().front();
        auto* rm                       = mpm.create_module(post_pm->name() + ":concat", *post_pm);
        std::vector<std::string> names = rm->get_parameter_names();
        std::sort(names.begin(), names.end());
        auto concat_param_name = names[concat_arg];
        auto concat_param      = rm->get_parameter(concat_param_name);
        auto param = rm->add_parameter("!" + concat_param_name, concat_param->get_shape());
        rm->replace_instruction(concat_param, param);
        rm->remove_instruction(concat_param);

        module_inputs.push_back(rm);
        mpm.get_module().replace_instruction(
            ins,
            make_op("fused_concat", concat_ins->normalized_operator().to_value()),
            inputs,
            module_inputs);
    }
};

} // namespace

void fuse_concat::apply(module_pass_manager& mpm) const
{
    match::find_matches(mpm, find_pointwise_concat_pointwise{});
    mpm.run_pass(migraphx::dead_code_elimination{});
    match::find_matches(mpm, find_concat_pointwise{});
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
