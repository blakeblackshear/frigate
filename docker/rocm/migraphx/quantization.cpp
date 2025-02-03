/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/float_equal.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/quantization.hpp>
#include <migraphx/truncate_float.hpp>
#include <migraphx/quantize_8bits.hpp>
#include <migraphx/quantize_int4.hpp>
#include <migraphx/simplify_reshapes.hpp>
#include <migraphx/simplify_qdq.hpp>
#include <migraphx/eliminate_common_subexpression.hpp>
#include <migraphx/optimize_module.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/op/capture.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/target.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/normalize_ops.hpp>
#include <set>
#include <map>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_8BITS_QUANTIZATION_PARAMS)
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_QUANTIZATION)

tracer quant_tracer()
{
    if(enabled(MIGRAPHX_TRACE_QUANTIZATION{}))
        return tracer{std::cout};

    return tracer{};
};

// This function is to convert any instructions specified in the input
// from double or float to float16 by inserting a convert operator.
// For the conversion, there could be cases of overflowing or underflowing, but it
// is uncommon. Run optimize_module() before converting to fp16 to const eval and fold in FP32 to
// avoid loss of precision.
void quantize_fp16(program& prog, const std::vector<std::string>& ins_names)
{
    run_passes(prog,
               {normalize_ops{},
                optimize_module{{"quantizelinear", "dequantizelinear"}},
                truncate_float_pass{ins_names, shape::half_type},
                optimize_module{{"quantizelinear", "dequantizelinear"}}},
               quant_tracer());
}

void quantize_bf16(program& prog, const std::vector<std::string>& ins_names)
{
    run_passes(prog,
               {normalize_ops{},
                optimize_module{{"quantizelinear", "dequantizelinear"}},
                truncate_float_pass{ins_names, shape::bf16_type},
                optimize_module{{"quantizelinear", "dequantizelinear"}}},
               quant_tracer());
}

void quantize_8bits(program& prog,
                    const target& t,
                    shape::type_t precision,
                    const std::vector<parameter_map>& calibration,
                    const std::unordered_set<std::string>& ins_names)
{
    // Run optimize_module() before converting to int8/fp8 to const eval and fold in FP32 to
    // avoid loss of precision.
    run_passes(prog, {normalize_ops{}, optimize_module{}}, quant_tracer());

    std::shared_ptr<std::vector<std::pair<float, float>>> quant_8bit_params =
        std::make_shared<std::vector<std::pair<float, float>>>();
    std::shared_ptr<std::vector<float>> max_abs_vals = std::make_shared<std::vector<float>>();
    std::map<shape::type_t, float> type_ranges       = {{shape::type_t::int8_type, 127.0},
                                                        {shape::type_t::fp8e4m3fnuz_type, 240.0},
                                                        {shape::type_t::fp8e4m3fn_type, 448.0}};
    float quantized_range                            = type_ranges.at(precision);
    auto calc_quant_params = [&](std::size_t ins_index, std::vector<argument> args) {
        std::pair<float, float> param_pair{64.0f, 0.0f};
        // scale and shift is need for only int8 type, and we do not
        // consider shift, so set shift to 0
        std::vector<float> vec_val;
        argument arg = t.copy_from(args.front());
        arg.visit([&](auto output) { vec_val.assign(output.begin(), output.end()); });
        auto max_val                = *std::max_element(vec_val.begin(), vec_val.end());
        auto min_val                = *std::min_element(vec_val.begin(), vec_val.end());
        auto max_abs                = std::max(std::fabs(max_val), std::fabs(min_val));
        max_abs_vals->at(ins_index) = std::max(max_abs_vals->at(ins_index), max_abs);
        // if all values are 0, no need to do scaling
        if(float_equal(max_abs_vals->at(ins_index), 0.0f))
        {
            param_pair.first = 1.0f;
        }
        else
        {
            param_pair.first = quantized_range / max_abs_vals->at(ins_index);
        }
        quant_8bit_params->at(ins_index) = param_pair;
    };

    // pass to add capture argument op
    std::size_t param_num = 0;
    run_passes(
        prog, {capture_arguments_pass{ins_names, calc_quant_params, &param_num}}, quant_tracer());
    quant_8bit_params->resize(param_num, std::pair<float, float>(64.0f, 0.0f));
    max_abs_vals->resize(param_num, 0.0f);

    // use the calibration data to compute the quantization scale
    auto capture_prog = prog;
    capture_prog.compile(t);

    // use all calibration data to run the program to calculate the
    // quantization scale and shift
    for(auto&& arg : calibration)
    {
        parameter_map m;
        for(auto&& x : capture_prog.get_parameter_shapes())
        {
            if(arg.count(x.first) > 0)
            {
                assert(x.second == arg.at(x.first).get_shape());
                m[x.first] = t.copy_to(arg.at(x.first));
            }
            else
            {
                m[x.first] = t.allocate(x.second);
            }
        }
        capture_prog.eval(m);
    }

    // print the quantization parameters in only the main module
    if(enabled(MIGRAPHX_8BITS_QUANTIZATION_PARAMS{}))
    {
        for(std::size_t i = 0; i < quant_8bit_params->size(); ++i)
        {
            auto param = quant_8bit_params->at(i);
            std::cout << "ins_index = " << i << ", scale = " << param.first
                      << ", shift = " << param.second << std::endl;
        }
        std::cout << std::endl;
    }

    run_passes(prog,
               {quantize_8bits_pass{precision, *quant_8bit_params}, dead_code_elimination{}},
               quant_tracer());
}

void quantize_int8(program& prog,
                   const target& t,
                   const std::vector<parameter_map>& calibration,
                   const std::unordered_set<std::string>& ins_names)
{
    std::unordered_set<std::string> op_names = {"convolution", "dot"};
    if(op_names != ins_names)
    {
        MIGRAPHX_THROW("QUANTIZE_INT8: only support DOT and CONVOLUTION operation");
    }
    quantize_8bits(prog, t, shape::int8_type, calibration, ins_names);
}

void quantize_int4_weights(program& prog)
{
    run_passes(prog, {normalize_ops{}, optimize_module{}, quantize_int4_pass{}}, quant_tracer());
}

void quantize_fp8(program& prog, const target& t, const std::vector<parameter_map>& calibration)
{
    std::unordered_set<std::string> supported_ins_names;
    auto* mm = prog.get_main_module();
    for(auto ins : iterator_for(*mm))
    {
        if(ins->name() == "convert")
        {
            continue;
        }
        if(not starts_with(ins->name(), "@"))
        {
            supported_ins_names.insert(ins->name());
        }
    }
    quantize_8bits(prog, t, shape::fp8e4m3fn_type, calibration, supported_ins_names);
}
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
