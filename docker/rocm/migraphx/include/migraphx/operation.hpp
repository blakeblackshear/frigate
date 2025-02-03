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
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_OPERAND_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_OPERAND_HPP

#include <cassert>
#include <string>
#include <functional>
#include <memory>
#include <type_traits>
#include <utility>
#include <unordered_map>
#include <migraphx/reflect.hpp>
#include <migraphx/dyn_output.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/streamutils.hpp>
#include <migraphx/normalize_attributes.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/module_ref.hpp>
#include <migraphx/serialize.hpp>
#include <migraphx/auto_any_cast.hpp>
#include <migraphx/lifetime.hpp>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct context;

#ifdef DOXYGEN

/// The operation interface represents an action an instruction will perform. All
/// operation classes must be CopyConstructible.
struct operation
{
    /// A unique name identifying the operation
    std::string name() const;
    /// An optional method that can be used to finalize the operator before running
    void finalize(context& ctx);
    /// This is used to compute the resulting shape from an operation. If an
    /// operation cannot be run with input shapes, then it should throw an
    /// exception.
    shape compute_shape(const std::vector<shape>& input) const;
    /**
     * @brief This performs the operation's computation.
     *
     * This method can be optional when the operation is only used as a placeholder to be lowered
     * later on.
     *
     * @param ctx This is the context created by the `target` during compilation. Implementations
     * can use the target's `context` class rather than the `context` interface class.
     * @param output Equivalent to running `compute_shape` with each `shape` of the `argument`.
     * For a fixed shape, the returned argument will have the same shape as `output`.
     * For a dynamic shape, the returned `argument` will be a fixed shape within the bounds
     * set in the dynamic shape `output`.
     * @param input This is the `argument` result from the previous instruction's computation.
     * @return Return an `argument` of the result computation. The `shape` of `argument` should be
     * the same the `output` shape.
     */
    argument compute(context& ctx, const shape& output, const std::vector<argument>& input) const;
    /// An optional method to return which argument the output will alias. If
    /// there is no aliased output then -1 can be returned.
    std::ptrdiff_t output_alias(const std::vector<shape>& input) const;
    /// An optional stream operator to print the operation. When this is not
    /// implemented, it will just print the operation's name.
    friend std::ostream& operator<<(std::ostream& os, const operation& op);
};

/// Returns true if operation does not require a context to run compute
bool is_context_free(const operation& x);
/// Returns true if operation needs normalization before running compute
bool need_normalization(const operation& x);
/// Returns true if the operation has a finalize method
bool has_finalize(const operation& x);

#else

