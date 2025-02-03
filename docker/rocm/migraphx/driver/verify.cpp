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
#include "verify.hpp"
#include "perf.hpp"

#include <migraphx/register_target.hpp>
#include <migraphx/generate.hpp>
#include <migraphx/verify_args.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/compile_options.hpp>
#include <migraphx/quantization.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/fp_to_double.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

/**
 * Gives tolerances based on user input (`rms_tol`, `atol`, `rtol` parameters) and defaults.
 * Sets to fp16 tolerances if `quantize` input is fp16 or any fp16 instruction in found in the
 * model.
 */
verify::tolerance get_tolerances(const program& p,
                                 verify_options vo,
                                 std::optional<double> rms_tol,
                                 std::optional<double> atol,
                                 std::optional<double> rtol)
{
    bool has_16bit = any_of(p.get_modules(), [](auto&& m) {
        return any_of(*m, [](auto&& ins) {
            return (ins.get_shape().type() == shape::half_type or
                    ins.get_shape().type() == shape::bf16_type);
        });
    });
    migraphx::verify::tolerance result{};
    if(has_16bit or vo.quantize == precision::fp16 or vo.quantize == precision::bf16)
    {
        result.rms_tol = 8e-2;
        result.atol    = 4e-2;
        result.rtol    = 4e-2;
    }
    if(rms_tol)
    {
        result.rms_tol = *rms_tol;
    }
    if(atol)
    {
        result.atol = *atol;
    }
    if(rtol)
    {
        result.rtol = *rtol;
    }
    return result;
}

std::vector<argument> run_ref(program p,
                              const compile_options& options,
                              const verify_options& vo,
                              const parameter_map& inputs)
{
    if(vo.ref_use_double)
    {
        run_passes(p, {fp_to_double{}});
    }
    p.compile(migraphx::make_target("ref"), options);
    auto out = p.eval(inputs);
    std::cout << p << std::endl;
    return out;
}

std::vector<argument> run_target(program p,
                                 const target& t,
                                 const compile_options& options,
                                 const verify_options& vo,
                                 const parameter_map& inputs)
{
    if(vo.quantize == precision::fp16)
    {
        quantize_fp16(p);
    }
    if(vo.quantize == precision::bf16)
    {
        quantize_bf16(p);
    }
    p.compile(t, options);

    parameter_map m;
    for(auto&& x : p.get_parameter_shapes())
    {
        auto arg   = inputs.count(x.first) == 0 ? generate_argument(x.second) : inputs.at(x.first);
        m[x.first] = options.offload_copy ? arg : t.copy_to(arg);
    }
    auto gpu_out = p.eval(m);
    std::vector<argument> output(gpu_out.size());
    std::cout << p << std::endl;
    std::transform(gpu_out.begin(), gpu_out.end(), output.begin(), [&](auto& argu) {
        return options.offload_copy ? argu : t.copy_from(argu);
    });
    return output;
}

bool verify_program(const std::string& name,
                    const program& p,
                    const target& t,
                    compile_options options,
                    verify_options vo,
                    const parameter_map& inputs,
                    verify::tolerance tols)
{
    auto ref_outs    = run_ref(p, options, vo, inputs);
    auto target_outs = run_target(p, t, options, vo, inputs);

    std::size_t output_num = ref_outs.size();
    bool passed            = true;
    for(std::size_t i = 0; i < output_num; ++i)
    {
        if(ref_outs[i].get_shape().type() != target_outs[i].get_shape().type() or
           ref_outs[i].get_shape().lens() != target_outs[i].get_shape().lens())
        {
            std::cout << "FAILED: " << name << std::endl;
            std::cout << "Shape mismatch {" << ref_outs[i].get_shape() << "} != {"
                      << target_outs[i].get_shape() << "}" << std::endl;
        }
        else
        {
            passed &= verify_args(name, target_outs[i], verify::expected{ref_outs[i]}, tols);
        }
    }
    if(passed)
        std::cout << "MIGraphX verification passed successfully." << std::endl;
    return passed;
}

