/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2024 Advanced Micro Devices, Inc. All rights reserved.
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

#include "verify.hpp"
#include "verify_options.hpp"
#include "argument_parser.hpp"
#include "command.hpp"
#include "mlir.hpp"
#include "precision.hpp"
#include "passes.hpp"
#include "perf.hpp"
#include "models.hpp"
#include "marker_roctx.hpp"

#include <migraphx/tf.hpp>
#include <migraphx/onnx.hpp>
#ifdef MIGRAPHX_ENABLE_PYTHON
#include <migraphx/py.hpp>
#endif
#include <migraphx/stringutils.hpp>
#include <migraphx/convert_to_json.hpp>
#include <migraphx/load_save.hpp>
#include <migraphx/json.hpp>
#include <migraphx/version.h>

#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/eliminate_identity.hpp>
#include <migraphx/eliminate_pad.hpp>
#include <migraphx/generate.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/propagate_constant.hpp>
#include <migraphx/quantization.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/simplify_algebra.hpp>
#include <migraphx/simplify_reshapes.hpp>
#include <migraphx/register_target.hpp>

#include <migraphx/netron_output.hpp>

#include <fstream>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

inline std::string get_version()
{
    return "MIGraphX Version: " + std::to_string(MIGRAPHX_VERSION_MAJOR) + "." +
           std::to_string(MIGRAPHX_VERSION_MINOR) + "." + std::to_string(MIGRAPHX_VERSION_PATCH) +
           "." MIGRAPHX_VERSION_TWEAK;
}

struct loader
{
    std::string file;
    std::string file_type;
    unsigned batch              = 1;
    bool is_nhwc                = true;
    bool is_test                = false;
    unsigned trim               = 0;
    bool optimize               = false;
    bool mlir                   = false;
    bool skip_unknown_operators = false;
    bool brief                  = false;
    std::string output_type;
    std::string output;
    std::string default_dyn_dim;
    std::vector<std::string> param_dims;
    std::vector<std::string> dim_params;
    std::vector<std::string> dyn_param_dims;
    std::vector<std::string> output_names;
    std::vector<std::string> passes;

