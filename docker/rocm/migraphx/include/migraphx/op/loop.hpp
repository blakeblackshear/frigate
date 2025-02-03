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
#ifndef MIGRAPHX_GUARD_OPERATORS_LOOP_HPP
#define MIGRAPHX_GUARD_OPERATORS_LOOP_HPP

#include <migraphx/check_shapes.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/config.hpp>
#include <migraphx/module.hpp>
#include <migraphx/run_loop.hpp>
#include <migraphx/ranges.hpp>
#include <cmath>
#include <string>
#include <utility>
#include <set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct loop
{
    int64_t max_iterations                      = 10;
    std::vector<int64_t> scan_output_directions = {};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.max_iterations, "max_iterations"),
                    f(self.scan_output_directions, "scan_output_directions"));
    }

    std::string name() const { return "loop"; }

    shape compute_shape(const std::vector<shape>& inputs, std::vector<module_ref> mods) const
    {
        check_shapes{inputs, *this}.standard();
        if(mods.size() != 1)
        {
            MIGRAPHX_THROW("LOOP: operator should have one submodule.");
        }

        const_module_ref mod = mods.front();
        auto mod_out_shapes  = mod->get_output_shapes();
        auto dep_param_num   = inputs.size() - 2;

        // first item of the mod output shapes is condition used in loop,
        // which is not needed to compute output shape
        mod_out_shapes.erase(mod_out_shapes.begin());
        std::vector<shape> ins_out_shapes(mod_out_shapes.begin(),
                                          mod_out_shapes.begin() + dep_param_num);
        mod_out_shapes.erase(mod_out_shapes.begin(), mod_out_shapes.begin() + dep_param_num);
        for(const auto& out_s : mod_out_shapes)
        {
            auto lens = out_s.lens();
            lens.insert(lens.begin(), max_iterations);
            ins_out_shapes.push_back({out_s.type(), lens});
        }

        return shape(ins_out_shapes);
    }

    struct ref_loop
    {
        int64_t max_iterations = 0;

        template <class T>
        void copy(context&, const argument& src, T& dst) const
        {
            dst = *src.cast<T>();
        }

        template <class T>
        void copy(context&, T src, const argument& dst) const
        {
            *dst.cast<T>() = src;
        }

        void append(const std::vector<argument>& iter_state,
                    const std::vector<argument>& concatenated_outputs,
                    const std::vector<int64_t>& scan_output_dirs,
                    int64_t curr_iter,
                    int64_t num_iters) const
        {
            assert(iter_state.size() == concatenated_outputs.size());
            for(auto i : range(iter_state.size()))
            {
                const auto& iter_stat = iter_state.at(i);
                const auto& scan_out  = concatenated_outputs.at(i);

                auto dir = scan_output_dirs.empty() ? 0 : scan_output_dirs[i];
                auto idx = (1 - dir) * curr_iter + dir * (num_iters - 1 - curr_iter);

                auto* in_data        = iter_stat.data();
                auto* out_data       = scan_out.data();
                std::size_t out_size = iter_stat.get_shape().bytes();
                assert((idx + 1) * out_size <= scan_out.get_shape().bytes());
                std::copy(in_data, in_data + out_size, out_data + idx * out_size);
            }
        }

        void set_zero(context&, const std::vector<argument>& concatenated_outputs, int iter) const
        {
            if(iter >= max_iterations)
                return;

            for(const auto& out : concatenated_outputs)
            {
                auto s    = out.get_shape();
                auto size = s.bytes() / max_iterations;
                std::fill(out.data() + iter * size, out.data() + max_iterations * size, 0);
            }
        }

        std::unordered_map<std::string, int> get_output_params(const module&) const { return {}; }
    };

    argument compute(context& ctx,
                     const shape& out_shape,
                     const std::vector<argument>& args,
                     const std::vector<module_ref>& mods,
                     const std::function<std::vector<argument>(
                         module_ref&, const std::unordered_map<std::string, argument>&)>& run) const
    {
        // wrap up the arguments vector, so ref and gpu impl are the same
        auto cpy_args = args;
        bool in_cond  = args.at(1).at<bool>();
        bool cond     = in_cond;
        int64_t iter  = 0;
        // insert iter and cond used in the loop
        auto s_cond = args.at(1).get_shape();
        auto s_iter = args.at(0).get_shape();
        cpy_args.push_back({s_iter, &iter});
        cpy_args.push_back({s_cond, &cond});
        cpy_args.insert(cpy_args.end(), args.begin() + 2, args.end());

        // add cond and mod outputs to the argument list
        cpy_args.push_back(argument(s_cond));
        cpy_args.push_back(argument(out_shape));

        // run loop
        return run_loop(ref_loop{max_iterations}, scan_output_directions, ctx, cpy_args, mods, run);
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
