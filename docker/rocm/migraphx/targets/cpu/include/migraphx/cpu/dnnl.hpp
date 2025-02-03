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
#ifndef MIGRAPHX_GUARD_AMDMIGRAPHX_DNNL_HPP
#define MIGRAPHX_GUARD_AMDMIGRAPHX_DNNL_HPP

#include <migraphx/config.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/reflect.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/check_shapes.hpp>
#include <unordered_map>
#include <migraphx/errors.hpp>
#include <migraphx/assert.hpp>
#ifdef MIGRAPHX_ENABLE_ZENDNN
#include <zendnn.hpp>
#else
#include <dnnl.hpp>
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

#ifdef MIGRAPHX_ENABLE_ZENDNN
namespace dnnl = zendnn;
#define MIGRAPHX_CONCAT_PREFIX(b) ZENDNN_##b // NOLINT
#else
#define MIGRAPHX_CONCAT_PREFIX(b) DNNL_##b // NOLINT
#endif
#define MIGRAPHX_DNNL_PREFIX(b) MIGRAPHX_CONCAT_PREFIX(b) // NOLINT

struct dnnl_context
{
    dnnl::engine engine;
    dnnl::stream stream;
    dnnl_context() : engine(dnnl::engine::kind::cpu, 0), stream(engine) {}
};

dnnl_context& get_dnnl_context();

dnnl::memory::data_type to_dnnl_memory_data_type(shape::type_t t);

dnnl::memory::format_tag to_dnnl_memory_format_tag(std::size_t n);

template <class R>
inline dnnl::memory::dims to_dnnl_dims(R&& r)
{
    return {r.begin(), r.end()};
}

dnnl::memory::desc to_dnnl_memory_desc(const shape& s);

dnnl::memory to_dnnl_memory(const dnnl::memory::desc& desc, const argument& a);

dnnl::memory to_dnnl_memory(const argument& a);

dnnl::algorithm to_dnnl_algo(const std::string& name);

std::string to_string(const dnnl::algorithm& algo);

struct post_op : reflect_equality<post_op>, reflect_stream<post_op>
{
    std::string algo;
    float alpha = 0;
    float beta  = 0;
    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.algo, "algo"), f(self.alpha, "alpha"), f(self.beta, "beta"));
    }
};

template <class F>
struct execute_wrapper
{
    F f;
    argument operator()(context&, const std::vector<argument>& args) const { return f(args); }
};

template <class F>
execute_wrapper<F> make_execute_wrapper(F f)
{
    return {std::move(f)};
}

template <class Derived, class Primitive>
struct dnnl_op : auto_register_op<Derived>
{
    std::vector<post_op> post_ops;
    std::function<argument(context& ctx, const std::vector<argument>& args)> execute;

