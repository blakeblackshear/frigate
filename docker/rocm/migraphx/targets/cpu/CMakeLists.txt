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

include(CheckCXXCompilerFlag)

add_library(migraphx_cpu
    allocate.cpp
    allocation_model.cpp
    binary.cpp
    concat.cpp
    convolution.cpp
    copy.cpp
    deconvolution.cpp
    dnnl.cpp
    eltwise.cpp
    erf.cpp
    fmod.cpp
    fuse_ops.cpp
    gather.cpp
    gemm.cpp
    layernorm.cpp
    logsoftmax.cpp
    lowering.cpp
    lrn.cpp
    mod.cpp
    preallocate.cpp
    pooling.cpp
    reduction.cpp
    reorder.cpp
    softmax.cpp
    sub.cpp
    target.cpp
    write_literals.cpp
)
set_target_properties(migraphx_cpu PROPERTIES EXPORT_NAME cpu)
rocm_set_soversion(migraphx_cpu ${MIGRAPHX_SO_VERSION})

set(MIGRAPHX_ENABLE_ZENDNN Off CACHE BOOL "")

if(MIGRAPHX_ENABLE_ZENDNN)
    find_path(ZENDNN_INC_PATH zendnn.hpp)
    find_library(ZENDNN_LIB amdZenDNN)
    find_library(BLIS_LIB blis)
else()
    find_package(dnnl REQUIRED)
endif()

rocm_clang_tidy_check(migraphx_cpu)
if(MIGRAPHX_ENABLE_ZENDNN)
    target_compile_definitions(migraphx_cpu PRIVATE -DMIGRAPHX_ENABLE_ZENDNN)
    target_include_directories(migraphx_cpu PRIVATE ${ZENDNN_INC_PATH})
    message(STATUS "ZENDNN_LIB: ${ZENDNN_LIB}")
    target_link_libraries(migraphx_cpu PRIVATE ${BLIS_LIB})
    target_link_libraries(migraphx_cpu PRIVATE ${ZENDNN_LIB})
else()
    target_link_libraries(migraphx_cpu PUBLIC DNNL::dnnl)
endif()
target_link_libraries(migraphx_cpu PRIVATE migraphx)

migraphx_generate_export_header(migraphx_cpu)

find_package(OpenMP)
if(WIN32)
    target_link_libraries(migraphx_cpu PUBLIC libomp)
    target_include_directories(migraphx_cpu PUBLIC ${OpenMP_CXX_INCLUDE_DIRS})
    target_compile_options(migraphx_cpu PUBLIC ${OpenMP_CXX_FLAGS})
else()
    target_link_libraries(migraphx_cpu PUBLIC OpenMP::OpenMP_CXX)
    # Add library path to rpath to workaround issues with our broken packages
    foreach(LIBRARY ${OpenMP_CXX_LIBRARIES})
        if(LIBRARY MATCHES "libomp")
            get_filename_component(LIBRARY_PATH "${LIBRARY}" PATH)
            target_link_libraries(migraphx_cpu PUBLIC -Wl,-rpath=${LIBRARY_PATH} -Wl,-rpath-link=${LIBRARY_PATH})
        endif()
    endforeach()
endif()

rocm_install_targets(
  PRIVATE
  TARGETS migraphx_cpu
  INCLUDE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

