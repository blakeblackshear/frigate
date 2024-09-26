
cmake_minimum_required(VERSION 3.1)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

SET(CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)

project(migraphx_py)

include_directories(/opt/rocm/include /opt/rocm/lib/migraphx/include)

find_package(pybind11 REQUIRED)
pybind11_add_module(migraphx migraphx_py.cpp)

target_link_libraries(migraphx PRIVATE /opt/rocm/lib/migraphx/lib/libmigraphx.so.2010000 /opt/rocm/lib/migraphx/lib/libmigraphx_tf.so.2010000 /opt/rocm/lib/migraphx/lib/libmigraphx_onnx.so.2010000)

install(TARGETS migraphx
  COMPONENT python
  LIBRARY DESTINATION /opt/rocm/lib
)