namespace detail {

namespace operation_operators {

template <class T>
auto operator<<(std::ostream& os, const T& x) -> decltype(os << x.name())
{
    os << x.name();
    char delim = '[';
    reflect_each(x, [&](auto&& y, auto name) {
        os << delim;
        os << name << "=";
        stream_write_value(os, y);
        delim = ',';
    });
    if(delim == ',')
        os << "]";
    return os;
}

template <class T, class U>
auto operator==(const T& x, const U& y) -> decltype(x.name() == y.name())
{
    static_assert(is_reflectable<T>{} or sizeof(T) <= 1,
                  "Missing equality operator or reflect method.");
    if(x.name() != y.name())
        return false;
    const auto& yy = any_cast<T>(y);
    return reflect_tie(x) == reflect_tie(yy);
}

} // namespace operation_operators

template <class T>
auto compute_shape_op(rank<3>,
                      const T& x,
                      const std::vector<shape>& inputs) -> decltype(x.compute_shape(inputs))
{
    return x.compute_shape(inputs);
}

template <class T>
auto compute_shape_op(rank<2>, const T& x, const std::vector<shape>& inputs)
    -> decltype(x.normalize_compute_shape(inputs))
{
    if(inputs.empty())
        MIGRAPHX_THROW("At least one input is required for " + x.name());
    dependent_type<operation, T> y = x;
    normalize_attributes(y, inputs[0]);
    return any_cast<T>(y).normalize_compute_shape(inputs);
}

template <class T>
auto compute_shape_op(rank<1>,
                      const T& x,
                      const std::vector<shape>& inputs) -> decltype(x.compute_shape(inputs, {}))
{
    return x.compute_shape(inputs, {});
}

template <class T>
shape compute_shape_op(rank<0>, const T& x, const std::vector<shape>&)
{
    std::string name = x.name();
    MIGRAPHX_THROW("Shape not computable: " + name);
}

template <class T>
shape compute_shape_op(const T& x, const std::vector<shape>& inputs)
{
    return compute_shape_op(rank<3>{}, x, inputs);
}

template <class T>
auto mod_compute_shape_op(rank<1>,
                          const T& x,
                          const std::vector<shape>& inputs,
                          const std::vector<module_ref>& mod_args)
    -> decltype(x.compute_shape(inputs, mod_args))
{
    return x.compute_shape(inputs, mod_args);
}

template <class T>
shape mod_compute_shape_op(rank<0>,
                           const T& x,
                           const std::vector<shape>& inputs,
                           const std::vector<module_ref>& mod_args)
{
    if(mod_args.empty())
        return compute_shape_op(x, inputs);
    std::string name = x.name();
    MIGRAPHX_THROW("Shape not computable: " + name);
}

template <class T>
shape mod_compute_shape_op(const T& x,
                           const std::vector<shape>& inputs,
                           const std::vector<module_ref>& mod_args)
{
    return mod_compute_shape_op(rank<1>{}, x, inputs, mod_args);
}

template <class T>
auto compute_op(rank<1>,
                const T& x,
                context& ctx,
                const shape& output_shape,
                const std::vector<argument>& input)
    -> decltype(x.compute(auto_any_cast(ctx),
                          make_compute_output_shape(pack(x, output_shape, input)),
                          input))
{
    return x.compute(
        auto_any_cast(ctx), make_compute_output_shape(pack(x, output_shape, input)), input);
}

template <class T>
argument compute_op(rank<0>, const T& x, context&, const shape&, const std::vector<argument>&)
{
    std::string name = x.name();
    MIGRAPHX_THROW("Not computable: " + name);
}

template <class T>
argument
compute_op(const T& x, context& ctx, const shape& output_shape, const std::vector<argument>& input)
{
    return compute_op(rank<1>{}, x, ctx, output_shape, input);
}

template <class T>
auto compute_op(rank<1>, const T& x, const shape& output_shape, const std::vector<argument>& input)
    -> decltype(x.compute(make_compute_output_shape(pack(x, output_shape, input)), input))
{
    return x.compute(make_compute_output_shape(pack(x, output_shape, input)), input);
}

template <class T>
argument compute_op(rank<0>, const T& x, const shape&, const std::vector<argument>&)
{
    std::string name = x.name();
    MIGRAPHX_THROW("Not computable: " + name);
}

template <class T>
argument compute_op(const T& x, const shape& output_shape, const std::vector<argument>& input)
{
    return compute_op(rank<1>{}, x, output_shape, input);
}

template <class T, class F>
auto compute_op(rank<1>,
                const T& x,
                const shape& output,
                const std::vector<argument>& inputs,
                const std::vector<module_ref>& module_args,
                F f) -> decltype(x.compute(make_compute_output_shape(pack(x, output, inputs)),
                                           inputs,
                                           module_args,
                                           f))
{
    return x.compute(make_compute_output_shape(pack(x, output, inputs)), inputs, module_args, f);
}

template <class T, class F>
argument compute_op(rank<0>,
                    const T& x,
                    const shape& output,
                    const std::vector<argument>& inputs,
                    const std::vector<module_ref>& module_args,
                    F)
{
    if(module_args.empty())
        return compute_op(x, output, inputs);
    std::string name = x.name();
    MIGRAPHX_THROW("Not computable: " + name);
}

template <class T, class F>
argument compute_op(const T& x,
                    const shape& output,
                    const std::vector<argument>& inputs,
                    const std::vector<module_ref>& module_args,
                    F f)
{
    return compute_op(rank<1>{}, x, output, inputs, module_args, f);
}

template <class T, class F>
auto compute_op(rank<4>,
                const T& x,
                context& ctx,
                const shape& output,
                const std::vector<argument>& inputs,
                const std::vector<module_ref>& module_args,
                F f) -> decltype(x.compute(auto_any_cast(ctx),
                                           make_compute_output_shape(pack(x, output, inputs)),
                                           inputs,
                                           module_args,
                                           f))
{
    return x.compute(auto_any_cast(ctx),
                     make_compute_output_shape(pack(x, output, inputs)),
                     inputs,
                     module_args,
                     f);
}

template <class T, class F>
auto compute_op(rank<3>,
                const T& x,
                context&,
                const shape& output,
                const std::vector<argument>& inputs,
                const std::vector<module_ref>& module_args,
                F f) -> decltype(x.compute(make_compute_output_shape(pack(x, output, inputs)),
                                           inputs,
                                           module_args,
                                           f))
{
    return x.compute(make_compute_output_shape(pack(x, output, inputs)), inputs, module_args, f);
}

template <class T, class F>
auto compute_op(rank<2>,
                const T& x,
                context&,
                const shape& output,
                const std::vector<argument>& inputs,
                const std::vector<module_ref>&,
                F) -> decltype(x.compute(make_compute_output_shape(pack(x, output, inputs)),
                                         inputs))
{
    return x.compute(make_compute_output_shape(pack(x, output, inputs)), inputs);
}

template <class T, class F>
auto compute_op(rank<1>,
                const T& x,
                context& ctx,
                const shape& output,
                const std::vector<argument>& inputs,
                const std::vector<module_ref>&,
                F) -> decltype(x.compute(auto_any_cast(ctx),
                                         make_compute_output_shape(pack(x, output, inputs)),
                                         inputs))
{
    return x.compute(
        auto_any_cast(ctx), make_compute_output_shape(pack(x, output, inputs)), inputs);
}

template <class T, class F>
argument compute_op(rank<0>,
                    const T& x,
                    context&,
                    const shape&,
                    const std::vector<argument>&,
                    const std::vector<module_ref>&,
                    F)
{
    std::string name = x.name();
    MIGRAPHX_THROW("Not computable: " + name);
}

template <class T, class F>
argument compute_op(const T& x,
                    context& ctx,
                    const shape& output,
                    const std::vector<argument>& inputs,
                    const std::vector<module_ref>& module_args,
                    F f)
{
    return compute_op(rank<4>{}, x, ctx, output, inputs, module_args, f);
}

template <class T>
auto is_context_free_op(rank<1>,
                        const T& x,
                        const shape& output_shape,
                        const std::vector<argument>& input)
    -> decltype(x.compute(make_compute_output_shape(pack(x, output_shape, input)), input),
                std::true_type{});

template <class T>
auto is_context_free_op(rank<0>, const T&, const shape&, const std::vector<argument>&)
    -> std::false_type;

template <class T>
auto is_context_free_op(const T& x)
    -> decltype(is_context_free_op(
        rank<1>{}, x, std::declval<const shape&>(), std::declval<std::vector<argument>>()))
{
    return {};
}

template <class T>
auto need_normalization_op(rank<1>, const T& x, const std::vector<shape>& inputs)
    -> decltype(x.normalize_compute_shape(inputs), std::true_type{});

template <class T>
auto need_normalization_op(rank<0>, const T&, const std::vector<shape>&) -> std::false_type;

template <class T>
auto need_normalization_op(const T& x)
    -> decltype(need_normalization_op(rank<1>{}, x, std::declval<std::vector<shape>>()))
{
    return {};
}

template <class T>
std::ptrdiff_t output_alias_op(const T&, const std::vector<shape>&)
{
    return -1;
}

template <class T>
auto finalize_op(
    rank<1>, T& x, context& ctx, const shape& output_shape, const std::vector<shape>& input)
    -> decltype(x.finalize(auto_any_cast(ctx), output_shape, input), void())
{
    x.finalize(auto_any_cast(ctx), output_shape, input);
}

template <class T>
void finalize_op(rank<0>, T&, context&, const shape&, const std::vector<shape>&)
{
}

template <class T>
void finalize_op(T& x, context& ctx, const shape& output_shape, const std::vector<shape>& input)
{
    finalize_op(rank<1>{}, x, ctx, output_shape, input);
}

template <class T>
auto has_finalize_op(
    rank<1>, T& x, context& ctx, const shape& output_shape, const std::vector<shape>& input)
    -> decltype(x.finalize(auto_any_cast(ctx), output_shape, input), std::true_type{});

template <class T>
auto has_finalize_op(rank<0>, T&, context&, const shape&, const std::vector<shape>&)
    -> std::false_type;

template <class T>
auto has_finalize_op(const T&) -> decltype(has_finalize_op(rank<1>{},
                                                           std::declval<T&>(),
                                                           std::declval<context&>(),
                                                           std::declval<const shape&>(),
                                                           std::declval<std::vector<shape>>()))
{
    return {};
}

template <class T>
auto compile_op(
    rank<1>, T& x, context& ctx, const shape& output_shape, const std::vector<shape>& input)
    -> decltype(x.compile(auto_any_cast(ctx), output_shape, input))
{
    return x.compile(auto_any_cast(ctx), output_shape, input);
}

template <class T>
value compile_op(rank<0>, T&, context&, const shape&, const std::vector<shape>&)
{
    return value::object{};
}

template <class T>
value compile_op(const T& x,
                 context& ctx,
                 const shape& output_shape,
                 const std::vector<shape>& input)
{
    return compile_op(rank<1>{}, x, ctx, output_shape, input);
}

template <class T>
value attributes_op(const T&)
{
    return value::object{};
}

template <class T>
value to_value_op(const T& x)
{
    return migraphx::to_value(x);
}

template <class T>
void from_value_op(T& x, const value& v)
{
    if(not(v.is_object() or (v.empty() and v.is_array())))
        MIGRAPHX_THROW("Value is not an object");
    return migraphx::from_value(v, x);
}

template <class T>
lifetime get_lifetime_op(const T&)
{
    return lifetime::local;
}

} // namespace detail