    void parse(argument_parser& ap)
    {
        ap(file, {}, ap.metavar("<input file>"), ap.file_exist(), ap.required(), ap.group("input"));
        ap(is_test,
           {"--test"},
           ap.help("Run a single GEMM to test MIGraphX"),
           ap.set_value(true),
           ap.group("input"));
        ap(file_type, {"--onnx"}, ap.help("Load as onnx"), ap.set_value("onnx"));
        ap(file_type, {"--tf"}, ap.help("Load as tensorflow"), ap.set_value("tf"));
        ap(file_type, {"--migraphx"}, ap.help("Load as MIGraphX"), ap.set_value("migraphx"));
        ap(file_type, {"--migraphx-json"}, ap.help("Load as MIGraphX JSON"), ap.set_value("json"));
        ap(batch,
           {"--batch"},
           ap.help("For a static model, sets default_dim_value size (commonly batch size). For a "
                   "dynamic batch model, sets the batch "
                   "size at runtime."));
        ap(is_nhwc, {"--nhwc"}, ap.help("Treat tensorflow format as nhwc"), ap.set_value(true));
        ap(skip_unknown_operators,
           {"--skip-unknown-operators"},
           ap.help("Skip unknown operators when parsing and continue to parse."),
           ap.set_value(true));
        ap(is_nhwc, {"--nchw"}, ap.help("Treat tensorflow format as nchw"), ap.set_value(false));
        ap(trim, {"--trim", "-t"}, ap.help("Trim instructions from the end"));
        ap(param_dims,
           {"--input-dim"},
           ap.help("Dim of a parameter (format: \"@name d1 d2 dn\")"),
           ap.append(),
           ap.nargs(2));
        ap(dim_params,
           {"--dim-param"},
           ap.help("Symbolic parameter dimension name (fixed / dynamic) - "
                   "(fixed format): \"@dim_param_name\" \"x\" / "
                   "(dynamic format): \"@dim_param_name\" \"{min:x, max:y, optimals:[o1,o2]}\""),
           ap.append(),
           ap.nargs(2));
        ap(dyn_param_dims,
           {"--dyn-input-dim"},
           ap.help("Dynamic dimensions of a parameter (format: \"@name_1\" \"[{min:x, max:y, "
                   "optimals:[o1,o2,...]}, dim2,dim3, ...]\", \"@name_2\", ... You can supply a "
                   "single integer value for a dimension to specify it as fixed."),
           ap.append(),
           ap.nargs(2));
        ap(default_dyn_dim,
           {"--default-dyn-dim"},
           ap.help("Default dynamic dimension (format: \"{min:x, max:y, optimals:[o1,o2]}\")."));
        ap(output_names,
           {"--output-names"},
           ap.help("Names of node output (format: \"name_1 name_2 name_n\")"),
           ap.append(),
           ap.nargs(2));
        ap(optimize, {"--optimize", "-O"}, ap.help("Optimize when reading"), ap.set_value(true));
        ap(mlir, {"--mlir"}, ap.help("Offload everything to mlir"), ap.set_value(true));
        ap(passes, {"--apply-pass", "-p"}, ap.help("Passes to apply to model"), ap.append());
        ap(output_type,
           {"--graphviz", "-g"},
           ap.help("Print out a graphviz representation."),
           ap.set_value("graphviz"));
        ap(brief, {"--brief"}, ap.help("Make the output brief."), ap.set_value(true));
        ap(output_type,
           {"--cpp"},
           ap.help("Print out the program as C++ program."),
           ap.set_value("cpp"));
        ap(output_type,
           {"--python", "--py"},
           ap.help("Print out the program as python program."),
           ap.set_value("py"));
        ap(output_type, {"--json"}, ap.help("Print out program as json."), ap.set_value("json"));
        ap(output_type,
           {"--text"},
           ap.help("Print out program in text format."),
           ap.set_value("text"));
        ap(output_type,
           {"--binary"},
           ap.help("Print out program in binary format."),
           ap.set_value("binary"));
        ap(output_type,
           {"--netron"},
           ap.help("Print out program as Netron readable json."),
           ap.set_value("netron"));
        ap(output, {"--output", "-o"}, ap.help("Output to file."));
    }

    static auto parse_param_dims(const std::vector<std::string>& param_dims_info)
    {
        std::unordered_map<std::string, std::vector<std::size_t>> map_input_dims;
        std::string name = "";
        for(auto&& x : param_dims_info)
        {
            if(x[0] == '@')
            {
                name = x.substr(1);
            }
            else
            {
                map_input_dims[name].push_back(value_parser<std::size_t>::apply(x));
            }
        }

        return map_input_dims;
    }

    static auto parse_dyn_dims_json(const std::string& dd_json)
    {
        // expecting a json string like "[{min:1,max:64,optimals:[1,2,4,8]},3,224,224]"
        auto v = from_json_string(convert_to_json(dd_json));
        std::vector<migraphx::shape::dynamic_dimension> dyn_dims;
        std::transform(v.begin(), v.end(), std::back_inserter(dyn_dims), [&](auto x) {
            if(x.is_object())
                return from_value<migraphx::shape::dynamic_dimension>(x);
            auto d = x.template to<std::size_t>();
            return migraphx::shape::dynamic_dimension{d, d};
        });
        return dyn_dims;
    }

    static auto parse_dyn_dims_map(const std::vector<std::string>& param_dyn_dims)
    {
        // expecting vector of strings formatted like
        // {"@param_name_0", "dd_json_0", "@param_name_1", "dd_json_1", ...}
        std::unordered_map<std::string, std::vector<shape::dynamic_dimension>> map_dyn_input_dims;
        std::string name = "";
        for(auto&& x : param_dyn_dims)
        {
            if(x[0] == '@')
            {
                name = x.substr(1);
            }
            else
            {
                map_dyn_input_dims[name] = parse_dyn_dims_json(x);
            }
        }
        return map_dyn_input_dims;
    }

