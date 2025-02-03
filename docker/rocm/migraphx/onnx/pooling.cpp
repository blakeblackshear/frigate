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

#include <migraphx/onnx/pooling.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/onnx/padding.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/op/pad.hpp>
#include <migraphx/ranges.hpp>
namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

value handle_pooling_values(const op_desc& opd,
                            onnx_parser::node_info info,
                            const shape& in_shape,
                            value values)
{
    auto kdims = in_shape.ndim() - 2;
    if(starts_with(opd.onnx_name, "Global") or starts_with(opd.onnx_name, "QLinearGlobal"))
    {
        // if spatial dimensions are dynamic use dyn_global flag
        if(in_shape.dynamic() and std::any_of(in_shape.dyn_dims().cbegin() + 2,
                                              in_shape.dyn_dims().cend(),
                                              [](auto dd) { return not dd.is_fixed(); }))
        {
            values["dyn_global"] = true;
            values["lengths"]    = std::vector<size_t>();
        }
        else
        {
            // works with static and fixed dynamic shape
            auto m_lens       = in_shape.max_lens();
            values["lengths"] = std::vector<size_t>(m_lens.begin() + 2, m_lens.end());
        }
    }

    if(contains(info.attributes, "ceil_mode"))
    {
        values["ceil_mode"] = static_cast<bool>(info.attributes.at("ceil_mode").i());
    }

    if(contains(info.attributes, "strides"))
    {
        values["stride"].clear();
        copy(info.attributes["strides"].ints(), std::back_inserter(values["stride"]));
        check_attr_sizes(kdims, values["stride"].size(), "PARSE_POOLING: inconsistent strides");
    }

    if(contains(info.attributes, "kernel_shape"))
    {
        values["lengths"].clear();
        copy(info.attributes["kernel_shape"].ints(), std::back_inserter(values["lengths"]));
        check_attr_sizes(kdims, values["lengths"].size(), "PARSE_POOLING: inconsistent lengths");
    }

    if(contains(info.attributes, "dilations"))
    {
        values["dilations"].clear();
        copy(info.attributes["dilations"].ints(), std::back_inserter(values["dilations"]));
        check_attr_sizes(
            kdims, values["dilations"].size(), "PARSE_POOLING: inconsistent dilations");
    }

    // lp_order attribute
    if(contains(info.attributes, "p"))
    {
        values["lp_order"] = info.attributes.at("p").i();
    }

    // ensure pads available only when auto_pad is "NOT_SET"
    check_padding_mode(info, opd.onnx_name);

    return values;
}

