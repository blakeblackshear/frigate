/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_RTGLIB_ARGUMENT_PARSER_HPP
#define MIGRAPHX_GUARD_RTGLIB_ARGUMENT_PARSER_HPP

#include <algorithm>
#include <functional>
#include <iostream>
#include <list>
#include <set>
#include <string>
#include <sstream>
#include <type_traits>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include <migraphx/config.hpp>
#include <migraphx/requires.hpp>
#include <migraphx/type_name.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/filesystem.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/rank.hpp>

#ifndef _WIN32
#include <unistd.h>
#endif

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

#ifdef MIGRAPHX_USE_CLANG_TIDY
#define MIGRAPHX_DRIVER_STATIC
#else
#define MIGRAPHX_DRIVER_STATIC static
#endif

template <class T>
using bare = std::remove_cv_t<std::remove_reference_t<T>>;

namespace detail {

template <class T>
auto is_container(int, T&& x) -> decltype(x.insert(x.end(), *x.begin()), std::true_type{});

template <class T>
std::false_type is_container(float, T&&);

} // namespace detail

template <class T>
struct is_container : decltype(detail::is_container(int(0), std::declval<T>()))
{
};

template <class T>
using is_multi_value =
    std::integral_constant<bool, (is_container<T>{} and not std::is_convertible<T, std::string>{})>;

enum class color
{
    reset      = 0,
    bold       = 1,
    underlined = 4,
    fg_red     = 31,
    fg_green   = 32,
    fg_yellow  = 33,
    fg_blue    = 34,
    fg_default = 39,
    bg_red     = 41,
    bg_green   = 42,
    bg_yellow  = 43,
    bg_blue    = 44,
    bg_default = 49
};
inline std::ostream& operator<<(std::ostream& os, const color& c)
{
#ifndef _WIN32
    static const bool use_color = isatty(STDOUT_FILENO) != 0;
    if(use_color)
        return os << "\033[" << static_cast<std::size_t>(c) << "m";
#else
    (void)c;
#endif
    return os;
}

inline std::string colorize(color c, const std::string& s)
{
    std::stringstream ss;
    ss << c << s << color::reset;
    return ss.str();
}

template <class T>
struct type_name
{
    static const std::string& apply() { return migraphx::get_type_name<T>(); }
};

template <>
struct type_name<std::string>
{
    static const std::string& apply()
    {
        static const std::string name = "std::string";
        return name;
    }
};

template <class T>
struct type_name<std::vector<T>>
{
    static const std::string& apply()
    {
        static const std::string name = "std::vector<" + type_name<T>::apply() + ">";
        return name;
    }
};

template <class T>
struct value_parser
{
    template <MIGRAPHX_REQUIRES(not std::is_enum<T>{} and not is_multi_value<T>{})>
    static T apply(const std::string& x)
    {
        // handle whitespace in string
        if constexpr(std::is_same<T, std::string>{})
        {
            return x;
        }
        else
        {
            T result;
            std::stringstream ss;
            ss.str(x);
            ss >> result;
            if(ss.fail())
                throw std::runtime_error("Failed to parse '" + x + "' as " + type_name<T>::apply());
            return result;
        }
    }

    template <MIGRAPHX_REQUIRES(std::is_enum<T>{} and not is_multi_value<T>{})>
    static T apply(const std::string& x)
    {
        std::ptrdiff_t i;
        std::stringstream ss;
        ss.str(x);
        ss >> i;
        if(ss.fail())
            throw std::runtime_error("Failed to parse '" + x + "' as " + type_name<T>::apply());
        return static_cast<T>(i);
    }

    template <MIGRAPHX_REQUIRES(is_multi_value<T>{} and not std::is_enum<T>{})>
    static T apply(const std::string& x)
    {
        T result;
        using value_type = typename T::value_type;
        result.insert(result.end(), value_parser<value_type>::apply(x));
        return result;
    }
};

// version for std::optional object
template <class T>
struct value_parser<std::optional<T>>
{
    static T apply(const std::string& x) { return value_parser<T>::apply(x); }
};