    static auto parse_dim_params(const std::vector<std::string>& dim_params_info)
    {
        std::unordered_map<std::string, shape::dynamic_dimension> map_dim_params;
        std::string name = "";
        for(auto&& x : dim_params_info)
        {
            if(x[0] == '@')
            {
                name = x.substr(1);
            }
            else
            {
                if(std::all_of(x.begin(), x.end(), [](char ch) {
                       return std::isdigit(static_cast<unsigned char>(ch));
                   }))
                    map_dim_params[name] = {std::stoul(x), std::stoul(x)};
                else
                {
                    auto dyn_dim = parse_dyn_dims_json(x);
                    if(dyn_dim.size() != 1)
                        MIGRAPHX_THROW("dim_param must only specifiy one dimension");
                    map_dim_params[name] = dyn_dim.front();
                }
            }
        }

        return map_dim_params;
    }

    static auto parse_output_names(const std::vector<std::string>& output_names_info)
    {
        std::vector<std::string> output_node_names;
        std::transform(output_names_info.begin(),
                       output_names_info.end(),
                       std::back_inserter(output_node_names),
                       [&](auto x) { return value_parser<std::string>::apply(x); });

        return output_node_names;
    }

    tf_options get_tf_options() const
    {
        auto map_input_dims    = parse_param_dims(param_dims);
        auto output_node_names = parse_output_names(output_names);
        tf_options options;
        options.is_nhwc           = is_nhwc;
        options.batch_size        = batch;
        options.map_input_dims    = map_input_dims;
        options.output_node_names = output_node_names;
        return options;
    }

    onnx_options get_onnx_options() const
    {
        auto map_input_dims     = parse_param_dims(param_dims);
        auto map_dyn_input_dims = parse_dyn_dims_map(dyn_param_dims);
        auto map_dim_params     = parse_dim_params(dim_params);
        onnx_options options;
        if(default_dyn_dim.empty())
        {
            options.default_dim_value = batch;
        }
        else
        {
            auto v                        = from_json_string(convert_to_json(default_dyn_dim));
            options.default_dyn_dim_value = from_value<migraphx::shape::dynamic_dimension>(v);
        }
        options.skip_unknown_operators = skip_unknown_operators;
        options.print_program_on_error = true;
        options.map_input_dims         = map_input_dims;
        options.map_dyn_input_dims     = map_dyn_input_dims;
        options.dim_params             = map_dim_params;
        return options;
    }

    static std::string get_file_type(const std::string& file)
    {
        if(ends_with(file, ".onnx"))
            return "onnx";
        else if(ends_with(file, ".pb"))
            return "tf";
        else if(ends_with(file, ".json"))
            return "json";
        else if(ends_with(file, ".py"))
            return "py";
        else
            return "migraphx";
    }

    program load()
    {
        program p;
        if(is_test)
        {
            p = test_gemm();
        }
        else
        {
            if(file_type.empty())
            {
                file_type = get_file_type(file);
            }
            std::cout << "Reading: " << file << std::endl;
            if(file_type == "onnx")
            {
                p = parse_onnx(file, get_onnx_options());
            }
            else if(file_type == "tf")
            {
                p = parse_tf(file, get_tf_options());
            }
            else if(file_type == "json")
            {
                file_options options;
                options.format = "json";
                p              = migraphx::load(file, options);
            }
#ifdef MIGRAPHX_ENABLE_PYTHON
            else if(file_type == "py")
            {
                p = migraphx::load_py(file);
            }
#endif
            else if(file_type == "migraphx")
            {
                p = migraphx::load(file);
            }
        }
        if(trim > 0)
        {
            auto* mm  = p.get_main_module();
            auto last = std::prev(mm->end(), trim);
            mm->remove_instructions(last, mm->end());
        }
        // Remove unused variable when exporting to cpp
        if(output_type == "cpp")
            migraphx::run_passes(*p.get_main_module(), {migraphx::dead_code_elimination{}});
        if(optimize)
        {
            migraphx::run_passes(*p.get_main_module(),
                                 {
                                     migraphx::eliminate_identity{},
                                     migraphx::dead_code_elimination{},
                                     migraphx::simplify_algebra{},
                                     migraphx::dead_code_elimination{},
                                     migraphx::simplify_reshapes{},
                                     migraphx::dead_code_elimination{},
                                     migraphx::propagate_constant{},
                                     migraphx::dead_code_elimination{},
                                     migraphx::eliminate_pad{},
                                     migraphx::dead_code_elimination{},
                                 });
        }
        if(not passes.empty())
            migraphx::run_passes(p, get_passes(passes));
        if(mlir)
            offload_to_mlir(p);
        return p;
    }

