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

add_executable(migraphx-hiprtc-driver
    main.cpp
)
rocm_clang_tidy_check(migraphx-hiprtc-driver)
# On Windows, the driver's default 1MB stack size is not enough - increasing to 4MB.
set(STACK_SIZE 4194304)
if(MSVC)
    target_link_options(migraphx-hiprtc-driver PRIVATE /STACK:${STACK_SIZE})
elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang" AND CMAKE_CXX_SIMULATE_ID MATCHES "MSVC")
    target_link_options(migraphx-hiprtc-driver PRIVATE -Xlinker /stack:${STACK_SIZE})
endif()
target_link_libraries(migraphx-hiprtc-driver PRIVATE migraphx_gpu)
add_dependencies(migraphx_all_targets migraphx-hiprtc-driver)
rocm_install_targets(
    TARGETS migraphx-hiprtc-driver
)