#ifdef TYPE_ERASED_DECLARATION

// Type-erased interface for:
struct MIGRAPHX_EXPORT operation
{
    //
    std::string name() const;
    // (optional)
    bool is_context_free() const;
    // (optional)
    bool need_normalization() const;
    // (optional)
    bool has_finalize() const;
    // (optional)
    lifetime get_lifetime() const;
    // (optional)
    std::ptrdiff_t output_alias(const std::vector<shape>& input) const;
    // (optional)
    value compile(context& ctx, const shape& output, const std::vector<shape>& input);
    // (optional)
    void finalize(context& ctx, const shape& output, const std::vector<shape>& input);
    // (optional)
    shape compute_shape(const std::vector<shape>& input) const;
    // (optional)
    shape compute_shape(const std::vector<shape>& inputs,
                        const std::vector<module_ref>& mod_args) const;
    // (optional)
    argument compute(context& ctx, const shape& output, const std::vector<argument>& input) const;
    // (optional)
    argument compute(const shape& output, const std::vector<argument>& input) const;
    // (optional)
    argument compute(const shape& output,
                     const std::vector<argument>& input,
                     const std::vector<module_ref>& module_args,
                     std::function<std::vector<argument>(
                         module_ref&, const std::unordered_map<std::string, argument>&)> run) const;
    // (optional)
    argument compute(context& ctx,
                     const shape& output,
                     const std::vector<argument>& input,
                     const std::vector<module_ref>& module_args,
                     std::function<std::vector<argument>(
                         module_ref&, const std::unordered_map<std::string, argument>&)> run) const;
    // (optional)
    value to_value() const;
    // (optional)
    void from_value(const value& v);
    // (optional)
    value attributes() const;
    //
    friend std::ostream& operator<<(std::ostream& os, const operation& op);
    //
    friend bool operator==(const operation& x, const operation& y);
};

#else

struct operation
{
    private:
    template <class T>
    static auto private_detail_te_default_is_context_free(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.is_context_free())
    {
        return private_detail_te_self.is_context_free();
    }

    template <class T>
    static bool private_detail_te_default_is_context_free(float, T&& private_detail_te_self)
    {
        return detail::is_context_free_op(private_detail_te_self);
    }

    template <class T>
    static auto private_detail_te_default_need_normalization(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.need_normalization())
    {
        return private_detail_te_self.need_normalization();
    }

    template <class T>
    static bool private_detail_te_default_need_normalization(float, T&& private_detail_te_self)
    {
        return detail::need_normalization_op(private_detail_te_self);
    }

