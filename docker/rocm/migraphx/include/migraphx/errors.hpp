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
#ifndef MIGRAPHX_GUARD_ERRORS_HPP
#define MIGRAPHX_GUARD_ERRORS_HPP

#include <exception>
#include <stdexcept>
#include <string>
#include <migraphx/config.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

/// Represents exceptions that can be thrown by migraphxlib
struct exception : std::runtime_error
{
    unsigned int error;
    exception(unsigned int e = 0, const std::string& msg = "") : std::runtime_error(msg), error(e)
    {
    }
};

/**
 * @brief Create an exception object
 *
 * @param context A message that says where the exception occurred
 * @param message Custom message for the error
 * @return Exceptions
 */
inline exception make_exception(const std::string& context, const std::string& message = "")
{
    return {0, context + ": " + message};
}

inline exception
make_exception(const std::string& context, unsigned int e, const std::string& message = "")
{
    return {e, context + ": " + message};
}

/**
 * @brief Create a message of a file location
 *
 * @param file The filename
 * @param line The line number
 *
 * @return A string that represents the file location
 */
inline std::string make_source_context(const std::string& file, int line, const std::string& fname)
{
    return file + ":" + std::to_string(line) + ": " + fname;
}

// NOLINTNEXTLINE
#define MIGRAPHX_MAKE_SOURCE_CTX() migraphx::make_source_context(__FILE__, __LINE__, __func__)

/**
 * @brief Throw an exception with context information
 */
#define MIGRAPHX_THROW(...) throw migraphx::make_exception(MIGRAPHX_MAKE_SOURCE_CTX(), __VA_ARGS__)

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif
