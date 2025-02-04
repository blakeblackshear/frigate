
cmake_minimum_required(VERSION 3.1)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(migraphx
    adjust_allocation.cpp
    analyze_streams.cpp
    apply_alpha_beta.cpp
    argument.cpp
    autocast_fp8.cpp
    auto_contiguous.cpp
    base64.cpp
    common.cpp
    common_dims.cpp
    compile_src.cpp
    convert_to_json.cpp
    cpp_generator.cpp
    dead_code_elimination.cpp
    dom_info.cpp
    dynamic_loader.cpp
    eliminate_allocation.cpp
    eliminate_common_subexpression.cpp
    eliminate_concat.cpp
    eliminate_contiguous.cpp
    eliminate_convert.cpp
    eliminate_data_type.cpp
    eliminate_identity.cpp
    eliminate_pad.cpp
    env.cpp
    file_buffer.cpp
    fileutils.cpp
    fp_to_double.cpp
    fp8_ocp_to_fnuz.cpp
    fuse_concat.cpp
    fuse_pointwise.cpp
    fuse_pointwise_reduce.cpp
    fuse_reduce.cpp
    generate.cpp
    inline_module.cpp
    insert_pad.cpp
    instruction.cpp
    json.cpp
    layout_convolution.cpp
    lexing.cpp
    load_save.cpp
    make_op.cpp
    memory_coloring.cpp
    module.cpp
    msgpack.cpp
    netron_output.cpp
    normalize_attributes.cpp
    normalize_ops.cpp
    op_enums.cpp
    operation.cpp
    optimize_module.cpp
    pad_calc.cpp
    param_utils.cpp
    pass.cpp
    pass_manager.cpp
    permutation.cpp
    preallocate_param.cpp
    process.cpp
    program.cpp
    propagate_constant.cpp
    promote_literals.cpp
    quantization.cpp
    quantize_int4.cpp
    quantize_8bits.cpp
    reduce_dims.cpp
    register_op.cpp
    register_target.cpp
    replace_allocate.cpp
    rewrite_reduce.cpp
    simplify_qdq.cpp
    split_reduce.cpp
    sqlite.cpp
    rewrite_gelu.cpp
    rewrite_low_precision.cpp
    rewrite_pooling.cpp
    rewrite_quantization.cpp
    rewrite_rnn.cpp
    schedule.cpp
    serialize.cpp
    shape.cpp
    shape_transform_descriptor.cpp
    simplify_algebra.cpp
    simplify_dyn_ops.cpp
    simplify_reshapes.cpp
    split_single_dyn_dim.cpp
    target.cpp
    tmp_dir.cpp
    truncate_float.cpp
    value.cpp
    verify_args.cpp
)


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
