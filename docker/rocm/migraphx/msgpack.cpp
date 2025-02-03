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
#include <migraphx/msgpack.hpp>
#include <migraphx/serialize.hpp>
#include <msgpack.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

// Leave an extra byte for error checking
constexpr std::size_t msgpack_size_limit = std::numeric_limits<uint32_t>::max() - 1;

template <class Range>
std::size_t msgpack_chunk_size(const Range& r)
{
    return 1 + (r.size() - 1) / msgpack_size_limit;
}

template <class Iterator, class F>
void msgpack_chunk_for_each(Iterator start, Iterator last, F f)
{
    while(std::distance(start, last) > msgpack_size_limit)
    {
        auto next = std::next(start, msgpack_size_limit);
        f(start, next);
        start = next;
    }
    f(start, last);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

namespace msgpack {
MSGPACK_API_VERSION_NAMESPACE(MSGPACK_DEFAULT_API_NS)
{
    namespace adaptor {

    template <>
    struct convert<migraphx::value>
    {
        const msgpack::object& operator()(const msgpack::object& o, migraphx::value& v) const
        {
            switch(o.type)
            {
            case msgpack::type::NIL: {
                v = nullptr;
                break;
            }
            case msgpack::type::BOOLEAN: {
                v = o.as<bool>();
                break;
            }
            case msgpack::type::POSITIVE_INTEGER: {
                v = o.as<std::uint64_t>();
                break;
            }
            case msgpack::type::NEGATIVE_INTEGER: {
                v = o.as<std::int64_t>();
                break;
            }
            case msgpack::type::FLOAT32:
            case msgpack::type::FLOAT64: {
                v = o.as<double>();
                break;
            }
            case msgpack::type::STR: {
                v = o.as<std::string>();
                break;
            }
            case msgpack::type::BIN: {
                // For backwards compatibility
                v = migraphx::value::binary{o.via.bin.ptr, o.via.bin.size};
                break;
            }
            case msgpack::type::ARRAY: {
                if(o.via.array.size != 0 and o.via.array.ptr->type == msgpack::type::BIN)
                {
                    auto bin = migraphx::value::binary{};
                    std::for_each(
                        o.via.array.ptr,
                        o.via.array.ptr + o.via.array.size,
                        [&](const msgpack::object& so) {
                            bin.insert(bin.end(), so.via.bin.ptr, so.via.bin.ptr + so.via.bin.size);
                        });
                    v = bin;
                }
                else
                {
                    migraphx::value r = migraphx::value::array{};
                    std::for_each(
                        o.via.array.ptr,
                        o.via.array.ptr + o.via.array.size,
                        [&](const msgpack::object& so) { r.push_back(so.as<migraphx::value>()); });
                    v = r;
                }
                break;
            }
            case msgpack::type::MAP: {
                migraphx::value r = migraphx::value::object{};
                std::for_each(o.via.map.ptr,
                              o.via.map.ptr + o.via.map.size,
                              [&](const msgpack::object_kv& p) {
                                  r[p.key.as<std::string>()] = p.val.as<migraphx::value>();
                              });
                v = r;
                break;
            }
            case msgpack::type::EXT: {
                MIGRAPHX_THROW("msgpack EXT type not supported.");
            }
            }
            return o;
        }
    };

    template <>
    struct pack<migraphx::value::binary>
    {
        template <class Stream>
        packer<Stream>& operator()(msgpack::packer<Stream>& o,
                                   const migraphx::value::binary& x) const
        {
            const auto* data = reinterpret_cast<const char*>(x.data());
            auto size        = x.size();
            o.pack_array(migraphx::msgpack_chunk_size(x));
            migraphx::msgpack_chunk_for_each(
                data, data + size, [&](const char* start, const char* last) {
                    o.pack_bin(last - start);
                    o.pack_bin_body(start, last - start);
                });
            return o;
        }
    };

    template <>
    struct pack<migraphx::value>
    {
        template <class Stream>
        void write(msgpack::packer<Stream>& o, const std::nullptr_t&) const
        {
            o.pack_nil();
        }
        template <class Stream, class T>
        void write(msgpack::packer<Stream>& o, const T& x) const
        {
            o.pack(x);
        }
        template <class Stream>
        void write(msgpack::packer<Stream>& o, const std::vector<migraphx::value>& v) const
        {
            if(v.empty())
            {
                o.pack_array(0);
                return;
            }
            if(v.size() > migraphx::msgpack_size_limit)
                MIGRAPHX_THROW("Size is too large for msgpack");
            if(not v.front().get_key().empty())
            {
                o.pack_map(v.size());
                for(auto&& x : v)
                {
                    o.pack(x.get_key());
                    o.pack(x.without_key());
                }
            }
            else
            {
                o.pack_array(v.size());
                for(auto&& x : v)
                {
                    o.pack(x);
                }
            }
        }
        template <class Stream>
        packer<Stream>& operator()(msgpack::packer<Stream>& o, const migraphx::value& v) const
        {
            v.visit_value([&](auto&& x) { this->write(o, x); });
            return o;
        }
    };

    } // namespace adaptor
} // MSGPACK_API_VERSION_NAMESPACE(MSGPACK_DEFAULT_API_NS)
} // namespace msgpack

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct vector_stream
{
    std::vector<char> buffer{};
    vector_stream& write(const char* b, std::size_t n)
    {
        buffer.insert(buffer.end(), b, b + n);
        return *this;
    }
};

struct writer_stream
{
    std::function<void(const char*, std::size_t)> writer;
    writer_stream& write(const char* b, std::size_t n)
    {
        writer(b, n);
        return *this;
    }
};

void to_msgpack(const value& v, std::function<void(const char*, std::size_t)> writer)
{
    writer_stream ws{std::move(writer)};
    msgpack::pack(ws, v);
}

std::vector<char> to_msgpack(const value& v)
{
    vector_stream vs;
    msgpack::pack(vs, v);
    return vs.buffer;
}
value from_msgpack(const char* buffer, std::size_t size)
{
    msgpack::object_handle oh = msgpack::unpack(buffer, size);
    return oh.get().as<value>();
}
value from_msgpack(const std::vector<char>& buffer)
{
    return from_msgpack(buffer.data(), buffer.size());
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
