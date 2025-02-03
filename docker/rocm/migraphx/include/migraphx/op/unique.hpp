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

#ifndef MIGRAPHX_GUARD_OPERATORS_UNIQUE_HPP
#define MIGRAPHX_GUARD_OPERATORS_UNIQUE_HPP

#include <migraphx/shape_for_each.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/config.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/tune_axis.hpp>
#include <utility>
#include <map>
#include <limits>
#include <optional>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

// https://onnx.ai/onnx/operators/onnx__Unique.html
// The Onnx spec refers to numpy specification, used as a reference:
// https://numpy.org/doc/stable/reference/generated/numpy.unique.html

// Input : Given an array of elements : X.

// Output(s) :
// 1. Find the unique elements (Y) of input (X).
//
// There are three outputs in addition to the unique elements in Y:
// 2. the indices of the input array that give the unique values
// 3. the indices of the unique array that reconstruct the input array
// 4. the number of times each unique value comes up in the input array

// Optional Attribute: 'Sorted' = 1 for sorted; = 0 for unsorted.
// Onnx specification makes 'sorted' a default, while Numpy always sorts.
//
// Optional Attribute: 'Axis' is 'None' (default) or a valid int < rank(X).
// Negative values are allowed.
//
// Numpy has the following important note on Axis:
// ------------------------------------------------------------------
// When an axis is specified the subarrays indexed by the axis are
// sorted. This is done by making the specified axis the first
// dimension of the array (move the axis to the first dimension to
// keep the order of the other axes) and then flattening the subarrays
// in C order. The flattened subarrays are then viewed as a structured
// type with each element given a label, with the effect that we end
// up with a 1-D array of structured types that can be treated in the
// same way as any other 1-D array. The result is that the flattened
// subarrays are sorted in lexicographic order starting with the first
// element.
// ------------------------------------------------------------------

struct unique
{

    template <class T>
    auto make_idx_less_fn(const T& data, size_t chunk_sz) const
    {
        return [&data, chunk_sz](auto idx1, auto idx2) {
            return std::lexicographical_compare(data.begin() + idx1,
                                                data.begin() + idx1 + chunk_sz,
                                                data.begin() + idx2,
                                                data.begin() + idx2 + chunk_sz);
        };
    }

    // CASE SORTED:
    //
    // To process into a sorted unique series of elements/chunks:
    // Chunk size == 1 means a simple element; >1 means a flat representation.
    // Steps: first go through the input elements/chunks for uniqueness.
    // At the end of this processing, per the sorted sequence of unique elements:
    // update/create data structures: y, y_indices, x_rev_indices, y_count
    //
    // INPUT x: [2, 1, 1, 3, 4, 3], attr_sorted = 1;

    // OUTPUT(s): indices..
    // y_indices: [1, 0, 3, 4]  --- first incidence, in terms of index in sequence x
    // x_rev_indices: [1, 0, 0, 2, 3, 2] --- x seen in terms of indices of unique sequence y
    // y_count: [2, 1, 2, 1] -- count at each y_index. sum = len(x)

    // NOTE: y [1, 2, 3, 4]   --- the unique output is constructed from x[y_indices[...]]

    template <class T>
    auto sorted_uniq_indices(const T& input_data, size_t chunk_sz) const
    {
        struct y_info
        {
            size_t y_idx;
            size_t x_idx;
            size_t ct = 0;
        };

        auto idx_less_fn = make_idx_less_fn(input_data, chunk_sz);
        std::map<size_t, y_info, decltype(idx_less_fn)> uniq_val_map(idx_less_fn);

        std::tuple<std::vector<std::size_t>, std::vector<std::size_t>, std::vector<std::size_t>> rv;
        auto& [y_indices, x_rev_indices, y_count] = rv;

        // go through all the elements and find the unique elements..
        size_t count_x = input_data.size();
        for(size_t f_idx = 0, x_idx = 0; f_idx < count_x; f_idx += chunk_sz, x_idx++)
        {
            y_info entry          = {.y_idx = uniq_val_map.size(), .x_idx = x_idx};
            auto [itr, added_new] = uniq_val_map.insert({f_idx, entry});
            itr->second.ct++;
            x_rev_indices.push_back(itr->second.y_idx);
        }

        std::vector<std::size_t> y2x_indices(uniq_val_map.size());
        y_indices.resize(uniq_val_map.size());
        y_count.resize(uniq_val_map.size());
        size_t idx = 0;
        // the unique elements are now sorted:
        // post-processing for all the return indices.
        for(const auto& v : uniq_val_map)
        {
            y2x_indices[v.second.y_idx] = idx;
            y_indices[idx]              = v.second.x_idx;
            y_count[idx]                = v.second.ct;
            idx++;
        }
        // update x_rev_indices as per the sorted order of y_indices
        for(auto& i : x_rev_indices)
            i = y2x_indices[i];

        return rv;
    }

    // CASE UNSORTED:
    //
    // To process into an un-sorted unique series of elements/chunks:
    // For chunk size = 1 is a simple element, else use a flat representation of a tensor obj
    // Go through the input elements/chunks one by one with inline processing of indices..

    // INPUT x: [2, 1, 1, 3, 4, 3], attr_sorted = 0;

    // OUTPUT(s): indices..
    // y_indices: [0, 1, 3, 4]  --- first incidence, in terms of index in sequence x
    // x_rev_indices: [0, 1, 1, 2, 3, 2] --- x seen in terms of indices of unique sequence y
    // y_count: [1, 2, 2, 1] -- count at each y_index. sum = len(x)

    // NOTE: y [2, 1, 3, 4]   --- the unique output is constructed from x[y_indices[...]]
    // Output data structures: y_indices, x_rev_indices, y_count are processed inline.