    static void write(std::ostream& os, const std::vector<char>& buffer)
    {
        os.write(buffer.data(), buffer.size());
    }

    void save(const program& p) const
    {
        auto* os = &std::cout;
        std::ofstream fs;
        if(not output.empty())
        {
            fs.open(output, std::ios::binary);
            os = &fs;
        }

        std::string type = output_type;
        if(type.empty())
        {
            if(output.empty())
                type = "text";
            else
                type = "binary";
        }

        if(type == "py")
            p.print_py(*os);
        else if(type == "cpp")
            p.print_cpp(*os);
        else if(type == "graphviz")
            p.print_graph(*os, brief);
        else if(type == "text")
            *os << p << std::endl;
        else if(type == "json")
            *os << to_json_string(p.to_value()) << std::endl;
        else if(type == "binary")
            write(*os, save_buffer(p));
        else if(type == "netron")
            *os << make_netron_output(p) << std::endl;
    }
};

struct program_params
{
    std::vector<std::string> fill0{};
    std::vector<std::string> fill1{};
    void parse(argument_parser& ap)
    {
        ap(fill0, {"--fill0"}, ap.help("Fill parameter with 0s"), ap.append(), ap.nargs(2));
        ap(fill1, {"--fill1"}, ap.help("Fill parameter with 1s"), ap.append(), ap.nargs(2));
    }

    auto generate(const program& p, const target& t, bool offload, unsigned batch)
    {
        parameter_map m;
        auto param_shapes = p.get_parameter_shapes();
        std::unordered_map<std::string, shape> static_param_shapes;
        std::transform(
            param_shapes.cbegin(),
            param_shapes.cend(),
            std::inserter(static_param_shapes, static_param_shapes.end()),
            [&](const auto& x) { return std::make_pair(x.first, x.second.to_static(batch)); });
        for(auto&& s : fill0)
            m[s] = fill_argument(static_param_shapes.at(s), 0);
        for(auto&& s : fill1)
            m[s] = fill_argument(static_param_shapes.at(s), 1);
        fill_param_map(m, static_param_shapes, t, offload);
        return m;
    }
};

struct compiler_target
{
#ifdef HAVE_GPU
    std::string target_name = "gpu";
#elif defined(HAVE_CPU)
    std::string target_name = "cpu";
#elif defined(HAVE_FPGA)
    std::string target_name = "fpga";
#else
    std::string target_name = "ref";
#endif

    void parse(argument_parser& ap)
    {
        ap(target_name, {"--gpu"}, ap.help("Compile on the gpu"), ap.set_value("gpu"));
        ap(target_name, {"--cpu"}, ap.help("Compile on the cpu"), ap.set_value("cpu"));
        ap(target_name,
           {"--ref"},
           ap.help("Compile on the reference implementation"),
           ap.set_value("ref"));
    }

    target get_target() const { return make_target(target_name); }
};

struct compiler
{
    loader l;
    program_params parameters;
    compiler_target ct;
    compile_options co;
    bool to_fp16 = false;
    bool to_bf16 = false;
    bool to_fp8  = false;
    bool to_int8 = false;
    bool to_int4 = false;

    std::vector<std::string> fill0;
    std::vector<std::string> fill1;
    void parse(argument_parser& ap)
    {
        l.parse(ap);
        parameters.parse(ap);
        ct.parse(ap);
        ap(co.offload_copy,
           {"--enable-offload-copy"},
           ap.help("Enable implicit offload copying"),
           ap.set_value(true));
        ap(co.fast_math,
           {"--disable-fast-math"},
           ap.help("Disable fast math optimization"),
           ap.set_value(false));
        ap(co.exhaustive_tune,
           {"--exhaustive-tune"},
           ap.help("Exhastively search for best tuning parameters for kernels"),
           ap.set_value(true));
        ap(to_fp16, {"--fp16"}, ap.help("Quantize for fp16"), ap.set_value(true));
        ap(to_bf16, {"--bf16"}, ap.help("Quantize for bf16"), ap.set_value(true));
        ap(to_int8, {"--int8"}, ap.help("Quantize for int8"), ap.set_value(true));
        ap(to_fp8, {"--fp8"}, ap.help("Quantize for fp8"), ap.set_value(true));
        ap(to_int4, {"--int4-weights"}, ap.help("Quantize weights for int4"), ap.set_value(true));
    }

