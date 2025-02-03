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
#include <migraphx/gpu/analyze_streams.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/value.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct hip_stream_model
{
    std::size_t max_stream = 0;
    std::unordered_map<migraphx::instruction_ref, std::size_t> ins2stream{};
    std::size_t get_nstream() const { return max_stream + 1; }
    std::size_t get_stream(migraphx::instruction_ref ins) const { return ins2stream.at(ins); }
    std::size_t get_event_id(migraphx::instruction_ref ins) const
    {
        auto v = ins->get_operator().to_value();
        return v["event"].to<std::size_t>();
    }
    bool has_stream(migraphx::instruction_ref ins) const { return ins2stream.count(ins) > 0; }
    bool is_record(migraphx::instruction_ref ins) const
    {
        return ins->name() == "gpu::record_event";
    }
    bool is_wait(migraphx::instruction_ref ins) const { return ins->name() == "gpu::wait_event"; }
};

stream_model make_stream_model(const module& m)
{
    hip_stream_model hsm;
    std::size_t stream = 0;
    for(auto ins : iterator_for(m))
    {
        if(ins->name() == "gpu::set_stream")
        {
            auto v         = ins->get_operator().to_value();
            stream         = v["stream"].to<std::size_t>();
            hsm.max_stream = std::max(stream, hsm.max_stream);
        }
        if(ins->get_operator().is_context_free())
            continue;
        if(contains({"hip::hip_allocate_memory", "hip::hip_copy_literal", "@param"}, ins->name()))
            continue;
        hsm.ins2stream[ins] = stream;
    }
    return hsm;
}

std::vector<stream_race> analyze_streams(const module& m)
{
    return migraphx::analyze_streams(m, make_stream_model(m));
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
