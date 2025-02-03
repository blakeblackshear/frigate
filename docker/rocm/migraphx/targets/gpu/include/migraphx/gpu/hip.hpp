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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_HIP_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_HIP_HPP

#include <migraphx/gpu/config.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/dyn_output.hpp>
#include <utility>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

struct context;

MIGRAPHX_GPU_EXPORT std::string hip_error(int error);

MIGRAPHX_GPU_EXPORT argument allocate_gpu(const shape& s, bool host = false);

MIGRAPHX_GPU_EXPORT argument register_on_gpu(const argument& arg);

MIGRAPHX_GPU_EXPORT argument to_gpu(const argument& arg, bool host = false);

MIGRAPHX_GPU_EXPORT argument from_gpu(const argument& arg);

MIGRAPHX_GPU_EXPORT void set_device(std::size_t id);

MIGRAPHX_GPU_EXPORT void gpu_sync();
MIGRAPHX_GPU_EXPORT void gpu_sync(const context& ctx);

MIGRAPHX_GPU_EXPORT void gpu_copy(context& ctx, const argument& src, const argument& dst);
MIGRAPHX_GPU_EXPORT void copy_to_gpu(context& ctx, const argument& src, const argument& dst);
MIGRAPHX_GPU_EXPORT void copy_from_gpu(context& ctx, const argument& src, const argument& dst);

MIGRAPHX_GPU_EXPORT argument get_preallocation(context& ctx, const std::string& id);

MIGRAPHX_GPU_EXPORT void gpu_fill(context& ctx, const argument& dst, int value = 0);

struct hip_allocate
{
    shape s;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.s, "shape"));
    }

    std::string name() const { return "hip::allocate"; }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(0);
        return s;
    }
    argument compute(context&, const shape& output_shape, const std::vector<argument>&) const
    {
        return allocate_gpu(output_shape);
    }
};

struct hip_fill
{
    int value = 0;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.value, "value"));
    }

    std::string name() const { return "hip::fill"; }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(1);
        return inputs.front();
    }
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        gpu_fill(ctx, args.front(), value);
        return args.front();
    }
    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 0; }
};

struct hip_sync_stream
{

    std::string name() const { return "hip::sync_stream"; }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        if(inputs.empty())
            return {};
        return inputs.front();
    }

    argument compute(const context& ctx, const shape&, const std::vector<argument>& args) const
    {
        gpu_sync(ctx);
        if(args.empty())
            return {};
        return args.front();
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& args) const
    {
        if(args.empty())
            return -1;
        return 0;
    }
};

struct hip_copy_to_gpu
{
    std::string name() const { return "hip::copy_to_gpu"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1, 2).same_type();
        return inputs.at(0);
    }
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        auto input = register_on_gpu(args[0]);
        if(args.size() == 1)
            return input;
        argument result = args[1].share();
        if(result.get_shape().dynamic())
        {
            result = result.reshape(args[0].get_shape());
        }
        gpu_copy(ctx, input, result);
        // Associate the input since it was registered with hip
        return {result.get_shape(), [input, result]() mutable { return result.data(); }};
    }
    std::ptrdiff_t output_alias(const std::vector<shape>& args) const
    {
        if(args.size() == 1)
            return -1;
        return 1;
    }
};

struct hip_copy_from_gpu
{
    std::string name() const { return "hip::copy_from_gpu"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this, true}.has(1, 2).same_type();
        return inputs.at(0);
    }
    argument
    compute(context& ctx, const dyn_output& dyn_out, const std::vector<argument>& args) const
    {
        if(args.size() == 1)
        {
            argument result = allocate_gpu(dyn_out.computed_shape, true);
            gpu_copy(ctx, args[0], result);
            return result;
        }
        argument input = args[0].share();
        if(input.get_shape().dynamic())
        {
            input = input.reshape(args[1].get_shape());
        }
        copy_from_gpu(ctx, input, args[1]);
        return args[1];
    }
    std::ptrdiff_t output_alias(const std::vector<shape>& args) const
    {
        if(args.size() == 1)
            return -1;
        return 1;
    }
};

struct hip_copy
{
    std::string name() const { return "hip::copy"; }
    shape compute_shape(std::vector<shape> inputs) const
    {
        check_shapes{inputs, *this}.has(2).same_type();
        return inputs.at(1);
    }
    argument compute(context& ctx, const shape&, std::vector<argument> args) const
    {
        gpu_copy(ctx, args[0], args[1]);
        return args[1];
    }
    std::ptrdiff_t output_alias(const std::vector<shape>&) const { return 1; }
};

MIGRAPHX_GPU_EXPORT void
store_preallocated_param(context& ctx, const std::string& id, const argument& a);

struct hip_allocate_memory
{
    shape s;
    std::string id{};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.s, "shape"), f(self.id, "id"));
    }

    std::string name() const { return "hip::hip_allocate_memory"; }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(0);
        return s;
    }

    argument compute(context& ctx, const shape&, const std::vector<argument>&) const
    {
        return get_preallocation(ctx, id);
    }

    void finalize(context& ctx, const shape&, const std::vector<shape>&) const
    {
        argument a = allocate_gpu(s);
        store_preallocated_param(ctx, id, a);
    }
};

struct hip_copy_literal
{
    literal l;
    std::string id{};

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.l, "literal"), f(self.id, "id"));
    }

    std::string name() const { return "hip::hip_copy_literal"; }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        check_shapes{inputs, *this}.has(0);
        return l.get_shape();
    }

    argument compute(context& ctx, const shape&, const std::vector<argument>&) const
    {
        return get_preallocation(ctx, id);
    }

    void finalize(context& ctx, const shape&, const std::vector<shape>&) const
    {
        argument a = to_gpu(l.get_argument());
        store_preallocated_param(ctx, id, a);
    }
    friend std::ostream& operator<<(std::ostream& os, const hip_copy_literal& x)
    {
        os << x.name() << "[id=" << x.id << "]";
        return os;
    }
};

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