    auto params(const program& p)
    {
        return parameters.generate(p, ct.get_target(), co.offload_copy, l.batch);
    }

    auto host_params(const program& p)
    {
        return parameters.generate(p, ct.get_target(), true, l.batch);
    }

    program compile()
    {
        auto p = l.load();
        // Dont compile if its already been compiled

        if(p.is_compiled())
        {
            if(ct.target_name == "gpu")
            {
                if(is_offload_copy_set(p) and not co.offload_copy)
                {
                    std::cout
                        << "[WARNING]: MIGraphX program was likely compiled with offload_copy "
                           "set, Try "
                           "passing "
                           "`--enable-offload-copy` if program run fails.\n";
                }
                else if(not is_offload_copy_set(p) and co.offload_copy)
                {
                    std::cout << "[WARNING]: MIGraphX program was likely compiled without "
                                 "offload_copy set, Try "
                                 "removing "
                                 "`--enable-offload-copy` if program run "
                                 "fails.\n";
                }
            }

            return p;
        }
        auto t = ct.get_target();
        if(to_fp16)
        {
            quantize_fp16(p);
        }
        if(to_bf16)
        {
            quantize_bf16(p);
        }
        if(to_int8)
        {
            quantize_int8(p, t, {host_params(p)});
        }
        if(to_fp8)
        {
            quantize_fp8(p, t, {host_params(p)});
        }
        if(to_int4)
        {
            quantize_int4_weights(p);
        }
        p.compile(t, co);
        l.save(p);
        return p;
    }
};

struct read : command<read>
{
    loader l;
    void parse(argument_parser& ap) { l.parse(ap); }

    void run()
    {
        auto p = l.load();
        l.save(p);
    }
};

struct params : command<params>
{
    loader l;
    void parse(argument_parser& ap) { l.parse(ap); }

    void run()
    {
        auto p = l.load();
        for(auto&& param : p.get_parameter_shapes())
            std::cout << param.first << ": " << param.second << std::endl;
    }
};

struct verify : command<verify>
{
    compiler c;
    std::optional<double> rms_tol;
    std::optional<double> atol;
    std::optional<double> rtol;
    bool per_instruction = false;
    bool reduce          = false;
    bool bisect          = false;
    verify_options vo;
    void parse(argument_parser& ap)
    {
        c.parse(ap);
        ap(rms_tol, {"--rms-tol"}, ap.help("Tolerance for the RMS error"));
        ap(atol, {"--atol"}, ap.help("Tolerance for the elementwise absolute difference"));
        ap(rtol, {"--rtol"}, ap.help("Tolerance for the elementwise relative difference"));
        ap(per_instruction,
           {"-i", "--per-instruction"},
           ap.help("Verify each instruction"),
           ap.set_value(true));
        ap(reduce, {"-r", "--reduce"}, ap.help("Reduce program and verify"), ap.set_value(true));
        ap(bisect, {"-b", "--bisect"}, ap.help("Bisect program and verify"), ap.set_value(true));
        ap(vo.ref_use_double,
           {"--ref-use-double"},
           ap.help("Convert floating point values to double on ref"),
           ap.set_value(true));
    }

