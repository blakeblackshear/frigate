/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2022 Advanced Micro Devices, Inc. All rights reserved.
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

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/numpy.h>
#include <migraphx/program.hpp>
#include <migraphx/instruction_ref.hpp>
#include <migraphx/operation.hpp>
#include <migraphx/quantization.hpp>
#include <migraphx/generate.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/ref/target.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/tf.hpp>
#include <migraphx/onnx.hpp>
#include <migraphx/load_save.hpp>
#include <migraphx/register_target.hpp>
#include <migraphx/json.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/op/common.hpp>

#ifdef HAVE_GPU
#include <migraphx/gpu/hip.hpp>
#endif

using half   = half_float::half;
namespace py = pybind11;

#ifdef __clang__
#define MIGRAPHX_PUSH_UNUSED_WARNING \
    _Pragma("clang diagnostic push") \
        _Pragma("clang diagnostic ignored \"-Wused-but-marked-unused\"")
#define MIGRAPHX_POP_WARNING _Pragma("clang diagnostic pop")
#else
#define MIGRAPHX_PUSH_UNUSED_WARNING
#define MIGRAPHX_POP_WARNING
#endif
#define MIGRAPHX_PYBIND11_MODULE(...) \
    MIGRAPHX_PUSH_UNUSED_WARNING      \
    PYBIND11_MODULE(__VA_ARGS__)      \
    MIGRAPHX_POP_WARNING

#define MIGRAPHX_PYTHON_GENERATE_SHAPE_ENUM(x, t) .value(#x, migraphx::shape::type_t::x)
namespace migraphx {

migraphx::value to_value(py::kwargs kwargs);
migraphx::value to_value(py::list lst);

template <class T, class F>
void visit_py(T x, F f)
{
    if(py::isinstance<py::kwargs>(x))
    {
        f(to_value(x.template cast<py::kwargs>()));
    }
    else if(py::isinstance<py::list>(x))
    {
        f(to_value(x.template cast<py::list>()));
    }
    else if(py::isinstance<py::bool_>(x))
    {
        f(x.template cast<bool>());
    }
    else if(py::isinstance<py::int_>(x) or py::hasattr(x, "__index__"))
    {
        f(x.template cast<int>());
    }
    else if(py::isinstance<py::float_>(x))
    {
        f(x.template cast<float>());
    }
    else if(py::isinstance<py::str>(x))
    {
        f(x.template cast<std::string>());
    }
    else if(py::isinstance<migraphx::shape::dynamic_dimension>(x))
    {
        f(migraphx::to_value(x.template cast<migraphx::shape::dynamic_dimension>()));
    }
    else
    {
        MIGRAPHX_THROW("VISIT_PY: Unsupported data type!");
    }
}

migraphx::value to_value(py::list lst)
{
    migraphx::value v = migraphx::value::array{};
    for(auto val : lst)
    {
        visit_py(val, [&](auto py_val) { v.push_back(py_val); });
    }

    return v;
}

migraphx::value to_value(py::kwargs kwargs)
{
    migraphx::value v = migraphx::value::object{};

    for(auto arg : kwargs)
    {
        auto&& key = py::str(arg.first);
        auto&& val = arg.second;
        visit_py(val, [&](auto py_val) { v[key] = py_val; });
    }
    return v;
}
} // namespace migraphx

namespace pybind11 {
namespace detail {

template <>
struct npy_format_descriptor<half>
{
    static std::string format()
    {
        // following: https://docs.python.org/3/library/struct.html#format-characters
        return "e";
    }
    static constexpr auto name() { return _("half"); }
};

} // namespace detail
} // namespace pybind11

template <class F>
void visit_type(const migraphx::shape& s, F f)
{
    s.visit_type(f);
}

template <class T, class F>
void visit(const migraphx::raw_data<T>& x, F f)
{
    x.visit(f);
}

template <class F>
void visit_types(F f)
{
    migraphx::shape::visit_types(f);
}

