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
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/onnx/checks.hpp>
#include <random>
#include <set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace onnx {

struct parse_randomuniform_ops : op_parser<parse_randomuniform_ops>
{
    std::set<shape::type_t> valid_types = {shape::float_type, shape::half_type, shape::double_type};

    std::vector<op_desc> operators() const { return {{"RandomUniform"}, {"RandomUniformLike"}}; }

    instruction_ref parse(const op_desc& opd,
                          const onnx_parser& parser,
                          const onnx_parser::node_info& info,
                          std::vector<instruction_ref> args) const
    {
        int dtype      = 1;
        bool use_dtype = false;
        if(contains(info.attributes, "dtype"))
        {
            dtype     = info.attributes.at("dtype").i();
            use_dtype = true;
        }
        shape::type_t out_type = get_type(dtype);
        if(not contains(valid_types, out_type))
            MIGRAPHX_THROW(opd.onnx_name + ": invalid output type: " + std::to_string(dtype) +
                           ". Valid types are 1 (float), 10 (half), and 11 (double).");

        float high = 1.0;
        if(contains(info.attributes, "high"))
            high = info.attributes.at("high").f();

        float low = 0.0;
        if(contains(info.attributes, "low"))
            low = info.attributes.at("low").f();

        shape out_shape;
        if(contains(info.attributes, "shape"))
        {
            // RandomUniform:
            // output type and shape must come from attributes
            std::vector<int> out_lens;
            literal ls = parser.parse_value(info.attributes.at("shape"));
            ls.visit([&](auto s) { out_lens.assign(s.begin(), s.end()); });
            out_shape = shape{out_type, out_lens};
        }
        else if(args.size() == 1)
        {
            // RandomUniformLike:
            // output type and shape are the same as the input by default
            // dtype is used instead when attribute is set
            if(not contains(valid_types, args[0]->get_shape().type()))
                MIGRAPHX_THROW(opd.onnx_name + ": invalid output type: " +
                               std::to_string(args[0]->get_shape().type()) +
                               ". Valid types are float, half, and double.");
            out_shape =
                use_dtype ? shape{out_type, args[0]->get_shape().lens()} : args[0]->get_shape();
        }
        else
        {
            MIGRAPHX_THROW(opd.onnx_name +
                           ": cannot deduce shape without shape attribute or argument.");
        }

        std::mt19937 gen(std::chrono::high_resolution_clock::now().time_since_epoch().count());
        if(contains(info.attributes, "seed"))
            gen.seed(info.attributes.at("seed").f());

        std::uniform_real_distribution<> d(low, high);
        std::vector<double> rand_vals(out_shape.elements());
        std::generate(rand_vals.begin(), rand_vals.end(), [&]() { return d(gen); });

        return info.add_literal(literal{out_shape, rand_vals});
    }
};

} // namespace onnx
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