    template <class Self, class F>
    static auto reflect_base(Self& self, F f)
    {
        return pack(f(self.post_ops, "post_ops"));
    }

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return reflect_base(self, f);
    }

    std::string group() const
    {
        const auto& self = static_cast<const Derived&>(*this);
        return self.name();
    }

    value attributes() const
    {
        std::vector<std::string> names;
        std::transform(post_ops.begin(), post_ops.end(), std::back_inserter(names), [](auto&& op) {
            return op.algo;
        });
        const auto& self = static_cast<const Derived&>(*this);
        auto g           = self.group();
        if(not names.empty())
            g += "<" + join_strings(names, ",") + ">";
        return {{"group", g}};
    }

    std::size_t get_extra_post_op_args() const
    {
        return std::count_if(post_ops.begin(), post_ops.end(), [](const auto& po) {
            return contains(po.algo, "binary");
        });
    }

    static std::size_t get_binary_post_op_arg(std::size_t pos)
    {
        return MIGRAPHX_DNNL_PREFIX(ARG_ATTR_MULTIPLE_POST_OP)(pos) | // NOLINT
               MIGRAPHX_DNNL_PREFIX(ARG_SRC_1);                       // NOLINT
    }

    static std::vector<shape> to_shapes(const std::vector<argument>& args)
    {
        std::vector<shape> shapes(args.size());
        std::transform(args.begin(), args.end(), shapes.begin(), [](const argument& a) {
            return a.get_shape();
        });
        return shapes;
    }
    static std::string impl(const Primitive& prim)
    {
        auto desc       = prim.get_primitive_desc();
        const char* str = nullptr;
#ifdef MIGRAPHX_ENABLE_ZENDNN
        zendnn_primitive_desc_query(
            desc, zendnn_query_impl_info_str, 0, reinterpret_cast<void*>(&str));
#else
        dnnl_primitive_desc_query(desc, dnnl_query_impl_info_str, 0, reinterpret_cast<void*>(&str));
#endif
        return str == nullptr ? "" : str;
    }
    // Map arg index to arg in dnnl
    std::vector<int> arg_map(int size) const
    {
        std::vector<int> result(size);
        std::iota(result.begin(), result.end(), MIGRAPHX_DNNL_PREFIX(ARG_SRC_0));
        return result;
    }
    shape base_adjust_shape(const shape& s, const shape& output) const
    {
        if(s.broadcasted())
        {
            auto lens    = s.lens();
            auto strides = s.strides();
            std::transform(strides.begin(),
                           strides.end(),
                           lens.begin(),
                           lens.begin(),
                           [](auto stride, auto len) -> std::size_t {
                               if(stride == 0)
                                   return 1;
                               else
                                   return len;
                           });
            // Use the permutation of the output
            return output.with_lens(s.type(), lens);
        }
        return s;
    }
    template <class F>
    void for_each_post_op(F f) const
    {
        int i = 0;
        for(auto&& op : post_ops)
        {
            if(contains(op.algo, "binary"))
            {
                f(op, get_binary_post_op_arg(i));
            }
            else
            {
                f(op, -1);
            }
            i++;
        }
    }
    shape adjust_shape(const shape& s, int, const shape& output) const
    {
        return base_adjust_shape(s, output);
    }
    std::vector<int> create_arg_map(std::size_t input_size) const
    {
        const auto& self     = static_cast<const Derived&>(*this);
        auto npost_ops       = get_extra_post_op_args();
        auto prim_input_size = input_size - npost_ops;
        auto m               = self.arg_map(prim_input_size);
        for_each_post_op([&](auto&&, auto arg) {
            if(arg < 0)
                return;
            m.push_back(arg);
        });
        return m;
    }
    std::unordered_map<int, dnnl::memory::desc>
    to_memory_desc(const shape& output_shape, const std::vector<shape>& inputs) const
    {
        const auto& self = static_cast<const Derived&>(*this);
        std::unordered_map<int, dnnl::memory::desc> result;
        result[MIGRAPHX_DNNL_PREFIX(ARG_DST)] =
            to_dnnl_memory_desc(self.adjust_shape(output_shape, inputs.size(), output_shape));
        auto m = create_arg_map(inputs.size());
        assert(m.size() >= inputs.size());
        for(int i = 0; i < inputs.size(); i++)
        {
            result[m[i]] = to_dnnl_memory_desc(self.adjust_shape(inputs[i], i, output_shape));
        }
        return result;
    }
    dnnl::primitive_attr
    get_primitive_attr(const std::unordered_map<int, dnnl::memory::desc>& m) const
    {
        dnnl::primitive_attr result;
        dnnl::post_ops po;
        for_each_post_op([&](auto&& op, auto arg) {
            if(contains(op.algo, "binary_add"))
            {
                auto desc = m.at(arg);
                if(desc == m.at(MIGRAPHX_DNNL_PREFIX(ARG_DST)))
                    po.append_sum(1.0f);
                else
                    po.append_binary(to_dnnl_algo(op.algo), m.at(arg));
            }
            else if(contains(op.algo, "binary"))
            {
                po.append_binary(to_dnnl_algo(op.algo), m.at(arg));
            }
            else if(contains(op.algo, "eltwise"))
                po.append_eltwise(1.0f, to_dnnl_algo(op.algo), op.alpha, op.beta);
            else
                MIGRAPHX_THROW("Unknown post op algo: " + op.algo);
        });
        result.set_post_ops(po);
        return result;
    }
    template <class T>
    auto get_primitive_desc(const T& desc, const dnnl::primitive_attr& attr) const
        -> decltype(typename Primitive::primitive_desc(desc, attr, get_dnnl_context().engine))
    {
        return typename Primitive::primitive_desc(desc, attr, get_dnnl_context().engine);
    }
    Primitive get_primitive(const std::unordered_map<int, dnnl::memory::desc>& m) const
    {
        const auto& self = static_cast<const Derived&>(*this);
        auto desc        = self.get_desc(m);
        auto attr        = MIGRAPHX_ASSERT_NO_THROW(this->get_primitive_attr(m));
        auto pd          = self.get_primitive_desc(desc, attr);
        return Primitive(pd);
    }
    argument compute(context& ctx, const shape&, const std::vector<argument>& args) const
    {
        return execute(ctx, args);
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& shapes) const
    {
        return shapes.size() - 1;
    }
    value compile(context&, const shape& output_shape, std::vector<shape> inputs)
    {
        // Compensate for allocation
        inputs.pop_back();
        auto md        = to_memory_desc(output_shape, inputs);
        auto prim      = get_primitive(md);
        auto impl_name = impl(prim);
        return {{"impl", impl_name}};
    }

    void finalize(context&, const shape& output_shape, std::vector<shape> inputs)
    {
        // Compensate for allocation
        inputs.pop_back();
        const auto& self = static_cast<const Derived&>(*this);
        auto name        = self.name();
        auto md          = to_memory_desc(output_shape, inputs);
        auto prim        = get_primitive(md);
        auto arg_lookup  = create_arg_map(inputs.size());
#ifndef NDEBUG
        auto prim_attr = get_primitive_attr(md);
#endif
        execute = make_execute_wrapper([=](const std::vector<argument>& args) {
#ifndef NDEBUG
            // Check that the memory descriptors have not changed
            auto debug_args = args;
            debug_args.pop_back();
            auto debug_md = to_memory_desc(output_shape, to_shapes(debug_args));
            for(auto&& p : debug_md)
            {
                if(md.count(p.first) == 0)
                    MIGRAPHX_THROW(name +
                                   ": Missing memory descriptor for: " + std::to_string(p.first));
                if(p.second == md.at(p.first))
                    continue;
                MIGRAPHX_THROW(name +
                               ": Memory descriptor has changed for: " + std::to_string(p.first));
            }
            // Check post_ops args are correct
            auto pos             = prim_attr.get_post_ops();
            auto prim_input_size = inputs.size() - this->get_extra_post_op_args();
            int j                = 0;
            for(int i = 0; i < pos.len(); i++)
            {
                auto arg  = j + prim_input_size;
                auto kind = pos.kind(i);
                std::string mesg =
                    "Post op " + std::to_string(i) + "@" + std::to_string(arg) + ": ";
                try
                {
                    dnnl::algorithm algo;
                    dnnl::memory::desc mdesc;
                    float scale = 0;
                    float alpha = 0;
                    float beta  = 0;
                    if(kind == dnnl::primitive::kind::binary)
                    {
                        pos.get_params_binary(i, algo, mdesc);
                        if(mdesc != md.at(arg_lookup.at(arg)))
                            MIGRAPHX_THROW(mesg +
                                           "Memory descriptor doesn't match for binary post op");
                        j++;
                    }
                    else if(kind == dnnl::primitive::kind::eltwise)
                    {
                        pos.get_params_eltwise(i, scale, algo, alpha, beta);
                    }
                    else if(kind == dnnl::primitive::kind::sum)
                    {
                        pos.get_params_sum(i, scale);
                        algo = dnnl::algorithm::binary_add;
                    }
                    else
                    {
                        MIGRAPHX_THROW("Unknown kind");
                    }
                    if(to_dnnl_algo(post_ops[i].algo) != algo)
                        MIGRAPHX_THROW(mesg + "Algorithm doesn't match for post op " +
                                       post_ops[i].algo + " != " + to_string(algo));
                }
                catch(const dnnl::error& e)
                {
                    MIGRAPHX_THROW(mesg + "Failed to get post ops argument " + ": " + e.what());
                }
            }
#endif
            std::unordered_map<int, dnnl::memory> m;
            m[MIGRAPHX_DNNL_PREFIX(ARG_DST)] =
                to_dnnl_memory(md.at(MIGRAPHX_DNNL_PREFIX(ARG_DST)), args.back());
            for(int i = 0; i < args.size() - 1; i++)
                m[arg_lookup[i]] = to_dnnl_memory(md.at(arg_lookup[i]), args[i]);
            prim.execute(get_dnnl_context().stream, m);
            return args.back();
        });
    }
    std::vector<shape> trim_post_op_inputs(const std::vector<shape>& inputs) const
    {
        auto prim_input_size = inputs.size() - this->get_extra_post_op_args();
        return {inputs.begin(), inputs.begin() + prim_input_size};
    }
};

template <class Derived, class Primitive, class Op>
struct dnnl_extend_op : dnnl_op<Derived, Primitive>
{
    Op op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack_join(self.reflect_base(self, f), migraphx::reflect(self.op, f));
    }

    // dnnl has some issues with non-packed inputs
    template <class T>
    void required(const check_shapes<T>& cs) const
    {
        cs.packed_or_broadcasted();
    }

    std::string name() const { return "dnnl::" + op.name(); }
    shape compute_shape(std::vector<shape> inputs) const
    {
        const auto& self = static_cast<const Derived&>(*this);
        // Compensate for allocation
        inputs.pop_back();
        self.required(check_shapes(inputs, self));
        auto r = migraphx::compute_shape(op, this->trim_post_op_inputs(inputs));
        // Call to get_primitive to make sure an algo is available
        this->get_primitive(this->to_memory_desc(r, inputs));
        return r;
    }
};

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
