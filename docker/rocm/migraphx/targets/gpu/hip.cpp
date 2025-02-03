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

#include <migraphx/gpu/hip.hpp>
#include <migraphx/manage_ptr.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/device/contiguous.hpp>
#if MIGRAPHX_USE_MIOPEN
#include <miopen/miopen.h>
#endif
#include <memory>
#include <mutex>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

MIGRAPHX_REGISTER_OP(hip_allocate)
MIGRAPHX_REGISTER_OP(hip_fill)
MIGRAPHX_REGISTER_OP(hip_sync_stream)
MIGRAPHX_REGISTER_OP(hip_copy_to_gpu)
MIGRAPHX_REGISTER_OP(hip_copy_from_gpu)
MIGRAPHX_REGISTER_OP(hip_copy)
MIGRAPHX_REGISTER_OP(hip_allocate_memory)
MIGRAPHX_REGISTER_OP(hip_copy_literal)

using hip_ptr      = MIGRAPHX_MANAGE_PTR(void, hipFree);
using hip_host_ptr = MIGRAPHX_MANAGE_PTR(void, hipHostUnregister);

std::string hip_error(int error) { return hipGetErrorString(static_cast<hipError_t>(error)); }

bool is_device_ptr(const void* ptr)
{
    hipPointerAttribute_t attr;
    auto status = hipPointerGetAttributes(&attr, ptr);
    if(status != hipSuccess)
        return false;
    return attr.type == hipMemoryTypeDevice;
}

std::size_t get_available_gpu_memory()
{
    size_t free;
    size_t total;
    auto status = hipMemGetInfo(&free, &total);
    if(status != hipSuccess)
        MIGRAPHX_THROW("Failed getting available memory: " + hip_error(status));
    return free;
}

void* get_device_ptr(void* hptr)
{
    void* result = nullptr;
    auto status  = hipHostGetDevicePointer(&result, hptr, 0);
    if(status != hipSuccess)
        MIGRAPHX_THROW("Failed getting device pointer: " + hip_error(status));
    return result;
}

struct host_ptr_cache
{
    std::unordered_map<void*, std::weak_ptr<void>> cache;
    std::mutex m;
    std::shared_ptr<void> get(void* ptr)
    {
        std::lock_guard<std::mutex> lock(m);
        auto it = cache.find(ptr);
        if(it != cache.end())
            return it->second.lock();
        return nullptr;
    }

    void put(const std::shared_ptr<void>& p)
    {
        std::lock_guard<std::mutex> lock(m);
        cache[p.get()] = p;
    }
};

static host_ptr_cache& get_host_ptr_cache()
{
    static host_ptr_cache cache;
    return cache;
}

std::shared_ptr<void> allocate_gpu(std::size_t sz, bool host = false)
{
    if(sz > get_available_gpu_memory())
        MIGRAPHX_THROW("Memory not available to allocate buffer: " + std::to_string(sz));
    void* alloc_ptr = nullptr;
    auto status     = host ? hipHostMalloc(&alloc_ptr, sz) : hipMalloc(&alloc_ptr, sz);
    if(status != hipSuccess)
    {
        if(host)
            MIGRAPHX_THROW("Gpu allocation failed: " + hip_error(status));
        else
            return allocate_gpu(sz, true);
    }
    assert(alloc_ptr != nullptr);
    std::shared_ptr<void> result = share(hip_ptr{alloc_ptr});
    if(host)
    {
        get_host_ptr_cache().put(result);
    }
    return result;
}

std::shared_ptr<void> register_on_gpu(void* ptr, std::size_t sz)
{
    std::shared_ptr<void> result = get_host_ptr_cache().get(ptr);
    if(result)
    {
        return result;
    }
    auto status = hipHostRegister(ptr, sz, hipHostRegisterMapped);
    if(status != hipSuccess)
        MIGRAPHX_THROW("Gpu register failed: " + hip_error(status));
    result = share(hip_host_ptr{ptr});
    get_host_ptr_cache().put(result);
    return result;
}

template <class T>
std::vector<T> read_from_gpu(const void* x, std::size_t sz)
{
    gpu_sync();
    std::vector<T> result(sz);
    assert(not is_device_ptr(result.data()));
    if(not is_device_ptr(x))
    {
        MIGRAPHX_THROW(
            "read_from_gpu() requires Src buffer to be on the GPU, Copy from gpu failed\n");
    }
    auto status = hipMemcpy(result.data(), x, sz * sizeof(T), hipMemcpyDeviceToHost);
    if(status != hipSuccess)
        MIGRAPHX_THROW("Copy from gpu failed: " + hip_error(status)); // NOLINT
    return result;
}

std::shared_ptr<void> write_to_gpu(const void* x, std::size_t sz, bool host = false)
{
    gpu_sync();
    auto result = allocate_gpu(sz, host);
    assert(is_device_ptr(result.get()));
    assert(not is_device_ptr(x));
    auto status = hipMemcpy(result.get(), x, sz, hipMemcpyHostToDevice);
    if(status != hipSuccess)
        MIGRAPHX_THROW("Copy to gpu failed: " + hip_error(status));
    return result;
}

