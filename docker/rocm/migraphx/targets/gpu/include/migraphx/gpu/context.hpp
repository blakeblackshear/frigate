/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_RTGLIB_CONTEXT_HPP
#define MIGRAPHX_GUARD_RTGLIB_CONTEXT_HPP

#include <migraphx/gpu/export.h>
#include <migraphx/context.hpp>
#include <migraphx/gpu/miopen.hpp>
#if !MIGRAPHX_USE_MIOPEN
#include <hip/hip_runtime.h>
#include <hip/hip_runtime_api.h>
#include <migraphx/manage_ptr.hpp>
#endif
#include <migraphx/gpu/rocblas.hpp>
#include <migraphx/gpu/hipblaslt.hpp>
#include <migraphx/gpu/hip.hpp>
#include <migraphx/env.hpp>
#include <migraphx/config.hpp>
#include <migraphx/gpu/device_name.hpp>
#include <migraphx/gpu/problem_cache.hpp>
#include <unordered_map>
#include <memory>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_NULL_STREAM)
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_NSTREAMS)

using hip_event_ptr = MIGRAPHX_MANAGE_PTR(hipEvent_t, hipEventDestroy);

struct hip_device
{
    hip_device() : device_props{} { add_stream(); }

    hip_device(std::size_t id, std::size_t n) : device_id(id)
    {
        auto status = hipGetDeviceProperties(&device_props, device_id);
        if(status != hipSuccess)
            MIGRAPHX_THROW("Failed to allocate stream");

        for(std::size_t i = 0; i < n; i++)
            add_stream();
    }

    struct stream
    {
        using hip_stream_ptr = MIGRAPHX_MANAGE_PTR(hipStream_t, hipStreamDestroy);

        stream() {}

        stream(std::size_t device_number) : id(device_number) {}

        void setup() const { set_device(id); }

        static hip_stream_ptr create_stream()
        {
            hipStream_t result = nullptr;
            auto status        = hipStreamCreateWithFlags(&result, hipStreamNonBlocking);
            if(status != hipSuccess)
                MIGRAPHX_THROW("Failed to allocate stream");
            return hip_stream_ptr{result};
        }

        hipStream_t get()
        {
            if(not enabled(MIGRAPHX_ENABLE_NULL_STREAM{}))
            {
                setup();
                if(s == nullptr)
                    s = create_stream();
                assert(s.get() != nullptr);
                return s.get();
            }
            return nullptr;
        }

#if MIGRAPHX_USE_MIOPEN
        auto create_miopen_handle()
        {
            if(not enabled(MIGRAPHX_ENABLE_NULL_STREAM{}))
                return make_obj<miopen_handle>(&miopenCreateWithStream, get());
            else
                return make_obj<miopen_handle>(&miopenCreate);
        }

        auto get_miopen()
        {
            setup();
            if(mihandle == nullptr)
                mihandle = create_miopen_handle();
            assert(mihandle.get() != nullptr);
            return mihandle.get();
        }
#endif

#if MIGRAPHX_USE_ROCBLAS
        auto get_rocblas()
        {
            setup();
            if(rbhandle == nullptr)
                rbhandle = create_rocblas_handle_ptr(get());
            assert(rbhandle.get() != nullptr);
            return rbhandle.get();
        }
#endif

#if MIGRAPHX_USE_HIPBLASLT
        auto get_hipblaslt()
        {
            setup();
            if(hblthandle == nullptr)
            {
                hblthandle = create_hipblaslt_handle_ptr();
            }
            assert(hblthandle.get() != nullptr);
            return hblthandle.get();
        }
#endif

        void wait() const
        {
            if(s == nullptr)
                return;
            setup();
            auto status = hipStreamSynchronize(s.get());
            if(status != hipSuccess)
                MIGRAPHX_THROW("Failed to wait.");
        }

        void wait(hipEvent_t event)
        {
            setup();
            auto status = hipStreamWaitEvent(get(), event, 0);
            if(status != hipSuccess)
                MIGRAPHX_THROW("Failed to wait.");
        }

        void record(hipEvent_t event)
        {
            setup();
            auto status = hipEventRecord(event, get());
            if(status != hipSuccess)
                MIGRAPHX_THROW("Failed to record.");
        }

        private:
        std::size_t id           = 0;
        shared<hip_stream_ptr> s = nullptr;
#if MIGRAPHX_USE_MIOPEN
        shared<miopen_handle> mihandle = nullptr;
#endif
#if MIGRAPHX_USE_ROCBLAS
        shared<rocblas_handle_ptr> rbhandle = nullptr;
#endif

#if MIGRAPHX_USE_HIPBLASLT
        shared<hipblaslt_handle_ptr> hblthandle = nullptr;
#endif
    };

    void add_stream() { streams.emplace_back(device_id); }

    stream& get_stream() { return streams.at(current_stream); }

    stream& get_stream(std::size_t n) { return streams.at(n); }

    const stream& get_stream() const { return streams.at(current_stream); }

    const stream& get_stream(std::size_t n) const { return streams.at(n); }

    void set_stream(std::size_t n) { current_stream = n; }

    std::size_t nstreams() const { return streams.size(); }

    std::size_t stream_id() const { return current_stream; }

    std::string get_device_name() const { return device_props.gcnArchName; }

    std::string get_gfx_name() const { return trim(split_string(get_device_name(), ':').front()); }

    std::size_t get_device_major() const { return device_props.major; }

    std::size_t get_device_minor() const { return device_props.minor; }

    std::size_t get_cu_count() const { return device_props.multiProcessorCount; }

    std::size_t get_max_workitems_per_cu() const
    {
        return device_props.maxThreadsPerMultiProcessor;
    }

