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
#ifndef MIGRAPHX_GUARD_RTGLIB_REGISTER_TARGET_HPP
#define MIGRAPHX_GUARD_RTGLIB_REGISTER_TARGET_HPP

#include <migraphx/config.hpp>
#include <migraphx/target.hpp>
#include <migraphx/auto_register.hpp>
#include <cstring>
#include <utility>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_EXPORT void register_target_init();
MIGRAPHX_EXPORT void register_target(const target& t);
MIGRAPHX_EXPORT void unregister_target(const std::string& name);
MIGRAPHX_EXPORT target make_target(const std::string& name);
MIGRAPHX_EXPORT std::vector<std::string> get_targets();

namespace detail {
struct target_handler
{
    target t;
    std::string target_name;
    explicit target_handler(target t_r) : t(std::move(t_r)), target_name(t.name()) {}
    ~target_handler() { unregister_target(target_name); }
};
} // namespace detail

template <class T>
void register_target()
{
    register_target_init();
    static auto t_h = detail::target_handler(T{});
    register_target(t_h.t);
}

struct register_target_action
{
    template <class T>
    static void apply()
    {
        register_target<T>();
    }
};

template <class T>
using auto_register_target = auto_register<register_target_action, T>;

#define MIGRAPHX_REGISTER_TARGET(...) MIGRAPHX_AUTO_REGISTER(register_target_action, __VA_ARGS__)

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
