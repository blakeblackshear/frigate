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
#include <migraphx/analyze_streams.hpp>
#include <migraphx/program.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/errors.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

bool happens_before(const std::vector<std::size_t>& e1, const std::vector<std::size_t>& e2)
{
    return std::equal(e1.begin(), e1.end(), e2.begin(), e2.end(), std::less_equal<>{}) and
           not std::equal(e1.begin(), e1.end(), e2.begin(), e2.end(), std::greater_equal<>{});
}

std::vector<stream_race> analyze_streams(const module& m, const stream_model& strmm)
{
    using vector_clock = std::vector<std::size_t>;
    std::vector<stream_race> races;
    auto nstream = strmm.get_nstream();
    std::vector<vector_clock> vclock(nstream, vector_clock(nstream));
    std::unordered_map<instruction_ref, vector_clock> timestamp;
    std::unordered_map<std::size_t, vector_clock> events;
    for(auto ins : iterator_for(m))
    {
        if(not strmm.has_stream(ins))
            continue;
        std::size_t s = strmm.get_stream(ins);
        assert(s < nstream);
        assert(vclock.size() == nstream);
        assert(vclock[s].size() == nstream);
        if(strmm.is_record(ins))
        {
            vclock[s][s]++;
            auto event    = strmm.get_event_id(ins);
            events[event] = vclock[s];
        }
        else if(strmm.is_wait(ins))
        {
            auto event = strmm.get_event_id(ins);
            if(not contains(events, event))
                MIGRAPHX_THROW("Event is waited on before being recorded: " +
                               std::to_string(event));
            auto payload = events.at(event);
            assert(vclock[s].size() == payload.size());
            std::transform(vclock[s].begin(),
                           vclock[s].end(),
                           payload.begin(),
                           vclock[s].begin(),
                           [&](auto x, auto y) { return std::max(x, y); });
            vclock[s][s]++;
        }
        else
        {
            vclock[s][s]++;
        }
        timestamp[ins] = vclock[s];
    }
    for(auto ins : iterator_for(m))
    {
        if(not strmm.has_stream(ins))
            continue;
        if(ins->inputs().empty())
            continue;
        std::size_t s = strmm.get_stream(ins);
        // Find inputs from different streams
        std::vector<instruction_ref> inputs;
        fix([&](auto self, auto start) {
            for(auto input : start->inputs())
            {
                if(not strmm.has_stream(input))
                    self(input);
                else if(strmm.get_stream(input) != s)
                    inputs.push_back(input);
            }
        })(ins);
        auto it = std::find_if(inputs.begin(), inputs.end(), [&](auto input) {
            return not happens_before(timestamp.at(input), timestamp.at(ins));
        });
        if(it != inputs.end())
        {
            races.push_back({ins, *it});
        }
    }

    return races;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