    std::size_t get_max_workitems_per_block() const { return device_props.maxThreadsPerBlock; }

    std::size_t get_wavefront_size() const { return device_props.warpSize; }

    private:
    std::size_t device_id      = 0;
    std::size_t current_stream = 0;
    std::vector<stream> streams;
    hipDeviceProp_t device_props;

    public:
    std::unordered_map<std::string, argument> preallocations{};
};

struct context
{
    struct auto_save_problem_cache : problem_cache
    {
        auto_save_problem_cache() : problem_cache{} {}

        bool auto_save = false;

        auto_save_problem_cache(const auto_save_problem_cache&)            = delete;
        auto_save_problem_cache& operator=(const auto_save_problem_cache&) = delete;
        virtual ~auto_save_problem_cache()
        {
            if(auto_save)
                this->save();
        }
    };
    context(std::size_t device_id = 0, std::size_t n = value_of(MIGRAPHX_NSTREAMS{}, 1))
        : current_device(std::make_shared<hip_device>(device_id, n)),
          begin_event(create_event()),
          finish_event(create_event()),
          pc(std::make_shared<auto_save_problem_cache>())
    {
    }

    hip_device& get_current_device()
    {
        assert(current_device != nullptr);
        return *current_device;
    }

    const hip_device& get_current_device() const
    {
        assert(current_device != nullptr);
        return *current_device;
    }

    bool get_exhaustive_tune_flag() const { return exhaustive_tune; }

    void set_exhaustive_tune_flag(bool t) { exhaustive_tune = t; }

    hip_device::stream& get_stream() { return get_current_device().get_stream(); }
    hip_device::stream& get_stream(std::size_t n) { return get_current_device().get_stream(n); }

    const hip_device::stream& get_stream() const { return get_current_device().get_stream(); }
    const hip_device::stream& get_stream(std::size_t n) const
    {
        return get_current_device().get_stream(n);
    }

    void set_stream(std::size_t n) { get_current_device().set_stream(n); }

    void create_events(std::size_t num_of_events)
    {
        for(std::size_t i = events.size(); i < num_of_events + 1; ++i)
            events.emplace_back(create_event());
    }

    hipEvent_t get_event(std::size_t i) const { return events.at(i).get(); }

    std::vector<argument> literals{};
    void finish() const { get_stream().wait(); }

    static hip_event_ptr create_event()
    {
        hipEvent_t event;
        auto status = hipEventCreateWithFlags(&event, hipEventDisableTiming);
        if(status != hipSuccess)
            MIGRAPHX_THROW("Failed to create event");
        return hip_event_ptr{event};
    }

    static hip_event_ptr create_event_for_timing()
    {
        hipEvent_t event;
        auto status = hipEventCreate(&event);
        if(status != hipSuccess)
            MIGRAPHX_THROW("Failed to create event");
        return hip_event_ptr{event};
    }

    value to_value() const
    {
        value result;
        result["events"]  = events.size();
        result["streams"] = current_device->nstreams();

        return result;
    }

    void from_value(const value& v)
    {
        auto v_events        = v.at("events");
        std::size_t n_events = v_events.without_key().to<std::size_t>();
        this->create_events(n_events - 1);

        auto v_streams        = v.at("streams");
        std::size_t n_streams = v_streams.without_key().to<std::size_t>();

        auto device          = get_device_id();
        this->current_device = std::make_shared<hip_device>(device, n_streams);
    }

    void wait_for(any_ptr queue)
    {
        auto status = hipEventRecord(begin_event.get(), queue.get<hipStream_t>());
        if(status != hipSuccess)
            MIGRAPHX_THROW("failed to record " + hip_error(status));

        get_stream().wait(begin_event.get());
    }

    void finish_on(any_ptr queue)
    {
        get_stream().record(finish_event.get());

        auto status = hipStreamWaitEvent(queue.get<hipStream_t>(), finish_event.get(), 0);
        if(status != hipSuccess)
            MIGRAPHX_THROW("Failed to wait on event " + hip_error(status));
    }

    any_ptr get_queue() { return get_stream().get(); }

    std::pair<hipEvent_t, hipEvent_t> get_perf_events() const
    {
        if(measure_perf)
            return std::make_pair(start_event.get(), stop_event.get());
        return std::make_pair(nullptr, nullptr);
    }

    static float get_elapsed_ms(hipEvent_t start, hipEvent_t stop)
    {
        float result = 0;
        if(start != nullptr and stop != nullptr)
        {
            auto status = hipEventElapsedTime(&result, start, stop);
            if(status != hipSuccess)
                MIGRAPHX_THROW("Failed hipEventElapsedTime: " + hip_error(status));
        }
        return result;
    }

    problem_cache& get_problem_cache() { return *pc; }
    void load_problem_cache()
    {
        pc->load();
        pc->auto_save = true;
    }

    private:
    // TODO: Make this a vector to support multiple devices
    std::shared_ptr<hip_device> current_device;
    std::vector<shared<hip_event_ptr>> events;
    bool exhaustive_tune = false;
    bool measure_perf    = false;
    // for event perf timing
    shared<hip_event_ptr> start_event = nullptr;
    shared<hip_event_ptr> stop_event  = nullptr;
    // for stream syncronization
    shared<hip_event_ptr> begin_event  = nullptr;
    shared<hip_event_ptr> finish_event = nullptr;
    std::shared_ptr<auto_save_problem_cache> pc = nullptr;
};

inline void migraphx_to_value(value& v, const context& ctx) { v = ctx.to_value(); }
inline void migraphx_from_value(const value& v, context& ctx) { ctx.from_value(v); }

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
