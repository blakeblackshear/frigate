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
#include <migraphx/gpu/compiler.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/gpu/compile_hip.hpp>
#include <migraphx/gpu/compile_gen.hpp>
#include <migraphx/reduce_dims.hpp>
#include <migraphx/algorithm.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

using namespace migraphx::gpu::gen; // NOLINT

// NOLINTNEXTLINE
static const char* const concat_kernel = R"__migraphx__(
#include <migraphx/kernels/concat.hpp>
#include <migraphx/kernels/vectorize.hpp>
#include <migraphx/kernels/ops.hpp>
#include <args.hpp>

namespace migraphx {

${preamble}

extern "C" {

MIGRAPHX_GLOBAL void ${kernel}(${params}) 
{
    transform_args(make_tensors(), rotate_last(), ${transformers})(${args})([](auto y, ${concat_params}, auto... xs) {
        concat<${axis}>(${concat_args})(${post}, y, xs...);
    });
}

}

} // namespace migraphx

)__migraphx__";

struct concat_compiler : compiler<concat_compiler>
{
    std::vector<std::string> names() const { return {"fused_concat", "concat"}; }

    static std::vector<shape> normalize(std::vector<shape> inputs, std::size_t& axis)
    {
        auto s = inputs.back();
        std::vector<std::size_t> strides(s.lens().size());
        strides[axis] = 1;

        inputs.push_back(shape{s.type(), s.lens(), strides});

        auto result   = reduce_dims(normalize_permutation(inputs));
        auto rstrides = result.back().strides();
        auto it = std::find_if(rstrides.begin(), rstrides.end(), [](auto x) { return x == 1; });
        axis    = it - rstrides.begin();
        result.pop_back();
        return result;
    }

    operation compile_op(context& ctx, const std::vector<shape>& inputs, const value& v) const
    {
        hip_compile_options options;
        options.inputs      = inputs;
        options.output      = inputs.back();
        auto concat_axis       = v.at("axis").to<std::size_t>();
        options.virtual_inputs = normalize(inputs, concat_axis);
        options.kernel_name = v.get("kernel", "concat_kernel");
        auto axis              = find_fast_axis(options.virtual_inputs);
        auto op_names       = v.at("ops").to_vector<std::string>();
        auto args           = v.at("args");
        vectorize vec{};
        if(axis != concat_axis)
            vec = vectorize::elements(ctx, axis, options.virtual_inputs);
        auto nelements_per_op = options.virtual_inputs.back().elements() / op_names.size();
        options.set_launch_params(v, compute_global_for(ctx, nelements_per_op / vec.size, 256));
        options.emplace_param("-Wno-float-equal");
        std::vector<std::string> concat_params;
        std::vector<std::string> concat_args;
        for(auto i : range(op_names.size()))
        {
            const auto& name = op_names[i];
            auto n           = args.at(name).to<std::size_t>();
            auto prefix      = to_c_id(name + std::to_string(i) + "_concat_x");
            transform(range(n), std::back_inserter(concat_params), [&](auto j) {
                return "auto " + prefix + std::to_string(j);
            });
            std::vector<std::string> pack_args = {"MIGRAPHX_LIFT(" + name + ")"};
            transform(range(n), std::back_inserter(pack_args), [&](auto j) {
                return prefix + std::to_string(j);
            });
            concat_args.push_back("pack(" + join_strings(pack_args, ", ") + ")");
        }
        auto src = interpolate_string(concat_kernel,
                                      {{"kernel", options.kernel_name},
                                       {"params", enum_params(inputs.size(), "void * private_p")},
                                       {"args", enum_params(inputs.size(), "private_p")},
                                       {"concat_params", join_strings(concat_params, ", ")},
                                       {"concat_args", join_strings(concat_args, ", ")},
                                       {"post", v.get("post", std::string{"op::id{}"})},
                                       {"transformers", make_transformer_args(vec)},
                                       {"preamble", v.get("preamble", std::string{})},
                                       {"axis", std::to_string(concat_axis)}});
        return compile_hip_code_object(ctx, src, options);
    }

    compiler_replace compile(context& ctx, instruction_ref ins, const operation& op) const
    {
        auto v = op.to_value();
        if(op.name() == "fused_concat")
        {
            std::unordered_map<std::string, std::string> mod_names_lookup;
            transform(range(ins->module_inputs().size()),
                      std::inserter(mod_names_lookup, mod_names_lookup.end()),
                      [&](auto i) {
                          return std::make_pair(ins->module_inputs()[i]->name(),
                                                "pointwise" + std::to_string(i));
                      });
            v["preamble"] = transform_accumulate(
                ins->module_inputs().begin(),
                ins->module_inputs().end(),
                std::string{},
                std::plus<>{},
                [&](module_ref mod) {
                    return generate_pointwise(*mod, mod_names_lookup.at(mod->name())) + "\n";
                });
            std::vector<std::string> mod_names;
            std::transform(ins->module_inputs().begin(),
                           ins->module_inputs().end() - 1,
                           std::back_inserter(mod_names),
                           [&](module_ref mod) { return mod_names_lookup.at(mod->name()); });
            v["ops"]            = mod_names;
            module_ref last_mod = ins->module_inputs().back();
            v["post"]           = "MIGRAPHX_LIFT(" + mod_names_lookup.at(last_mod->name()) + ")";
            std::unordered_map<std::string, std::size_t> mod_args;
            std::transform(ins->module_inputs().begin(),
                           ins->module_inputs().end() - 1,
                           std::inserter(mod_args, mod_args.end()),
                           [&](module_ref mod) {
                               const auto& name = mod_names_lookup.at(mod->name());
                               return std::make_pair(name, mod->get_parameter_names().size());
                           });
            v["args"]        = mod_args;
            auto prefix_name = transform_accumulate(ins->module_inputs().begin(),
                                                    ins->module_inputs().end() - 1,
                                                    std::string{},
                                                    std::plus<>{},
                                                    [&](module_ref mod) -> std::string {
                                                        auto name = generate_name_from_ops(*mod);
                                                        if(name.empty())
                                                            return "";
                                                        return name + "_";
                                                    });
            v["kernel"]      = prefix_name + "concat_" +
                          generate_name_from_ops(*(ins->module_inputs().back())) + "_kernel";
        }
        else if(op.name() == "concat")
        {
            auto concat_inputs = ins->inputs().size() - 1;
            if(not ins->module_inputs().empty())
            {
                auto* pm      = ins->module_inputs().front();
                concat_inputs = ins->inputs().size() - pm->get_parameter_names().size();
                v["preamble"] = generate_pointwise(*pm, "post_concat");
                v["post"]     = "MIGRAPHX_LIFT(post_concat)";
                v["kernel"]   = "concat_" + generate_name_from_ops(*pm) + "_kernel";
            }
            std::vector<std::string> mod_names(concat_inputs, "op::id{}");
            v["ops"]                                              = mod_names;
            std::unordered_map<std::string, std::size_t> mod_args = {{"op::id{}", 1}};
            v["args"]                                             = mod_args;
        }
        return compile_op(ctx, to_shapes(ins->inputs()), v);
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
