/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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
#include "marker_roctx.hpp"

#include <migraphx/dynamic_loader.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/instruction_ref.hpp>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

class marker_roctx
{
    std::function<void(const char*)> sym_roctx_mark;
    std::function<uint64_t(const char*)> sym_roctx_range_start;
    std::function<void(uint64_t)> sym_roctx_range_stop;

    std::function<int(const char*)> sym_roctx_range_push;
    std::function<int()> sym_roctx_range_pop;

    uint64_t range_id = 0;

    public:
    marker_roctx()
    {
        dynamic_loader lib    = migraphx::dynamic_loader{"libroctx64.so"};
        sym_roctx_mark        = lib.get_function<void(const char*)>("roctxMarkA");
        sym_roctx_range_start = lib.get_function<uint64_t(const char*)>("roctxRangeStartA");
        sym_roctx_range_stop  = lib.get_function<void(uint64_t)>("roctxRangeStop");

        sym_roctx_range_push = lib.get_function<int(const char*)>("roctxRangePushA");
        sym_roctx_range_pop  = lib.get_function<int()>("roctxRangePop");

        sym_roctx_mark("rocTX marker created.");
    }

    void mark_start(instruction_ref ins_ref)
    {
        std::string text = "Marker start: " + ins_ref->name();
        sym_roctx_range_push(text.c_str());
    }
    void mark_stop(instruction_ref) { sym_roctx_range_pop(); }
    void mark_start(const program&) { range_id = sym_roctx_range_start("0"); }
    void mark_stop(const program&) { sym_roctx_range_stop(range_id); }
};

marker create_marker_roctx() { return marker_roctx(); }
} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx
