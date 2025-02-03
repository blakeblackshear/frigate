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
#ifndef MIGRAPHX_GUARD_RTGLIB_REGISTER_OP_HPP
#define MIGRAPHX_GUARD_RTGLIB_REGISTER_OP_HPP

#include <migraphx/config.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/auto_register.hpp>
#include <cstring>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

// unregister all ops for specified target, useful when unloading dynamically plugged-in target lib
MIGRAPHX_EXPORT void unregister_op(const std::string& op_name);

namespace detail {
struct op_handler
{
    operation op;
    std::string name;
    op_handler(const operation& op_r) : op(op_r), name(op.name()){};
    ~op_handler() { unregister_op(name); }
};

} // namespace detail

MIGRAPHX_EXPORT void register_op_init();

MIGRAPHX_EXPORT void register_op(const operation& op);

MIGRAPHX_EXPORT operation load_op(const std::string& name);

MIGRAPHX_EXPORT bool has_op(const std::string& name);

MIGRAPHX_EXPORT std::vector<std::string> get_operators();

template <class T>
void register_op()
{
    register_op_init(); // instantiate static op_map;
    static auto op_h = detail::op_handler(T{});
    register_op(op_h.op);
}

struct register_op_action
{
    template <class T>
    static void apply()
    {
        register_op<T>();
    }
};

template <class T>
using auto_register_op = auto_register<register_op_action, T>;

#define MIGRAPHX_REGISTER_OP(...) MIGRAPHX_AUTO_REGISTER(register_op_action, __VA_ARGS__)

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
