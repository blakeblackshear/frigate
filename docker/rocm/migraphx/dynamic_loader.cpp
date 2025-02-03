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
#include <migraphx/manage_ptr.hpp>
#include <migraphx/dynamic_loader.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/file_buffer.hpp>
#include <migraphx/tmp_dir.hpp>
#include <utility>

#ifdef _WIN32
// cppcheck-suppress definePrefix
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#else
#include <dlfcn.h>
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

#ifndef _WIN32

void check_load_error(bool flush = false)
{
    char* error_msg = dlerror();
    if(not flush and error_msg != nullptr)
        MIGRAPHX_THROW("Dynamic loading or symbol lookup failed with " + std::string(error_msg));
}

struct dynamic_loader_impl
{
    dynamic_loader_impl() = default;

#if defined(__GNUC__) && !defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wignored-attributes"
#endif
    dynamic_loader_impl(const fs::path& p, std::shared_ptr<tmp_dir> t = nullptr)
        : handle(dlopen(p.string().c_str(), RTLD_GLOBAL | RTLD_NOW),
                 manage_deleter<decltype(&dlclose), &dlclose>{}),
          temp(std::move(t))
    {
        check_load_error();
    }

#if defined(__GNUC__) && !defined(__clang__)
#pragma GCC diagnostic pop
#endif

    static std::shared_ptr<dynamic_loader_impl> from_buffer(const char* image, std::size_t size)
    {
        auto t = std::make_shared<tmp_dir>("dloader");
        auto f = t->path / "libtmp.so";
        write_buffer(f, image, size);
        return std::make_shared<dynamic_loader_impl>(f, t);
    }

    std::shared_ptr<void> handle  = nullptr;
    std::shared_ptr<tmp_dir> temp = nullptr;
};

fs::path dynamic_loader::path(void* address)
{
    fs::path p;
    Dl_info info;
    // Find the location of .so
    if(dladdr(address, &info) != 0)
        p = info.dli_fname;
    return p;
}

#else

struct dynamic_loader_impl
{
    dynamic_loader_impl() = default;
    dynamic_loader_impl(const fs::path& p, tmp_dir t = {})
        : handle{LoadLibrary(p.string().c_str())}, temp{std::move(t)}
    {
        if(handle == nullptr)
        {
            MIGRAPHX_THROW("Error loading DLL: " + p.string() + " (" +
                           std::to_string(GetLastError()) + ")");
        }
    }

    dynamic_loader_impl(const dynamic_loader_impl&)            = delete;
    dynamic_loader_impl& operator=(const dynamic_loader_impl&) = delete;

    dynamic_loader_impl(dynamic_loader_impl&&) = default;

    ~dynamic_loader_impl()
    {
        if(handle != nullptr)
        {
            FreeLibrary(handle);
        }
    }

    static std::shared_ptr<dynamic_loader_impl> from_buffer(const char* image, std::size_t size)
    {
        auto t = tmp_dir{"migx-dynload"};
        auto f = t.path / "tmp.dll";
        write_buffer(f, image, size);
        return std::make_shared<dynamic_loader_impl>(f, std::move(t));
    }

    HMODULE handle = nullptr;
    tmp_dir temp;
};

fs::path dynamic_loader::path(void* address)
{
    HMODULE module = nullptr;
    if(GetModuleHandleEx(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS |
                             GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                         static_cast<LPCSTR>(address),
                         &module) == 0)
    {
        auto err = GetLastError();
        MIGRAPHX_THROW("Unable to obtain module handle, error = " + std::to_string(err));
    }
    TCHAR buffer[MAX_PATH];
    if(GetModuleFileName(module, buffer, sizeof(buffer)) == 0)
    {
        auto err = GetLastError();
        MIGRAPHX_THROW("Unable to read module file path, error = " + std::to_string(err));
    }
    if(GetLastError() == ERROR_INSUFFICIENT_BUFFER)
    {
        MIGRAPHX_THROW("Buffer too small (" + std::to_string(MAX_PATH) + ") to hold the path");
    }
    return {buffer};
}

#endif

optional<dynamic_loader> dynamic_loader::try_load(const fs::path& p)
{
    try
    {
        return dynamic_loader{p};
    }
    catch(const std::exception&)
    {
        return nullopt;
    }
}

dynamic_loader::dynamic_loader(const fs::path& p) : impl(std::make_shared<dynamic_loader_impl>(p))
{
}

dynamic_loader::dynamic_loader(const char* image, std::size_t size)
    : impl(dynamic_loader_impl::from_buffer(image, size))
{
}

dynamic_loader::dynamic_loader(const std::vector<char>& buffer)
    : impl(dynamic_loader_impl::from_buffer(buffer.data(), buffer.size()))
{
}

std::shared_ptr<void> dynamic_loader::get_symbol(const std::string& name) const
{
#ifndef _WIN32
    // flush any previous error messages
    check_load_error(true);
    void* symbol = dlsym(impl->handle.get(), name.c_str());
    if(symbol == nullptr)
        check_load_error();
    return {impl, symbol};
#else
    FARPROC addr = GetProcAddress(impl->handle, name.c_str());
    if(addr == nullptr)
        MIGRAPHX_THROW("Symbol not found: " + name + " (" + std::to_string(GetLastError()) + ")");
    return {impl, reinterpret_cast<void*>(addr)};
#endif
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
