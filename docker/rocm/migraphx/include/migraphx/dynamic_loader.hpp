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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_DYNAMIC_LOADER_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_DYNAMIC_LOADER_HPP

#include <migraphx/config.hpp>
#include <migraphx/filesystem.hpp>
#include <migraphx/optional.hpp>
#include <functional>
#include <memory>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct dynamic_loader_impl;

struct MIGRAPHX_EXPORT dynamic_loader
{
    template <class T>
    static fs::path path(T* address)
    {
        return path(reinterpret_cast<void*>(address));
    }
    static fs::path path(void* address);
    static optional<dynamic_loader> try_load(const fs::path& p);

    dynamic_loader() = default;

    dynamic_loader(const fs::path& p);

    dynamic_loader(const char* image, std::size_t size);

    dynamic_loader(const std::vector<char>& buffer);

    std::shared_ptr<void> get_symbol(const std::string& name) const;

    template <class F>
    std::function<F> get_function(const std::string& name) const
    {
        auto s = get_symbol(name);
        return [=](auto&&... xs) -> decltype(auto) {
            auto f = reinterpret_cast<std::add_pointer_t<F>>(s.get());
            return f(std::forward<decltype(xs)>(xs)...);
        };
    }

    private:
    std::shared_ptr<dynamic_loader_impl> impl;
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_DYNAMIC_LOADER_HPP
