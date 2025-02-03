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
#include <migraphx/register_op.hpp>
#include <migraphx/ranges.hpp>
#include <unordered_map>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

std::unordered_map<std::string, operation>& op_map()
{
    static std::unordered_map<std::string, operation> m; // NOLINT
    return m;
}

void register_op_init() { (void)op_map(); }

void register_op(const operation& op) { op_map()[op.name()] = op; }

void unregister_op(const std::string& op_name)
{
    assert(op_map().count(op_name));
    op_map().erase(op_name);
}

operation load_op(const std::string& name)
{
    return at(op_map(), name, "Operator not found: " + name);
}

bool has_op(const std::string& name) { return op_map().count(name) == 1; }

std::vector<std::string> get_operators()
{
    std::vector<std::string> result;
    std::transform(op_map().begin(), op_map().end(), std::back_inserter(result), [&](auto&& p) {
        return p.first;
    });
    std::sort(result.begin(), result.end());
    return result;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
