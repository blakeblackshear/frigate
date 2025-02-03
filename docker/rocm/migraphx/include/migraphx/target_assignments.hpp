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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_ASSIGNMENT_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_ASSIGNMENT_HPP

#include <unordered_map>
#include <string>

#include <migraphx/instruction_ref.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct target_assignments
{
    using iterator   = std::unordered_map<instruction_ref, std::string>::const_iterator;
    using value_type = std::pair<instruction_ref, std::string>;

    auto size() const { return assignments.size(); }
    auto& at(instruction_ref ins) const { return assignments.at(ins); }

    auto insert(iterator it, const std::pair<instruction_ref, std::string>& assignment)
    {
        return assignments.insert(it, assignment);
    }
    auto find(instruction_ref ins) const { return assignments.find(ins); }

    auto begin() const { return assignments.begin(); }
    auto end() const { return assignments.end(); }

    private:
    std::unordered_map<instruction_ref, std::string> assignments;
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_ASSIGNMENT_HPP
