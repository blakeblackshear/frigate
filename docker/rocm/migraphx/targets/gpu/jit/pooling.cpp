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
#include <migraphx/make_op.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/op/common.hpp>

#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/gpu/compile_hip.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

// NOLINTNEXTLINE
static const char* const pooling_kernel = R"__migraphx__(
#include <migraphx/kernels/pooling.hpp>
#include <migraphx/kernels/ops.hpp>
#include <migraphx/kernels/integral_constant.hpp>
#include <migraphx/kernels/generic_constant.hpp>
#include <args.hpp>

namespace migraphx {

extern "C" {

MIGRAPHX_GLOBAL void pooling_kernel(void* in_data, void* output)
{
    transform_args(make_tensors(), rotate_last())(in_data, output)([](auto&&... xs) {
        pooling<${algo}, ${group_size}>(${op}, make_window(index_ints<${window}>{}, index_ints<${stride}>{}, index_ints<${padding}>{}), xs...);
    });
}

}

} // namespace migraphx

)__migraphx__";

struct pooling_compiler : compiler<pooling_compiler>
{

    static std::size_t compute_subwave_size(context& ctx, std::size_t n)
    {
        std::size_t max_wavefront_size = ctx.get_current_device().get_wavefront_size();
        std::size_t wavefront_size     = 1;
        while(wavefront_size <= n and wavefront_size < max_wavefront_size)
            wavefront_size *= 2;
        return wavefront_size / 2;
    }

    struct algorithm
    {
        std::string name        = "reduce::lane";
        std::size_t reduce_size = 1;
        std::size_t block_size  = 256;
        std::size_t group_size  = 1;

        static std::size_t compute_group_size(const shape& output)
        {
            auto n                           = output.lens().back();
            const std::size_t max_group_size = 32;
            std::size_t group_size           = 1;
            while((n % (group_size * 2) == 0) and group_size <= max_group_size)
                group_size *= 2;
            return group_size;
        }

        algorithm() {}

        algorithm(context& ctx, const shape& input, const std::vector<std::size_t>& window)
        {
            if(input.strides().back() != 1)
                return;
            std::size_t max_wavefront_size = ctx.get_current_device().get_wavefront_size();
            auto wsize                     = window.back();
            if(wsize > max_wavefront_size)
            {
                block_size  = compute_block_size(ctx, wsize, 256);
                reduce_size = block_size;
                name        = "reduce::block";
            }
            else
            {
                block_size  = max_wavefront_size;
                reduce_size = compute_subwave_size(ctx, wsize);
                name        = "reduce::subwave<" + to_string(reduce_size) + ">";
            }
        }
    };

    template <class... Ts>
    static void normalize(std::vector<shape>& inputs, Ts&... xs)
    {
        auto perm = find_permutation(inputs);
        std::transform(inputs.begin(), inputs.end(), inputs.begin(), [&](auto s) {
            return reorder_shape(s, perm);
        });
        each_args([&](auto& dims) { dims = reorder_dims(dims, perm); }, xs...);
    }

    std::vector<std::string> names() const { return {"pooling"}; }

    operation compile_op(context& ctx, const std::vector<shape>& inputs, const value& v) const
    {
        hip_compile_options options;
        const auto& out_s      = inputs.back();
        options.inputs         = inputs;
        options.output         = out_s;
        options.kernel_name    = "pooling_kernel";
        options.virtual_inputs = inputs;

        auto ndim      = out_s.ndim();
        auto pool_ndim = ndim - 2;

        auto read_value = [&](const std::string& name, std::size_t def) {
            if(v.contains(name))
            {
                std::vector<std::size_t> result(2, def);
                auto x = v.at(name).to_vector<std::size_t>();
                if(x.size() >= pool_ndim)
                    result.insert(result.end(), x.begin(), x.begin() + pool_ndim);
                return result;
            }
            else
            {
                std::vector<std::size_t> result(ndim, def);
                return result;
            }
        };

        auto padding = read_value("padding", 0);
        auto stride  = read_value("stride", 1);
        auto window  = read_value("lengths", 1);

        const auto& mode_v = v.at("mode");
        std::string mode =
            mode_v.is_string() ? mode_v.get_string() : to_string(mode_v.to<op::pooling_mode>());
        bool count_include_pad = v.get("count_include_pad", false);
        if(count_include_pad and mode == "average")
            mode = "average_include_pad";

        std::string op = mode + "_pool";
        if(mode == "lpnorm")
            op += "<" + v.at("lp_order").to<std::string>() + ">";

        algorithm algo{};
        options.set_launch_params(
            v,
            compute_global_for(ctx, (out_s.elements() / algo.group_size) * algo.reduce_size, 256),
            algo.block_size);
        normalize(options.virtual_inputs, padding, stride, window);
        auto src = interpolate_string(pooling_kernel,
                                      {{"op", op + "{}"},
                                       {"algo", algo.name},
                                       {"group_size", to_string(algo.group_size)},
                                       {"window", to_string_range(window)},
                                       {"stride", to_string_range(stride)},
                                       {"padding", to_string_range(padding)}});

        return compile_hip_code_object(ctx, src, options);
    }

    compiler_replace compile(context& ctx, instruction_ref ins, const operation& op) const
    {
        return compile_op(ctx, to_shapes(ins->inputs()), op.to_value());
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