    template <class T>
    static auto private_detail_te_default_has_finalize(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.has_finalize())
    {
        return private_detail_te_self.has_finalize();
    }

    template <class T>
    static bool private_detail_te_default_has_finalize(float, T&& private_detail_te_self)
    {
        return detail::has_finalize_op(private_detail_te_self);
    }

    template <class T>
    static auto private_detail_te_default_get_lifetime(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.get_lifetime())
    {
        return private_detail_te_self.get_lifetime();
    }

    template <class T>
    static lifetime private_detail_te_default_get_lifetime(float, T&& private_detail_te_self)
    {
        return detail::get_lifetime_op(private_detail_te_self);
    }

    template <class T>
    static auto private_detail_te_default_output_alias(char,
                                                       T&& private_detail_te_self,
                                                       const std::vector<shape>& input)
        -> decltype(private_detail_te_self.output_alias(input))
    {
        return private_detail_te_self.output_alias(input);
    }

    template <class T>
    static std::ptrdiff_t private_detail_te_default_output_alias(float,
                                                                 T&& private_detail_te_self,
                                                                 const std::vector<shape>& input)
    {
        return detail::output_alias_op(private_detail_te_self, input);
    }

    template <class T>
    static auto private_detail_te_default_compile(char,
                                                  T&& private_detail_te_self,
                                                  context& ctx,
                                                  const shape& output,
                                                  const std::vector<shape>& input)
        -> decltype(private_detail_te_self.compile(ctx, output, input))
    {
        return private_detail_te_self.compile(ctx, output, input);
    }

    template <class T>
    static value private_detail_te_default_compile(float,
                                                   T&& private_detail_te_self,
                                                   context& ctx,
                                                   const shape& output,
                                                   const std::vector<shape>& input)
    {
        return detail::compile_op(private_detail_te_self, ctx, output, input);
    }

    template <class T>
    static auto private_detail_te_default_finalize(char,
                                                   T&& private_detail_te_self,
                                                   context& ctx,
                                                   const shape& output,
                                                   const std::vector<shape>& input)
        -> decltype(private_detail_te_self.finalize(ctx, output, input))
    {
        private_detail_te_self.finalize(ctx, output, input);
    }

    template <class T>
    static void private_detail_te_default_finalize(float,
                                                   T&& private_detail_te_self,
                                                   context& ctx,
                                                   const shape& output,
                                                   const std::vector<shape>& input)
    {
        detail::finalize_op(private_detail_te_self, ctx, output, input);
    }

    template <class T>
    static auto private_detail_te_default_compute_shape(char,
                                                        T&& private_detail_te_self,
                                                        const std::vector<shape>& input)
        -> decltype(private_detail_te_self.compute_shape(input))
    {
        return private_detail_te_self.compute_shape(input);
    }

    template <class T>
    static shape private_detail_te_default_compute_shape(float,
                                                         T&& private_detail_te_self,
                                                         const std::vector<shape>& input)
    {
        return detail::compute_shape_op(private_detail_te_self, input);
    }

    template <class T>
    static auto private_detail_te_default_compute_shape(char,
                                                        T&& private_detail_te_self,
                                                        const std::vector<shape>& inputs,
                                                        const std::vector<module_ref>& mod_args)
        -> decltype(private_detail_te_self.compute_shape(inputs, mod_args))
    {
        return private_detail_te_self.compute_shape(inputs, mod_args);
    }

    template <class T>
    static shape private_detail_te_default_compute_shape(float,
                                                         T&& private_detail_te_self,
                                                         const std::vector<shape>& inputs,
                                                         const std::vector<module_ref>& mod_args)
    {
        return detail::mod_compute_shape_op(private_detail_te_self, inputs, mod_args);
    }

    template <class T>
    static auto private_detail_te_default_compute(char,
                                                  T&& private_detail_te_self,
                                                  context& ctx,
                                                  const shape& output,
                                                  const std::vector<argument>& input)
        -> decltype(private_detail_te_self.compute(ctx, output, input))
    {
        return private_detail_te_self.compute(ctx, output, input);
    }

    template <class T>
    static argument private_detail_te_default_compute(float,
                                                      T&& private_detail_te_self,
                                                      context& ctx,
                                                      const shape& output,
                                                      const std::vector<argument>& input)
    {
        return detail::compute_op(private_detail_te_self, ctx, output, input);
    }

    template <class T>
    static auto private_detail_te_default_compute(char,
                                                  T&& private_detail_te_self,
                                                  const shape& output,
                                                  const std::vector<argument>& input)
        -> decltype(private_detail_te_self.compute(output, input))
    {
        return private_detail_te_self.compute(output, input);
    }

    template <class T>
    static argument private_detail_te_default_compute(float,
                                                      T&& private_detail_te_self,
                                                      const shape& output,
                                                      const std::vector<argument>& input)
    {
        return detail::compute_op(private_detail_te_self, output, input);
    }

    template <class T>
    static auto private_detail_te_default_compute(
        char,
        T&& private_detail_te_self,
        const shape& output,
        const std::vector<argument>& input,
        const std::vector<module_ref>& module_args,
        std::function<std::vector<argument>(module_ref&,
                                            const std::unordered_map<std::string, argument>&)> run)
        -> decltype(private_detail_te_self.compute(output, input, module_args, std::move(run)))
    {
        return private_detail_te_self.compute(output, input, module_args, std::move(run));
    }

