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
#include <migraphx/env.hpp>
#include <migraphx/errors.hpp>
#include <migraphx/process.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/tmp_dir.hpp>
#include <migraphx/fileutils.hpp>
#include <algorithm>
#include <numeric>
#include <functional>
#include <iostream>

#ifdef _WIN32
// cppcheck-suppress definePrefix
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <cstring>
#include <sstream>
#include <optional>
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_CMD_EXECUTE)

#ifndef _WIN32

std::function<void(const char*)> redirect_to(std::ostream& os)
{
    return [&](const char* x) { os << x; };
}

template <class F>
int exec(const std::string& cmd, const char* type, F f)
{
    int ec = 0;
    if(enabled(MIGRAPHX_TRACE_CMD_EXECUTE{}))
        std::cout << cmd << std::endl;
    auto closer = [&](FILE* stream) {
        auto status = pclose(stream);
        ec          = WIFEXITED(status) ? WEXITSTATUS(status) : 0; // NOLINT
    };
    {
        // TODO: Use execve instead of popen
        std::unique_ptr<FILE, decltype(closer)> pipe(popen(cmd.c_str(), type), closer); // NOLINT
        if(not pipe)
            MIGRAPHX_THROW("popen() failed: " + cmd);
        f(pipe.get());
    }
    return ec;
}

int exec(const std::string& cmd, const std::function<void(const char*)>& std_out)
{
    return exec(cmd, "r", [&](FILE* f) {
        std::array<char, 128> buffer;
        while(fgets(buffer.data(), buffer.size(), f) != nullptr)
            std_out(buffer.data());
    });
}

int exec(const std::string& cmd, std::function<void(process::writer)> std_in)
{
    return exec(cmd, "w", [&](FILE* f) {
        std_in([&](const char* buffer, std::size_t n) { std::fwrite(buffer, 1, n, f); });
    });
}

#else

constexpr std::size_t MIGRAPHX_PROCESS_BUFSIZE = 4096;

enum class direction
{
    input,
    output
};

template <direction dir>
class pipe
{
    public:
    explicit pipe()
    {
        SECURITY_ATTRIBUTES attrs;
        attrs.nLength              = sizeof(SECURITY_ATTRIBUTES);
        attrs.bInheritHandle       = TRUE;
        attrs.lpSecurityDescriptor = nullptr;

        if(CreatePipe(&m_read, &m_write, &attrs, 0) == FALSE)
            throw GetLastError();

        if(dir == direction::output)
        {
            // Do not inherit the read handle for the output pipe
            if(SetHandleInformation(m_read, HANDLE_FLAG_INHERIT, 0) == 0)
                throw GetLastError();
        }
        else
        {
            // Do not inherit the write handle for the input pipe
            if(SetHandleInformation(m_write, HANDLE_FLAG_INHERIT, 0) == 0)
                throw GetLastError();
        }
    }

    pipe(const pipe&)            = delete;
    pipe& operator=(const pipe&) = delete;

    pipe(pipe&&) = default;

    ~pipe()
    {
        if(m_write != nullptr)
        {
            CloseHandle(m_write);
        }
        if(m_read != nullptr)
        {
            CloseHandle(m_read);
        }
    }

    bool close_write_handle()
    {
        auto result = true;
        if(m_write != nullptr)
        {
            result  = CloseHandle(m_write) == TRUE;
            m_write = nullptr;
        }
        return result;
    }

    bool close_read_handle()
    {
        auto result = true;
        if(m_read != nullptr)
        {
            result = CloseHandle(m_read) == TRUE;
            m_read = nullptr;
        }
        return result;
    }

    std::pair<bool, DWORD> read(LPVOID buffer, DWORD length) const
    {
        DWORD bytes_read;
        if(ReadFile(m_read, buffer, length, &bytes_read, nullptr) == FALSE and
           GetLastError() == ERROR_MORE_DATA)
        {
            return {true, bytes_read};
        }
        return {false, bytes_read};
    }

    HANDLE get_read_handle() const { return m_read; }

    bool write(LPCVOID buffer, DWORD length) const
    {
        DWORD bytes_written;
        return WriteFile(m_write, buffer, length, &bytes_written, nullptr) == TRUE;
    }

