cmake_minimum_required(VERSION 3.2 FATAL_ERROR)

project(FlattenConcat LANGUAGES CXX)

# Enable all compile warnings
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wno-long-long -pedantic -Wno-deprecated-declarations")
# Use C++11
set (CMAKE_CXX_STANDARD 11)

# Sets variable to a value if variable is unset.
macro(set_ifndef var val)
    if (NOT ${var})
        set(${var} ${val})
    endif()
    message(STATUS "Configurable variable ${var} set to ${${var}}")
endmacro()

# -------- CONFIGURATION --------
find_package(CUDA REQUIRED)

set_ifndef(TRT_LIB /usr/lib/x86_64-linux-gnu)
set_ifndef(TRT_INCLUDE /usr/include/x86_64-linux-gnu)
set_ifndef(CUDA_ROOT /usr/local/cuda)

# Find dependencies:
message("\nThe following variables are derived from the values of the previous variables unless provided explicitly:\n")

# TensorRT's nvinfer lib
find_library(_NVINFER_LIB nvinfer HINTS ${TRT_LIB} PATH_SUFFIXES lib lib64)
set_ifndef(NVINFER_LIB ${_NVINFER_LIB})

# cuBLAS
find_library(_CUBLAS_LIB cublas HINTS ${CUDA_ROOT} PATH_SUFFIXES lib lib64)
set_ifndef(CUBLAS_LIB ${_CUBLAS_LIB})

# CUDA include dir
find_path(_CUDA_INC_DIR cuda_runtime_api.h HINTS ${CUDA_ROOT} PATH_SUFFIXES include)
set_ifndef(CUDA_INC_DIR ${_CUDA_INC_DIR})

# -------- BUILDING --------
include_directories(${TRT_INCLUDE} ${CUDA_INC_DIR})
add_library(flattenconcat MODULE
    ${CMAKE_SOURCE_DIR}/FlattenConcat.cpp
)

# Link TensorRT's nvinfer lib
target_link_libraries(flattenconcat PRIVATE ${NVINFER_LIB} ${CUBLAS_LIB})