    template <class T>
    static argument private_detail_te_default_compute(
        float,
        T&& private_detail_te_self,
        const shape& output,
        const std::vector<argument>& input,
        const std::vector<module_ref>& module_args,
        std::function<std::vector<argument>(module_ref&,
                                            const std::unordered_map<std::string, argument>&)> run)
    {
        return detail::compute_op(
            private_detail_te_self, output, input, module_args, std::move(run));
    }

    template <class T>
    static auto private_detail_te_default_compute(
        char,
        T&& private_detail_te_self,
        context& ctx,
        const shape& output,
        const std::vector<argument>& input,
        const std::vector<module_ref>& module_args,
        std::function<std::vector<argument>(module_ref&,
                                            const std::unordered_map<std::string, argument>&)> run)
        -> decltype(private_detail_te_self.compute(ctx, output, input, module_args, std::move(run)))
    {
        return private_detail_te_self.compute(ctx, output, input, module_args, std::move(run));
    }

    template <class T>
    static argument private_detail_te_default_compute(
        float,
        T&& private_detail_te_self,
        context& ctx,
        const shape& output,
        const std::vector<argument>& input,
        const std::vector<module_ref>& module_args,
        std::function<std::vector<argument>(module_ref&,
                                            const std::unordered_map<std::string, argument>&)> run)
    {
        return detail::compute_op(
            private_detail_te_self, ctx, output, input, module_args, std::move(run));
    }

    template <class T>
    static auto private_detail_te_default_to_value(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.to_value())
    {
        return private_detail_te_self.to_value();
    }

    template <class T>
    static value private_detail_te_default_to_value(float, T&& private_detail_te_self)
    {
        return detail::to_value_op(private_detail_te_self);
    }

    template <class T>
    static auto
    private_detail_te_default_from_value(char, T&& private_detail_te_self, const value& v)
        -> decltype(private_detail_te_self.from_value(v))
    {
        private_detail_te_self.from_value(v);
    }

    template <class T>
    static void
    private_detail_te_default_from_value(float, T&& private_detail_te_self, const value& v)
    {
        detail::from_value_op(private_detail_te_self, v);
    }

    template <class T>
    static auto private_detail_te_default_attributes(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.attributes())
    {
        return private_detail_te_self.attributes();
    }

    template <class T>
    static value private_detail_te_default_attributes(float, T&& private_detail_te_self)
    {
        return detail::attributes_op(private_detail_te_self);
    }

    template <class PrivateDetailTypeErasedT>
    struct private_te_unwrap_reference
    {
        using type = PrivateDetailTypeErasedT;
    };
    template <class PrivateDetailTypeErasedT>
    struct private_te_unwrap_reference<std::reference_wrapper<PrivateDetailTypeErasedT>>
    {
        using type = PrivateDetailTypeErasedT;
    };
    template <class PrivateDetailTypeErasedT>
    using private_te_pure = typename std::remove_cv<
        typename std::remove_reference<PrivateDetailTypeErasedT>::type>::type;

    template <class PrivateDetailTypeErasedT>
    using private_te_constraints_impl =
        decltype(std::declval<PrivateDetailTypeErasedT>().name(),
                 private_detail_te_default_is_context_free(
                     char(0), std::declval<PrivateDetailTypeErasedT>()),
                 private_detail_te_default_need_normalization(
                     char(0), std::declval<PrivateDetailTypeErasedT>()),
                 private_detail_te_default_has_finalize(char(0),
                                                        std::declval<PrivateDetailTypeErasedT>()),
                 private_detail_te_default_get_lifetime(char(0),
                                                        std::declval<PrivateDetailTypeErasedT>()),
                 private_detail_te_default_output_alias(char(0),
                                                        std::declval<PrivateDetailTypeErasedT>(),
                                                        std::declval<const std::vector<shape>&>()),
                 private_detail_te_default_compile(char(0),
                                                   std::declval<PrivateDetailTypeErasedT>(),
                                                   std::declval<context&>(),
                                                   std::declval<const shape&>(),
                                                   std::declval<const std::vector<shape>&>()),
                 private_detail_te_default_finalize(char(0),
                                                    std::declval<PrivateDetailTypeErasedT>(),
                                                    std::declval<context&>(),
                                                    std::declval<const shape&>(),
                                                    std::declval<const std::vector<shape>&>()),
                 private_detail_te_default_compute_shape(char(0),
                                                         std::declval<PrivateDetailTypeErasedT>(),
                                                         std::declval<const std::vector<shape>&>()),
                 private_detail_te_default_compute_shape(
                     char(0),
                     std::declval<PrivateDetailTypeErasedT>(),
                     std::declval<const std::vector<shape>&>(),
                     std::declval<const std::vector<module_ref>&>()),
                 private_detail_te_default_compute(char(0),
                                                   std::declval<PrivateDetailTypeErasedT>(),
                                                   std::declval<context&>(),
                                                   std::declval<const shape&>(),
                                                   std::declval<const std::vector<argument>&>()),
                 private_detail_te_default_compute(char(0),
                                                   std::declval<PrivateDetailTypeErasedT>(),
                                                   std::declval<const shape&>(),
                                                   std::declval<const std::vector<argument>&>()),
                 private_detail_te_default_compute(
                     char(0),
                     std::declval<PrivateDetailTypeErasedT>(),
                     std::declval<const shape&>(),
                     std::declval<const std::vector<argument>&>(),
                     std::declval<const std::vector<module_ref>&>(),
                     std::declval<std::function<std::vector<argument>(
                         module_ref&, const std::unordered_map<std::string, argument>&)>>()),
                 private_detail_te_default_compute(
                     char(0),
                     std::declval<PrivateDetailTypeErasedT>(),
                     std::declval<context&>(),
                     std::declval<const shape&>(),
                     std::declval<const std::vector<argument>&>(),
                     std::declval<const std::vector<module_ref>&>(),
                     std::declval<std::function<std::vector<argument>(
                         module_ref&, const std::unordered_map<std::string, argument>&)>>()),
                 private_detail_te_default_to_value(char(0),
                                                    std::declval<PrivateDetailTypeErasedT>()),
                 private_detail_te_default_from_value(char(0),
                                                      std::declval<PrivateDetailTypeErasedT>(),
                                                      std::declval<const value&>()),
                 private_detail_te_default_attributes(char(0),
                                                      std::declval<PrivateDetailTypeErasedT>()),
                 static_cast<void>(void()),
                 static_cast<void>(void()),
                 void());

