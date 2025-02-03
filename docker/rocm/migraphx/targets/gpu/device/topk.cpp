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
#include <migraphx/shape.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/gpu/device/topk.hpp>
#include <migraphx/gpu/device/tensor.hpp>
#include <migraphx/gpu/device/launch.hpp>
#include <migraphx/gpu/device/types.hpp>
#include <migraphx/gpu/device/visit.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace device {

template <class T, class Index, class Compare>
struct hip_heap_vector
{
    MIGRAPHX_DEVICE_CONSTEXPR hip_heap_vector(T* val, index_int n, Index v_idx, Compare comp)
        : data(val), size(n), data_index(v_idx), compare(comp)
    {
        make_heap(size);
    }

    MIGRAPHX_DEVICE_CONSTEXPR void try_push(const T val)
    {
        if(compare(val, data[data_index(0)]))
            return;

        pop_heap(size - 1);
        data[data_index(size - 1)] = val;
        push_heap(size - 1);
    }

    MIGRAPHX_DEVICE_CONSTEXPR void sort() { sort_heap(size); }

    private:
    MIGRAPHX_DEVICE_CONSTEXPR inline static void swap(T& v1, T& v2) noexcept
    {
        T v = v1;
        v1  = v2;
        v2  = v;
    }

    MIGRAPHX_DEVICE_CONSTEXPR inline void heapify_down(index_int n, index_int index)
    {
        while(index < n)
        {
            auto pre_index = index;
            index_int l    = 2 * index + 1;
            index_int r    = 2 * index + 2;

            if(l < n and compare(data[data_index(l)], data[data_index(index)]))
            {
                index = l;
            }

            if(r < n and compare(data[data_index(r)], data[data_index(index)]))
            {
                index = r;
                if(compare(data[data_index(l)], data[data_index(r)]))
                {
                    index = l;
                }
            }

            if(index == pre_index)
            {
                break;
            }

            swap(data[data_index(index)], data[data_index(pre_index)]);
        }
    }

    MIGRAPHX_DEVICE_CONSTEXPR inline void heapify_up(index_int index)
    {
        while(index > 0)
        {
            auto parent_idx = (index - 1) / 2;

            if(not compare(data[data_index(index)], data[data_index(parent_idx)]))
            {
                break;
            }

            swap(data[data_index(index)], data[data_index(parent_idx)]);
            index = parent_idx;
        }
    }

    MIGRAPHX_DEVICE_CONSTEXPR inline void make_heap(index_int n)
    {
        for(int j = n / 2 - 1; j >= 0; --j)
        {
            heapify_down(n, j);
        }
    }

    MIGRAPHX_DEVICE_CONSTEXPR inline void push_heap(index_int loc) { heapify_up(loc); }

    MIGRAPHX_DEVICE_CONSTEXPR inline void pop_heap(index_int loc)
    {
        swap(data[data_index(0)], data[data_index(loc)]);
        heapify_down(loc, 0);
    }

    MIGRAPHX_DEVICE_CONSTEXPR inline void sort_heap(index_int n)
    {
        for(int j = n - 1; j > 0; --j)
        {
            swap(data[data_index(0)], data[data_index(j)]);
            heapify_down(j, 0);
        }
    }

    T* data = nullptr;
    index_int size;
    Index data_index;
    Compare compare;
};

template <class T, class Index, class Compare>
__device__ hip_heap_vector<T, Index, Compare>
make_heap(T* data, index_int n, Index idx, Compare compare)
{
    return {data, n, idx, compare};
}

template <class Compare>
std::vector<argument> topk(hipStream_t stream,
                           const argument& val_res,
                           const argument& ind_res,
                           const argument& arg,
                           int64_t k,
                           int64_t axis,
                           Compare compare)
{
    auto in_s       = arg.get_shape();
    auto in_lens    = in_s.lens();
    auto out_s      = val_res.get_shape();
    auto axis_dim   = in_s.lens()[axis];
    auto comp_lens  = in_lens;
    comp_lens[axis] = 1;
    shape comp_s{in_s.type(), comp_lens};
    std::size_t elem_num = comp_s.elements();

    hip_visit_all(val_res, arg, out_s, in_s, comp_s)(
        [&](auto out_val, auto input, auto oss, auto iss, auto css) {
            auto* data      = device_cast(input.data());
            auto* out       = device_cast(out_val.data());
            auto* const ind = ind_res.cast<int64_t>();
            gs_launch(stream, elem_num)([=](auto i) __device__ {
                auto idx = css.multi(i);

                auto in_idx = [&](int ii) {
                    auto iidx  = idx;
                    iidx[axis] = ii;
                    return iss.index(iidx);
                };

                auto out_idx = [&](int ii) {
                    auto iidx  = idx;
                    iidx[axis] = ii;
                    return oss.index(iidx);
                };

                auto data_compare = [=](auto ii, auto jj) {
                    return compare(data[in_idx(ii)], data[in_idx(jj)]);
                };

                for(int j = 0; j < k; ++j)
                {
                    ind[out_idx(j)] = j;
                }

                auto hp = make_heap(ind, k, out_idx, data_compare);
                for(int j = k; j < axis_dim; ++j)
                {
                    hp.try_push(j);
                }
                hp.sort();

                for(int j = 0; j < k; ++j)
                {
                    out[out_idx(j)] = data[in_idx(ind[out_idx(j)])];
                }
            });
        });

    return {val_res, ind_res};
}

argument topk_largest(hipStream_t stream,
                      const argument& val_res,
                      const argument& ind_res,
                      const argument& arg,
                      int64_t k,
                      int64_t axis)
{
    return {topk(stream, val_res, ind_res, arg, k, axis, std::less<>{})};
}

argument topk_smallest(hipStream_t stream,
                       const argument& val_res,
                       const argument& ind_res,
                       const argument& arg,
                       int64_t k,
                       int64_t axis)
{
    return {topk(stream, val_res, ind_res, arg, k, axis, std::greater<>{})};
}

} // namespace device
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