struct argument_parser
{
    struct argument
    {
        using action_function =
            std::function<bool(argument_parser&, const std::vector<std::string>&)>;
        using validate_function =
            std::function<void(const argument_parser&, const std::vector<std::string>&)>;
        std::vector<std::string> flags;
        action_function action{};
        std::string type          = "";
        std::string help          = "";
        std::string metavar       = "";
        std::string default_value = "";
        std::string group         = "";
        unsigned nargs            = 1;
        bool required             = false;
        std::vector<validate_function> validations{};

        std::string usage(const std::string& flag) const
        {
            std::stringstream ss;
            if(flag.empty())
            {
                ss << metavar;
            }
            else
            {
                ss << flag;
                if(not type.empty())
                    ss << " [" << type << "]";
            }
            return ss.str();
        }
        std::string usage() const
        {
            if(flags.empty())
                return usage("");
            return usage(flags.front());
        }
    };

    template <class T, MIGRAPHX_REQUIRES(is_multi_value<T>{})>
    std::string as_string_value(const T& x)
    {
        return to_string_range(x);
    }

    template <class T>
    auto as_string_value(rank<1>, const T& x) -> decltype(to_string(x))
    {
        return to_string(x);
    }

    template <class T>
    std::string as_string_value(rank<0>, const T&)
    {
        throw std::runtime_error("Can't convert to string");
    }

    template <class T, MIGRAPHX_REQUIRES(not is_multi_value<T>{})>
    std::string as_string_value(const T& x)
    {
        return as_string_value(rank<1>{}, x);
    }

    template <class T, class... Fs>
    void operator()(T& x, const std::vector<std::string>& flags, Fs... fs)
    {
        arguments.push_back({flags, [&](auto&&, const std::vector<std::string>& params) {
                                 if(params.empty())
                                     throw std::runtime_error("Flag with no value.");
                                 if(not is_multi_value<T>{} and params.size() > 1)
                                     throw std::runtime_error("Too many arguments passed.");
                                 x = value_parser<T>::apply(params.back());
                                 return false;
                             }});

        argument& arg = arguments.back();
        arg.type      = type_name<T>::apply();
        migraphx::each_args([&](auto f) { f(x, arg); }, fs...);
        if(not arg.default_value.empty() and arg.nargs > 0)
            arg.default_value = as_string_value(x);
    }

    template <class... Fs>
    void operator()(std::nullptr_t x, std::vector<std::string> flags, Fs... fs)
    {
        arguments.push_back({std::move(flags)});

        argument& arg = arguments.back();
        arg.type      = "";
        arg.nargs     = 0;
        migraphx::each_args([&](auto f) { f(x, arg); }, fs...);
    }

    MIGRAPHX_DRIVER_STATIC auto nargs(unsigned n = 1)
    {
        return [=](auto&&, auto& arg) { arg.nargs = n; };
    }

    MIGRAPHX_DRIVER_STATIC auto required()
    {
        return [=](auto&&, auto& arg) { arg.required = true; };
    }

    template <class F>
    MIGRAPHX_DRIVER_STATIC auto write_action(F f)
    {
        return [=](auto& x, auto& arg) {
            arg.action = [&, f](auto& self, const std::vector<std::string>& params) {
                f(self, x, params);
                return false;
            };
        };
    }

    template <class F>
    MIGRAPHX_DRIVER_STATIC auto do_action(F f)
    {
        return [=](auto&, auto& arg) {
            arg.nargs  = 0;
            arg.action = [&, f](auto& self, const std::vector<std::string>&) {
                f(self);
                return true;
            };
        };
    }

    MIGRAPHX_DRIVER_STATIC auto append()
    {
        return write_action([](auto&, auto& x, auto& params) {
            using type = typename bare<decltype(params)>::value_type;
            std::transform(params.begin(),
                           params.end(),
                           std::inserter(x, x.end()),
                           [](std::string y) { return value_parser<type>::apply(y); });
        });
    }

    template <class F>
    MIGRAPHX_DRIVER_STATIC auto validate(F f)
    {
        return [=](const auto& x, auto& arg) {
            arg.validations.push_back(
                [&, f](auto& self, const std::vector<std::string>& params) { f(self, x, params); });
        };
    }

    MIGRAPHX_DRIVER_STATIC auto file_exist()
    {
        return validate([](auto&, auto&, const auto& params) {
            if(params.empty())
                throw std::runtime_error("No argument passed.");
            if(not fs::exists(params.back()))
                throw std::runtime_error("Path does not exist: " + params.back());
        });
    }

    MIGRAPHX_DRIVER_STATIC auto matches(const std::unordered_set<std::string>& names)
    {
        return validate([=](auto&, auto&, const auto& params) {
            auto invalid_param = std::find_if(
                params.begin(), params.end(), [&](const auto& p) { return names.count(p) == 0; });
            if(invalid_param != params.end())
                throw std::runtime_error("Invalid argument: " + *invalid_param +
                                         ". Valid arguments are {" + to_string_range(names) + "}");
        });
    }

    template <class F>
    argument* find_argument(F f)
    {
        auto it = std::find_if(arguments.begin(), arguments.end(), f);
        if(it == arguments.end())
            return nullptr;
        return std::addressof(*it);
    }
    template <class F>
    bool has_argument(F f)
    {
        return find_argument(f) != nullptr;
    }

    template <class F>
    std::vector<argument*> find_arguments(F f)
    {
        std::vector<argument*> result;
        for(auto& arg : arguments)
        {
            if(not f(arg))
                continue;
            result.push_back(&arg);
        }
        return result;
    }

    std::vector<argument*> get_group_arguments(const std::string& group)
    {
        return find_arguments([&](const auto& arg) { return arg.group == group; });
    }

    std::vector<argument*> get_required_arguments()
    {
        return find_arguments([&](const auto& arg) { return arg.required; });
    }

    template <class SequenceContainer>
    std::vector<std::string> get_argument_usages(SequenceContainer args)
    {
        std::vector<std::string> usage_flags;
        std::unordered_set<std::string> found_groups;
        // Remove arguments that belong to a group
        auto it = std::remove_if(args.begin(), args.end(), [&](const argument* arg) {
            if(arg->group.empty())
                return false;
            found_groups.insert(arg->group);
            return true;
        });
        args.erase(it, args.end());
        transform(found_groups, std::back_inserter(usage_flags), [&](auto&& group) {
            std::vector<std::string> either_flags;
            transform(get_group_arguments(group), std::back_inserter(either_flags), [](auto* arg) {
                return arg->usage();
            });
            return "(" + join_strings(either_flags, "|") + ")";
        });
        transform(args, std::back_inserter(usage_flags), [&](auto* arg) { return arg->usage(); });
        return usage_flags;
    }

