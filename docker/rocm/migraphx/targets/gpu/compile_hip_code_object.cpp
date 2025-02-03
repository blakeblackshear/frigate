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
#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/gpu/compile_hip.hpp>
#include <migraphx/gpu/code_object_op.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/device_name.hpp>
#include <migraphx/context.hpp>
#include <migraphx_kernels.hpp>
#include <migraphx/stringutils.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

std::string generate_make_shape(const shape& s)
{
    return "make_shape(" + generate_index_ints(s.lens()) + ", " + generate_index_ints(s.strides()) +
           ")";
}

static const char* const make_tensor_template = R"__migraphx__(
template<>
struct make_tensor<${n}>
{
    static __device__ auto apply(void* __restrict__ p)
    {
        return make_tensor_view(reinterpret_cast<${type}* __restrict__>(p), make_shape(${lens}, ${strides}));
    }
};
)__migraphx__";

std::string generate_make_tensor(std::size_t n, const shape& s)
{
    return interpolate_string(make_tensor_template,
                              {{"n", std::to_string(n)},
                               {"type", shape::cpp_type(s.type())},
                               {"lens", generate_index_ints(s.lens())},
                               {"strides", generate_index_ints(s.strides())}});
}

std::string generate_args_hpp(const std::vector<shape>& inputs)
{
    std::string inner;
    for(std::size_t i = 0; i < inputs.size(); i++)
    {
        inner += generate_make_tensor(i, inputs[i]);
    }
    const std::string args_hpp = R"__migraphx__(
#ifndef MIGRAPHX_GUARD_AUTO_ARGS_HPP
#define MIGRAPHX_GUARD_AUTO_ARGS_HPP

#include <migraphx/kernels/args.hpp>
#include <migraphx/kernels/tensor_view.hpp>
#include <migraphx/kernels/types.hpp>

namespace migraphx {

__content__

} // namespace migraphx
#endif
)__migraphx__";
    return replace_string(args_hpp, "__content__", inner);
}

static std::vector<std::string> get_compiler_warnings()
{
    std::vector<std::string> warnings = {
        "-Weverything",
        "-Wno-c++98-compat",
        "-Wno-c++98-compat-pedantic",
        "-Wno-conversion",
        "-Wno-double-promotion",
        "-Wno-exit-time-destructors",
        "-Wno-extra-semi",
        "-Wno-extra-semi-stmt",
        "-Wno-float-conversion",
        "-Wno-gnu-anonymous-struct",
        "-Wno-gnu-zero-variadic-macro-arguments",
        "-Wno-missing-prototypes",
        "-Wno-nested-anon-types",
        "-Wno-padded",
        "-Wno-shorten-64-to-32",
        "-Wno-sign-conversion",
        "-Wno-sign-compare",
        "-Wno-unused-command-line-argument",
        "-Wno-weak-vtables",
        "-Wno-c99-extensions",
    };

    if(hip_has_flags({"-Werror", "-Wunsafe-buffer-usage"}))
        warnings.push_back("-Wno-unsafe-buffer-usage");
    return warnings;
}

const std::vector<std::string>& compiler_warnings()
{
    static std::vector<std::string> warnings = get_compiler_warnings();
    return warnings;
}

void hip_compile_options::set_launch_params(
    const value& v,
    const std::function<std::size_t(std::size_t local)>& compute_global,
    std::size_t default_local)
{
    local = v.get("local", default_local);
    if(v.contains("global"))
        global = v.at("global").to<std::size_t>();
    else
        global = compute_global(local);
}

static bool hip_accept_non_uniform_wg()
{
    static bool non_uniform_wg = hip_has_flags({"-fno-offload-uniform-block"});
    return non_uniform_wg;
}

std::function<std::size_t(std::size_t local)>
compute_global_for(context& ctx, std::size_t n, std::size_t over)
{
    assert(over > 0);
    std::size_t max_global = ctx.get_current_device().get_cu_count() *
                             ctx.get_current_device().get_max_workitems_per_cu();
    return [n, over, max_global](std::size_t local) {
        std::size_t num_elements = n;
        if(not hip_accept_non_uniform_wg())
        {
            num_elements = (1 + (n - 1) / local) * local;
        }
        std::size_t groups     = 1 + (num_elements - 1) / local;
        std::size_t max_blocks = max_global / local;
        std::size_t nglobal    = std::min(max_blocks * over, groups) * local;
        return std::min(nglobal, num_elements);
    };
}

std::size_t compute_block_size(context& ctx, std::size_t n, std::size_t max_block_size)
{
    const std::size_t min_block_size = ctx.get_current_device().get_wavefront_size();
    auto block_size                  = (((n - 1) / min_block_size + 1)) * min_block_size;
    return std::min(std::max(min_block_size, block_size), max_block_size);
}

operation
compile_hip_code_object(context& ctx, const std::string& content, hip_compile_options options)
{
    assert(options.global > 0);
    assert(options.local > 0);
    assert(not options.inputs.empty());
    assert(options.inputs.size() == options.virtual_inputs.size() or
           options.virtual_inputs.empty());
    std::vector<src_file> srcs = options.additional_src_files;
    static auto kernels{::migraphx_kernels()};
    std::transform(
        kernels.begin(),
        kernels.end(),
        std::back_inserter(srcs),
        [](const std::pair<std::string_view, std::string_view>& elem) { return src_file{elem}; });
    srcs.emplace_back("main.cpp", content);
    auto args_hpp =
        generate_args_hpp(options.virtual_inputs.empty() ? options.inputs : options.virtual_inputs);
    srcs.emplace_back("args.hpp", args_hpp);

    if(options.global % options.local != 0 and hip_accept_non_uniform_wg())
        options.emplace_param("-fno-offload-uniform-block");
    else
        assert(options.global % options.local == 0);

    options.emplace_param("-DMIGRAPHX_NGLOBAL=" + std::to_string(options.global));
    options.emplace_param("-DMIGRAPHX_NLOCAL=" + std::to_string(options.local));
    options.emplace_param("-DMIGRAPHX_WAVEFRONTSIZE=" +
                          std::to_string(ctx.get_current_device().get_wavefront_size()));
    const auto& warnings = compiler_warnings();
    options.params.insert(options.params.end(), warnings.begin(), warnings.end());
    options.emplace_param("-ftemplate-backtrace-limit=0");
    options.emplace_param("-Werror");
    auto cos = compile_hip_src(srcs, options.params, get_device_name());
    if(cos.size() != 1)
        MIGRAPHX_THROW("No code object");
    return code_object_op{value::binary{cos.front()},
                          options.kernel_name,
                          options.global,
                          options.local,
                          options.inputs,
                          options.output,
                          options.output_arg};
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