void verify_instructions(const program& prog,
                         const target& t,
                         compile_options options,
                         verify_options vo,
                         verify::tolerance tols)
{
    const auto* mm_prog = prog.get_main_module();
    for(auto&& ins : (*mm_prog))
    {
        if(ins.name().front() == '@')
            continue;
        if(ins.name() == "broadcast")
            continue;
        if(ins.name() == "transpose")
            continue;
        if(ins.name() == "reshape")
            continue;
        if(ins.name() == "undefined")
            continue;
        program p;
        auto* mm_p = p.get_main_module();
        std::vector<instruction_ref> inputs;
        for(auto&& arg : ins.inputs())
        {
            if(arg->name() == "@literal")
                inputs.push_back(mm_p->add_literal(arg->get_literal()));
            else
                inputs.push_back(
                    mm_p->add_parameter(std::to_string(inputs.size()), arg->get_shape()));
        }
        mm_p->add_instruction(ins.get_operator(), inputs);
        try
        {
            std::cout << "Verify: " << ins.name() << std::endl;
            std::cout << p << std::endl;
            verify_program(ins.name(), p, t, options, vo, create_param_map(p, false), tols);
        }
        catch(...)
        {
            std::cout << "Instruction " << ins.name() << " threw an exception." << std::endl;
            throw;
        }
    }
}

bool verify_reduced(program p,
                    int n,
                    const target& t,
                    compile_options options,
                    verify_options vo,
                    const parameter_map& inputs,
                    verify::tolerance tols)
{
    auto* mm  = p.get_main_module();
    auto last = std::prev(mm->end(), n);
    mm->remove_instructions(last, mm->end());
    std::cout << "Verify: " << n << std::endl;
    std::cout << p << std::endl;
    try
    {
        return verify_program(std::to_string(n), p, t, options, vo, inputs, tols);
    }
    catch(const std::exception& e)
    {
        std::cout << "FAILED: " << n << std::endl;
        std::cout << "Exception: " << e.what() << std::endl;
        return false;
    }
}

void verify_reduced_program(const program& p,
                            const target& t,
                            compile_options options,
                            verify_options vo,
                            const parameter_map& inputs,
                            verify::tolerance tols)
{
    const auto* mm = p.get_main_module();
    auto n         = std::distance(mm->begin(), mm->end());
    std::cout << "Verify steps: " << n << std::endl;
    for(std::size_t i = 1; i < n; i++)
    {
        auto last = std::prev(mm->end(), i + 1);
        if(contains({"@literal", "@param"}, last->name()))
        {
            std::cout << "Skip: " << i << std::endl;
            continue;
        }
        verify_reduced(p, i, t, options, vo, inputs, tols);
    }
}

static std::unordered_map<instruction_ref, std::size_t> accumulate_weights(instruction_ref last)
{
    std::unordered_map<instruction_ref, std::size_t> weights;
    fix<std::size_t>([&](auto self, auto ins) -> std::size_t {
        if(not contains(weights, ins))
        {
            if(ins->can_eval())
                return 0;
            std::size_t weight = 1;
            weights[ins]       = std::accumulate(
                ins->inputs().begin(),
                ins->inputs().end(),
                weight,
                [&](std::size_t w, instruction_ref i) -> std::size_t { return w + self(i); });
        }
        return weights[ins];
    })(last);
    return weights;
}

static optional<instruction_ref>
get_parent(const std::unordered_map<instruction_ref, std::size_t>& weights, instruction_ref ins)
{
    if(ins->inputs().empty())
        return nullopt;
    auto next = std::max_element(ins->inputs().begin(),
                                 ins->inputs().end(),
                                 by(std::less<>{}, [&](instruction_ref input) -> std::size_t {
                                     if(not contains(weights, input))
                                         return 0;
                                     return weights.at(input);
                                 }));
    return *next;
}

static std::vector<std::size_t> find_trim_instructions(const module& m)
{
    std::vector<std::size_t> result;
    auto last     = std::prev(m.end());
    auto weights  = accumulate_weights(last);
    auto next     = get_parent(weights, last);
    std::size_t i = 0;
    while(auto parent = get_parent(weights, *next))
    {
        i += std::distance(*parent, *next);
        result.push_back(i + 1);
        next = parent;
    }
    return result;
}

void verify_bisected_program(const program& p,
                             const target& t,
                             compile_options options,
                             verify_options vo,
                             const parameter_map& inputs,
                             verify::tolerance tols)
{
    const auto* mm = p.get_main_module();

    std::vector<std::size_t> trims = find_trim_instructions(*mm);
    std::int64_t right             = trims.size();
    std::int64_t left              = 0;
    std::int64_t failed            = -1;

    while(left <= right)
    {
        std::int64_t mid = left + (right - left) / 2;
        assert(mid < trims.size() and mid >= 0);
        std::int64_t trim = trims.rbegin()[mid];
        bool passed       = verify_reduced(p, trim, t, options, vo, inputs, tols);
        if(passed)
        {
            left = mid + 1;
        }
        else
        {
            failed = trim;
            right  = mid - 1;
        }
    }
    if(failed > 0)
    {
        std::cout << "Failure starts at: " << failed << std::endl;
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx
