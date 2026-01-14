cmake_minimum_required(VERSION 3.1)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

project(migraphx_py)

find_package(pybind11 REQUIRED)
pybind11_add_module(migraphx_py migraphx_py.cpp)

include_directories(
  /opt/rocm/include
  /opt/rocm/lib/migraphx/include
)

target_link_directories(migraphx_py PRIVATE
  "/opt/rocm/lib"
  "/opt/rocm/lib/migraphx/lib"
)
target_link_libraries(migraphx_py PRIVATE
    migraphx
    migraphx_tf
    migraphx_onnx
)
SET(CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)

set_target_properties(migraphx_py PROPERTIES OUTPUT_NAME "migraphx")
install(TARGETS migraphx_py
  COMPONENT python
  LIBRARY DESTINATION lib
)
