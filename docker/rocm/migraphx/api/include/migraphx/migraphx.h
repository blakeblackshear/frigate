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
#ifndef MIGRAPHX_GUARD_C_API_MIGRAPHX_H
#define MIGRAPHX_GUARD_C_API_MIGRAPHX_H

#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>

#include <migraphx/api/export.h>

// Add new types here
// clang-format off
#define MIGRAPHX_SHAPE_VISIT_TYPES(m) \
    m(bool_type, bool) \
    m(half_type, half) \
    m(float_type, float) \
    m(double_type, double) \
    m(uint8_type, uint8_t) \
    m(int8_type, int8_t) \
    m(uint16_type, uint16_t) \
    m(int16_type, int16_t) \
    m(int32_type, int32_t) \
    m(int64_type, int64_t) \
    m(uint32_type, uint32_t) \
    m(uint64_type, uint64_t) \
    m(fp8e4m3fnuz_type, migraphx::fp8::fp8e4m3fnuz) \
    m(fp8e4m3fn_type, migraphx::fp8::fp8e4m3fn) \
    m(fp8e5m2_type, migraphx::fp8::fp8e5m2) \
    m(bf16_type, bf16) \
    m(fp8e5m2fnuz_type, migraphx::fp8::fp8e5m2fnuz)
// clang-format on

