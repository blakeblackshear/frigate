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
#include <migraphx/serialize.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/literal.hpp>
#include <nlohmann/json.hpp>
#include <migraphx/json.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

using json = nlohmann::json;

void value_to_json(const value& val, json& j);
migraphx::value value_from_json(const json& j);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

namespace nlohmann {
template <>
struct adl_serializer<migraphx::value>
{
    static void to_json(json& j, const migraphx::value& val) { migraphx::value_to_json(val, j); }

    static void from_json(const json& j, migraphx::value& val)
    {
        val = migraphx::value_from_json(j);
    }
};
} // namespace nlohmann

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

using json = nlohmann::json;

template <class T>
void value_to_json(const T& x, json& j)
{
    j = x;
}

void value_to_json(const value::binary& x, json& j)
{
    j          = json::object();
    j["bytes"] = std::vector<int>(x.begin(), x.end());
}

void value_to_json(const std::vector<value>& x, json& j)
{
    for(const auto& v : x)
    {
        if(v.get_key().empty())
        {
            j.push_back(v);
        }
        else
        {
            j[v.get_key()] = v.without_key();
        }
    }
}

void value_to_json(std::nullptr_t&, json& j) { j = {}; }

void value_to_json(const value& val, json& j)
{
    if(val.is_array())
    {
        j = json::array();
    }

    if(val.is_object())
    {
        j = json::object();
    }

    val.visit([&](auto v) { value_to_json(v, j); });
}

migraphx::value value_from_json(const json& j)
{
    migraphx::value val;
    json::value_t type = j.type();
    switch(type)
    {
    case json::value_t::null: val = nullptr; break;

    case json::value_t::boolean: val = j.get<bool>(); break;

    case json::value_t::number_float: val = j.get<double>(); break;

    case json::value_t::number_integer: val = j.get<int64_t>(); break;

    case json::value_t::number_unsigned: val = j.get<uint64_t>(); break;

    case json::value_t::string: val = j.get<std::string>(); break;

    case json::value_t::array:
        val = migraphx::value::array{};
        std::transform(j.begin(), j.end(), std::back_inserter(val), [&](const json& jj) {
            return jj.get<value>();
        });
        break;

    case json::value_t::object:
        if(j.contains("bytes") and j.size() == 1)
        {
            val = migraphx::value::binary{j["bytes"].get<std::vector<std::uint8_t>>()};
        }
        else
        {
            val = migraphx::value::object{};
            for(const auto& item : j.items())
            {
                const auto& key = item.key();
                const json& jv  = item.value();
                val[key]        = jv.get<value>();
            }
        }
        break;

    case json::value_t::binary: MIGRAPHX_THROW("Convert JSON to Value: binary type not supported!");
    case json::value_t::discarded:
        MIGRAPHX_THROW("Convert JSON to Value: discarded type not supported!");
    }

    return val;
}

std::string to_json_string(const value& val)
{
    json j = val;
    return j.dump();
}

std::string to_pretty_json_string(const value& val, std::size_t indent)
{
    json j = val;
    return j.dump(indent);
}

migraphx::value from_json_string(const char* str, std::size_t size)
{
    json j = json::parse(str, str + size);
    return j.get<value>();
}
migraphx::value from_json_string(const std::string& str)
{
    json j = json::parse(str);
    return j.get<value>();
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