instruction_ref add_pooling_op(const op_desc& opd, onnx_parser::node_info info, instruction_ref l0)
{
    std::string mode                                                 = opd.op_name;
    const std::unordered_map<std::string, op::pooling_mode> mode_map = {
        {"max", op::pooling_mode::max},
        {"average", op::pooling_mode::average},
        {"lpnorm", op::pooling_mode::lpnorm}};
    if(not contains(mode_map, mode))
    {
        MIGRAPHX_THROW(
            "PARSE_POOLING: onnx pooling mode must be [\"max\", \"average\", \"lpnorm\"]");
    }
    operation op  = make_op("pooling", {{"mode", mode_map.at(mode)}});
    value values  = op.to_value();
    auto in_shape = l0->get_shape();
    assert(in_shape.ndim() > 2);
    auto kdims = in_shape.ndim() - 2;

    values = handle_pooling_values(opd, info, in_shape, values);

    // count include padding, if count include pad is 1, we always use
    // explicit pad
    int count_include_pad = 0;
    if(contains(info.attributes, "count_include_pad"))
    {
        if(in_shape.dynamic())
        {
            MIGRAPHX_THROW("PARSE_POOLING: count_include_pad attribute is not supported for "
                           "dynamic input shape");
        }
        count_include_pad = info.attributes.at("count_include_pad").i();
    }

    std::vector<int64_t> paddings;
    float pad_val = ((mode == "max") ? std::numeric_limits<float>::lowest() : 0.0f);

    if(contains(info.attributes, "pads"))
    {
        values["padding"].clear();
        copy(info.attributes["pads"].ints(), std::back_inserter(paddings));
        check_attr_sizes(
            kdims, paddings.size() / 2, "PARSE_POOLING: inconsistent explicit paddings");
    }

    if(paddings.size() != 2 * kdims)
    {
        paddings.resize(kdims * 2);
        std::fill_n(paddings.begin(), 2 * kdims, 0);
    }

    if(values["padding"].size() != kdims)
    {
        values["padding"].resize(kdims);
        std::fill_n(values["padding"].begin(), kdims, 0);
    }

    if(values["stride"].size() != kdims)
    {
        values["stride"].resize(kdims);
        std::fill_n(values["stride"].begin(), kdims, 1);
    }

    if(values["dilations"].size() != kdims)
    {
        values["dilations"].resize(kdims);
        std::fill_n(values["dilations"].begin(), kdims, 1);
    }

    // used to calculate the supposed output shape
    std::vector<int64_t> orig_padding = paddings;

    // TODO:  add parsing for dilations
    if(contains(info.attributes, "auto_pad") and
       to_upper(info.attributes["auto_pad"].s()) != "NOTSET")
    {
        auto auto_pad = to_upper(info.attributes["auto_pad"].s());
        // don't use the given padding sizes, if any
        // values["padding"].clear();
        if(in_shape.dynamic())
        {
            // set padding_mode to trigger auto padding at runtime
            bool is_same_upper     = (auto_pad.find("SAME_UPPER") != std::string::npos);
            values["padding_mode"] = is_same_upper ? to_value(op::padding_mode_t::same_upper)
                                                   : to_value(op::padding_mode_t::same_lower);
        }
        else
        {
            // Calculate auto padding
            // dilations (argument 4) not supported; default to all 1's
            cal_auto_padding_size(info,
                                  values,
                                  values["lengths"].to_vector<std::size_t>(),
                                  values["dilations"].to_vector<std::size_t>(),
                                  in_shape.lens(),
                                  paddings);
            values["padding"] = paddings;
            // default padding_mode indicates that padding sizes are not calculated dynamically
            values["padding_mode"] = migraphx::op::padding_mode_t::default_;
        }
    }

    std::vector<int64_t> slice_start;
    std::vector<int64_t> slice_end;
    tune_padding_size(values, paddings, count_include_pad, slice_start);

    if(not slice_start.empty())
    {
        if(in_shape.dynamic())
        {
            MIGRAPHX_THROW(
                "PARSE_POOLING: asymmetric padding not supported for dynamic input shape");
        }
        // calculate expected output shape
        orig_padding.insert(orig_padding.begin() + kdims, 2, 0);
        orig_padding.insert(orig_padding.begin(), 2, 0);
        op::pad pad{orig_padding, 0.0f};
        shape padded_shape = pad.compute_shape({l0->get_shape()});

        // make an op just to get its output shape
        auto out_lens = make_op("pooling", values).compute_shape({padded_shape}).lens();
        // compute slice_end information
        slice_end.resize(slice_start.size());
        std::transform(out_lens.begin() + 2,
                       out_lens.end(),
                       slice_start.begin(),
                       slice_end.begin(),
                       [](auto i, auto j) { return i + j; });
    }
    values["padding"] = std::vector<size_t>(paddings.begin(), paddings.end());

    check_asym_padding(info, l0, paddings, values, count_include_pad, pad_val);
    op.from_value(values);

    auto l1 = info.add_instruction(op, l0);
    if(not slice_start.empty())
    {
        std::vector<int64_t> axes(kdims);
        std::iota(axes.begin(), axes.end(), 2);
        l1 = info.add_instruction(
            make_op("slice", {{"axes", axes}, {"starts", slice_start}, {"ends", slice_end}}), l1);
    }

    return l1;
}

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
