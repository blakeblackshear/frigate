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
#ifndef MIGRAPHX_GUARD_ALLOCATION_MODEL_HPP
#define MIGRAPHX_GUARD_ALLOCATION_MODEL_HPP

#include <cassert>
#include <string>
#include <functional>
#include <memory>
#include <type_traits>
#include <utility>

#include <migraphx/config.hpp>
#include <migraphx/operation.hpp>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

#ifdef DOXYGEN

/// An interface for target-dependent allocation
struct allocation_model
{
    /// A name of the target-dependent allocate operator
    std::string name() const;
    /// A name of the target-dependent copy operator
    std::string copy() const;
    /// Create an allocation operator for the given shape
    operation allocate(const shape& s) const;
    /// Create a preallocated operator for the given shape
    operation preallocate(const shape& s, const std::string& id) const;
    /// Check if outputs are to be inserted
    bool needs_out_params() const;
};

#else

#ifdef TYPE_ERASED_DECLARATION

// Type-erased interface for:
struct MIGRAPHX_EXPORT allocation_model
{
    //
    std::string name() const;
    //
    std::string copy() const;
    //
    operation allocate(const shape& s) const;
    //
    operation preallocate(const shape& s, std::string id) const;
    //
    bool needs_out_params() const;
};

#else

struct allocation_model
{
    private:
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
                 std::declval<PrivateDetailTypeErasedT>().copy(),
                 std::declval<PrivateDetailTypeErasedT>().allocate(std::declval<const shape&>()),
                 std::declval<PrivateDetailTypeErasedT>().preallocate(std::declval<const shape&>(),
                                                                      std::declval<std::string>()),
                 std::declval<PrivateDetailTypeErasedT>().needs_out_params(),
                 void());

    template <class PrivateDetailTypeErasedT>
    using private_te_constraints = private_te_constraints_impl<
        typename private_te_unwrap_reference<private_te_pure<PrivateDetailTypeErasedT>>::type>;

    public:
    // Constructors
    allocation_model() = default;

    template <
        typename PrivateDetailTypeErasedT,
        typename = private_te_constraints<PrivateDetailTypeErasedT>,
        typename = typename std::enable_if<
            not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, allocation_model>{}>::type>
    allocation_model(PrivateDetailTypeErasedT&& value)
        : private_detail_te_handle_mem_var(
              std::make_shared<
                  private_detail_te_handle_type<private_te_pure<PrivateDetailTypeErasedT>>>(
                  std::forward<PrivateDetailTypeErasedT>(value)))
    {
    }

    // Assignment
    template <
        typename PrivateDetailTypeErasedT,
        typename = private_te_constraints<PrivateDetailTypeErasedT>,
        typename = typename std::enable_if<
            not std::is_same<private_te_pure<PrivateDetailTypeErasedT>, allocation_model>{}>::type>
    allocation_model& operator=(PrivateDetailTypeErasedT&& value)
    {
        using std::swap;
        auto* derived = this->any_cast<private_te_pure<PrivateDetailTypeErasedT>>();
        if(derived and private_detail_te_handle_mem_var.use_count() == 1)
        {
            *derived = std::forward<PrivateDetailTypeErasedT>(value);
        }
        else
        {
            allocation_model rhs(value);
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

    std::string copy() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().copy();
    }

    operation allocate(const shape& s) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().allocate(s);
    }

    operation preallocate(const shape& s, std::string id) const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().preallocate(s, std::move(id));
    }

    bool needs_out_params() const
    {
        assert((*this).private_detail_te_handle_mem_var);
        return (*this).private_detail_te_get_handle().needs_out_params();
    }

    friend bool is_shared(const allocation_model& private_detail_x,
                          const allocation_model& private_detail_y)
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

        virtual std::string name() const                                    = 0;
        virtual std::string copy() const                                    = 0;
        virtual operation allocate(const shape& s) const                    = 0;
        virtual operation preallocate(const shape& s, std::string id) const = 0;
        virtual bool needs_out_params() const                               = 0;
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

        std::string copy() const override { return private_detail_te_value.copy(); }

        operation allocate(const shape& s) const override
        {

            return private_detail_te_value.allocate(s);
        }

        operation preallocate(const shape& s, std::string id) const override
        {

            return private_detail_te_value.preallocate(s, std::move(id));
        }

        bool needs_out_params() const override
        {

            return private_detail_te_value.needs_out_params();
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
inline const ValueType* any_cast(const allocation_model* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType* any_cast(allocation_model* x)
{
    return x->any_cast<ValueType>();
}

template <typename ValueType>
inline ValueType& any_cast(allocation_model& x)
{
    auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}

template <typename ValueType>
inline const ValueType& any_cast(const allocation_model& x)
{
    const auto* y = x.any_cast<typename std::remove_reference<ValueType>::type>();
    if(y == nullptr)
        throw std::bad_cast();
    return *y;
}
#endif

#endif

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