    template <class T>
    auto unsorted_uniq_indices(const T& input_data, size_t chunk_sz) const
    {
        auto idx_less_fn = make_idx_less_fn(input_data, chunk_sz);
        std::map<size_t, size_t, decltype(idx_less_fn)> uniq_val_map(idx_less_fn);

        // rv is used for NVRO below..
        std::tuple<std::vector<std::size_t>, std::vector<std::size_t>, std::vector<std::size_t>> rv;
        auto& [y_indices, x_rev_indices, y_count] = rv;

        // go through all the elements and add the unique elements into the map..
        // inline processing for outputs: y_indices, x_rev_indices, y_count
        size_t count_x = input_data.size();
        for(size_t f_idx = 0; f_idx < count_x; f_idx += chunk_sz)
        {
            auto [itr, added_new] = uniq_val_map.insert({f_idx, y_indices.size()});
            if(added_new)
            {
                y_count.push_back(0);
                y_indices.push_back(x_rev_indices.size());
            }
            y_count[itr->second]++;
            x_rev_indices.push_back(itr->second);
        }

        return rv;
    }

    // Axis. Default: none. Range: [-rank, rank-1]
    std::optional<int64_t> axis;

    // Sorted, Default: 1= sorted. 0 = unsorted.
    bool sorted = true;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.axis, "axis"), f(self.sorted, "sorted"));
    }

    std::string name() const { return "unique"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(1);

        auto& sh_x         = inputs[0];
        auto lens_x        = sh_x.lens();
        size_t dim_x       = sh_x.ndim();
        size_t max_uniq_ct = sh_x.elements();
        std::vector<shape::dynamic_dimension> d_out;

        if(axis)
        {
            int64_t t_axis = migraphx::tune_axis(dim_x, *axis, name());
            if(t_axis != 0)
                MIGRAPHX_THROW("Unique: Only supports axis = 0 or None");

            d_out = sh_x.to_dynamic().dyn_dims();
            // only axis = 0 is supported:
            max_uniq_ct = lens_x[0];
            // min = 1 unique element; max = full dimension along axis 0
            d_out[0] = {1, max_uniq_ct};
        }
        else
        {
            d_out.push_back({1, max_uniq_ct});
        }

        shape sh_y = {sh_x.type(), d_out};
        // The three outputted Indices are just 1-D:
        shape sh_idx{shape::int64_type, {d_out[0]}};

        return shape({sh_y, sh_idx, sh_idx, sh_idx});
    }

    argument compute(const dyn_output& dyn_out, std::vector<argument> args) const
    {
        auto sh_x          = args.front().get_shape();
        auto lens_x        = sh_x.lens();
        shape output_shape = dyn_out.computed_shape;
        auto vec_ss        = output_shape.sub_shapes();
        auto ct_x          = sh_x.elements();
        shape sh_y         = {vec_ss[0].type(), {ct_x}};
        shape sh_idx       = {vec_ss[1].type(), {ct_x}};
        shape sh_x_idx     = {vec_ss[1].type(), {ct_x}};

        argument res_y{sh_y};
        argument res_y_idx{sh_idx};
        argument res_x_rev_idx{sh_idx};
        argument res_y_ct_idx{sh_idx};

        std::vector<size_t> out_y_idx;
        std::vector<size_t> out_x_rev_idx;
        std::vector<size_t> out_y_ct;

        // If axis is not none, for >1D tensors, we have to consider
        // then, the uniqueness of chunks of sub-tensors: a subsequence of built-ins..
        // For a built-in type, chunk_sz is of course = 1
        size_t chunk_sz = 1;
        if(axis)
            chunk_sz = ct_x / lens_x[0]; // axis = 0 is supported.

        visit_all(args.front(), res_y)([&](auto x, auto y_flat) {
            using o_type = typename decltype(x)::value_type;
            std::vector<o_type> x_in(x.begin(), x.end());

            std::tie(out_y_idx, out_x_rev_idx, out_y_ct) =
                sorted ? sorted_uniq_indices(x_in, chunk_sz)
                       : unsorted_uniq_indices(x_in, chunk_sz);

            const auto uniq_ct = out_y_idx.size();

            // construct y from x[indices] in flattened form
            // later we reshape y to the final shape..
            auto y_dst = y_flat.begin();
            for(size_t idx = 0; idx < uniq_ct; idx++)
                y_dst = copy_n(x_in.begin() + out_y_idx[idx] * chunk_sz, chunk_sz, y_dst);

            std::vector<size_t> lens_y;
            // if axis is specified:
            // the output shape keeps the n-1 dimensions of x
            if(axis)
            {
                lens_y    = lens_x;
                lens_y[0] = uniq_ct;
            }
            else
            {
                lens_y = {uniq_ct};
            }
            sh_y   = {sh_y.type(), lens_y};
            sh_idx = {sh_idx.type(), {uniq_ct}};
        });

        visit_all(res_y_idx, res_x_rev_idx, res_y_ct_idx)(
            [&](auto y_indices, auto x_rev_indices, auto y_count) {
                std::copy(out_y_idx.begin(), out_y_idx.end(), y_indices.begin());
                std::copy(out_x_rev_idx.begin(), out_x_rev_idx.end(), x_rev_indices.begin());
                std::copy(out_y_ct.begin(), out_y_ct.end(), y_count.begin());
                sh_x_idx = {sh_idx.type(), {out_x_rev_idx.size()}};
            });

        return {{res_y.reshape(sh_y),
                 res_y_idx.reshape(sh_idx),
                 res_x_rev_idx.reshape(sh_x_idx),
                 res_y_ct_idx.reshape(sh_idx)}};
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