    HANDLE get_write_handle() const { return m_write; }

    private:
    HANDLE m_write = nullptr, m_read = nullptr;
};

// clang-format off
template <typename F>
int exec(const std::string& cmd, const std::string& cwd, const std::string& args,
         const std::string& envs, F f)
// clang-format on
{
    if(enabled(MIGRAPHX_TRACE_CMD_EXECUTE{}))
    {
        std::cout << "[cwd=" << cwd << "];  cmd='" << cmd << "\'; args='" << args << "'; envs='"
                  << envs << "'\n";
    }

    // See CreateProcess() WIN32 documentation for details.
    constexpr std::size_t CMDLINE_LENGTH = 32767;

    // Build lpCommandLine parameter.
    std::string cmdline = quote_string(cmd);
    if(not args.empty())
        cmdline += " " + args;

    // clang-format off
    if(cmdline.size() > CMDLINE_LENGTH)
        MIGRAPHX_THROW("Command line too long, required maximum " +
                       std::to_string(CMDLINE_LENGTH) + " characters.");
    // clang-format on

    if(cmdline.size() < CMDLINE_LENGTH)
        cmdline.resize(CMDLINE_LENGTH, '\0');

    // Build lpEnvironment parameter.
    std::vector<TCHAR> environment{};
    if(not envs.empty())
    {
        std::istringstream iss{envs};
        std::string str;
        while(iss >> str)
        {
            environment.insert(environment.end(), str.begin(), str.end());
            environment.push_back('\0');
        }
        environment.push_back('\0');
    }

    try
    {
        STARTUPINFO info;
        PROCESS_INFORMATION process_info;

        pipe<direction::input> input{};
        pipe<direction::output> output{};

        ZeroMemory(&info, sizeof(STARTUPINFO));
        info.cb         = sizeof(STARTUPINFO);
        info.hStdError  = output.get_write_handle();
        info.hStdOutput = output.get_write_handle();
        info.hStdInput  = input.get_read_handle();
        info.dwFlags |= STARTF_USESTDHANDLES;

        ZeroMemory(&process_info, sizeof(process_info));

        if(CreateProcess(cmd.c_str(),
                         cmdline.data(),
                         nullptr,
                         nullptr,
                         TRUE,
                         0,
                         environment.empty() ? nullptr : environment.data(),
                         cwd.empty() ? nullptr : static_cast<LPCSTR>(cwd.c_str()),
                         &info,
                         &process_info) == FALSE)
        {
            MIGRAPHX_THROW("Error creating process (" + std::to_string(GetLastError()) + ")");
        }

        CloseHandle(process_info.hThread);

        if(not output.close_write_handle())
            MIGRAPHX_THROW("Error closing STDOUT handle for writing (" +
                           std::to_string(GetLastError()) + ")");

        if(not input.close_read_handle())
            MIGRAPHX_THROW("Error closing STDIN handle for reading (" +
                           std::to_string(GetLastError()) + ")");

        f(input, output);

        if(not input.close_write_handle())
            MIGRAPHX_THROW("Error closing STDIN handle for writing (" +
                           std::to_string(GetLastError()) + ")");

        WaitForSingleObject(process_info.hProcess, INFINITE);

        DWORD status{};
        GetExitCodeProcess(process_info.hProcess, &status);

        CloseHandle(process_info.hProcess);

        return static_cast<int>(status);
    }
    // cppcheck-suppress catchExceptionByValue
    catch(DWORD error)
    {
        MIGRAPHX_THROW("Error spawning process (" + std::to_string(error) + ")");
    }
}

// clang-format off
int exec(const std::string& cmd, const std::string& cwd, const std::string& args,
         const std::string& envs, HANDLE std_out)
{
    TCHAR buffer[MIGRAPHX_PROCESS_BUFSIZE];
    return (std_out == nullptr or std_out == INVALID_HANDLE_VALUE)
               ? GetLastError() : exec(cmd, cwd, args, envs,
                    [&](const pipe<direction::input>&, const pipe<direction::output>& out) {
                         for(;;)
                         {
                             auto [more_data, bytes_read] = out.read(buffer, MIGRAPHX_PROCESS_BUFSIZE);
                             if(bytes_read == 0)
                                 break;
                             if(WriteFile(std_out, buffer, bytes_read, nullptr, nullptr) == FALSE)
                                 break;
                             if(not more_data)
                                 break;
                         }
                    });
}

