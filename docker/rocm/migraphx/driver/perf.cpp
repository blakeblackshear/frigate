/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#include "perf.hpp"

#include <migraphx/generate.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/time.hpp>
#ifdef HAVE_GPU
#include <migraphx/gpu/hip.hpp>
#endif

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

using milliseconds = std::chrono::duration<double, std::milli>;

template <class T>
auto get_hash(const T& x)
{
    return std::hash<T>{}(x);
}

parameter_map fill_param_map(parameter_map& m,
                             const std::unordered_map<std::string, shape>& param_shapes,
                             const target& t,
                             bool offload)
{
    for(auto&& x : param_shapes)
    {
        argument& arg = m[x.first];
        if(arg.empty())
        {
            assert(not x.second.dynamic());
            arg = generate_argument(x.second, get_hash(x.first), random_mode::random);
        }
        if(not offload)
            arg = t.copy_to(arg);
    }
    return m;
}

parameter_map create_param_map(const program& p, const target& t, bool offload)
{
    parameter_map m;
    for(auto&& x : p.get_parameter_shapes())
    {
        auto arg = generate_argument(x.second, get_hash(x.first), random_mode::random);
        if(offload)
            m[x.first] = arg;
        else
            m[x.first] = t.copy_to(arg);
    }
    return m;
}

parameter_map create_param_map(const program& p, bool gpu)
{
    parameter_map m;
    for(auto&& x : p.get_parameter_shapes())
    {
#ifdef HAVE_GPU
        if(gpu)
            m[x.first] =
                gpu::to_gpu(generate_argument(x.second, get_hash(x.first), random_mode::random));
        else
#else
        (void)gpu;
#endif
            m[x.first] = generate_argument(x.second, get_hash(x.first), random_mode::random);
    }
    return m;
}

target get_target(bool gpu)
{
    if(gpu)
        return make_target("gpu");
    else
        return make_target("cpu");
}

bool is_offload_copy_set(const program& p)
{
    assert(p.is_compiled());
    const module* mm                     = p.get_main_module();
    std::vector<std::string> param_names = mm->get_parameter_names();
    std::unordered_set<instruction_ref> param_ins;
    std::transform(param_names.begin(),
                   param_names.end(),
                   std::inserter(param_ins, param_ins.begin()),
                   [&](const auto& i) { return mm->get_parameter(i); });
    for(const auto& i : *mm)
    {
        if(i.name() == "hip::copy_to_gpu")
        {
            auto copy_arg = instruction::get_output_alias(i.inputs().front(), true);
            param_ins.erase(copy_arg);
        }
        else if(i.name() == "@return")
        {
            auto return_args = i.inputs();
            for(const auto& j : return_args)
            {
                auto alias_ins = instruction::get_output_alias(j, true);
                if((alias_ins->name() == "@param" and param_ins.erase(alias_ins) == 0) or
                   (alias_ins->name() != "hip::copy_from_gpu"))
                    return false;
            }
        }
    }
    return param_ins.empty();
}

double time_run(const program& p, const parameter_map& m, int n)
{
    // Run once without timing
    p.eval(m);
    p.finish();
    double total = time<milliseconds>([&] {
        for(auto i : range(n))
        {
            (void)i;
            p.eval(m);
        }
        p.finish();
    });
    return total / n;
}

} // namespace  MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx
