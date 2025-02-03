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
#include <migraphx/argument.hpp>
#include <migraphx/functional.hpp>
#include <unordered_map>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

argument::argument(const shape& s) : m_shape(s)
{
    auto buffer = make_shared_array<char>(s.bytes());
    assign_buffer({[=]() mutable { return buffer.get(); }});
}

argument::argument(shape s, std::nullptr_t)
    : m_shape(std::move(s)), m_data({[] { return nullptr; }})
{
}

argument::argument(const shape& s, const argument::data_t& d) : m_shape(s), m_data(d) {}

void argument::assign_buffer(std::function<char*()> d)
{
    const shape& s = m_shape;
    if(s.type() != shape::tuple_type)
    {
        m_data = {std::move(d)};
        return;
    }
    // Collect all shapes
    std::unordered_map<std::size_t, shape> shapes;
    {
        std::size_t i = 0;
        fix([&](auto self, auto ss) {
            if(ss.sub_shapes().empty())
            {
                shapes[i] = ss;
                i++;
            }
            else
            {
                for(auto&& child : ss.sub_shapes())
                    self(child);
            }
        })(s);
    }
    // Sort by type size
    std::vector<std::size_t> order(shapes.size());
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), by(std::greater<>{}, [&](auto i) {
                  return shapes[i].type_size();
              }));
    // Compute offsets
    std::unordered_map<std::size_t, std::size_t> offsets;
    std::size_t offset = 0;
    for(auto i : order)
    {
        offsets[i] = offset;
        offset += shapes[i].bytes();
    }
    assert(offset == s.bytes());

    std::size_t i = 0;
    m_data        = fix<data_t>([&](auto self, auto ss) {
        data_t result;
        if(ss.sub_shapes().empty())
        {
            auto n = offsets[i];
            result = {[d, n]() mutable { return d() + n; }};
            i++;
            return result;
        }
        std::vector<data_t> subs;
        std::transform(ss.sub_shapes().begin(),
                       ss.sub_shapes().end(),
                       std::back_inserter(subs),
                       [&](auto child) { return self(child); });
        result.sub = subs;
        return result;
    })(s);
}

std::vector<argument> flatten(const std::vector<argument>& args)
{
    std::vector<argument> result;
    for(const auto& arg : args)
    {
        if(arg.get_shape().type() == shape::tuple_type)
        {
            auto subs = flatten(arg.get_sub_objects());
            result.insert(result.end(), subs.begin(), subs.end());
        }
        else
        {
            result.push_back(arg);
        }
    }
    return result;
}

std::vector<shape> to_shapes(const std::vector<argument>& args)
{
    std::vector<shape> shapes;
    std::transform(args.begin(), args.end(), std::back_inserter(shapes), [](auto&& arg) {
        return arg.get_shape();
    });
    return shapes;
}

argument::argument(const std::vector<argument>& args)
    : m_shape(to_shapes(args)), m_data(data_t::from_args(args))
{
}

char* argument::data() const
{
    assert(m_shape.type() != shape::tuple_type);
    assert(not this->empty());
    return m_data.get();
}

bool argument::empty() const { return not m_data.get and m_data.sub.empty(); }

const shape& argument::get_shape() const { return this->m_shape; }

argument argument::reshape(const shape& s) const
{
    assert(s.element_space() <= this->get_shape().element_space());
    return {s, this->m_data};
}

argument::data_t argument::data_t::share() const
{
    data_t result;
    if(this->get)
    {
        auto self  = std::make_shared<data_t>(*this);
        result.get = [self]() mutable { return self->get(); };
    }
    std::transform(sub.begin(), sub.end(), std::back_inserter(result.sub), [](const auto& d) {
        return d.share();
    });
    return result;
}

argument::data_t argument::data_t::from_args(const std::vector<argument>& args)
{
    data_t result;
    std::transform(args.begin(), args.end(), std::back_inserter(result.sub), [](auto&& arg) {
        return arg.m_data;
    });
    return result;
}

argument argument::copy() const
{
    argument result{this->get_shape()};
    auto* src = this->data();
    std::copy(src, src + this->get_shape().bytes(), result.data());
    return result;
}

argument argument::share() const { return {m_shape, m_data.share()}; }

std::vector<argument> argument::get_sub_objects() const
{
    std::vector<argument> result;
    assert(m_shape.sub_shapes().size() == m_data.sub.size());
    std::transform(m_shape.sub_shapes().begin(),
                   m_shape.sub_shapes().end(),
                   m_data.sub.begin(),
                   std::back_inserter(result),
                   [](auto&& s, auto&& d) {
                       return argument{s, d};
                   });
    return result;
}

argument argument::element(std::size_t i) const
{
    assert(this->get_shape().sub_shapes().empty());
    auto idx    = this->get_shape().index(i);
    auto offset = this->get_shape().type_size() * idx;
    return argument{shape{this->get_shape().type()}, this->data() + offset};
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
