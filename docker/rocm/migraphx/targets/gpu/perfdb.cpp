/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/gpu/perfdb.hpp>
#include <migraphx/value.hpp>
#include <migraphx/sqlite.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/permutation.hpp>
#include <fstream>
#include <mutex>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

namespace {

std::string get_layout(const shape& s, std::string labels)
{
    auto result = labels;
    auto p      = find_permutation(s);
    std::transform(p.begin(), p.end(), result.begin(), [&](auto i) { return labels[i]; });
    return "'" + result + "'";
}

std::string get_type(const shape& s)
{
    static const std::unordered_map<shape::type_t, std::string> m = {
        {shape::float_type, "'FP32'"},
        {shape::half_type, "'FP16'"},
        {shape::double_type, "'FP64'"},
        {shape::int8_type, "'INT8'"},
        {shape::int32_type, "'INT32'"},
    };
    auto it = m.find(s.type());
    if(it == m.end())
        return "UNKNOWN";
    return it->second;
}

std::string generate_miopen_config(const problem_params& pp)
{
    value v       = pp.op.to_value();
    auto input    = pp.inputs[0].lens();
    auto weights  = pp.inputs[1].lens();
    auto padding  = v["padding"].to_vector<std::size_t>();
    auto stride   = v["stride"].to_vector<std::size_t>();
    auto dilation = v["dilation"].to_vector<std::size_t>();
    if(padding.size() != stride.size())
        padding.erase(padding.begin() + padding.size() / 2, padding.end());
    return to_string_range({std::string{" C.in_channels="},       to_string(input[1]),
                            std::string{" AND C.in_h="},          to_string(input[2]),
                            std::string{" AND C.in_w="},          to_string(input[3]),
                            std::string{" AND C.fil_h="},         to_string(weights[2]),
                            std::string{" AND C.fil_w="},         to_string(weights[3]),
                            std::string{" AND C.out_channels="},  to_string(weights[0]),
                            std::string{" AND C.batchsize="},     to_string(input[0]),
                            std::string{" AND C.pad_h="},         to_string(padding[0]),
                            std::string{" AND C.pad_w="},         to_string(padding[2]),
                            std::string{" AND C.dilation_h="},    to_string(dilation[0]),
                            std::string{" AND C.dilation_w="},    to_string(dilation[1]),
                            std::string{" AND C.conv_stride_h="}, to_string(stride[0]),
                            std::string{" AND C.conv_stride_w="}, to_string(stride[1]),
                            std::string{" AND C.layout="},        get_layout(pp.inputs[0], "NCHW"),
                            std::string{" AND C.data_type="},     get_type(pp.inputs[0]),
                            std::string{" AND C.direction="},     std::string{"'F'"}},
                           " ");
}

auto query_miopen_db(const std::string& query)
{
    static std::mutex g_db_mutex; // NOLINT
    const std::lock_guard<std::mutex> lock(g_db_mutex);

    // TODO: Store db as a static variable
    const auto dbpath = fs::path{"/opt"} / "rocm" / "share" / "miopen" / "db" / "miopen.db";
    // Check if db file exists.
    std::ifstream dbs(dbpath);
    if(dbs.is_open())
    {
        dbs.close();
    }
    else
    {
        std::vector<std::unordered_map<std::string, std::string>> empty;
        return empty;
    }

    auto db = sqlite::read(dbpath);
    return db.execute(query);
}

} // namespace

std::string get_mlir_perf_for_conv(const problem_params& pp, bool xdlops)
{
    std::string solver = xdlops ? "ConvMlirIgemmFwdXdlops" : "ConvMlirIgemmFwd";
    std::string query  = "select P.* \
                             from perf_db P, config C \
                             where P.config = C.id AND \
                             P.solver = '${solver}' AND \
                             ${config}";

    auto results = query_miopen_db(
        interpolate_string(query, {{"config", generate_miopen_config(pp)}, {"solver", solver}}));
    if(results.empty())
        return "";
    return results.front().at("params");
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