template <class T>
py::buffer_info to_buffer_info(T& x)
{
    migraphx::shape s = x.get_shape();
    assert(s.type() != migraphx::shape::tuple_type);
    if(s.dynamic())
        MIGRAPHX_THROW("MIGRAPHX PYTHON: dynamic shape argument passed to to_buffer_info");
    auto strides = s.strides();
    std::transform(
        strides.begin(), strides.end(), strides.begin(), [&](auto i) { return i * s.type_size(); });
    py::buffer_info b;
    visit_type(s, [&](auto as) {
        // migraphx use int8_t data to store bool type, we need to
        // explicitly specify the data type as bool for python
        if(s.type() == migraphx::shape::bool_type)
        {
            b = py::buffer_info(x.data(),
                                as.size(),
                                py::format_descriptor<bool>::format(),
                                s.ndim(),
                                s.lens(),
                                strides);
        }
        else
        {
            b = py::buffer_info(x.data(),
                                as.size(),
                                py::format_descriptor<decltype(as())>::format(),
                                s.ndim(),
                                s.lens(),
                                strides);
        }
    });
    return b;
}

migraphx::shape to_shape(const py::buffer_info& info)
{
    migraphx::shape::type_t t;
    std::size_t n = 0;
    visit_types([&](auto as) {
        if(info.format == py::format_descriptor<decltype(as())>::format() or
           (info.format == "l" and py::format_descriptor<decltype(as())>::format() == "q") or
           (info.format == "L" and py::format_descriptor<decltype(as())>::format() == "Q"))
        {
            t = as.type_enum();
            n = sizeof(as());
        }
        else if(info.format == "?" and py::format_descriptor<decltype(as())>::format() == "b")
        {
            t = migraphx::shape::bool_type;
            n = sizeof(bool);
        }
    });

    if(n == 0)
    {
        MIGRAPHX_THROW("MIGRAPHX PYTHON: Unsupported data type " + info.format);
    }

    auto strides = info.strides;
    std::transform(strides.begin(), strides.end(), strides.begin(), [&](auto i) -> std::size_t {
        return n > 0 ? i / n : 0;
    });

    // scalar support
    if(info.shape.empty())
    {
        return migraphx::shape{t};
    }
    else
    {
        return migraphx::shape{t, info.shape, strides};
    }
}

