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
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/onnx/conv.hpp>
#include <migraphx/onnx/padding.hpp>
#include <migraphx/op/common.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

template <class T>
std::vector<int64_t> to_int64_vector(const std::vector<T>& input_vector)
{
    std::vector<int64_t> output_vector(input_vector.begin(), input_vector.end());
    return output_vector;
}

struct parse_conv_transpose : op_parser<parse_conv_transpose>
{
    std::vector<op_desc> operators() const { return {{"ConvTranspose"}}; }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          std::vector<instruction_ref> args) const
    {
        operation op = make_op("convolution_backwards");
        value values = op.to_value();
        auto l0      = args[0];
        std::vector<std::int64_t> padding;
        bool asym_padding = false;
        assert(l0->get_shape().ndim() > 2);
        auto kdims = l0->get_shape().ndim() - 2;

        // ensure pads available only when auto_pad is "NOT_SET"
        check_padding_mode(info, opd.onnx_name);

        if(contains(info.attributes, "pads"))
        {
            copy(info.attributes["pads"].ints(), std::back_inserter(padding));

            asym_padding = is_asym_padding(padding);

            size_t pad_ndims = padding.size() / 2;
            if(not asym_padding)
            {
                check_attr_sizes(kdims, pad_ndims, "PARSE_CONV_TRANSPOSE: inconsistent paddings");
                values["padding"].clear();
                std::transform(padding.begin(),
                               padding.begin() + pad_ndims,
                               std::back_inserter(values["padding"]),
                               [](auto pad_val) { return pad_val; });
            }
            else if(l0->get_shape().dynamic())
            {
                MIGRAPHX_THROW("PARSE_CONV_TRANSPOSE: asymmetric padding (padding_L != padding_R) "
                               "not supported with dynamic shapes");
            }
            else
            {
                // set padding to 0s, asym_padding handled by parser with slice
                // TODO changing parser and op to do asym padding in op
                values["padding"] = std::vector<std::size_t>(pad_ndims, 0);
            }
        }

        if(contains(info.attributes, "strides"))
        {
            values["stride"].clear();
            copy(info.attributes["strides"].ints(), std::back_inserter(values["stride"]));
            check_attr_sizes(
                kdims, values["stride"].size(), "PARSE_CONV_TRANSPOSE: inconsistent strides");
        }

        if(contains(info.attributes, "dilations"))
        {
            values["dilation"].clear();
            copy(info.attributes["dilations"].ints(), std::back_inserter(values["dilation"]));
            check_attr_sizes(
                kdims, values["dilation"].size(), "PARSE_CONV_TRANSPOSE: inconsistent dilations");
        }

        // TODO: auto padding needs to be implemented for this parser and operator
        if(contains(info.attributes, "auto_pad") and
           to_upper(info.attributes.at("auto_pad").s()) != "NOTSET")
        {
            MIGRAPHX_THROW("PARSE_CONV_TRANSPOSE: auto padding not supported");
        }

        if(contains(info.attributes, "group"))
        {
            values["group"] = parser.parse_value(info.attributes.at("group")).at<int>();
        }

        recalc_conv_attributes(values, kdims);

        op.from_value(values);
        auto l1 = info.add_instruction(op, l0, args[1]);
        if(asym_padding)
        {
            std::vector<int64_t> dims = to_int64_vector(l1->get_shape().lens());
            std::vector<int64_t> curr_shape(dims.begin() + 2, dims.end());
            std::vector<int64_t> axes(kdims);
            std::iota(axes.begin(), axes.end(), 2); // ignore first 2 dims

            auto pad_kdim_start = padding.begin() + kdims;
            std::vector<int64_t> starts(padding.begin(), pad_kdim_start);

            std::vector<int64_t> ends{};
            std::transform(curr_shape.begin(),
                           curr_shape.end(),
                           pad_kdim_start,
                           std::back_inserter(ends),
                           [](auto curr_dim, auto pad_dim) { return curr_dim - pad_dim; });

            l1 = info.add_instruction(
                make_op("slice", {{"axes", axes}, {"starts", starts}, {"ends", ends}}), l1);
        }

        // TODO, should check output_padding < (strides or dilations)
        if(contains(info.attributes, "output_padding") and
           not contains(info.attributes, "output_shape"))
        {
            size_t non_kdims = l1->get_shape().ndim() * 2 - kdims;
            std::vector<int64_t> output_padding(non_kdims, 0);
            copy(info.attributes["output_padding"].ints(), std::back_inserter(output_padding));
            check_attr_sizes(kdims,
                             output_padding.size() - non_kdims,
                             "PARSE_CONV_TRANSPOSE: inconsistent output padding");
            l1 = info.add_instruction(make_op("pad", {{"pads", output_padding}}), l1);
        }

        // TODO, doing unnecessary calcuations with this. Could instead
        // calculate the padding to conv_transpose that would give the output_shape.
        if(contains(info.attributes, "output_shape"))
        {
            if(l1->get_shape().dynamic())
            {
                MIGRAPHX_THROW("PARSE_CONV_TRANSPOSE: output_shape attribute and dynamic shapes "
                               "not supported");
            }
            std::vector<int64_t> dims = to_int64_vector(l1->get_shape().lens());
            std::vector<int64_t> curr_shape(dims.begin() + 2, dims.end());
            std::vector<int64_t> output_shape;
            copy(info.attributes["output_shape"].ints(), std::back_inserter(output_shape));
            check_attr_sizes(
                kdims, output_shape.size(), "PARSE_CONV_TRANSPOSE: inconsistent output shape");
            if(curr_shape != output_shape)
            {
                std::vector<int64_t> target_padding(dims.size() * 2 - kdims, 0);
                std::transform(output_shape.begin(),
                               output_shape.end(),
                               curr_shape.begin(),
                               std::back_inserter(target_padding),
                               [](auto out_dim, auto curr_dim) { return out_dim - curr_dim; });
                l1 = info.add_instruction(make_op("pad", {{"pads", target_padding}}), l1);
            }
        }

        return info.add_bias(args, l1, 1);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
