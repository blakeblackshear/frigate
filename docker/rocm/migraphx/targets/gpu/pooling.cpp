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
#include <migraphx/gpu/pooling.hpp>
#include <migraphx/gpu/context.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
#if MIGRAPHX_USE_MIOPEN
shape miopen_pooling::compute_shape(const std::vector<shape>& inputs) const
{
    check_shapes{inputs, *this}.has(2).standard();
    std::vector<shape> pooling_input = {inputs.at(0)};
    check_shapes{pooling_input, *this}.max_ndims(5);
    return op.normalize_compute_shape(pooling_input);
}

inline void reshape_if_1d(shape& input)
{
    auto dims = input.lens();

    if(dims.size() == 3)
    {
        std::vector<size_t> new_dims = dims;
        new_dims.insert(new_dims.begin() + 2, 1);
        input = shape{input.type(), new_dims};
    }
}

argument miopen_pooling::compute(context& ctx,
                                 const shape& output_shape,
                                 const std::vector<argument>& args) const
{
    shape x_shape = args[0].get_shape();
    shape y_shape = output_shape;

    reshape_if_1d(x_shape);
    reshape_if_1d(y_shape);

    auto x_desc = make_tensor(x_shape);
    auto y_desc = make_tensor(y_shape);

    float alpha = 1;
    float beta  = 0;

    miopenPoolingForward(ctx.get_stream().get_miopen(),
                         pd.get(),
                         &alpha,
                         x_desc.get(),
                         args[0].implicit(),
                         &beta,
                         y_desc.get(),
                         args[1].implicit(),
                         false,
                         nullptr,
                         0);

    return args[1];
}

void miopen_pooling::finalize(context&, const shape&, const std::vector<shape>&)
{
    if(pd == nullptr)
        pd = make_pooling(op);
}
#endif
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