    template <class PrivateDetailTypeErasedT>
    using private_te_constraints = private_te_constraints_impl<
        typename private_te_unwrap_reference<private_te_pure<PrivateDetailTypeErasedT>>::type>;

    public:
    // Constructors
    operation() = default;

    template <typename PrivateDetailTypeErasedT,
              typename = private_te_constraints<PrivateDetailTypeErasedT>,
              typename = typename std::enable_if<
                  not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, operation>{}>::type>
    operation(PrivateDetailTypeErasedT&& value)
        : private_detail_te_handle_mem_var(
              std::make_shared<
                  private_detail_te_handle_type<private_te_pure<PrivateDetailTypeErasedT>>>(
                  std::forward<PrivateDetailTypeErasedT>(value)))
    {
    }

    // Assignment
    template <typename PrivateDetailTypeErasedT,
              typename = private_te_constraints<PrivateDetailTypeErasedT>,
              typename = typename std::enable_if<
                  not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, operation>{}>::type>
    operation& operator=(PrivateDetailTypeErasedT&& value)
    {
        using std::swap;
        auto* derived = this->any_cast<private_te_pure<PrivateDetailTypeErasedT>>();
        if(derived and private_detail_te_handle_mem_var.use_count() == 1)
        {
            *derived = std::forward<PrivateDetailTypeErasedT>(value);
        }
        else
        {
            operation rhs(value);
            swap(private_detail_te_handle_mem_var, rhs.private_detail_te_handle_mem_var);
        }
        return *this;
    }

    // Cast
    template <typename PrivateDetailTypeErasedT>
    PrivateDetailTypeErasedT* any_cast()
    {
        return this->type_id() == typeid(PrivateDetailTypeErasedT)
                   ? std::addressof(static_cast<private_detail_te_handle_type<
                                        typename std::remove_cv<PrivateDetailTypeErasedT>::type>&>(
                                        private_detail_te_get_handle())
                                        .private_detail_te_value)
                   : nullptr;
    }

    template <typename PrivateDetailTypeErasedT>
    const typename std::remove_cv<PrivateDetailTypeErasedT>::type* any_cast() const
    {
        return this->type_id() == typeid(PrivateDetailTypeErasedT)
                   ? std::addressof(static_cast<const private_detail_te_handle_type<
                                        typename std::remove_cv<PrivateDetailTypeErasedT>::type>&>(
                                        private_detail_te_get_handle())
                                        .private_detail_te_value)
                   : nullptr;
    }

    const std::type_info& type_id() const
    {
        if(private_detail_te_handle_empty())
            return typeid(std::nullptr_t);
        else
            return private_detail_te_get_handle().type();
    }

