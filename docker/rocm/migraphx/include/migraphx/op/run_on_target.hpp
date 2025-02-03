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
#ifndef MIGRAPHX_GUARD_RTGLIB_RUN_ON_TARGET_HPP
#define MIGRAPHX_GUARD_RTGLIB_RUN_ON_TARGET_HPP
#include <unordered_map>
#include <vector>
#include <set>
#include <algorithm>
#include <migraphx/config.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/module.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace op {
struct run_on_target
{

    std::size_t target_id = 0;
    std::string name() const { return "run_on_target"; }

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.target_id, "target_id"));
    }

    migraphx::shape compute_shape(const std::vector<migraphx::shape>& inputs,
                                  std::vector<migraphx::module_ref> mods) const
    {
        if(mods.size() != 1)
        {
            MIGRAPHX_THROW("RUN_ON_TARGET: must have exactly 1 module argument");
        }
        auto* mod_input = mods.front();
        if(inputs.size() != mod_input->get_parameter_shapes().size())
        {
            MIGRAPHX_THROW("RUN_ON_TARGET: Mismatched number of input parameters");
        }
        auto mod_out_shapes = mod_input->get_output_shapes();
        return shape(mod_out_shapes);
    }

    migraphx::argument
    compute(const migraphx::shape&,
            const std::vector<migraphx::argument>& args,
            const std::vector<migraphx::module_ref>& mods,
            const std::function<std::vector<migraphx::argument>(
                migraphx::module_ref&, const std::unordered_map<std::string, migraphx::argument>&)>&
                run) const

    {
        std::unordered_map<std::string, migraphx::argument> params;
        std::set<std::string> pnames;
        const auto* smod = mods.front();
        assert(mods.size() == 1);
        auto names = smod->get_parameter_names();
        pnames.insert(names.begin(), names.end());
        assert(pnames.size() == args.size());
        std::transform(pnames.begin(),
                       pnames.end(),
                       args.begin(),
                       std::inserter(params, params.end()),
                       [](auto&& name, auto&& arg) { return std::make_pair(name, arg); });
        auto* mod    = mods.front();
        auto results = run(mod, params);
        return migraphx::argument{results};
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif
