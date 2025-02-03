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
#ifndef MIGRAPHX_GUARD_MIGRAPHX_COMMON_HPP
#define MIGRAPHX_GUARD_MIGRAPHX_COMMON_HPP

#include <migraphx/config.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/instruction_ref.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct module;
struct operation;

struct common_options
{
    bool common_type = true;
    bool common_lens = true;
};

/**
 * Broadcasting works by comparing the shapes element-wise starting with
 * the trailing (right-most) dimensions and working leftwards. This is equivalent
 * to what is done in NumPy.
 * example 1:
 * s0 = (3,2,4,5) and s1 = (2,1,1)
 * In this case we need to broadcast (:,1,1) portion of
 * s1 plus broadcast the 1st dimension of s0
 * giving output_lens = (3,2,4,5)
 *
 * example 2:
 * s0 = (3,2,1,5) and s1 = (2,7,5)
 * In this case we need to broadcast the (:,:,1:,:) axis
 * of s0 plus the 1st dimension of s1 giving
 * output_lens = (3,2,7,5)
 *
 * example 3:
 * s0 = (4, 1, 1) and s1 = (3, 4)
 * output_lens = (4, 3, 4)
 */
MIGRAPHX_EXPORT
std::vector<std::size_t> compute_broadcasted_lens(std::vector<std::size_t> s0,
                                                  std::vector<std::size_t> s1);

/**
 * Broadcasting for two vectors of dynamic_dimensions.
 * Compares `dynamic_dimension` objects from the trailing (right-most) dimension and working
 * leftwards.
 *
 * Rules for broadcasting dynamic_dimension:
 * If the same `dynamic_dimension`, return either.
 * If one of the `dynamic_dimension`s is 1, return the other one.
 * If the `dynamic_dimension`s have an intersection, return the intersection.
 *   Explanation:
 *   For the shape to be broadcastable at runtime (when the dimensions are constant) the dimensions
 *   must be the same. The only way for the dimensions to be the same is if the output dimension is
 *   the intersection of the ranges.
 *   In practice, we will mostly see this case for handling unknown dynamic_dimensions like {0,
 * max_int}. Else, throw an error.
 *
 * There is a contrived edge case for ranges that include 1 but are not a fixed {1, 1}.
 * That case is not supported.
 */
MIGRAPHX_EXPORT
std::vector<shape::dynamic_dimension>
compute_broadcasted_dyn_dims(std::vector<shape::dynamic_dimension> dds0,
                             std::vector<shape::dynamic_dimension> dds1);

MIGRAPHX_EXPORT
std::vector<shape::dynamic_dimension> compute_broadcasted_dyn_dims(shape s0, shape s1);

MIGRAPHX_EXPORT
shape common_shape(const std::vector<shape>& shapes);

/**
 * @brief Compute the common (broadcasted) dimensions of a list of fixed shapes
 */
MIGRAPHX_EXPORT
std::vector<std::size_t> compute_common_lens(const std::vector<shape>& shapes);

/**
 * @ brief Compute the common (broadcasted) dynamic dimensions of a list of dynamic shapes
 */
MIGRAPHX_EXPORT
std::vector<shape::dynamic_dimension> compute_common_dyn_dims(const std::vector<shape>& shapes);

/**
 * @brief  Creates and adds instructions to convert input arguments to common shapes and types
 * by adding multi-broadcast and type convert operations. This is a utility function for creating
 * operations where the shape and type of inputs need to match. It supports both dynamic and
 * static-shaped arguments.
 *
 * @param m         containing module for instruction
 * @param ins       insertion location in instruction list
 * @param inputs    instructions to use as argument list; also, the shapes
 *                  attached to each instruction_ref are considered for broadcasting
 * @return std::vector<instruction_ref>   a modified argument list
 */
MIGRAPHX_EXPORT std::vector<instruction_ref> insert_common_args(module& m,
                                                                instruction_ref ins,
                                                                std::vector<instruction_ref> inputs,
                                                                common_options options = {});

MIGRAPHX_EXPORT
std::vector<instruction_ref>
add_common_args(module& m, std::vector<instruction_ref> inputs, common_options options = {});

MIGRAPHX_EXPORT
instruction_ref insert_common_op(module& m,
                                 instruction_ref ins,
                                 const operation& op,
                                 std::vector<instruction_ref> inputs,
                                 common_options options = {});

/**
 * @brief Wrapper for insert_common_args() which inserts operation at the end of the module.
 */
MIGRAPHX_EXPORT
instruction_ref add_common_op(module& m,
                              const operation& op,
                              std::vector<instruction_ref> inputs,
                              common_options options = {});

/**
 * Calculates the broadcasted shape with the given input_shape and broadcasted dimensions.
 *
 * @param input_shape static shape to broadcast
 * @param bcast_lens dimensions to broadcast to
 * @return broadcasted shape with calculated strides
 */
MIGRAPHX_EXPORT
shape make_bcast_shape(const shape& input_shape, const std::vector<std::size_t>& bcast_lens);

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif // MIGRAPHX_GUARD_MIGRAPHX_COMMON_HPP
