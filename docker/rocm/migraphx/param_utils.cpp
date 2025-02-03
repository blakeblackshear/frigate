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
#include <migraphx/param_utils.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/builtin.hpp>
#include <migraphx/module.hpp>
#include <migraphx/ranges.hpp>
#include <map>
#include <cmath>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

std::string param_name(std::size_t i, const std::string& prefix)
{
    if(i < 10)
        return prefix + std::to_string(i);
    const std::size_t max_digits = 5;
    if(i >= std::pow(10, max_digits))
        MIGRAPHX_THROW("Too many parameters.");
    std::size_t n = log10(i) + 1;
    return prefix + ":" + std::string(max_digits - n, '0') + std::to_string(i);
}

void sort_params(std::vector<instruction_ref>& params)
{
    std::sort(params.begin(), params.end(), by(std::less<>{}, [](instruction_ref ins) {
                  const auto& param = any_cast<const builtin::param&>(ins->get_operator());
                  return param.parameter;
              }));
}

std::vector<instruction_ref>
find_inputs(const std::unordered_map<instruction_ref, instruction_ref>& map_ins,
            const_module_ref parent,
            const_module_ref sub)
{
    std::vector<instruction_ref> result;
    std::map<std::string, instruction_ref> names;
    for(auto&& [input, param] : map_ins)
    {
        if(sub != nullptr and not sub->has_instruction(param))
            continue;
        if(param->name() != "@param")
            continue;
        if(parent != nullptr and not parent->has_instruction(input))
            continue;
        auto v      = param->get_operator().to_value();
        auto name   = v.at("parameter").to<std::string>();
        names[name] = input;
    }
    std::transform(names.begin(), names.end(), std::back_inserter(result), [](const auto& p) {
        return p.second;
    });
    assert(not sub or result.size() == sub->get_parameter_shapes().size());
    return result;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
