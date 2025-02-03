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
#ifndef MIGRAPHX_GUARD_GPU_CK_HPP
#define MIGRAPHX_GUARD_GPU_CK_HPP

#include <migraphx/compile_src.hpp>
#include <migraphx/env.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/stringutils.hpp>
#include <string_view>

#include "ck/host/device_gemm_multiple_d.hpp"
#include "ck/host/device_batched_gemm_softmax_gemm.hpp"

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

#ifndef _WIN32
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_CK);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_LOG_CK_GEMM);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_CK_DEBUG);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TUNE_CK);
#endif

// NOLINTNEXTLINE
const char* const disable_warning_pragma = R"__migraphx__(
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Weverything"
${content}
#pragma clang diagnostic pop
)__migraphx__";

template <class P>
std::string ck_disable_warnings(P p)
{
    return interpolate_string(disable_warning_pragma,
                              {{"content", std::string{p.data(), p.size()}}});
}

static std::unordered_map<std::string, std::string> create_ck_header_strings()
{
    std::unordered_map<std::string, std::string> result;
    auto ck_headers = ck::host::GetHeaders();

    std::transform(
        ck_headers.begin(), ck_headers.end(), std::inserter(result, result.begin()), [&](auto& p) {
            return std::pair<std::string, std::string>(p.first, ck_disable_warnings(p.second));
        });
    return result;
}

static std::vector<src_file> create_ck_headers()
{
    static const auto& header_strings = create_ck_header_strings();
    std::vector<src_file> srcs;
    std::transform(header_strings.begin(),
                   header_strings.end(),
                   std::back_inserter(srcs),
                   [&](auto& p) { return src_file{p}; });
    return srcs;
}

static inline const std::vector<src_file>& ck_headers()
{
    static const auto& headers = create_ck_headers();
    return headers;
}

inline bool transposed_matrix(const shape& s) { return s.strides().back() != 1; }

inline ck::host::DataType get_type(const shape& s)
{
    if(s.type() == shape::half_type)
        return ck::host::DataType::Half;
    else if(s.type() == shape::float_type)
        return ck::host::DataType::Float;
    else if(s.type() == shape::int8_type)
        return ck::host::DataType::Int8;
    else if(s.type() == shape::int32_type)
        return ck::host::DataType::Int32;
    MIGRAPHX_THROW("Unsupported ck type");
}

inline std::size_t get_batch_count(const shape& s)
{
    return std::accumulate(
        s.lens().rbegin() + 2, s.lens().rend(), std::size_t{1}, std::multiplies<std::size_t>());
}

inline void fold_batch_dims(shape& s)
{
    auto lens = s.lens();
    if(lens.size() <= 2)
        return;
    auto batch_count = get_batch_count(s);
    auto m1          = lens.at(lens.size() - 2);
    auto m2          = lens.at(lens.size() - 1);
    if(transposed_matrix(s))
        s = shape{s.type(), {m1, m2 * batch_count}};
    else
        s = shape{s.type(), {m1 * batch_count, m2}};
}

inline void remove_batch_dims(shape& s)
{
    auto lens = s.lens();
    if(lens.size() <= 2)
        return;
    auto m1 = lens.at(lens.size() - 2);
    auto m2 = lens.at(lens.size() - 1);
    s       = shape{s.type(), {m1, m2}};
}

inline bool standard_batch(const shape& s)
{
    if(s.lens().size() < 3)
        return true;
    std::vector<std::size_t> lens(s.lens().begin(), s.lens().end() - 2);
    std::vector<std::size_t> strides(s.strides().begin(), s.strides().end() - 2);
    auto base = *(s.lens().end() - 2) * *(s.lens().end() - 1);
    std::transform(strides.begin(), strides.end(), strides.begin(), [&](auto stride) {
        return stride / base;
    });
    return shape{s.type(), lens, strides}.standard();
}

inline bool can_fold_batch(const std::vector<shape>& inputs)
{
    const auto& b_shape = inputs[1];
    if(std::any_of(inputs.begin() + 2, inputs.end() - 1, [](auto input) {
           return not standard_batch(input);
       }))
        return false;
    const auto& b_strides = b_shape.strides();
    return std::all_of(
        b_strides.begin(), b_strides.end() - 2, [](auto stride) { return stride == 0; });
}

} // namespace gpu

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_GPU_CK_HPP
