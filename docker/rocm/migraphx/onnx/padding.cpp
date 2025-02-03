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
#include <migraphx/onnx/padding.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/pad_calc.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/op/common.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

void cal_auto_padding_size(onnx_parser::node_info info,
                           value& v,
                           const std::vector<std::size_t>& k_lens,
                           const std::vector<std::size_t>& dilation,
                           const std::vector<std::size_t>& in_lens,
                           std::vector<int64_t>& paddings)
{
    size_t kdims = in_lens.size() - 2;
    assert(k_lens.size() == kdims and dilation.size() == kdims);

    if(not contains(info.attributes, "auto_pad"))
    {
        return;
    }

    auto auto_pad = to_upper(info.attributes["auto_pad"].s());
    if(auto_pad.find("SAME") != std::string::npos)
    {
        bool is_same_upper = (auto_pad.find("SAME_UPPER") != std::string::npos);
        paddings.resize(2 * kdims);

        for(size_t i = 0; i < paddings.size() / 2; i++)
        {
            calculate_padding(i,
                              paddings,
                              in_lens[i + 2],
                              v["stride"][i].to<int64_t>(),
                              dilation[i],
                              k_lens[i],
                              is_same_upper);
        }
    }
}

bool is_asym_padding(const std::vector<int64_t>& padding)
{
    assert(padding.size() % 2 == 0);
    size_t pad_ndims = padding.size() / 2;

    for(size_t i = 0; i < pad_ndims; i++)
    {
        if(padding[i] != padding[i + pad_ndims])
        {
            return true;
        }
    }
    return false;
}

void check_padding_mode(const onnx_parser::node_info& info, const std::string& onnx_name)
{
    // ensure pads availabe only when auto_pad is "NOT_SET"
    if(contains(info.attributes, "pads") and contains(info.attributes, "auto_pad"))
    {
        auto s = info.attributes.at("auto_pad").s();
        if(to_upper(s) != "NOTSET")
        {
            MIGRAPHX_THROW("PARSE_" + to_upper(onnx_name) +
                           ": auto_pad and padding cannot be specified simultaneously");
        }
    }
}

static void
tune_padding_to_symmetric(int64_t& left, int64_t& right, const int stride, int64_t& s_start)
{
    s_start = 0;
    if(left > right)
    {
        right = left;
    }
    else if(left < right)
    {
        auto diff = right - left;
        s_start   = (diff + stride - 1) / stride;
        left      = left + s_start * stride;
        right     = left;
    }
}

void tune_padding_size(const value& v,
                       std::vector<int64_t>& padding,
                       int count_include_pad,
                       std::vector<int64_t>& s_start)
{
    // maxpooling or count_include_pad is 1, no change is required.
    if(v.at("mode").to<op::pooling_mode>() == op::pooling_mode::max or count_include_pad == 1)
    {
        return;
    }

    // if padding is symmetric, return directly
    if(not is_asym_padding(padding))
    {
        return;
    }

    // asymmetric padding, make it symmetric
    std::size_t n_dims = padding.size() / 2;
    s_start.resize(n_dims);
    for(std::size_t i = 0; i < n_dims; ++i)
    {
        tune_padding_to_symmetric(
            padding[i], padding[i + n_dims], v.at("stride")[i].to<int64_t>(), s_start[i]);
    }
}

void check_asym_padding(const onnx_parser::node_info& info,
                        instruction_ref& ins,
                        const std::vector<int64_t>& padding,
                        value& v,
                        int count_include_pad,
                        float pad_val)
{
    size_t pad_ndims  = padding.size() / 2;
    auto left_pad_it  = padding.begin();
    auto right_pad_it = left_pad_it + pad_ndims;

    if(count_include_pad == 1)
    {
        std::vector<int64_t> asym_pads{0, 0, 0, 0}; // don't pad N and C
        // add left pads
        asym_pads.insert(asym_pads.begin() + 2, left_pad_it, right_pad_it);
        // add right pads
        asym_pads.insert(asym_pads.begin() + pad_ndims + 4, right_pad_it, padding.end());
        ins = info.add_instruction(make_op("pad", {{"pads", asym_pads}, {"value", pad_val}}), ins);
        std::vector<size_t> new_padding(padding.size());
        // subtract asym padding originally found from parsing the operator
        std::transform(padding.begin(),
                       left_pad_it,
                       asym_pads.begin() + 2,
                       new_padding.begin(),
                       std::minus<size_t>());
        std::transform(right_pad_it,
                       padding.end(),
                       asym_pads.begin() + pad_ndims + 4,
                       new_padding.begin() + pad_ndims,
                       std::minus<size_t>());
        v["padding"] = new_padding;
    }
}

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
