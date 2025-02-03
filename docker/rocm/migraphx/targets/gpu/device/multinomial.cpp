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
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/dfor.hpp>
#include <migraphx/gpu/device/multinomial.hpp>
#include <migraphx/gpu/device/tensor.hpp>
#include <migraphx/gpu/device/launch.hpp>
#include <migraphx/gpu/device/types.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

template <class Iterator, class T>
constexpr Iterator upper_bound(Iterator first, Iterator last, const T& value)
{
    Iterator it;
    typename std::iterator_traits<Iterator>::difference_type count;
    typename std::iterator_traits<Iterator>::difference_type step;
    count = std::distance(first, last);

    while(count > 0)
    {
        it   = first;
        step = count / 2;
        std::advance(it, step);
        if(not(value < *it))
        {
            first = ++it;
            count -= step + 1;
        }
        else
            count = step;
    }
    return first;
}

void multinomial(hipStream_t stream,
                 const argument& result,
                 const argument& arg0,
                 const argument& arg1)
{
    size_t batch_size  = arg0.get_shape().lens().front();
    size_t class_size  = arg0.get_shape().lens().back();
    size_t sample_size = result.get_shape().lens().back();

    visit_all(arg0, arg1)([&](auto cdf_host, auto dist_host) {
        result.visit([&](auto output_host) {
            hip_visit_views(cdf_host, dist_host, output_host)(
                [&](auto cdf, auto dist, auto output) {
                    gs_launch(stream, batch_size * sample_size)([=](auto i) __device__ {
                        auto idx       = output.get_shape().multi(i);
                        auto cdf_begin = cdf.begin() + (idx.front() * class_size);
                        auto cdf_end   = cdf_begin + class_size;
                        auto* sample_iter =
                            upper_bound(cdf_begin, cdf_end, dist[i] * *(std::prev(cdf_end)));
                        output[i] = std::distance(cdf_begin, sample_iter);
                    });
                });
        });
    });
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
