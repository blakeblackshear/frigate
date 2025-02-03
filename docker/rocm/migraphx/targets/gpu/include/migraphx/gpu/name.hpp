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
#ifndef MIGRAPHX_GUARD_RTGLIB_OP_NAME_HPP
#define MIGRAPHX_GUARD_RTGLIB_OP_NAME_HPP

#include <migraphx/config.hpp>
#include <migraphx/type_name.hpp>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

template <class Derived>
struct oper
{
    // function to extract the name part of an operator. For example, we have
    // a operation "sin", then the get_type_name() will return
    // "migraphx::version_1::gpu::hip_sin", this functin will return the name
    // "gpu::sin" as the operator name
    std::string name() const
    {
        const std::string& name = get_type_name<Derived>();
        // search the namespace gpu (::gpu::)
        auto pos_ns = name.find("::gpu::");
        if(pos_ns != std::string::npos)
        {
            auto pos_name = name.find("hip_", pos_ns + std::string("::gpu::").length());
            if(pos_name != std::string::npos)
            {
                return std::string("gpu::") + name.substr(pos_name + 4);
            }
            else
            {
                return name.substr(pos_ns + 2);
            }
        }
        return "unknown_operator_name";
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