template <class T>
hip_ptr write_to_gpu(const T& x)
{
    using type = typename T::value_type;
    auto size  = x.size() * sizeof(type);
    return write_to_gpu(x.data(), size);
}

argument allocate_gpu(const shape& s, bool host)
{
    auto p = allocate_gpu(s.bytes() + 1, host);
    return {s, [p]() mutable { return reinterpret_cast<char*>(p.get()); }};
}

argument register_on_gpu(const argument& arg)
{
    auto arg_shared = arg.share();
    auto p          = register_on_gpu(arg_shared.data(), arg_shared.get_shape().bytes());
    auto s          = arg_shared.get_shape();
    return {s, [p, a = std::move(arg_shared)]() mutable { return get_device_ptr(p.get()); }};
}

argument to_gpu(const argument& arg, bool host)
{
    argument result;
    arg.visit(
        [&](auto x) {
            auto p = write_to_gpu(arg.data(), arg.get_shape().bytes(), host);
            result = {x.get_shape(), p};
        },
        [&](const auto& xs) {
            std::vector<argument> args;
            std::transform(xs.begin(), xs.end(), std::back_inserter(args), [&](auto x) {
                return to_gpu(x, host);
            });
            result = argument{args};
        });
    return result;
}

argument from_gpu(const argument& arg)
{
    argument result;
    arg.visit(
        [&](auto x) {
            using type = typename decltype(x)::value_type;
            auto v     = read_from_gpu<type>(arg.data(), x.get_shape().bytes() / sizeof(type));
            // cppcheck-suppress returnDanglingLifetime
            result = {x.get_shape(), [v]() mutable { return v.data(); }};
        },
        [&](const auto& xs) {
            std::vector<argument> args;
            std::transform(xs.begin(), xs.end(), std::back_inserter(args), [&](auto x) {
                return from_gpu(x);
            });
            result = argument{args};
        });

    return result;
}

void set_device(std::size_t id)
{
    auto status = hipSetDevice(id);
    if(status != hipSuccess)
        MIGRAPHX_THROW("Error setting device");
}

void gpu_sync()
{
    auto status = hipDeviceSynchronize();
    if(status != hipSuccess)
        MIGRAPHX_THROW("hip device synchronization failed: " + hip_error(status));
}

void gpu_sync(const context& ctx) { ctx.finish(); }

void hip_async_memset(context& ctx, const argument& dst, int value)
{
    std::size_t dst_size = dst.get_shape().bytes();
    auto status          = hipMemsetAsync(dst.data(), value, dst_size, ctx.get_stream().get());
    if(status != hipSuccess)
        MIGRAPHX_THROW("Gpu fill failed: " + hip_error(status));
}

void hip_async_copy(context& ctx, const argument& src, const argument& dst, hipMemcpyKind kind)
{
    std::size_t src_size = src.get_shape().bytes();
    std::size_t dst_size = dst.get_shape().bytes();
    if(src_size > dst_size)
        MIGRAPHX_THROW("Not enough memory available in destination to do copy");
    auto status = hipMemcpyAsync(dst.data(), src.data(), src_size, kind, ctx.get_stream().get());
    if(status != hipSuccess)
        MIGRAPHX_THROW("Gpu copy failed: " + hip_error(status));
}

void gpu_copy(context& ctx, const argument& src, const argument& dst)
{
    // Workaround: Use contiguous as hip's memcpy is broken
    device::contiguous(ctx.get_stream().get(), dst, src);
    // hip_async_copy(ctx, src, dst, hipMemcpyDeviceToDevice);
}

void copy_to_gpu(context& ctx, const argument& src, const argument& dst)
{
    if(src.get_shape() == dst.get_shape() and dst.get_shape().packed())
    {
        hip_async_copy(ctx, src, dst, hipMemcpyHostToDevice);
    }
    else
    {
        gpu_copy(ctx, register_on_gpu(src), dst);
    }
}

void copy_from_gpu(context& ctx, const argument& src, const argument& dst)
{
    if(src.get_shape() == dst.get_shape() and dst.get_shape().packed())
    {
        hip_async_copy(ctx, src, dst, hipMemcpyDeviceToHost);
    }
    else
    {
        gpu_copy(ctx, src, register_on_gpu(dst));
    }
}

argument get_preallocation(context& ctx, const std::string& id)
{
    return ctx.get_current_device().preallocations.at(id);
}

void gpu_fill(context& ctx, const argument& dst, int value)
{
    if(dst.get_sub_objects().empty())
    {
        // TODO: Handle non-packed tensor when value is not 0
        assert(dst.get_shape().packed() and value == 0);
        hip_async_memset(ctx, dst, value);
    }
    else
    {
        for(const auto& arg : dst.get_sub_objects())
            gpu_fill(ctx, arg, value);
    }
}

void store_preallocated_param(context& ctx, const std::string& id, const argument& a)
{
    ctx.get_current_device().preallocations[id] = a;
}

// clang-format off
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
