#ifndef MIGRAPHX_GUARD_MIGRAPHX_BIT_SIGNAL_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_BIT_SIGNAL_HPP

#include <migraphx/config.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/errors.hpp>
#include <bitset>
#include <cassert>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/// Observer pattern for keeping track of if something has changed or been
/// updated. Can have up to `N` different subscribers. Use by creating a
/// `bit_signal` and adding subscribers with `bit_signal.subscribe()`. Use
/// `bit_signal.notify()` to set that subscribers should be notified. Get the
/// status of the subscription by checking the `slot` returned by
/// `bit_signal.subscribe()`.
template <std::size_t N>
struct bit_signal
{
    std::bitset<N> slots;
    std::bitset<N> allocated;

    struct slot
    {
        bit_signal* handler = nullptr;
        std::size_t i       = N;

        slot() = default;

        slot(bit_signal* h, std::size_t x) : handler(h), i(x) {}

        slot(slot&& rhs) noexcept : handler(rhs.handler), i(rhs.i)
        {
            rhs.handler = nullptr;
            rhs.i       = N;
        }

        slot(const slot& rhs) : handler(rhs.handler), i(rhs.handler->allocate()) {}

        slot& operator=(slot rhs)
        {
            std::swap(handler, rhs.handler);
            std::swap(i, rhs.i);
            return *this;
        }

        ~slot() noexcept
        {
            if(valid())
                handler->deallocate(i);
        }

        bool valid() const { return i < N and handler != nullptr; }

        bool triggered() const
        {
            assert(valid());
            return handler->triggered(i);
        }

        operator bool() const { return triggered(); }
    };

    slot subscribe() { return {this, allocate()}; }

    std::size_t allocate()
    {
        auto i = *find_if(range(N), [&](auto x) { return not allocated[x]; });
        if(i == N)
            MIGRAPHX_THROW("Too many signals allocated");
        slots[i]     = false;
        allocated[i] = true;
        return i;
    }

    void deallocate(std::size_t i) { allocated[i] = false; }

    void notify() { slots.set(); }

    bool triggered(std::size_t i) const { return slots[i]; }

    void clear()
    {
        slots.reset();
        allocated.reset();
    }

    std::size_t nslots() const { return allocated.count(); }
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_BIT_SIGNAL_HPP