MIGRAPHX_PYBIND11_MODULE(migraphx, m)
{
    py::class_<migraphx::shape> shape_cls(m, "shape");
    shape_cls
        .def(py::init([](py::kwargs kwargs) {
            auto v = migraphx::to_value(kwargs);
            auto t = migraphx::shape::parse_type(v.get("type", "float"));
            if(v.contains("dyn_dims"))
            {
                auto dyn_dims =
                    migraphx::from_value<std::vector<migraphx::shape::dynamic_dimension>>(
                        v.at("dyn_dims"));
                return migraphx::shape(t, dyn_dims);
            }
            auto lens = v.get<std::size_t>("lens", {1});
            if(v.contains("strides"))
                return migraphx::shape(t, lens, v.at("strides").to_vector<std::size_t>());
            else
                return migraphx::shape(t, lens);
        }))
        .def("type", &migraphx::shape::type)
        .def("lens", &migraphx::shape::lens)
        .def("strides", &migraphx::shape::strides)
        .def("ndim", &migraphx::shape::ndim)
        .def("elements", &migraphx::shape::elements)
        .def("bytes", &migraphx::shape::bytes)
        .def("type_string", &migraphx::shape::type_string)
        .def("type_size", &migraphx::shape::type_size)
        .def("dyn_dims", &migraphx::shape::dyn_dims)
        .def("packed", &migraphx::shape::packed)
        .def("transposed", &migraphx::shape::transposed)
        .def("broadcasted", &migraphx::shape::broadcasted)
        .def("standard", &migraphx::shape::standard)
        .def("scalar", &migraphx::shape::scalar)
        .def("dynamic", &migraphx::shape::dynamic)
        .def("__eq__", std::equal_to<migraphx::shape>{})
        .def("__ne__", std::not_equal_to<migraphx::shape>{})
        .def("__repr__", [](const migraphx::shape& s) { return migraphx::to_string(s); });

    py::enum_<migraphx::shape::type_t>(shape_cls, "type_t")
        MIGRAPHX_SHAPE_VISIT_TYPES(MIGRAPHX_PYTHON_GENERATE_SHAPE_ENUM);

    py::class_<migraphx::shape::dynamic_dimension>(shape_cls, "dynamic_dimension")
        .def(py::init<>())
        .def(py::init<std::size_t, std::size_t>())
        .def(py::init<std::size_t, std::size_t, std::set<std::size_t>>())
        .def_readwrite("min", &migraphx::shape::dynamic_dimension::min)
        .def_readwrite("max", &migraphx::shape::dynamic_dimension::max)
        .def_readwrite("optimals", &migraphx::shape::dynamic_dimension::optimals)
        .def("is_fixed", &migraphx::shape::dynamic_dimension::is_fixed);

    py::class_<migraphx::argument>(m, "argument", py::buffer_protocol())
        .def_buffer([](migraphx::argument& x) -> py::buffer_info { return to_buffer_info(x); })
        .def(py::init([](py::buffer b) {
            py::buffer_info info = b.request();
            return migraphx::argument(to_shape(info), info.ptr);
        }))
        .def("get_shape", &migraphx::argument::get_shape)
        .def("data_ptr",
             [](migraphx::argument& x) { return reinterpret_cast<std::uintptr_t>(x.data()); })
        .def("tolist",
             [](migraphx::argument& x) {
                 py::list l{x.get_shape().elements()};
                 visit(x, [&](auto data) { l = py::cast(data.to_vector()); });
                 return l;
             })
        .def("__eq__", std::equal_to<migraphx::argument>{})
        .def("__ne__", std::not_equal_to<migraphx::argument>{})
        .def("__repr__", [](const migraphx::argument& x) { return migraphx::to_string(x); });

    py::class_<migraphx::target>(m, "target");

    py::class_<migraphx::instruction_ref>(m, "instruction_ref")
        .def("shape", [](migraphx::instruction_ref i) { return i->get_shape(); })
        .def("op", [](migraphx::instruction_ref i) { return i->get_operator(); });

    py::class_<migraphx::module, std::unique_ptr<migraphx::module, py::nodelete>>(m, "module")
        .def("print", [](const migraphx::module& mm) { std::cout << mm << std::endl; })
        .def(
            "add_instruction",
            [](migraphx::module& mm,
               const migraphx::operation& op,
               std::vector<migraphx::instruction_ref>& args,
               std::vector<migraphx::module*>& mod_args) {
                return mm.add_instruction(op, args, mod_args);
            },
            py::arg("op"),
            py::arg("args"),
            py::arg("mod_args") = std::vector<migraphx::module*>{})
        .def(
            "add_literal",
            [](migraphx::module& mm, py::buffer data) {
                py::buffer_info info = data.request();
                auto literal_shape   = to_shape(info);
                return mm.add_literal(literal_shape, reinterpret_cast<char*>(info.ptr));
            },
            py::arg("data"))
        .def(
            "add_parameter",
            [](migraphx::module& mm, const std::string& name, const migraphx::shape shape) {
                return mm.add_parameter(name, shape);
            },
            py::arg("name"),
            py::arg("shape"))
        .def(
            "add_return",
            [](migraphx::module& mm, std::vector<migraphx::instruction_ref>& args) {
                return mm.add_return(args);
            },
            py::arg("args"))
        .def("__repr__", [](const migraphx::module& mm) { return migraphx::to_string(mm); });

    py::class_<migraphx::program>(m, "program")
        .def(py::init([]() { return migraphx::program(); }))
        .def("get_parameter_names", &migraphx::program::get_parameter_names)
        .def("get_parameter_shapes", &migraphx::program::get_parameter_shapes)
        .def("get_output_shapes", &migraphx::program::get_output_shapes)
        .def("is_compiled", &migraphx::program::is_compiled)
        .def(
            "compile",
            [](migraphx::program& p,
               const migraphx::target& t,
               bool offload_copy,
               bool fast_math,
               bool exhaustive_tune) {
                migraphx::compile_options options;
                options.offload_copy    = offload_copy;
                options.fast_math       = fast_math;
                options.exhaustive_tune = exhaustive_tune;
                p.compile(t, options);
            },
            py::arg("t"),
            py::arg("offload_copy")    = true,
            py::arg("fast_math")       = true,
            py::arg("exhaustive_tune") = false)
        .def("get_main_module", [](const migraphx::program& p) { return p.get_main_module(); })
        .def(
            "create_module",
            [](migraphx::program& p, const std::string& name) { return p.create_module(name); },
            py::arg("name"))
        .def("run",
             [](migraphx::program& p, py::dict params) {
                 migraphx::parameter_map pm;
                 for(auto x : params)
                 {
                     std::string key      = x.first.cast<std::string>();
                     py::buffer b         = x.second.cast<py::buffer>();
                     py::buffer_info info = b.request();
                     pm[key]              = migraphx::argument(to_shape(info), info.ptr);
                 }
                 return p.eval(pm);
             })
        .def("run_async",
             [](migraphx::program& p,
                py::dict params,
                std::uintptr_t stream,
                std::string stream_name) {
                 migraphx::parameter_map pm;
                 for(auto x : params)
                 {
                     std::string key      = x.first.cast<std::string>();
                     py::buffer b         = x.second.cast<py::buffer>();
                     py::buffer_info info = b.request();
                     pm[key]              = migraphx::argument(to_shape(info), info.ptr);
                 }
                 migraphx::execution_environment exec_env{
                     migraphx::any_ptr(reinterpret_cast<void*>(stream), stream_name), true};
                 return p.eval(pm, exec_env);
             })
        .def("sort", &migraphx::program::sort)
        .def("print", [](const migraphx::program& p) { std::cout << p << std::endl; })
        .def("__eq__", std::equal_to<migraphx::program>{})
        .def("__ne__", std::not_equal_to<migraphx::program>{})
        .def("__repr__", [](const migraphx::program& p) { return migraphx::to_string(p); });

    py::class_<migraphx::operation> op(m, "op");
    op.def(py::init([](const std::string& name, py::kwargs kwargs) {
          migraphx::value v = migraphx::value::object{};
          if(kwargs)
          {
              v = migraphx::to_value(kwargs);
          }
          return migraphx::make_op(name, v);
      }))
        .def("name", &migraphx::operation::name);

    py::enum_<migraphx::op::pooling_mode>(op, "pooling_mode")
        .value("average", migraphx::op::pooling_mode::average)
        .value("max", migraphx::op::pooling_mode::max)
        .value("lpnorm", migraphx::op::pooling_mode::lpnorm);

    py::enum_<migraphx::op::rnn_direction>(op, "rnn_direction")
        .value("forward", migraphx::op::rnn_direction::forward)
        .value("reverse", migraphx::op::rnn_direction::reverse)
        .value("bidirectional", migraphx::op::rnn_direction::bidirectional);

    m.def(
        "argument_from_pointer",
        [](const migraphx::shape shape, const int64_t address) {
            return migraphx::argument(shape, reinterpret_cast<void*>(address));
        },
        py::arg("shape"),
        py::arg("address"));

    m.def(
        "parse_tf",
        [](const std::string& filename,
           bool is_nhwc,
           unsigned int batch_size,
           std::unordered_map<std::string, std::vector<std::size_t>> map_input_dims,
           std::vector<std::string> output_names) {
            return migraphx::parse_tf(
                filename, migraphx::tf_options{is_nhwc, batch_size, map_input_dims, output_names});
        },
        "Parse tf protobuf (default format is nhwc)",
        py::arg("filename"),
        py::arg("is_nhwc")        = true,
        py::arg("batch_size")     = 1,
        py::arg("map_input_dims") = std::unordered_map<std::string, std::vector<std::size_t>>(),
        py::arg("output_names")   = std::vector<std::string>());

    m.def(
        "parse_onnx",
        [](const std::string& filename,
           unsigned int default_dim_value,
           migraphx::shape::dynamic_dimension default_dyn_dim_value,
           std::unordered_map<std::string, std::vector<std::size_t>> map_input_dims,
           std::unordered_map<std::string, std::vector<migraphx::shape::dynamic_dimension>>
               map_dyn_input_dims,
           bool skip_unknown_operators,
           bool print_program_on_error,
           int64_t max_loop_iterations) {
            migraphx::onnx_options options;
            options.default_dim_value      = default_dim_value;
            options.default_dyn_dim_value  = default_dyn_dim_value;
            options.map_input_dims         = map_input_dims;
            options.map_dyn_input_dims     = map_dyn_input_dims;
            options.skip_unknown_operators = skip_unknown_operators;
            options.print_program_on_error = print_program_on_error;
            options.max_loop_iterations    = max_loop_iterations;
            return migraphx::parse_onnx(filename, options);
        },
        "Parse onnx file",
        py::arg("filename"),
        py::arg("default_dim_value")     = 0,
        py::arg("default_dyn_dim_value") = migraphx::shape::dynamic_dimension{1, 1},
        py::arg("map_input_dims") = std::unordered_map<std::string, std::vector<std::size_t>>(),
        py::arg("map_dyn_input_dims") =
            std::unordered_map<std::string, std::vector<migraphx::shape::dynamic_dimension>>(),
        py::arg("skip_unknown_operators") = false,
        py::arg("print_program_on_error") = false,
        py::arg("max_loop_iterations")    = 10);

    m.def(
        "parse_onnx_buffer",
        [](const std::string& onnx_buffer,
           unsigned int default_dim_value,
           migraphx::shape::dynamic_dimension default_dyn_dim_value,
           std::unordered_map<std::string, std::vector<std::size_t>> map_input_dims,
           std::unordered_map<std::string, std::vector<migraphx::shape::dynamic_dimension>>
               map_dyn_input_dims,
           bool skip_unknown_operators,
           bool print_program_on_error) {
            migraphx::onnx_options options;
            options.default_dim_value      = default_dim_value;
            options.default_dyn_dim_value  = default_dyn_dim_value;
            options.map_input_dims         = map_input_dims;
            options.map_dyn_input_dims     = map_dyn_input_dims;
            options.skip_unknown_operators = skip_unknown_operators;
            options.print_program_on_error = print_program_on_error;
            return migraphx::parse_onnx_buffer(onnx_buffer, options);
        },
        "Parse onnx file",
        py::arg("filename"),
        py::arg("default_dim_value")     = 0,
        py::arg("default_dyn_dim_value") = migraphx::shape::dynamic_dimension{1, 1},
        py::arg("map_input_dims") = std::unordered_map<std::string, std::vector<std::size_t>>(),
        py::arg("map_dyn_input_dims") =
            std::unordered_map<std::string, std::vector<migraphx::shape::dynamic_dimension>>(),
        py::arg("skip_unknown_operators") = false,
        py::arg("print_program_on_error") = false);

    m.def(
        "load",
        [](const std::string& name, const std::string& format) {
            migraphx::file_options options;
            options.format = format;
            return migraphx::load(name, options);
        },
        "Load MIGraphX program",
        py::arg("filename"),
        py::arg("format") = "msgpack");

    m.def(
        "save",
        [](const migraphx::program& p, const std::string& name, const std::string& format) {
            migraphx::file_options options;
            options.format = format;
            return migraphx::save(p, name, options);
        },
        "Save MIGraphX program",
        py::arg("p"),
        py::arg("filename"),
        py::arg("format") = "msgpack");

    m.def("get_target", &migraphx::make_target);
    m.def("create_argument", [](const migraphx::shape& s, const std::vector<double>& values) {
        if(values.size() != s.elements())
            MIGRAPHX_THROW("Values and shape elements do not match");
        migraphx::argument a{s};
        a.fill(values.begin(), values.end());
        return a;
    });
    m.def("generate_argument", &migraphx::generate_argument, py::arg("s"), py::arg("seed") = 0);
    m.def("fill_argument", &migraphx::fill_argument, py::arg("s"), py::arg("value"));
    m.def("quantize_fp16",
          &migraphx::quantize_fp16,
          py::arg("prog"),
          py::arg("ins_names") = std::vector<std::string>{"all"});
    m.def("quantize_int8",
          &migraphx::quantize_int8,
          py::arg("prog"),
          py::arg("t"),
          py::arg("calibration") = std::vector<migraphx::parameter_map>{},
          py::arg("ins_names")   = std::vector<std::string>{"dot", "convolution"});

#ifdef HAVE_GPU
    m.def("allocate_gpu", &migraphx::gpu::allocate_gpu, py::arg("s"), py::arg("host") = false);
    m.def("to_gpu", &migraphx::gpu::to_gpu, py::arg("arg"), py::arg("host") = false);
    m.def("from_gpu", &migraphx::gpu::from_gpu);
    m.def("gpu_sync", [] { migraphx::gpu::gpu_sync(); });
#endif

#ifdef VERSION_INFO
    m.attr("__version__") = VERSION_INFO;
#else
    m.attr("__version__") = "dev";
#endif
}