#ifdef __cplusplus
extern "C" {
#endif

// return code, more to be added later
typedef enum
{
    migraphx_status_success        = 0,
    migraphx_status_bad_param      = 1,
    migraphx_status_unknown_target = 3,
    migraphx_status_unknown_error  = 4,

} migraphx_status;

#define MIGRAPHX_SHAPE_GENERATE_ENUM_TYPES(x, t) migraphx_shape_##x,
/// An enum to represent the different data type inputs
typedef enum
{
    migraphx_shape_tuple_type,
    MIGRAPHX_SHAPE_VISIT_TYPES(MIGRAPHX_SHAPE_GENERATE_ENUM_TYPES)
} migraphx_shape_datatype_t;
#undef MIGRAPHX_SHAPE_GENERATE_ENUM_TYPES

typedef struct migraphx_optimals* migraphx_optimals_t;
typedef const struct migraphx_optimals* const_migraphx_optimals_t;

typedef struct migraphx_dynamic_dimension* migraphx_dynamic_dimension_t;
typedef const struct migraphx_dynamic_dimension* const_migraphx_dynamic_dimension_t;

typedef struct migraphx_dynamic_dimensions* migraphx_dynamic_dimensions_t;
typedef const struct migraphx_dynamic_dimensions* const_migraphx_dynamic_dimensions_t;

typedef struct migraphx_shape* migraphx_shape_t;
typedef const struct migraphx_shape* const_migraphx_shape_t;

typedef struct migraphx_argument* migraphx_argument_t;
typedef const struct migraphx_argument* const_migraphx_argument_t;

typedef struct migraphx_target* migraphx_target_t;
typedef const struct migraphx_target* const_migraphx_target_t;

typedef struct migraphx_program_parameter_shapes* migraphx_program_parameter_shapes_t;
typedef const struct migraphx_program_parameter_shapes* const_migraphx_program_parameter_shapes_t;

typedef struct migraphx_program_parameters* migraphx_program_parameters_t;
typedef const struct migraphx_program_parameters* const_migraphx_program_parameters_t;

typedef struct migraphx_arguments* migraphx_arguments_t;
typedef const struct migraphx_arguments* const_migraphx_arguments_t;

typedef struct migraphx_shapes* migraphx_shapes_t;
typedef const struct migraphx_shapes* const_migraphx_shapes_t;

typedef struct migraphx_instruction* migraphx_instruction_t;
typedef const struct migraphx_instruction* const_migraphx_instruction_t;

typedef struct migraphx_instructions* migraphx_instructions_t;
typedef const struct migraphx_instructions* const_migraphx_instructions_t;

typedef struct migraphx_modules* migraphx_modules_t;
typedef const struct migraphx_modules* const_migraphx_modules_t;

typedef struct migraphx_module* migraphx_module_t;
typedef const struct migraphx_module* const_migraphx_module_t;

typedef struct migraphx_program* migraphx_program_t;
typedef const struct migraphx_program* const_migraphx_program_t;

typedef struct migraphx_operation* migraphx_operation_t;
typedef const struct migraphx_operation* const_migraphx_operation_t;

typedef struct migraphx_onnx_options* migraphx_onnx_options_t;
typedef const struct migraphx_onnx_options* const_migraphx_onnx_options_t;

typedef struct migraphx_file_options* migraphx_file_options_t;
typedef const struct migraphx_file_options* const_migraphx_file_options_t;

typedef struct migraphx_compile_options* migraphx_compile_options_t;
typedef const struct migraphx_compile_options* const_migraphx_compile_options_t;

typedef struct migraphx_tf_options* migraphx_tf_options_t;
typedef const struct migraphx_tf_options* const_migraphx_tf_options_t;

typedef struct migraphx_quantize_op_names* migraphx_quantize_op_names_t;
typedef const struct migraphx_quantize_op_names* const_migraphx_quantize_op_names_t;

typedef struct migraphx_quantize_int8_options* migraphx_quantize_int8_options_t;
typedef const struct migraphx_quantize_int8_options* const_migraphx_quantize_int8_options_t;

typedef struct migraphx_quantize_fp8_options* migraphx_quantize_fp8_options_t;
typedef const struct migraphx_quantize_fp8_options* const_migraphx_quantize_fp8_options_t;

typedef struct migraphx_context* migraphx_context_t;
typedef const struct migraphx_context* const_migraphx_context_t;

typedef struct migraphx_experimental_custom_op* migraphx_experimental_custom_op_t;
typedef const struct migraphx_experimental_custom_op* const_migraphx_experimental_custom_op_t;

typedef migraphx_status (*migraphx_experimental_custom_op_compute)(migraphx_argument_t out,
                                                                   void* obj,
                                                                   char* exception_msg,
                                                                   size_t exception_msg_size,
                                                                   migraphx_context_t ctx,
                                                                   migraphx_shape_t output,
                                                                   migraphx_arguments_t inputs);

typedef migraphx_status (*migraphx_experimental_custom_op_compute_shape)(migraphx_shape_t out,
                                                                         void* obj,
                                                                         char* exception_msg,
                                                                         size_t exception_msg_size,
                                                                         migraphx_shapes_t inputs);

typedef migraphx_status (*migraphx_experimental_custom_op_output_alias)(size_t* out,
                                                                        size_t* out_size,
                                                                        void* obj,
                                                                        char* exception_msg,
                                                                        size_t exception_msg_size,
                                                                        migraphx_shapes_t inputs);

typedef migraphx_status (*migraphx_experimental_custom_op_runs_on_offload_target)(
    bool* out, void* obj, char* exception_msg, size_t exception_msg_size);

typedef migraphx_status (*migraphx_experimental_custom_op_copy)(void** out, void* input);

typedef migraphx_status (*migraphx_experimental_custom_op_delete)(void* input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_optimals_destroy(migraphx_optimals_t optimals);

MIGRAPHX_C_EXPORT migraphx_status migraphx_optimals_assign_to(migraphx_optimals_t output,
                                                              const_migraphx_optimals_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_optimals_create(migraphx_optimals_t* optimals,
                                                           const size_t* ptr,
                                                           size_t size);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_dynamic_dimension_destroy(migraphx_dynamic_dimension_t dynamic_dimension);

MIGRAPHX_C_EXPORT migraphx_status migraphx_dynamic_dimension_assign_to(
    migraphx_dynamic_dimension_t output, const_migraphx_dynamic_dimension_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_dynamic_dimension_create_min_max(
    migraphx_dynamic_dimension_t* dynamic_dimension, size_t min, size_t max);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_dynamic_dimension_create_min_max_optimals(migraphx_dynamic_dimension_t* dynamic_dimension,
                                                   size_t min,
                                                   size_t max,
                                                   migraphx_optimals_t optimals);

MIGRAPHX_C_EXPORT migraphx_status migraphx_dynamic_dimension_is_fixed(
    bool* out, const_migraphx_dynamic_dimension_t dynamic_dimension);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_dynamic_dimension_equal(bool* out,
                                 const_migraphx_dynamic_dimension_t dynamic_dimension,
                                 const_migraphx_dynamic_dimension_t x);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_dynamic_dimensions_destroy(migraphx_dynamic_dimensions_t dynamic_dimensions);

MIGRAPHX_C_EXPORT migraphx_status migraphx_dynamic_dimensions_assign_to(
    migraphx_dynamic_dimensions_t output, const_migraphx_dynamic_dimensions_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_dynamic_dimensions_create(migraphx_dynamic_dimensions_t* dynamic_dimensions,
                                   const const_migraphx_dynamic_dimension_t* ptr,
                                   size_t size);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_dynamic_dimensions_size(size_t* out, migraphx_dynamic_dimensions_t dynamic_dimensions);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_dynamic_dimensions_get(const_migraphx_dynamic_dimension_t* out,
                                migraphx_dynamic_dimensions_t dynamic_dimensions,
                                size_t idx);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_destroy(migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_assign_to(migraphx_shape_t output,
                                                           const_migraphx_shape_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_create(migraphx_shape_t* shape,
                                                        migraphx_shape_datatype_t type,
                                                        size_t* lengths,
                                                        size_t lengths_size);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_create_with_strides(migraphx_shape_t* shape,
                                                                     migraphx_shape_datatype_t type,
                                                                     size_t* lengths,
                                                                     size_t lengths_size,
                                                                     size_t* strides,
                                                                     size_t strides_size);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_create_scalar(migraphx_shape_t* shape,
                                                               migraphx_shape_datatype_t type);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_create_dynamic(migraphx_shape_t* shape,
                                                                migraphx_shape_datatype_t type,
                                                                migraphx_dynamic_dimensions_t dims);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_lengths(const size_t** out,
                                                         size_t* out_size,
                                                         const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_strides(const size_t** out,
                                                         size_t* out_size,
                                                         const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_dyn_dims(migraphx_dynamic_dimensions_t* out,
                                                          const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_type(migraphx_shape_datatype_t* out,
                                                      const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_elements(size_t* out,
                                                          const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_bytes(size_t* out, const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_ndim(size_t* out, const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_equal(bool* out,
                                                       const_migraphx_shape_t shape,
                                                       const_migraphx_shape_t x);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_standard(bool* out, const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_dynamic(bool* out, const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shape_index(size_t* out,
                                                       const_migraphx_shape_t shape,
                                                       size_t i);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_destroy(migraphx_argument_t argument);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_assign_to(migraphx_argument_t output,
                                                              const_migraphx_argument_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_create(migraphx_argument_t* argument,
                                                           const_migraphx_shape_t shape,
                                                           void* buffer);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_create_empty(migraphx_argument_t* argument,
                                                                 const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_shape(const_migraphx_shape_t* out,
                                                          const_migraphx_argument_t argument);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_buffer(char** out,
                                                           const_migraphx_argument_t argument);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_equal(bool* out,
                                                          const_migraphx_argument_t argument,
                                                          const_migraphx_argument_t x);

MIGRAPHX_C_EXPORT migraphx_status migraphx_argument_generate(migraphx_argument_t* out,
                                                             const_migraphx_shape_t s,
                                                             size_t seed);

MIGRAPHX_C_EXPORT migraphx_status migraphx_target_destroy(migraphx_target_t target);

MIGRAPHX_C_EXPORT migraphx_status migraphx_target_assign_to(migraphx_target_t output,
                                                            const_migraphx_target_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_target_create(migraphx_target_t* target,
                                                         const char* name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_parameter_shapes_destroy(
    migraphx_program_parameter_shapes_t program_parameter_shapes);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_parameter_shapes_assign_to(
    migraphx_program_parameter_shapes_t output, const_migraphx_program_parameter_shapes_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_parameter_shapes_size(
    size_t* out, migraphx_program_parameter_shapes_t program_parameter_shapes);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_program_parameter_shapes_get(const_migraphx_shape_t* out,
                                      migraphx_program_parameter_shapes_t program_parameter_shapes,
                                      const char* name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_parameter_shapes_names(
    const char** out, migraphx_program_parameter_shapes_t program_parameter_shapes);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_program_parameters_destroy(migraphx_program_parameters_t program_parameters);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_parameters_assign_to(
    migraphx_program_parameters_t output, const_migraphx_program_parameters_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_program_parameters_create(migraphx_program_parameters_t* program_parameters);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_program_parameters_add(migraphx_program_parameters_t program_parameters,
                                const char* name,
                                const_migraphx_argument_t argument);

MIGRAPHX_C_EXPORT migraphx_status migraphx_arguments_destroy(migraphx_arguments_t arguments);

MIGRAPHX_C_EXPORT migraphx_status migraphx_arguments_assign_to(migraphx_arguments_t output,
                                                               const_migraphx_arguments_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_arguments_size(size_t* out,
                                                          migraphx_arguments_t arguments);

MIGRAPHX_C_EXPORT migraphx_status migraphx_arguments_get(const_migraphx_argument_t* out,
                                                         migraphx_arguments_t arguments,
                                                         size_t idx);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shapes_destroy(migraphx_shapes_t shapes);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shapes_assign_to(migraphx_shapes_t output,
                                                            const_migraphx_shapes_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shapes_size(size_t* out, migraphx_shapes_t shapes);

MIGRAPHX_C_EXPORT migraphx_status migraphx_shapes_get(const_migraphx_shape_t* out,
                                                      migraphx_shapes_t shapes,
                                                      size_t idx);

MIGRAPHX_C_EXPORT migraphx_status migraphx_instruction_destroy(migraphx_instruction_t instruction);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_instruction_assign_to(migraphx_instruction_t output, const_migraphx_instruction_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_instructions_destroy(migraphx_instructions_t instructions);

MIGRAPHX_C_EXPORT migraphx_status migraphx_instructions_assign_to(
    migraphx_instructions_t output, const_migraphx_instructions_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_instructions_create(
    migraphx_instructions_t* instructions, const const_migraphx_instruction_t* ptr, size_t size);

MIGRAPHX_C_EXPORT migraphx_status migraphx_modules_destroy(migraphx_modules_t modules);

MIGRAPHX_C_EXPORT migraphx_status migraphx_modules_assign_to(migraphx_modules_t output,
                                                             const_migraphx_modules_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_modules_create(migraphx_modules_t* modules,
                                                          migraphx_module_t* ptr,
                                                          size_t size);

MIGRAPHX_C_EXPORT migraphx_status migraphx_module_create(migraphx_module_t* module, char* name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_module_print(const_migraphx_module_t module);

MIGRAPHX_C_EXPORT migraphx_status migraphx_module_add_instruction(migraphx_instruction_t* out,
                                                                  migraphx_module_t module,
                                                                  migraphx_operation_t op,
                                                                  migraphx_instructions_t args);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_module_add_instruction_with_mod_args(migraphx_instruction_t* out,
                                              migraphx_module_t module,
                                              migraphx_operation_t op,
                                              migraphx_instructions_t args,
                                              migraphx_modules_t module_refs);

MIGRAPHX_C_EXPORT migraphx_status migraphx_module_add_literal(migraphx_instruction_t* out,
                                                              migraphx_module_t module,
                                                              const_migraphx_shape_t shape,
                                                              const char* buffer);

MIGRAPHX_C_EXPORT migraphx_status migraphx_module_add_parameter(migraphx_instruction_t* out,
                                                                migraphx_module_t module,
                                                                const char* name,
                                                                const_migraphx_shape_t shape);

MIGRAPHX_C_EXPORT migraphx_status migraphx_module_add_return(migraphx_instruction_t* out,
                                                             migraphx_module_t module,
                                                             migraphx_instructions_t args);

MIGRAPHX_C_EXPORT migraphx_status migraphx_module_add_allocation(migraphx_instruction_t* out,
                                                                 migraphx_module_t module,
                                                                 const_migraphx_shape_t s);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_destroy(migraphx_program_t program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_assign_to(migraphx_program_t output,
                                                             const_migraphx_program_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_create(migraphx_program_t* program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_get_main_module(migraphx_module_t* out,
                                                                   migraphx_program_t program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_create_module(migraphx_module_t* out,
                                                                 migraphx_program_t program,
                                                                 const char* name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_compile(migraphx_program_t program,
                                                           migraphx_target_t target,
                                                           migraphx_compile_options_t options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_get_parameter_shapes(
    migraphx_program_parameter_shapes_t* out, migraphx_program_t program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_get_output_shapes(migraphx_shapes_t* out,
                                                                     migraphx_program_t program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_print(const_migraphx_program_t program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_sort(migraphx_program_t program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_run(migraphx_arguments_t* out,
                                                       migraphx_program_t program,
                                                       migraphx_program_parameters_t params);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_run_async(migraphx_arguments_t* out,
                                                             migraphx_program_t program,
                                                             migraphx_program_parameters_t params,
                                                             void* s,
                                                             const char* name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_equal(bool* out,
                                                         const_migraphx_program_t program,
                                                         const_migraphx_program_t x);

MIGRAPHX_C_EXPORT migraphx_status migraphx_program_experimental_get_context(
    migraphx_context_t* out, const_migraphx_program_t program);

MIGRAPHX_C_EXPORT migraphx_status migraphx_operation_destroy(migraphx_operation_t operation);

MIGRAPHX_C_EXPORT migraphx_status migraphx_operation_assign_to(migraphx_operation_t output,
                                                               const_migraphx_operation_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_operation_create(migraphx_operation_t* operation,
                                                            const char* name,
                                                            const char* attributes,
                                                            ...);

MIGRAPHX_C_EXPORT migraphx_status migraphx_operation_name(char* out,
                                                          size_t out_size,
                                                          migraphx_operation_t operation);

MIGRAPHX_C_EXPORT migraphx_status migraphx_load(migraphx_program_t* out,
                                                const char* name,
                                                migraphx_file_options_t options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_save(migraphx_program_t p,
                                                const char* name,
                                                migraphx_file_options_t options);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_onnx_options_destroy(migraphx_onnx_options_t onnx_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_onnx_options_assign_to(
    migraphx_onnx_options_t output, const_migraphx_onnx_options_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_onnx_options_create(migraphx_onnx_options_t* onnx_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_onnx_options_set_input_parameter_shape(
    migraphx_onnx_options_t onnx_options, const char* name, size_t* dims, size_t dims_size);

MIGRAPHX_C_EXPORT migraphx_status migraphx_onnx_options_set_dyn_input_parameter_shape(
    migraphx_onnx_options_t onnx_options, const char* name, migraphx_dynamic_dimensions_t dims);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_onnx_options_set_default_dim_value(migraphx_onnx_options_t onnx_options, size_t value);

MIGRAPHX_C_EXPORT migraphx_status migraphx_onnx_options_set_default_dyn_dim_value(
    migraphx_onnx_options_t onnx_options, const_migraphx_dynamic_dimension_t dd);

MIGRAPHX_C_EXPORT migraphx_status migraphx_onnx_options_set_default_loop_iterations(
    migraphx_onnx_options_t onnx_options, int64_t value);

MIGRAPHX_C_EXPORT migraphx_status migraphx_onnx_options_set_limit_loop_iterations(
    migraphx_onnx_options_t onnx_options, int64_t value);

MIGRAPHX_C_EXPORT migraphx_status migraphx_onnx_options_set_external_data_path(
    migraphx_onnx_options_t onnx_options, const char* external_data_path);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_file_options_destroy(migraphx_file_options_t file_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_file_options_assign_to(
    migraphx_file_options_t output, const_migraphx_file_options_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_file_options_create(migraphx_file_options_t* file_options);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_file_options_set_file_format(migraphx_file_options_t file_options, const char* format);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_compile_options_destroy(migraphx_compile_options_t compile_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_compile_options_assign_to(
    migraphx_compile_options_t output, const_migraphx_compile_options_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_compile_options_create(migraphx_compile_options_t* compile_options);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_compile_options_set_offload_copy(migraphx_compile_options_t compile_options, bool value);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_compile_options_set_fast_math(migraphx_compile_options_t compile_options, bool value);

MIGRAPHX_C_EXPORT migraphx_status migraphx_compile_options_set_exhaustive_tune_flag(
    migraphx_compile_options_t compile_options, bool value);

MIGRAPHX_C_EXPORT migraphx_status migraphx_parse_onnx(migraphx_program_t* out,
                                                      const char* name,
                                                      migraphx_onnx_options_t options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_parse_onnx_buffer(migraphx_program_t* out,
                                                             const void* data,
                                                             size_t size,
                                                             migraphx_onnx_options_t options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_tf_options_destroy(migraphx_tf_options_t tf_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_tf_options_assign_to(migraphx_tf_options_t output,
                                                                const_migraphx_tf_options_t input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_tf_options_create(migraphx_tf_options_t* tf_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_tf_options_set_nhwc(migraphx_tf_options_t tf_options,
                                                               bool is_nhwc);

MIGRAPHX_C_EXPORT migraphx_status migraphx_tf_options_set_input_parameter_shape(
    migraphx_tf_options_t tf_options, const char* name, size_t* dims, size_t dims_size);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_tf_options_set_default_dim_value(migraphx_tf_options_t tf_options, size_t value);

MIGRAPHX_C_EXPORT migraphx_status migraphx_tf_options_set_output_names(
    migraphx_tf_options_t tf_options, const char** names, size_t names_size);

MIGRAPHX_C_EXPORT migraphx_status migraphx_parse_tf(migraphx_program_t* out,
                                                    const char* name,
                                                    migraphx_tf_options_t options);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_op_names_destroy(migraphx_quantize_op_names_t quantize_op_names);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_op_names_assign_to(
    migraphx_quantize_op_names_t output, const_migraphx_quantize_op_names_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_op_names_create(migraphx_quantize_op_names_t* quantize_op_names);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_op_names_add(migraphx_quantize_op_names_t quantize_op_names, const char* name);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_fp16_with_op_names(migraphx_program_t prog, migraphx_quantize_op_names_t name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_fp16(migraphx_program_t prog);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_int8_options_destroy(migraphx_quantize_int8_options_t quantize_int8_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_int8_options_assign_to(
    migraphx_quantize_int8_options_t output, const_migraphx_quantize_int8_options_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_int8_options_create(migraphx_quantize_int8_options_t* quantize_int8_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_int8_options_add_op_name(
    migraphx_quantize_int8_options_t quantize_int8_options, const char* name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_int8_options_add_calibration_data(
    migraphx_quantize_int8_options_t quantize_int8_options, migraphx_program_parameters_t data);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_int8(migraphx_program_t prog,
                                                         migraphx_target_t target,
                                                         migraphx_quantize_int8_options_t options);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_fp8_options_destroy(migraphx_quantize_fp8_options_t quantize_fp8_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_fp8_options_assign_to(
    migraphx_quantize_fp8_options_t output, const_migraphx_quantize_fp8_options_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_quantize_fp8_options_create(migraphx_quantize_fp8_options_t* quantize_fp8_options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_fp8_options_add_calibration_data(
    migraphx_quantize_fp8_options_t quantize_fp8_options, migraphx_program_parameters_t data);

MIGRAPHX_C_EXPORT migraphx_status migraphx_quantize_fp8(migraphx_program_t prog,
                                                        migraphx_target_t target,
                                                        migraphx_quantize_fp8_options_t options);

MIGRAPHX_C_EXPORT migraphx_status migraphx_context_finish(const_migraphx_context_t context);

MIGRAPHX_C_EXPORT migraphx_status migraphx_context_get_queue(void** out,
                                                             migraphx_context_t context);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_experimental_custom_op_destroy(migraphx_experimental_custom_op_t experimental_custom_op);

MIGRAPHX_C_EXPORT migraphx_status migraphx_experimental_custom_op_assign_to(
    migraphx_experimental_custom_op_t output, const_migraphx_experimental_custom_op_t input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_experimental_custom_op_create(migraphx_experimental_custom_op_t* experimental_custom_op,
                                       void* obj,
                                       migraphx_experimental_custom_op_copy c,
                                       migraphx_experimental_custom_op_delete d,
                                       const char* obj_typename,
                                       const char* name);

MIGRAPHX_C_EXPORT migraphx_status migraphx_experimental_custom_op_set_compute(
    migraphx_experimental_custom_op_t obj, migraphx_experimental_custom_op_compute input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_experimental_custom_op_set_compute_shape(
    migraphx_experimental_custom_op_t obj, migraphx_experimental_custom_op_compute_shape input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_experimental_custom_op_set_output_alias(
    migraphx_experimental_custom_op_t obj, migraphx_experimental_custom_op_output_alias input);

MIGRAPHX_C_EXPORT migraphx_status migraphx_experimental_custom_op_set_runs_on_offload_target(
    migraphx_experimental_custom_op_t obj,
    migraphx_experimental_custom_op_runs_on_offload_target input);

MIGRAPHX_C_EXPORT migraphx_status
migraphx_experimental_custom_op_register(migraphx_experimental_custom_op_t experimental_custom_op);

#ifdef __cplusplus
}
#endif

#endif
