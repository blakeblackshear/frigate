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
#include <migraphx/generate.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

argument fill_argument(shape s, double value)
{
    argument result;
    if(s.type() == shape::tuple_type)
    {
        std::vector<argument> sub_args;
        const auto& sub_ss = s.sub_shapes();
        std::transform(sub_ss.begin(), sub_ss.end(), std::back_inserter(sub_args), [&](auto ss) {
            return fill_argument(ss, value);
        });

        result = argument(sub_args);
    }
    else
    {
        s.visit_type([&](auto as) {
            using type = typename decltype(as)::type;
            auto v     = fill_tensor_data<type>(s, value);
            result     = {s, v};
        });
    }
    return result;
}

argument generate_argument(shape s, unsigned long seed, random_mode m)
{
    argument result;
    if(s.type() == shape::tuple_type)
    {
        const auto& sub_ss = s.sub_shapes();
        std::vector<argument> sub_args;
        std::transform(sub_ss.begin(), sub_ss.end(), std::back_inserter(sub_args), [&](auto ss) {
            return generate_argument(ss, seed, m);
        });

        result = argument(sub_args);
    }
    else
    {
        s.visit_type([&](auto as) {
            // we use char type to store bool type internally, so bool_type
            // needs special processing to generate data
            if(s.type() == shape::bool_type)
            {
                auto v = generate_tensor_data<bool>(s, seed, m);
                result = {s, v};
            }
            else
            {
                using type = typename decltype(as)::type;
                auto v     = generate_tensor_data<type>(s, seed, m);
                result     = {s, v};
            }
        });
    }

    return result;
}

literal generate_literal(shape s, unsigned long seed)
{
    literal result;
    s.visit_type([&](auto as) {
        using type = typename decltype(as)::type;
        auto v     = generate_tensor_data<type>(s, seed);
        result     = {s, reinterpret_cast<char*>(v.get())};
    });
    return result;
}

// TODO: Move to literal.cpp
literal abs(literal l)
{
    return transform(std::move(l), [](auto x) { return std::fabs(x); });
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
