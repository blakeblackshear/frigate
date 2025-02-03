#####################################################################################
# The MIT License (MIT)
#
# Copyright (c) 2015-2024 Advanced Micro Devices, Inc. All rights reserved.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#####################################################################################

add_executable(driver 
    main.cpp
    verify.cpp
    passes.cpp
    mlir.cpp
    models.cpp
    perf.cpp
    marker_roctx.cpp
)
set_target_properties(driver PROPERTIES OUTPUT_NAME migraphx-driver)
if(NOT WIN32)
    # Copy driver for backwards compatibility (Linux only)
    add_custom_command(
        TARGET driver
        POST_BUILD COMMAND ${CMAKE_COMMAND} -E copy
                $<TARGET_FILE:driver>
                ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/driver
        BYPRODUCTS ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/driver
    )
    set_directory_properties(PROPERTIES ADDITIONAL_CLEAN_FILES ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/driver)
endif()
rocm_clang_tidy_check(driver)

file(STRINGS "${CMAKE_SOURCE_DIR}/test/onnx/.onnxrt-commit" String_output)
target_compile_definitions(driver PUBLIC MIGRAPHX_ORT_SHA1="${String_output}")

target_link_libraries(driver migraphx_all_targets migraphx_onnx migraphx_tf)

if(MIGRAPHX_ENABLE_PYTHON)
    target_link_libraries(driver migraphx_py)
    target_compile_definitions(driver PRIVATE MIGRAPHX_ENABLE_PYTHON)
endif()

rocm_install_targets(
  TARGETS driver
)
