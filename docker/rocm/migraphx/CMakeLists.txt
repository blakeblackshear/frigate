
cmake_minimum_required(VERSION 3.1)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

SET(CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)

project(migraphx_py)

include_directories(/opt/rocm/include)

find_package(pybind11 REQUIRED)
pybind11_add_module(migraphx migraphx_py.cpp)

target_link_libraries(migraphx PRIVATE /opt/rocm/lib/libmigraphx.so /opt/rocm/lib/libmigraphx_tf.so /opt/rocm/lib/libmigraphx_onnx.so)

install(TARGETS migraphx
  COMPONENT python
  LIBRARY DESTINATION /opt/rocm/lib
)
