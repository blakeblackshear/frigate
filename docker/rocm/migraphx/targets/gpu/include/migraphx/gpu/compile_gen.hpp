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
#ifndef MIGRAPHX_GUARD_GPU_COMPILE_GEN_HPP
#define MIGRAPHX_GUARD_GPU_COMPILE_GEN_HPP

#include <migraphx/config.hpp>
#include <migraphx/module_ref.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/gpu/export.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct shape;
struct operation;

namespace gpu {

struct context;

namespace gen {

struct vectorize
{
    std::size_t size = 1;
    std::size_t axis = 0;
    static vectorize elements(std::size_t axis, const std::vector<shape>& inputs);
    static vectorize elements(context& ctx, std::size_t axis, const std::vector<shape>& inputs);
    static vectorize elements(std::size_t axis,
                              const std::vector<shape>& inputs,
                              const std::vector<std::size_t>& sizes);
    std::string str() const;
};
struct preload
{
    std::vector<bool> args = {};
    static preload broadcasts(std::size_t axis, const std::vector<shape>& inputs);
    bool is_preloading() const;
    std::string str() const;
};
struct tile
{
    enum mode
    {
        store,
        load,
        none
    };
    std::vector<mode> args = {};
    std::size_t axis       = 0;
    std::size_t ntiles     = 0;
    std::size_t block_size = 0;
    std::vector<std::size_t> inner{};
    std::vector<std::size_t> outer{};
    static tile elements(const std::vector<shape>& inputs, std::size_t noutputs);
    // bool is_preloading() const;
    std::string str() const;
};

MIGRAPHX_GPU_EXPORT std::size_t find_fast_axis(const shape& input);
MIGRAPHX_GPU_EXPORT std::size_t find_fast_axis(const std::vector<shape>& inputs);

std::string make_transformer_args(std::vector<std::string> transformers);

template <class... Ts>
std::string make_transformer_args(Ts... xs)
{
    return make_transformer_args({xs.str()...});
}

std::string
generate_pointwise(const module& pm, const std::string& name, bool always_return_tuple = false);

std::string generate_reduce(module m, const std::string& name);

std::string generate_name_from_ops(const module& m, const std::string& postname = "");

struct reduce_op
{
    std::vector<std::string> inputs = {};
    std::string reduction = "";
    std::string init      = "0";
    std::string read      = "op::id{}";
    std::string write     = "op::id{}";

    void set(instruction_ref ins, const operation& op);
    void set(const std::string& name, const shape& input, const shape& output);
    std::string str() const;
    static std::string generate(instruction_ref ins, const std::vector<std::string>& x);
};

} // namespace gen
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_GPU_COMPILE_GEN_HPP
