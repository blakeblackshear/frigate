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
 */
#ifndef MIGRAPHX_GUARD_BUILTIN_HPP
#define MIGRAPHX_GUARD_BUILTIN_HPP

#include <migraphx/context.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/reflect.hpp>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace builtin {

struct literal
{
    std::string name() const { return "@literal"; }
    shape compute_shape(const std::vector<shape>&) const { MIGRAPHX_THROW("builtin"); }
    argument compute(context&, const shape&, const std::vector<argument>&) const
    {
        MIGRAPHX_THROW("builtin");
    }
};

struct outline
{
    shape s;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.s, "shape"));
    }

    std::string name() const { return "@outline"; }
    shape compute_shape(const std::vector<shape>&) const { return s; }
    argument compute(context&, const shape&, const std::vector<argument>&) const
    {
        MIGRAPHX_THROW("builtin");
    }
};

struct param
{
    std::string parameter;
    uint32_t order = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.parameter, "parameter"));
    }

    std::string name() const { return "@param"; }
    shape compute_shape(const std::vector<shape>&) const { MIGRAPHX_THROW("builtin"); }
    argument compute(context&, const shape&, const std::vector<argument>&) const
    {
        MIGRAPHX_THROW("builtin");
    }
    friend std::ostream& operator<<(std::ostream& os, const param& op)
    {
        os << op.name() << ":" << op.parameter;
        return os;
    }
};

struct returns
{
    std::string name() const { return "@return"; }

    shape compute_shape(const std::vector<shape>& arg) const
    {
        if(arg.empty())
            return {};
        else if(arg.size() == 1)
            return arg[0];
        else
            return shape(arg);
    }

    argument compute(context&, const shape&, const std::vector<argument>&) const
    {
        MIGRAPHX_THROW("builtin");
    }
};

} // namespace builtin
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