    auto show_help(const std::string& msg = "")
    {
        return do_action([=](auto& self) {
            argument* input_argument =
                self.find_argument([](const auto& arg) { return arg.flags.empty(); });
            auto required_usages = get_argument_usages(get_required_arguments());
            if(required_usages.empty() and input_argument)
                required_usages.push_back(input_argument->metavar);
            required_usages.insert(required_usages.begin(), "<options>");
            print_usage(required_usages);
            std::cout << std::endl;
            if(self.find_argument([](const auto& arg) { return arg.nargs == 0; }))
            {
                std::cout << color::fg_yellow << "FLAGS:" << color::reset << std::endl;
                std::cout << std::endl;
                for(auto&& arg : self.arguments)
                {
                    if(arg.nargs != 0)
                        continue;
                    const int col_align = 35;
                    std::string prefix  = "    ";
                    int len             = 0;
                    std::cout << color::fg_green;
                    for(const std::string& a : arg.flags)
                    {
                        len += prefix.length() + a.length();
                        std::cout << prefix;
                        std::cout << a;
                        prefix = ", ";
                    }
                    std::cout << color::reset;
                    int spaces = col_align - len;
                    if(spaces < 0)
                    {
                        std::cout << std::endl;
                    }
                    else
                    {
                        for(int i = 0; i < spaces; i++)
                            std::cout << " ";
                    }
                    std::cout << arg.help << std::endl;
                }
                std::cout << std::endl;
            }
            if(self.find_argument([](const auto& arg) { return arg.nargs != 0; }))
            {
                std::cout << color::fg_yellow << "OPTIONS:" << color::reset << std::endl;
                for(auto&& arg : self.arguments)
                {
                    if(arg.nargs == 0)
                        continue;
                    std::cout << std::endl;
                    std::string prefix = "    ";
                    std::cout << color::fg_green;
                    if(arg.flags.empty())
                    {
                        std::cout << prefix;
                        std::cout << arg.metavar;
                    }
                    for(const std::string& a : arg.flags)
                    {
                        std::cout << prefix;
                        std::cout << a;
                        prefix = ", ";
                    }
                    std::cout << color::reset;
                    if(not arg.type.empty())
                    {
                        std::cout << " [" << color::fg_blue << arg.type << color::reset << "]";
                        if(not arg.default_value.empty())
                            std::cout << " (Default: " << arg.default_value << ")";
                    }
                    std::cout << std::endl;
                    std::cout << "        " << arg.help << std::endl;
                }
                std::cout << std::endl;
            }
            if(not msg.empty())
                std::cout << msg << std::endl;
        });
    }

    MIGRAPHX_DRIVER_STATIC auto help(const std::string& help)
    {
        return [=](auto&, auto& arg) { arg.help = help; };
    }

    MIGRAPHX_DRIVER_STATIC auto metavar(const std::string& metavar)
    {
        return [=](auto&, auto& arg) { arg.metavar = metavar; };
    }

    MIGRAPHX_DRIVER_STATIC auto type(const std::string& type)
    {
        return [=](auto&, auto& arg) { arg.type = type; };
    }

    MIGRAPHX_DRIVER_STATIC auto group(const std::string& group)
    {
        return [=](auto&, auto& arg) { arg.group = group; };
    }

    template <class T>
    MIGRAPHX_DRIVER_STATIC auto set_value(T value)
    {
        return [=](auto& x, auto& arg) {
            arg.nargs  = 0;
            arg.type   = "";
            arg.action = [&, value](auto&, const std::vector<std::string>&) {
                x = value;
                return false;
            };
        };
    }

    template <class T>
    void set_exe_name_to(T& x)
    {
        actions.push_back([&](const auto& self) { x = self.exe_name; });
    }

    void print_try_help()
    {
        if(has_argument([](const auto& a) { return contains(a.flags, "--help"); }))
        {
            std::cout << std::endl;
            std::cout << "For more information try '" << color::fg_green << "--help" << color::reset
                      << "'" << std::endl;
        }
    }

    void print_usage(const std::vector<std::string>& flags) const
    {
        std::cout << color::fg_yellow << "USAGE:" << color::reset << std::endl;
        std::cout << "    " << exe_name << " ";
        std::cout << join_strings(flags, " ") << std::endl;
    }

    auto spellcheck(const std::vector<std::string>& inputs)
    {
        struct result_t
        {
            const argument* arg     = nullptr;
            std::string correct     = "";
            std::string incorrect   = "";
            std::ptrdiff_t distance = std::numeric_limits<std::ptrdiff_t>::max();
        };
        result_t result;
        for(const auto& input : inputs)
        {
            if(input.empty())
                continue;
            if(input[0] != '-')
                continue;
            for(const auto& arg : arguments)
            {
                for(const auto& flag : arg.flags)
                {
                    if(flag.empty())
                        continue;
                    if(flag[0] != '-')
                        continue;
                    std::ptrdiff_t d = levenshtein_distance(flag, input);
                    if(d < result.distance)
                        result = result_t{&arg, flag, input, d};
                }
            }
        }
        return result;
    }

    bool
    run_action(const argument& arg, const std::string& flag, const std::vector<std::string>& inputs)
    {
        std::string msg = "";
        try
        {
            for(const auto& v : arg.validations)
                v(*this, inputs);
            return arg.action(*this, inputs);
        }
        catch(const std::exception& e)
        {
            msg = e.what();
        }
        catch(...)
        {
            msg = "unknown exception";
        }
        std::cout << color::fg_red << color::bold << "error: " << color::reset;
        auto sc = spellcheck(inputs);
        if(sc.distance < 5)
        {
            std::cout << "Found argument '" << color::fg_yellow << sc.incorrect << color::reset
                      << "'"
                      << " which wasn't expected, or isn't valid in this context" << std::endl;
            std::cout << "       "
                      << "Did you mean " << color::fg_green << sc.correct << color::reset << "?"
                      << std::endl;
            std::cout << std::endl;
            print_usage({sc.arg->usage(sc.correct)});
        }
        else
        {
            const auto& flag_name = flag.empty() ? arg.metavar : flag;
            std::cout << "Invalid input to '" << color::fg_yellow;
            std::cout << arg.usage(flag_name);
            std::cout << color::reset << "'" << std::endl;
            std::cout << "       " << msg << std::endl;
            std::cout << std::endl;
            print_usage({arg.usage()});
        }
        std::cout << std::endl;
        print_try_help();
        return true;
    }

    bool parse(std::vector<std::string> args)
    {
        std::unordered_map<std::string, unsigned> keywords;
        for(auto&& arg : arguments)
        {
            for(auto&& flag : arg.flags)
                keywords[flag] = arg.nargs + 1;
        }
        auto arg_map =
            generic_parse(std::move(args), [&](const std::string& x) { return keywords[x]; });
        std::list<const argument*> missing_arguments;
        std::unordered_set<std::string> groups_used;
        for(auto&& arg : arguments)
        {
            bool used  = false;
            auto flags = arg.flags;
            if(flags.empty())
                flags = {""};
            for(auto&& flag : flags)
            {
                if(arg_map.count(flag) > 0)
                {
                    if(run_action(arg, flag, arg_map[flag]))
                        return true;
                    used = true;
                }
            }
            if(used and not arg.group.empty())
                groups_used.insert(arg.group);
            if(arg.required and not used)
                missing_arguments.push_back(&arg);
        }
        // Remove arguments from a group that is being used
        missing_arguments.remove_if(
            [&](const argument* arg) { return groups_used.count(arg->group); });
        if(not missing_arguments.empty())
        {
            std::cout << color::fg_red << color::bold << "error: " << color::reset;
            std::cout << "The following required arguments were not provided:" << std::endl;
            std::cout << "       " << color::fg_red
                      << join_strings(get_argument_usages(std::move(missing_arguments)), " ")
                      << color::reset << std::endl;
            std::cout << std::endl;
            auto required_usages = get_argument_usages(get_required_arguments());
            print_usage(required_usages);
            print_try_help();
            return true;
        }
        for(auto&& action : actions)
            action(*this);
        return false;
    }

    void set_exe_name(const std::string& s) { exe_name = s; }

    const std::string& get_exe_name() const { return exe_name; }

    using string_map = std::unordered_map<std::string, std::vector<std::string>>;
    template <class IsKeyword>
    static string_map generic_parse(std::vector<std::string> as, IsKeyword is_keyword)
    {
        string_map result;

        std::string flag;
        bool clear = false;
        for(auto&& x : as)
        {
            auto k = is_keyword(x);
            if(k > 0)
            {
                flag = x;
                result[flag]; // Ensure the flag exists
                if(k == 1)
                    flag = "";
                else if(k == 2)
                    clear = true;
                else
                    clear = false;
            }
            else
            {
                result[flag].push_back(x);
                if(clear)
                    flag = "";
                clear = false;
            }
        }
        return result;
    }

    private:
    std::list<argument> arguments;
    std::string exe_name = "";
    std::vector<std::function<void(argument_parser&)>> actions;
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx

#endif
