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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_CPP_GENERATOR_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_CPP_GENERATOR_HPP

#include <migraphx/config.hpp>
#include <migraphx/instruction_ref.hpp>
#include <string>
#include <unordered_map>
#include <vector>
#include <memory>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct operation;
struct module;
struct shape;

struct cpp_generator_impl;

struct MIGRAPHX_EXPORT cpp_generator
{
    using generate_module_callback = std::function<std::string(
        instruction_ref, const std::unordered_map<instruction_ref, std::string>&)>;
    struct param
    {
        std::string name;
        std::string type;
    };

    struct MIGRAPHX_EXPORT function
    {
        std::vector<param> params           = {};
        std::string body                    = "";
        std::string return_type             = "void";
        std::string name                    = "";
        std::vector<std::string> attributes = {};
        std::vector<std::string> tparams    = {};
        function& set_body(const module& m, const generate_module_callback& g);
        function& set_body(const std::string& s)
        {
            body = s;
            return *this;
        }
        function& set_name(const std::string& s)
        {
            name = s;
            return *this;
        }
        function& set_attributes(std::vector<std::string> attrs)
        {
            attributes = std::move(attrs);
            return *this;
        }
        function& set_types(const module& m);
        function& set_types(const module& m, const std::function<std::string(shape)>& parse);
        function& set_generic_types(const module& m);
        function& add_generic_param(const std::string& pname);
        function& unused_param(const std::string& pname);
    };

    cpp_generator();

    // move constructor
    cpp_generator(cpp_generator&&) noexcept;

    // copy assignment operator
    cpp_generator& operator=(cpp_generator rhs);

    ~cpp_generator() noexcept;

    void fmap(const std::function<std::string(std::string)>& f);

    void fresult(const std::function<std::string(shape)>& f);

    void always_return_tuple(bool b = true);

    void add_point_op(const std::string& op_name, const std::string& code);

    std::string generate_point_op(const operation& op, const std::vector<std::string>& args);

    std::string str() const;

    function generate_module(const module& m, const generate_module_callback& g);

    function generate_module(const module& m);

    std::string create_function(const function& f);

    static std::vector<std::string>
    to_args(const std::vector<instruction_ref>& inputs,
            const std::unordered_map<instruction_ref, std::string>& names);

    private:
    std::unique_ptr<cpp_generator_impl> impl;
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_CPP_GENERATOR_HPP
