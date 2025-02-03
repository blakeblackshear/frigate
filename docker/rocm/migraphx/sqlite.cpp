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

#include <migraphx/sqlite.hpp>
#include <migraphx/manage_ptr.hpp>
#include <migraphx/errors.hpp>
#include <sqlite3.h>
#include <algorithm>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

using sqlite3_ptr = MIGRAPHX_MANAGE_PTR(sqlite3*, sqlite3_close);

struct sqlite_impl
{
    sqlite3* get() const { return ptr.get(); }
    void open(const fs::path& p, int flags)
    {
        sqlite3* ptr_tmp = nullptr;
        int rc           = sqlite3_open_v2(p.string().c_str(), &ptr_tmp, flags, nullptr);
        ptr              = sqlite3_ptr{ptr_tmp};
        if(rc != 0)
            MIGRAPHX_THROW("error opening " + p.string() + ": " + error_message());
    }

    template <class F>
    void exec(const char* sql, F f)
    {
        // cppcheck-suppress constParameterPointer
        auto callback = [](void* obj, auto... xs) -> int {
            try
            {
                const auto* g = static_cast<const F*>(obj);
                (*g)(xs...);
                return 0;
            }
            catch(...)
            {
                return -1;
            }
        };
        int rc = sqlite3_exec(get(), sql, callback, &f, nullptr);
        if(rc != 0)
            MIGRAPHX_THROW(error_message());
    }

    std::string error_message() const
    {
        std::string msg = "sqlite3: ";
        return msg + sqlite3_errmsg(get());
    }
    sqlite3_ptr ptr;
};

sqlite sqlite::read(const fs::path& p)
{
    sqlite r;
    r.impl = std::make_shared<sqlite_impl>();
    r.impl->open(p, SQLITE_OPEN_READONLY);
    return r;
}

sqlite sqlite::write(const fs::path& p)
{
    sqlite r;
    r.impl = std::make_shared<sqlite_impl>();
    // Using '+' instead of bitwise '|' to avoid compilation warning
    r.impl->open(p, SQLITE_OPEN_READWRITE + SQLITE_OPEN_CREATE);
    return r;
}

std::vector<std::unordered_map<std::string, std::string>> sqlite::execute(const std::string& s)
{
    std::vector<std::unordered_map<std::string, std::string>> result;
    impl->exec(s.c_str(), [&](int n, char** texts, char** names) {
        std::unordered_map<std::string, std::string> row;
        row.reserve(n);
        std::transform(
            names,
            names + n,
            texts,
            std::inserter(row, row.begin()),
            [&](const char* name, const char* text) { return std::make_pair(name, text); });
        result.push_back(row);
    });
    return result;
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