int exec(const std::string& cmd, const std::string& cwd, const std::string& args,
         const std::string& envs, std::function<void(process::writer)> std_in)
{
    return exec(cmd, cwd, args, envs,
        [&](const pipe<direction::input>& input, const pipe<direction::output>&) {
            std_in([&](const char* buffer, std::size_t n) { input.write(buffer, n); });
        });
}
// clang-format on

#endif

struct process_impl
{
    std::string args{};
    std::string envs{};
    std::string command{};
    fs::path cwd{};

    std::string get_command() const
    {
        std::string result;
        if(not cwd.empty())
            result += "cd " + cwd.string() + "; ";
        if(not envs.empty())
            result += envs + " ";
        result += command;
        if(not args.empty())
            result += " " + args;
        return result;
    }

    template <class... Ts>
    void check_exec(Ts&&... xs) const
    {
        int ec = migraphx::exec(std::forward<Ts>(xs)...);
        if(ec != 0)
            MIGRAPHX_THROW("Command " + get_command() + " exited with status " +
                           std::to_string(ec));
    }
};

process::process(const std::string& cmd, const std::vector<std::string>& args)
    : impl(std::make_unique<process_impl>())
{
    impl->command = cmd;
    if(not args.empty())
        impl->args = join_strings(args, " ");
}

process::process(process&&) noexcept = default;

process& process::operator=(process rhs)
{
    std::swap(impl, rhs.impl);
    return *this;
}

process::~process() noexcept = default;

process& process::cwd(const fs::path& p)
{
    impl->cwd = p;
    return *this;
}

process& process::env(const std::vector<std::string>& envs)
{
    if(not envs.empty())
    {
        impl->envs = join_strings(envs, " ");
    }
    return *this;
}

void process::read(const writer& output) const
{
#ifdef _WIN32
    // clang-format off
    constexpr std::string_view filename = "stdout";
    auto tmp = tmp_dir{};
    HANDLE handle = CreateFile((tmp.path / filename).string().c_str(),
                               GENERIC_READ | GENERIC_WRITE,
                               0,
                               nullptr,
                               CREATE_ALWAYS,
                               FILE_ATTRIBUTE_NORMAL,
                               nullptr);
    impl->check_exec(impl->command, impl->cwd.string(), impl->args, impl->envs,
                     handle == nullptr or handle == INVALID_HANDLE_VALUE ?
                                     GetStdHandle(STD_OUTPUT_HANDLE) : handle);
    CloseHandle(handle);
    handle = CreateFile((tmp.path / filename).string().c_str(),
                        GENERIC_READ | GENERIC_WRITE,
                        0,
                        nullptr,
                        OPEN_EXISTING,
                        FILE_ATTRIBUTE_NORMAL,
                        nullptr);
    if(handle == nullptr or handle == INVALID_HANDLE_VALUE)
        MIGRAPHX_THROW("Unable to open file: " + (tmp.path / filename));
    auto size = GetFileSize(handle, nullptr);
    std::string result(size, '\0');
    if(ReadFile(handle, result.data(), size, nullptr, nullptr) == FALSE)
        MIGRAPHX_THROW("Failed reading file: " + (tmp.path / filename));
    CloseHandle(handle);
    // clang-format on
#else
    std::stringstream ss;
    impl->check_exec(impl->get_command(), redirect_to(ss));
    auto result = ss.str();
#endif
    output(result.data(), result.size());
}

void process::exec()
{
#ifndef _WIN32
    impl->check_exec(impl->get_command(), redirect_to(std::cout));
#else
    // clang-format off
    impl->check_exec(impl->command, impl->cwd.string(), impl->args, impl->envs,
                     GetStdHandle(STD_OUTPUT_HANDLE));
    // clang-format on
#endif
}

void process::write(std::function<void(writer)> pipe_in)
{
#ifndef _WIN32
    impl->check_exec(impl->get_command(), std::move(pipe_in));
#else
    // clang-format off
    impl->check_exec(impl->command, impl->cwd.string(),
                     impl->args, impl->envs, std::move(pipe_in));
    // clang-format on
#endif
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
