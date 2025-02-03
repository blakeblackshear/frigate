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
#include <migraphx/op/common.hpp>
#include <migraphx/onnx/op_parser.hpp>
#include <migraphx/onnx/checks.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_roialign : op_parser<parse_roialign>
{
    std::vector<op_desc> operators() const { return {{"RoiAlign"}}; }

    instruction_ref parse(const op_desc& /*opd*/,
                          const onnx_parser& parser,
                          onnx_parser::node_info info,
                          const std::vector<instruction_ref>& args) const
    {
        std::string coord_trans_mode =
            parser.opset_version >= 16 ? "half_pixel" : "output_half_pixel";

        if(const auto* a = "coordinate_transformation_mode"; contains(info.attributes, a))
        {
            coord_trans_mode = info.attributes.at(a).s();
        }

        if(not contains({"half_pixel", "output_half_pixel"}, coord_trans_mode))
        {
            MIGRAPHX_THROW("coordinate_transformation_mode \"" + coord_trans_mode +
                           "\": invalid value!");
        }

        migraphx::op::pooling_mode rmode(migraphx::op::pooling_mode::average);
        if(contains(info.attributes, "mode"))
        {
            // read mode; default is "avg"
            if(info.attributes.at("mode").s() == "max")
            {
                rmode = migraphx::op::pooling_mode::max;
            }
        }

        int64_t output_height = 1;
        if(contains(info.attributes, "output_height"))
        {
            output_height = info.attributes.at("output_height").i();
        }

        int64_t output_width = 1;
        if(contains(info.attributes, "output_width"))
        {
            output_width = info.attributes.at("output_width").i();
        }

        int64_t sampling_ratio = 0;
        if(contains(info.attributes, "sampling_ratio"))
        {
            sampling_ratio = info.attributes.at("sampling_ratio").i();
        }

        float spatial_scale = 1.0f;
        if(contains(info.attributes, "spatial_scale"))
        {
            spatial_scale = info.attributes.at("spatial_scale").f();
        }
        return info.add_instruction(make_op("roialign",
                                            {{"coordinate_transformation_mode", coord_trans_mode},
                                             {"mode", rmode},
                                             {"output_height", output_height},
                                             {"output_width", output_width},
                                             {"sampling_ratio", sampling_ratio},
                                             {"spatial_scale", spatial_scale}}),
                                    args);
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
