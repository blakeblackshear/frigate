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
#ifndef MIGRAPHX_GUARD_RTGLIB_COMMAND_HPP
#define MIGRAPHX_GUARD_RTGLIB_COMMAND_HPP

#include "argument_parser.hpp"

#include <migraphx/config.hpp>
#include <migraphx/type_name.hpp>
#include <migraphx/stringutils.hpp>

#include <unordered_map>
#include <utility>
#include <vector>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

inline auto& get_commands()
{
    // NOLINTNEXTLINE
    static std::unordered_map<
        std::string,
        std::function<void(const std::string& exe_name, std::vector<std::string> args)>>
        m;
    return m;
}

template <class T>
std::string compute_command_name()
{
    static const std::string& tname = get_type_name<T>();
    auto name                       = tname.substr(tname.rfind("::") + 2);
    if(ends_with(name, "_command"))
        name = name.substr(0, name.size() - 8);
    if(ends_with(name, "_cmd"))
        name = name.substr(0, name.size() - 4);
    return name;
}

template <class T>
const std::string& command_name()
{
    static const std::string& name = compute_command_name<T>();
    return name;
}

template <class T>
void run_command(const std::string& exe_name, std::vector<std::string> args, bool add_help = false)
{
    T x;
    argument_parser ap;
    ap.set_exe_name(exe_name + " " + command_name<T>());
    if(add_help)
        ap(nullptr, {"-h", "--help"}, ap.help("Show help"), ap.show_help());
    x.parse(ap);
    if(ap.parse(std::move(args)))
        return;
    x.run();
}

template <class T>
int auto_register_command()
{
    auto& m              = get_commands();
    m[command_name<T>()] = [](const std::string& exe_name, std::vector<std::string> args) {
        run_command<T>(exe_name, args, true);
    };
    return 0;
}

template <class T>
struct command
{
    static const int static_register;
    // This typedef ensures that the static member will be instantiated if
    // the class itself is instantiated
    using static_register_type =
        std::integral_constant<decltype(&static_register), &static_register>;
};

#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wglobal-constructors"
#endif

template <class T>
const int command<T>::static_register = auto_register_command<T>(); // NOLINT

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx

#endif
