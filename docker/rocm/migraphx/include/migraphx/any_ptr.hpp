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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_ANY_PTR_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_ANY_PTR_HPP

#include <migraphx/config.hpp>
#include <migraphx/optional.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/type_name.hpp>
#include <cassert>
#include <string_view>
#include <typeindex>
#include <type_traits>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct any_ptr
{
    any_ptr() = default;
    template <class T>
    any_ptr(T* p) : ptr(p), ti(typeid(T*)), name(get_name<T*>())
    {
    }

    any_ptr(void* p, std::string_view pname) : ptr(p), name(pname) {}

    void* get(std::string_view n) const
    {
        if(name != n)
            MIGRAPHX_THROW("any_ptr: type mismatch: " + std::string{name} +
                           " != " + std::string{n});
        return ptr;
    }

    template <class T>
    T get() const
    {
        static_assert(std::is_pointer<T>{}, "Must be a pointer");
        assert(ptr != nullptr);
        if(ti and std::type_index{typeid(T)} != *ti)
            MIGRAPHX_THROW("any_ptr: type mismatch: " + std::string{name} + " != " + get_name<T>());
        else if(name != get_name<T>())
            MIGRAPHX_THROW("any_ptr: type mismatch: " + std::string{name} + " != " + get_name<T>());
        return reinterpret_cast<T>(ptr);
    }
    void* unsafe_get() const { return ptr; }

    private:
    void* ptr                    = nullptr;
    optional<std::type_index> ti = nullopt;
    std::string_view name        = "";

    template <class T>
    static const std::string& get_name()
    {
        return get_type_name<std::remove_cv_t<std::remove_pointer_t<T>>>();
    }
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_ANY_PTR_HPP
