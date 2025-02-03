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
#ifndef MIGRAPHX_GUARD_RTGLIB_CHECK_CONTEXT_HPP
#define MIGRAPHX_GUARD_RTGLIB_CHECK_CONTEXT_HPP

#include <migraphx/program.hpp>
#include <migraphx/config.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/ranges.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

template <class T>
struct check_context
{
    struct op : auto_register_op<op>
    {
        static std::string compute_op_name()
        {
            const auto& op_type_name                      = get_type_name<T>();
            const auto& split_name                        = split_string(op_type_name, ':');
            std::vector<std::string> name_without_version = {"check_context"};
            // op_type_name would contain internal namespace name with version_x_y_z
            // remove version and construct op_name such as check_context::migraphx::gpu::context
            std::copy_if(
                split_name.begin(),
                split_name.end(),
                std::back_inserter(name_without_version),
                [&](const auto& i) { return not i.empty() and not contains(i, "version"); });
            return join_strings(name_without_version, "::");
        }

        std::string name() const
        {
            static auto op_name = compute_op_name();
            return op_name;
        }

        shape compute_shape(const std::vector<shape>&) const { return {}; }
        argument compute(context& ctx, const shape&, const std::vector<argument>&) const
        {
            this->check(ctx);
            return {};
        }
        void finalize(context& ctx, const shape&, const std::vector<shape>&) const
        {
            this->check(ctx);
        }
        void check(context& ctx) const
        {
            T* x = any_cast<T>(&ctx);
            if(x == nullptr)
                MIGRAPHX_THROW(std::string("Unexpected context type: ") + ctx.type_id().name());
        }
    };

    std::string name() const { return "check_context"; }
    void apply(module& m) const { m.insert_instruction(m.begin(), op{}); }
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
