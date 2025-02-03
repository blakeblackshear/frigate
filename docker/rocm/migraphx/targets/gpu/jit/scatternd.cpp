/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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
#include "scatter.hpp"

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

// NOLINTNEXTLINE
static const char* const scatternd_kernel = R"__migraphx__(
#include <migraphx/kernels/scatternd.hpp>
#include <migraphx/kernels/integral_constant.hpp>
#include <migraphx/kernels/generic_constant.hpp>
#include <args.hpp>

namespace migraphx {

extern "C" {

MIGRAPHX_GLOBAL void scatternd_kernel(void* in_indices, void* in_updates, void* output) 
{
    make_tensors()(in_indices, in_updates, output)([](auto&&... xs) { 
        scatternd(xs..., ${reduction}{}); 
    });
}

}

} // namespace migraphx

)__migraphx__";

struct scatternd_compiler : scatter_compiler<scatternd_compiler>
{
    std::vector<std::string> names() const
    {
        return {
            "scatternd_none", "scatternd_add", "scatternd_mul", "scatternd_min", "scatternd_max"};
    }

    std::string make_interpolated_string(const operation& op) const
    {
        const auto reduction = op.name().substr(std::char_traits<char>::length("scatternd_"));
        return interpolate_string(scatternd_kernel, {{"reduction", "assign_" + reduction}});
    }

    std::string get_kernel_name(const operation&) const { return "scatternd_kernel"; }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
