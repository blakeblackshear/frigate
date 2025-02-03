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
#include <migraphx/cpu/dnnl.hpp>

#if defined(__GNUC__) && __GNUC__ <= 5
namespace std {
#ifdef MIGRAPHX_ENABLE_ZENDNN
namespace dnnl = zendnn;
#endif
template <>
struct hash<dnnl::algorithm>
{
    using argument_type = dnnl::algorithm;
    using result_type   = std::size_t;
    result_type operator()(const argument_type& x) const noexcept
    {
        return std::hash<underlying_type_t<argument_type>>{}(
            static_cast<underlying_type_t<argument_type>>(x));
    }
};

} // namespace std
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

dnnl_context& get_dnnl_context()
{
    static dnnl_context ctx{}; // NOLINT
    return ctx;
}

#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wswitch-enum"
#endif
dnnl::memory::data_type to_dnnl_memory_data_type(shape::type_t t)
{
    using dt = dnnl::memory::data_type;
    using st = shape::type_t;
    switch(t)
    {
    case st::half_type: return dt::f16;
    case st::float_type: return dt::f32;
    case st::int32_type: return dt::s32;
    case st::int8_type: return dt::s8;
    case st::uint8_type: return dt::u8;
    case st::fp8e4m3fnuz_type: MIGRAPHX_THROW("fp8e4m3fnuz unsupported in DNNL");
    default: MIGRAPHX_THROW("Unsupported data type");
    }
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif

dnnl::memory::format_tag to_dnnl_memory_format_tag(std::size_t n)
{
    switch(n)
    {
    case 1: return dnnl::memory::format_tag::a;
    case 2: return dnnl::memory::format_tag::ab;
    case 3: return dnnl::memory::format_tag::abc;
    case 4: return dnnl::memory::format_tag::abcd;
    case 5: return dnnl::memory::format_tag::abcde;
    case 6: return dnnl::memory::format_tag::abcdef;
    default: MIGRAPHX_THROW("Unsupported tensor size: " + std::to_string(n));
    }
}

dnnl::memory::desc to_dnnl_memory_desc(const shape& s)
{
    return {to_dnnl_dims(s.lens()), to_dnnl_memory_data_type(s.type()), to_dnnl_dims(s.strides())};
}

dnnl::memory to_dnnl_memory(const dnnl::memory::desc& desc, const argument& a)
{
    return {desc, get_dnnl_context().engine, a.data()};
}

dnnl::memory to_dnnl_memory(const argument& a)
{
    return to_dnnl_memory(to_dnnl_memory_desc(a.get_shape()), a);
}

// clang-format off
#define MIGRAPHX_VISIT_DNNL_ALGO(m) \
        m(undef) \
        m(convolution_auto) \
        m(convolution_direct) \
        m(convolution_winograd) \
        m(deconvolution_direct) \
        m(deconvolution_winograd) \
        m(eltwise_relu) \
        m(eltwise_tanh) \
        m(eltwise_elu) \
        m(eltwise_square) \
        m(eltwise_abs) \
        m(eltwise_sqrt) \
        m(eltwise_swish) \
        m(eltwise_linear) \
        m(eltwise_bounded_relu) \
        m(eltwise_soft_relu) \
        m(eltwise_logistic) \
        m(eltwise_exp) \
        m(eltwise_gelu) \
        m(eltwise_gelu_tanh) \
        m(eltwise_gelu_erf) \
        m(eltwise_log) \
        m(eltwise_clip) \
        m(eltwise_pow) \
        m(eltwise_round) \
        m(eltwise_relu_use_dst_for_bwd) \
        m(eltwise_tanh_use_dst_for_bwd) \
        m(eltwise_elu_use_dst_for_bwd) \
        m(eltwise_sqrt_use_dst_for_bwd) \
        m(eltwise_logistic_use_dst_for_bwd) \
        m(eltwise_exp_use_dst_for_bwd) \
        m(lrn_across_channels) \
        m(lrn_within_channel) \
        m(pooling_max) \
        m(pooling_avg) \
        m(pooling_avg_include_padding) \
        m(pooling_avg_exclude_padding) \
        m(vanilla_rnn) \
        m(vanilla_lstm) \
        m(vanilla_gru) \
        m(lbr_gru) \
        m(binary_add) \
        m(binary_mul) \
        m(binary_max) \
        m(binary_min) \
        m(binary_div) \
        m(resampling_nearest) \
        m(resampling_linear) \
        m(reduction_max) \
        m(reduction_min) \
        m(reduction_sum) \
        m(reduction_mul) \
        m(reduction_mean) \
        m(reduction_norm_lp_max) \
        m(reduction_norm_lp_sum) \
        m(reduction_norm_lp_power_p_max) \
        m(reduction_norm_lp_power_p_sum)
// clang-format on

const std::unordered_map<std::string, dnnl::algorithm>& dnnl_algo_map()
{
    static const std::unordered_map<std::string, dnnl::algorithm> m = {
#define MIGRAPHX_DNNL_ALGO_GENERATE_VISITOR(x) {#x, dnnl::algorithm::x},
        MIGRAPHX_VISIT_DNNL_ALGO(MIGRAPHX_DNNL_ALGO_GENERATE_VISITOR)
#undef MIGRAPHX_DNNL_ALGO_GENERATE_VISITOR
    };
    return m;
}

dnnl::algorithm to_dnnl_algo(const std::string& name)
{
    if(dnnl_algo_map().count(name) == 0)
        MIGRAPHX_THROW("Missing dnnl algo: " + name);
    return dnnl_algo_map().at(name);
}

const std::unordered_map<dnnl::algorithm, std::string>& dnnl_algo_string_map()
{
    static const std::unordered_map<dnnl::algorithm, std::string> m = {
#define MIGRAPHX_DNNL_ALGO_GENERATE_VISITOR(x) {dnnl::algorithm::x, #x},
        MIGRAPHX_VISIT_DNNL_ALGO(MIGRAPHX_DNNL_ALGO_GENERATE_VISITOR)
#undef MIGRAPHX_DNNL_ALGO_GENERATE_VISITOR
    };
    return m;
}

std::string to_string(const dnnl::algorithm& algo)
{
    if(dnnl_algo_string_map().count(algo) == 0)
        return "unknown_" + std::to_string(static_cast<int>(algo));
    return dnnl_algo_string_map().at(algo);
}

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