    void run()
    {
        auto p = c.l.load();
        c.l.save(p);
        std::cout << p << std::endl;

        auto t = c.ct.get_target();
        auto m = c.parameters.generate(p, t, true, c.l.batch);

        if(c.to_fp16)
        {
            vo.quantize = precision::fp16;
        }
        if(c.to_bf16)
        {
            vo.quantize = precision::bf16;
        }
        if(c.to_int8)
        {
            vo.quantize = precision::int8;
        }

        auto tols = get_tolerances(p, vo, rms_tol, atol, rtol);
        std::cout << "rms_tol: " << tols.rms_tol << std::endl;
        std::cout << "atol: " << tols.atol << std::endl;
        std::cout << "rtol: " << tols.rtol << std::endl;

        if(per_instruction)
        {
            verify_instructions(p, t, c.co, vo, tols);
        }
        else if(reduce)
        {
            verify_reduced_program(p, t, c.co, vo, m, tols);
        }
        else if(bisect)
        {
            verify_bisected_program(p, t, c.co, vo, m, tols);
        }
        else
        {
            verify_program(c.l.file, p, t, c.co, vo, m, tols);
        }
    }
};

struct compile : command<compile>
{
    compiler c;
    void parse(argument_parser& ap) { c.parse(ap); }

    void run()
    {
        std::cout << "Compiling ... " << std::endl;
        c.compile();
    }
};

struct run_cmd : command<run_cmd>
{
    compiler c;
    void parse(argument_parser& ap) { c.parse(ap); }

    void run()
    {
        std::cout << "Compiling ... " << std::endl;
        auto p = c.compile();
        std::cout << "Allocating params ... " << std::endl;
        auto m = c.params(p);
        p.eval(m);
        std::cout << p << std::endl;
    }
};

struct time_cmd : command<time_cmd>
{
    compiler c;
    unsigned n = 100;
    void parse(argument_parser& ap)
    {
        ap(n, {"--iterations", "-n"}, ap.help("Number of iterations to run."));
        c.parse(ap);
    }

    void run()
    {
        std::cout << "Compiling ... " << std::endl;
        auto p = c.compile();
        std::cout << "Allocating params ... " << std::endl;
        auto m = c.params(p);
        std::cout << "Running ... " << std::endl;
        double t = time_run(p, m, n);
        std::cout << "Total time: " << t << "ms" << std::endl;
    }
};

struct perf : command<perf>
{
    compiler c;
    unsigned n    = 100;
    bool detailed = false;
    void parse(argument_parser& ap)
    {
        c.parse(ap);
        ap(n, {"--iterations", "-n"}, ap.help("Number of iterations to run for perf report"));
        ap(detailed,
           {"--detailed", "-d"},
           ap.help("Show a more detailed summary report"),
           ap.set_value(true));
    }

    void run()
    {
        std::cout << "Compiling ... " << std::endl;
        auto p = c.compile();
        std::cout << "Allocating params ... " << std::endl;
        auto m = c.params(p);
        std::cout << "Running performance report ... " << std::endl;
        p.perf_report(std::cout, n, m, c.l.batch, detailed);
    }
};

struct roctx : command<roctx>
{
    compiler c;
    void parse(argument_parser& ap) { c.parse(ap); }

    void run()
    {
        std::cout << "Compiling ... " << std::endl;
        auto p = c.compile();
        std::cout << "Allocating params ... " << std::endl;
        auto m = c.params(p);
        std::cout << "rocTX:\tLoading rocTX library..." << std::endl;
        auto rtx = create_marker_roctx();
        p.mark(m, std::move(rtx));
    }
};

struct op : command<op>
{
    bool show_ops = false;
    std::string op_name{};
    void parse(argument_parser& ap)
    {
        ap(op_name, {}, ap.metavar("<MIGraphX operator name>"));
        ap(show_ops,
           {"--list", "-l"},
           ap.help("List all the operators of MIGraphX"),
           ap.set_value(true));
    }
    void run() const
    {
        if(show_ops)
        {
            for(const auto& name : get_operators())
                std::cout << name << std::endl;
        }
        else
        {
            auto op = load_op(op_name);
            std::cout << op_name << ": " << std::endl;
            std::cout << to_pretty_json_string(op.to_value()) << std::endl;
        }
    }
};

struct onnx : command<onnx>
{
    bool show_ops = false;
    void parse(argument_parser& ap)
    {
        ap(show_ops,
           {"--list", "-l"},
           ap.help("List all onnx operators supported by MIGraphX"),
           ap.set_value(true));
    }
    void run() const
    {
        if(show_ops)
        {
            for(const auto& name : get_onnx_operators())
                std::cout << name << std::endl;
        }
    }
};

