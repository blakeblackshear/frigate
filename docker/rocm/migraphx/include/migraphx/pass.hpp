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
#ifndef MIGRAPHX_GUARD_PASS_HPP
#define MIGRAPHX_GUARD_PASS_HPP

#include <cassert>
#include <string>
#include <memory>
#include <type_traits>
#include <utility>
#include <migraphx/functional.hpp>
#include <migraphx/config.hpp>
#include <migraphx/rank.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct program;
struct module;
struct module_pass_manager;

#ifdef DOXYGEN

/// An interface for applying a transformation to the instructions in a
/// `program`
struct pass
{
    /// A unique name used to identify the pass
    std::string name() const;
    /// Run the pass on the module
    void apply(module_pass_manager& mpm) const;
    void apply(module& m) const;
    /// Run the pass on the program
    void apply(program& p) const;
};

#else

MIGRAPHX_EXPORT module& get_module(module_pass_manager& mpm);

namespace detail {

template <class T>
auto module_pass_manager_apply(rank<1>,
                               const T& x,
                               module_pass_manager& mpm) -> decltype(x.apply(get_module(mpm)))
{
    return x.apply(get_module(mpm));
}

template <class T>
void module_pass_manager_apply(rank<0>, const T&, module_pass_manager&)
{
}

template <class T>
void module_pass_manager_apply(const T& x, module_pass_manager& mpm)
{
    module_pass_manager_apply(rank<1>{}, x, mpm);
}

} // namespace detail

#ifdef TYPE_ERASED_DECLARATION

// Type-erased interface for:
struct MIGRAPHX_EXPORT pass
{
    //
    std::string name() const;
    // (optional)
    void apply(module_pass_manager& mpm) const;
    // (optional)
    void apply(program& p) const;
};

#else

struct pass
{
    private:
    template <class T>
    static auto
    private_detail_te_default_apply(char, T&& private_detail_te_self, module_pass_manager& mpm)
        -> decltype(private_detail_te_self.apply(mpm))
    {
        private_detail_te_self.apply(mpm);
    }

    template <class T>
    static void
    private_detail_te_default_apply(float, T&& private_detail_te_self, module_pass_manager& mpm)
    {
        migraphx::detail::module_pass_manager_apply(private_detail_te_self, mpm);
    }

    template <class T>
    static auto private_detail_te_default_apply(char, T&& private_detail_te_self, program& p)
        -> decltype(private_detail_te_self.apply(p))
    {
        private_detail_te_self.apply(p);
    }

    template <class T>
    static void private_detail_te_default_apply(float, T&& private_detail_te_self, program& p)
    {
        migraphx::nop(private_detail_te_self, p);
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
                 private_detail_te_default_apply(char(0),
                                                 std::declval<PrivateDetailTypeErasedT>(),
                                                 std::declval<module_pass_manager&>()),
                 private_detail_te_default_apply(
                     char(0), std::declval<PrivateDetailTypeErasedT>(), std::declval<program&>()),
                 void());

    template <class PrivateDetailTypeErasedT>
    using private_te_constraints = private_te_constraints_impl<
        typename private_te_unwrap_reference<private_te_pure<PrivateDetailTypeErasedT>>::type>;

    public:
    // Constructors
    pass() = default;

    template <typename PrivateDetailTypeErasedT,
              typename = private_te_constraints<PrivateDetailTypeErasedT>,
              typename = typename std::enable_if<
                  not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, pass>{}>::type>
    pass(PrivateDetailTypeErasedT&& value)
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
                  not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, pass>{}>::type>
    pass& operator=(PrivateDetailTypeErasedT&& value)
    {
        using std::swap;
        auto* derived = this->any_cast<private_te_pure<PrivateDetailTypeErasedT>>();
        if(derived and private_detail_te_handle_mem_var.use_count() == 1)
        {
            *derived = std::forward<PrivateDetailTypeErasedT>(value);
        }
        else
        {
            pass rhs(value);
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

    void apply(module_pass_manager& mpm) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        (*this).private_detail_te_get_handle().apply(mpm);
    }

    void apply(program& p) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        (*this).private_detail_te_get_handle().apply(p);
    }

    friend bool is_shared(const pass& private_detail_x, const pass& private_detail_y)
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

        virtual std::string name() const                   = 0;
        virtual void apply(module_pass_manager& mpm) const = 0;
        virtual void apply(program& p) const               = 0;
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

        void apply(module_pass_manager& mpm) const override
        {

            private_detail_te_default_apply(char(0), private_detail_te_value, mpm);
        }

        void apply(program& p) const override
        {

            private_detail_te_default_apply(char(0), private_detail_te_value, p);
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
inline const ValueType* any_cast(const pass* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType* any_cast(pass* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType& any_cast(pass& x)
{
    auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}

template <typename ValueType>
inline const ValueType& any_cast(const pass& x)
{
    const auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}
#endif

/// Used in the targets to enable/disable compiler passes
MIGRAPHX_EXPORT pass enable_pass(bool enabled, pass p);

#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