    std::string name() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().name();
    }

    bool is_context_free() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().is_context_free();
    }

    bool need_normalization() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().need_normalization();
    }

    bool has_finalize() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().has_finalize();
    }

    lifetime get_lifetime() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().get_lifetime();
    }

    std::ptrdiff_t output_alias(const std::vector<shape>& input) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().output_alias(input);
    }

    value compile(context& ctx, const shape& output, const std::vector<shape>& input)
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().compile(ctx, output, input);
    }

    void finalize(context& ctx, const shape& output, const std::vector<shape>& input)
    {
        assert((*this).private_detail_te_handle_mem_var);
        (*this).private_detail_te_get_handle().finalize(ctx, output, input);
    }

    shape compute_shape(const std::vector<shape>& input) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().compute_shape(input);
    }

    shape compute_shape(const std::vector<shape>& inputs,
                        const std::vector<module_ref>& mod_args) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().compute_shape(inputs, mod_args);
    }

    argument compute(context& ctx, const shape& output, const std::vector<argument>& input) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().compute(ctx, output, input);
    }

    argument compute(const shape& output, const std::vector<argument>& input) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().compute(output, input);
    }

    argument compute(const shape& output,
                     const std::vector<argument>& input,
                     const std::vector<module_ref>& module_args,
                     std::function<std::vector<argument>(
                         module_ref&, const std::unordered_map<std::string, argument>&)> run) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().compute(
            output, input, module_args, std::move(run));
    }

    argument compute(context& ctx,
                     const shape& output,
                     const std::vector<argument>& input,
                     const std::vector<module_ref>& module_args,
                     std::function<std::vector<argument>(
                         module_ref&, const std::unordered_map<std::string, argument>&)> run) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().compute(
            ctx, output, input, module_args, std::move(run));
    }

    value to_value() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().to_value();
    }

    void from_value(const value& v)
    {
        assert((*this).private_detail_te_handle_mem_var);
        (*this).private_detail_te_get_handle().from_value(v);
    }

    value attributes() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().attributes();
    }

    friend std::ostream& operator<<(std::ostream& os, const operation& op)
    {
        assert(op.private_detail_te_handle_mem_var);
        return op.private_detail_te_get_handle().operator_shift_left(os);
    }

    friend bool operator==(const operation& x, const operation& y)
    {
        assert(x.private_detail_te_handle_mem_var);
        return x.private_detail_te_get_handle().operator==(y);
    }

    friend bool is_shared(const operation& private_detail_x, const operation& private_detail_y)
    {
        return private_detail_x.private_detail_te_handle_mem_var ==
               private_detail_y.private_detail_te_handle_mem_var;
    }

    private:
    struct private_detail_te_handle_base_type
    {
        virtual ~private_detail_te_handle_base_type() {}
        virtual std::shared_ptr<private_detail_te_handle_base_type> clone() const = 0;
        virtual const std::type_info& type() const                                = 0;

        virtual std::string name() const                                           = 0;
        virtual bool is_context_free() const                                       = 0;
        virtual bool need_normalization() const                                    = 0;
        virtual bool has_finalize() const                                          = 0;
        virtual lifetime get_lifetime() const                                      = 0;
        virtual std::ptrdiff_t output_alias(const std::vector<shape>& input) const = 0;
        virtual value
        compile(context& ctx, const shape& output, const std::vector<shape>& input) = 0;
        virtual void
        finalize(context& ctx, const shape& output, const std::vector<shape>& input) = 0;
        virtual shape compute_shape(const std::vector<shape>& input) const           = 0;
        virtual shape compute_shape(const std::vector<shape>& inputs,
                                    const std::vector<module_ref>& mod_args) const   = 0;
        virtual argument
        compute(context& ctx, const shape& output, const std::vector<argument>& input) const    = 0;
        virtual argument compute(const shape& output, const std::vector<argument>& input) const = 0;
        virtual argument
        compute(const shape& output,
                const std::vector<argument>& input,
                const std::vector<module_ref>& module_args,
                std::function<std::vector<argument>(
                    module_ref&, const std::unordered_map<std::string, argument>&)> run) const = 0;
        virtual argument
        compute(context& ctx,
                const shape& output,
                const std::vector<argument>& input,
                const std::vector<module_ref>& module_args,
                std::function<std::vector<argument>(
                    module_ref&, const std::unordered_map<std::string, argument>&)> run) const = 0;
        virtual value to_value() const                                                         = 0;
        virtual void from_value(const value& v)                                                = 0;
        virtual value attributes() const                                                       = 0;
        virtual std::ostream& operator_shift_left(std::ostream& os) const                      = 0;
        virtual bool operator==(const operation& y) const                                      = 0;
    };

    template <typename PrivateDetailTypeErasedT>
    struct private_detail_te_handle_type : private_detail_te_handle_base_type
    {
        template <typename PrivateDetailTypeErasedU = PrivateDetailTypeErasedT>
        private_detail_te_handle_type(
            PrivateDetailTypeErasedT value,
            typename std::enable_if<std::is_reference<PrivateDetailTypeErasedU>::value>::type* =
                nullptr)
            : private_detail_te_value(value)
        {
        }

        template <typename PrivateDetailTypeErasedU = PrivateDetailTypeErasedT>
        private_detail_te_handle_type(
            PrivateDetailTypeErasedT value,
            typename std::enable_if<not std::is_reference<PrivateDetailTypeErasedU>::value,
                                    int>::type* = nullptr) noexcept
            : private_detail_te_value(std::move(value))
        {
        }

        std::shared_ptr<private_detail_te_handle_base_type> clone() const override
        {
            return std::make_shared<private_detail_te_handle_type>(private_detail_te_value);
        }

        const std::type_info& type() const override { return typeid(private_detail_te_value); }

        std::string name() const override { return private_detail_te_value.name(); }

        bool is_context_free() const override
        {

            return private_detail_te_default_is_context_free(char(0), private_detail_te_value);
        }

        bool need_normalization() const override
        {

            return private_detail_te_default_need_normalization(char(0), private_detail_te_value);
        }

        bool has_finalize() const override
        {

            return private_detail_te_default_has_finalize(char(0), private_detail_te_value);
        }

        lifetime get_lifetime() const override
        {

            return private_detail_te_default_get_lifetime(char(0), private_detail_te_value);
        }

        std::ptrdiff_t output_alias(const std::vector<shape>& input) const override
        {

            return private_detail_te_default_output_alias(char(0), private_detail_te_value, input);
        }

        value compile(context& ctx, const shape& output, const std::vector<shape>& input) override
        {

            return private_detail_te_default_compile(
                char(0), private_detail_te_value, ctx, output, input);
        }

        void finalize(context& ctx, const shape& output, const std::vector<shape>& input) override
        {

            private_detail_te_default_finalize(
                char(0), private_detail_te_value, ctx, output, input);
        }

        shape compute_shape(const std::vector<shape>& input) const override
        {

            return private_detail_te_default_compute_shape(char(0), private_detail_te_value, input);
        }

        shape compute_shape(const std::vector<shape>& inputs,
                            const std::vector<module_ref>& mod_args) const override
        {

            return private_detail_te_default_compute_shape(
                char(0), private_detail_te_value, inputs, mod_args);
        }

        argument compute(context& ctx,
                         const shape& output,
                         const std::vector<argument>& input) const override
        {

            return private_detail_te_default_compute(
                char(0), private_detail_te_value, ctx, output, input);
        }

        argument compute(const shape& output, const std::vector<argument>& input) const override
        {

            return private_detail_te_default_compute(
                char(0), private_detail_te_value, output, input);
        }

        argument compute(
            const shape& output,
            const std::vector<argument>& input,
            const std::vector<module_ref>& module_args,
            std::function<std::vector<argument>(
                module_ref&, const std::unordered_map<std::string, argument>&)> run) const override
        {

            return private_detail_te_default_compute(
                char(0), private_detail_te_value, output, input, module_args, std::move(run));
        }

        argument compute(
            context& ctx,
            const shape& output,
            const std::vector<argument>& input,
            const std::vector<module_ref>& module_args,
            std::function<std::vector<argument>(
                module_ref&, const std::unordered_map<std::string, argument>&)> run) const override
        {

            return private_detail_te_default_compute(
                char(0), private_detail_te_value, ctx, output, input, module_args, std::move(run));
        }

        value to_value() const override
        {

            return private_detail_te_default_to_value(char(0), private_detail_te_value);
        }

        void from_value(const value& v) override
        {

            private_detail_te_default_from_value(char(0), private_detail_te_value, v);
        }

        value attributes() const override
        {

            return private_detail_te_default_attributes(char(0), private_detail_te_value);
        }

        std::ostream& operator_shift_left(std::ostream& os) const override
        {
            using migraphx::detail::operation_operators::operator<<;
            return os << private_detail_te_value;
        }

        bool operator==(const operation& y) const override
        {
            using migraphx::detail::operation_operators::operator==;
            return private_detail_te_value == y;
        }

        PrivateDetailTypeErasedT private_detail_te_value;
    };

    template <typename PrivateDetailTypeErasedT>
    struct private_detail_te_handle_type<std::reference_wrapper<PrivateDetailTypeErasedT>>
        : private_detail_te_handle_type<PrivateDetailTypeErasedT&>
    {
        private_detail_te_handle_type(std::reference_wrapper<PrivateDetailTypeErasedT> ref)
            : private_detail_te_handle_type<PrivateDetailTypeErasedT&>(ref.get())
        {
        }
    };

    bool private_detail_te_handle_empty() const
    {
        return private_detail_te_handle_mem_var == nullptr;
    }

    const private_detail_te_handle_base_type& private_detail_te_get_handle() const
    {
        assert(private_detail_te_handle_mem_var != nullptr);
        return *private_detail_te_handle_mem_var;
    }

    private_detail_te_handle_base_type& private_detail_te_get_handle()
    {
        assert(private_detail_te_handle_mem_var != nullptr);
        if(private_detail_te_handle_mem_var.use_count() > 1)
            private_detail_te_handle_mem_var = private_detail_te_handle_mem_var->clone();
        return *private_detail_te_handle_mem_var;
    }

    std::shared_ptr<private_detail_te_handle_base_type> private_detail_te_handle_mem_var;
};

