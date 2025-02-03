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
 *
 */
#include <migraphx/gpu/problem_cache.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/json.hpp>
#include <migraphx/env.hpp>
#include <migraphx/serialize.hpp>
#include <migraphx/file_buffer.hpp>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_PROBLEM_CACHE)

void problem_cache::load()
{
    auto pc_path = string_value_of(MIGRAPHX_PROBLEM_CACHE{});
    if(pc_path.empty())
        return;
    if(not fs::exists(pc_path))
    {
        std::cout << "Problem cache not found. Creating new file.\n";
        return;
    }
    from_value(from_json_string(read_string(pc_path)), cache);
}
void problem_cache::save() const
{
    auto pc_path = string_value_of(MIGRAPHX_PROBLEM_CACHE{});
    if(pc_path.empty())
        return;
    write_string(pc_path, to_pretty_json_string(to_value(cache)));
}

static value create_key(const std::string& name, const value& problem)
{
    return {{"name", name}, {"problem", problem}};
}

bool problem_cache::has(const std::string& name, const value& problem) const
{
    return contains(cache, create_key(name, problem));
}

void problem_cache::insert(const std::string& name, const value& problem, const value& solution)
{
    assert(not solution.is_null());
    cache[create_key(name, problem)] = solution;
}

void problem_cache::mark(const std::string& name, const value& problem)
{
    cache.insert(std::make_pair(create_key(name, problem), value{}));
}

optional<value> problem_cache::get(const std::string& name, const value& problem) const
{
    auto it = cache.find(create_key(name, problem));
    if(it == cache.end())
        return nullopt;
    return it->second;
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