struct tf : command<tf>
{
    bool show_ops = false;
    void parse(argument_parser& ap)
    {
        ap(show_ops,
           {"--list", "-l"},
           ap.help("List all tf operators supported by MIGraphX"),
           ap.set_value(true));
    }
    void run() const
    {
        if(show_ops)
        {
            for(const auto& name : get_tf_operators())
                std::cout << name << std::endl;
        }
    }
};

struct main_command
{
    static std::string get_command_help(const std::string& title = colorize(color::fg_yellow,
                                                                            "COMMANDS:"))
    {
        std::string result = title + "\n";
        std::vector<std::string> commands(get_commands().size());
        std::transform(get_commands().begin(),
                       get_commands().end(),
                       commands.begin(),
                       [](const auto& p) { return colorize(color::fg_green, p.first); });
        std::sort(commands.begin(), commands.end());
        return std::accumulate(commands.begin(), commands.end(), result, [](auto r, auto&& s) {
            return r + "    " + s + "\n";
        });
    }
    void parse(argument_parser& ap)
    {
        std::string version_str = get_version();
        ap(wrong_commands, {}, ap.metavar("<command>"), ap.append());
        ap(nullptr, {"-h", "--help"}, ap.help("Show help"), ap.show_help(get_command_help()));
        ap(nullptr,
           {"-v", "--version"},
           ap.help("Show MIGraphX version"),
           ap.show_help(version_str));
        ap(nullptr, {"--ort-sha"}, ap.help("Show MIGraphX onnx runtime SHA"));

        // Trim command off of exe name
        ap.set_exe_name(ap.get_exe_name().substr(0, ap.get_exe_name().size() - 5));
        ap.set_exe_name_to(exe_name);
    }

    std::vector<std::string> wrong_commands{};
    std::string exe_name = "<exe>";

    void run()
    {
        std::cout << color::fg_red << color::bold << "error: " << color::reset;
        auto it = std::find_if(wrong_commands.begin(), wrong_commands.end(), [](const auto& c) {
            return get_commands().count(c) > 0;
        });
        if(it == wrong_commands.end())
        {
            std::cout << "'" << color::fg_yellow << wrong_commands.front() << color::reset
                      << "' is not a valid command." << std::endl;
            std::cout << get_command_help("Available commands:");
        }
        else
        {
            std::cout << "command '" << color::fg_yellow << *it << color::reset
                      << "' must be first argument" << std::endl;
            std::cout << std::endl;

            std::cout << color::fg_yellow << "USAGE:" << color::reset << std::endl;
            std::cout << "    " << exe_name << " " << *it << " <options>" << std::endl;
        }
        std::cout << std::endl;
    }
};

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx

using namespace migraphx::driver; // NOLINT
int main(int argc, const char* argv[], const char* envp[])
{
    std::vector<std::string> args(argv + 1, argv + argc);
    // no argument, print the help infomration by default
    if(args.empty())
    {
        args.push_back("-h");
    }

    auto&& m = get_commands();
    auto cmd = args.front();

    if(cmd == "--ort-sha")
    {
        std::cout << MIGRAPHX_ORT_SHA1 << std::endl;
        return 0;
    }
    if(cmd == "-v" or cmd == "--version")
    {
        std::cout << get_version() << std::endl;
        return 0;
    }

    if(m.count(cmd) > 0)
    {
        std::string driver_invocation =
            std::string(argv[0]) + " " + migraphx::to_string_range(args, " ");
        std::cout << "Running [ " << get_version() << " ]: " << driver_invocation << std::endl;

        for(const char** env = envp; *env != nullptr; ++env)
        {
            std::string env_var(*env);
            size_t pos = env_var.find('=');
            if(pos != std::string::npos)
            {
                std::string key = env_var.substr(0, pos);
                if(key.find("MIGRAPHX") != std::string::npos)
                {
                    std::cout << env_var << std::endl;
                }
            }
        }

        m.at(cmd)(argv[0],
                  {args.begin() + 1, args.end()}); // run driver command found in commands map

        std::cout << "[ " << get_version() << " ] Complete: " << driver_invocation << std::endl;
    }
    else
    {
        run_command<main_command>(argv[0], args);
    }

    return 0;
}