template <typename ValueType>
inline const ValueType* any_cast(const operation* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType* any_cast(operation* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType& any_cast(operation& x)
{
    auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}

template <typename ValueType>
inline const ValueType& any_cast(const operation& x)
{
    const auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}
#endif

inline bool operator!=(const operation& x, const operation& y) { return not(x == y); }

inline value
compile(operation& op, context& ctx, const shape& output_shape, const std::vector<shape>& input)
{
    return op.compile(ctx, output_shape, input);
}
template <class Context>
inline value
compile(operation& op, Context& ctx, const shape& output_shape, const std::vector<shape>& input)
{
    dependent_type<context, Context> ctx2 = std::ref(ctx);
    return compile(op, ctx2, output_shape, input);
}
template <class T, class Context>
inline auto compile(T& op, Context& ctx, const shape& output_shape, const std::vector<shape>& input)
    -> decltype(op.compile(ctx, ctx, output_shape, input))
{
    return op.compile(ctx, ctx, output_shape, input);
}
inline shape compute_shape(const operation& op, const std::vector<shape>& inputs)
{
    return op.compute_shape(inputs);
}

template <class T>
inline auto compute_shape(const T& op,
                          const std::vector<shape>& inputs) -> decltype(op.compute_shape(inputs))
{
    return op.compute_shape(inputs);
}

template <class T>
inline auto compute_shape(const T& op, const std::vector<shape>& inputs)
    -> decltype(op.normalize_compute_shape(inputs))
{
    return detail::compute_shape_op(op, inputs);
}

inline shape compute_shape(const operation& op,
                           const std::vector<shape>& inputs,
                           const std::vector<module_ref>& mod_args)
{
    return op.compute_shape(inputs, mod_args);
}

template <class T>
inline auto compute_shape(const T& op,
                          const std::vector<shape>& inputs,
                          const std::vector<module_ref>& mod_args)
    -> decltype(op.compute_shape(inputs, mod_args))
{
    return op.compute_shape(inputs, mod_args);
}

template <class T>
inline auto compute_shape(const T& op,
                          const std::vector<shape>& inputs,
                          const std::vector<module_ref>& mod_args)
    -> decltype(op.normalize_compute_shape(inputs, mod_args))
{
    return detail::compute_shape_op(op, inputs, mod_args);
}

inline bool is_context_free(const operation& op) { return op.is_context_free(); }

template <class T>
bool is_context_free(const T& x)
{
    return detail::is_context_free_op(x);
}

inline bool need_normalization(const operation& op) { return op.need_normalization(); }

template <class T>
bool need_normalization(const T& x)
{
    return detail::need_normalization_op(x);
}

inline bool has_finalize(const operation& op) { return op.has_finalize(); }

template <class T>
bool has_finalize(const T& x)
{
    return detail::has_finalize_op(x);
}

MIGRAPHX_EXPORT void migraphx_to_value(value& v, const operation& op);
MIGRAPHX_EXPORT void migraphx_from_value(const value& v, operation& op);

#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
