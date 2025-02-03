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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_CODE_OBJECT_OP_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_CODE_OBJECT_OP_HPP

#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/gpu/kernel.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct context;

struct code_object_op
{
    value::binary code_object{};
    std::string symbol_name = "";
    std::size_t global      = 0;
    std::size_t local       = 0;
    std::vector<shape> expected_inputs{};
    shape output{};
    std::int64_t output_arg = -1;
    kernel k{};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.code_object, "code_object"),
                    f(self.symbol_name, "symbol_name"),
                    f(self.global, "global"),
                    f(self.local, "local"),
                    f(self.expected_inputs, "expected_inputs"),
                    f(self.output, "output"),
                    f(self.output_arg, "output_arg"));
    }

    value attributes() const { return {{"group", group()}}; }

    std::string group() const { return "gpu::code_object::" + symbol_name; }

    std::string name() const { return "gpu::code_object"; }
    shape compute_shape(std::vector<shape> inputs) const;
    argument
    compute(context& ctx, const shape& output_shape, const std::vector<argument>& args) const;
    void finalize(context&, const shape&, const std::vector<shape>&);
    std::int64_t get_output_arg(std::size_t n) const
    {
        return output_arg < 0 ? n + output_arg : output_arg;
    }
    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return get_output_arg(shapes.size());
    }

    friend std::ostream& operator<<(std::ostream& os, const code_object_op& op)
    {
        os << op.name() << "[";
        os << "code_object=" << op.code_object.size() << ",";
        os << "symbol_name=" << op.symbol_name << ",";
        os << "global=" << op.global << ",";
        os << "local=" << op.local << ",";
        if(op.output_arg != -1)
            os << "output_arg=" << op.output_arg << ",";
        os << "]";
        return os;
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
