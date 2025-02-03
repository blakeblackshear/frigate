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
#ifndef MIGRAPHX_GUARD_CONTEXT_HPP
#define MIGRAPHX_GUARD_CONTEXT_HPP

#include <cassert>
#include <string>
#include <functional>
#include <memory>
#include <type_traits>
#include <utility>
#include <migraphx/config.hpp>
#include <migraphx/value.hpp>
#include <migraphx/any_ptr.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

#ifdef DOXYGEN

/// A context is used to store internal data for a `target`. A context is
/// constructed by a target during compilation and passed to the operations
/// during `eval`.
struct context
{
    /// Wait for any tasks in the context to complete
    void finish() const;
};

#else

template <class T>
value to_value_context(const T&)
{
    return value{};
}

template <class T>
void from_value_context(T&, const value&)
{
}

template <class T>
any_ptr get_queue_context(T&)
{
    return {};
}

template <class T>
void wait_for_context(T&, any_ptr)
{
}

template <class T>
void finish_on_context(T&, any_ptr)
{
}

#ifdef TYPE_ERASED_DECLARATION

// Type-erased interface for:
struct MIGRAPHX_EXPORT context
{
    // (optional)
    value to_value() const;
    // (optional)
    void from_value(const value& v);
    // (optional)
    any_ptr get_queue();
    // (optional)
    void wait_for(any_ptr queue);
    // (optional)
    void finish_on(any_ptr queue);
    //
    void finish() const;
};

#else

struct context
{
    private:
    template <class T>
    static auto private_detail_te_default_to_value(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.to_value())
    {
        return private_detail_te_self.to_value();
    }

    template <class T>
    static value private_detail_te_default_to_value(float, T&& private_detail_te_self)
    {
        return to_value_context(private_detail_te_self);
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
        from_value_context(private_detail_te_self, v);
    }

    template <class T>
    static auto private_detail_te_default_get_queue(char, T&& private_detail_te_self)
        -> decltype(private_detail_te_self.get_queue())
    {
        return private_detail_te_self.get_queue();
    }

    template <class T>
    static any_ptr private_detail_te_default_get_queue(float, T&& private_detail_te_self)
    {
        return get_queue_context(private_detail_te_self);
    }

    template <class T>
    static auto private_detail_te_default_wait_for(char, T&& private_detail_te_self, any_ptr queue)
        -> decltype(private_detail_te_self.wait_for(queue))
    {
        private_detail_te_self.wait_for(queue);
    }

    template <class T>
    static void private_detail_te_default_wait_for(float, T&& private_detail_te_self, any_ptr queue)
    {
        wait_for_context(private_detail_te_self, queue);
    }

    template <class T>
    static auto private_detail_te_default_finish_on(char, T&& private_detail_te_self, any_ptr queue)
        -> decltype(private_detail_te_self.finish_on(queue))
    {
        private_detail_te_self.finish_on(queue);
    }

    template <class T>
    static void
    private_detail_te_default_finish_on(float, T&& private_detail_te_self, any_ptr queue)
    {
        finish_on_context(private_detail_te_self, queue);
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
        decltype(private_detail_te_default_to_value(char(0),
                                                    std::declval<PrivateDetailTypeErasedT>()),
                 private_detail_te_default_from_value(char(0),
                                                      std::declval<PrivateDetailTypeErasedT>(),
                                                      std::declval<const value&>()),
                 private_detail_te_default_get_queue(char(0),
                                                     std::declval<PrivateDetailTypeErasedT>()),
                 private_detail_te_default_wait_for(
                     char(0), std::declval<PrivateDetailTypeErasedT>(), std::declval<any_ptr>()),
                 private_detail_te_default_finish_on(
                     char(0), std::declval<PrivateDetailTypeErasedT>(), std::declval<any_ptr>()),
                 std::declval<PrivateDetailTypeErasedT>().finish(),
                 void());

    template <class PrivateDetailTypeErasedT>
    using private_te_constraints = private_te_constraints_impl<
        typename private_te_unwrap_reference<private_te_pure<PrivateDetailTypeErasedT>>::type>;

    public:
    // Constructors
    context() = default;

    template <typename PrivateDetailTypeErasedT,
              typename = private_te_constraints<PrivateDetailTypeErasedT>,
              typename = typename std::enable_if<
                  not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, context>{}>::type>
    context(PrivateDetailTypeErasedT&& value)
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
                  not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, context>{}>::type>
    context& operator=(PrivateDetailTypeErasedT&& value)
    {
        using std::swap;
        auto* derived = this->any_cast<private_te_pure<PrivateDetailTypeErasedT>>();
        if(derived and private_detail_te_handle_mem_var.use_count() == 1)
        {
            *derived = std::forward<PrivateDetailTypeErasedT>(value);
        }
        else
        {
            context rhs(value);
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

    any_ptr get_queue()
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().get_queue();
    }

    void wait_for(any_ptr queue)
    {
        assert((*this).private_detail_te_handle_mem_var);
        (*this).private_detail_te_get_handle().wait_for(queue);
    }

    void finish_on(any_ptr queue)
    {
        assert((*this).private_detail_te_handle_mem_var);
        (*this).private_detail_te_get_handle().finish_on(queue);
    }

    void finish() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        (*this).private_detail_te_get_handle().finish();
    }

    friend bool is_shared(const context& private_detail_x, const context& private_detail_y)
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

        virtual value to_value() const          = 0;
        virtual void from_value(const value& v) = 0;
        virtual any_ptr get_queue()             = 0;
        virtual void wait_for(any_ptr queue)    = 0;
        virtual void finish_on(any_ptr queue)   = 0;
        virtual void finish() const             = 0;
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

        value to_value() const override
        {

            return private_detail_te_default_to_value(char(0), private_detail_te_value);
        }

        void from_value(const value& v) override
        {

            private_detail_te_default_from_value(char(0), private_detail_te_value, v);
        }

        any_ptr get_queue() override
        {

            return private_detail_te_default_get_queue(char(0), private_detail_te_value);
        }

        void wait_for(any_ptr queue) override
        {

            private_detail_te_default_wait_for(char(0), private_detail_te_value, queue);
        }

        void finish_on(any_ptr queue) override
        {

            private_detail_te_default_finish_on(char(0), private_detail_te_value, queue);
        }

        void finish() const override { private_detail_te_value.finish(); }

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
inline const ValueType* any_cast(const context* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType* any_cast(context* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType& any_cast(context& x)
{
    auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}

template <typename ValueType>
inline const ValueType& any_cast(const context& x)
{
    const auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}
#endif

inline void migraphx_to_value(value& v, const context& ctx) { v = ctx.to_value(); }

inline void migraphx_from_value(const value& v, context& ctx) { ctx.from_value(v); }

#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
