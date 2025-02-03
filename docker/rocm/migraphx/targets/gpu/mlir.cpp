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
#include <algorithm>
#include <cstdint>
#include <migraphx/shape.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/gpu/mlir.hpp>
#include <mlir-c/Dialect/RockEnums.h>
#include <numeric>
#include <ostream>

#ifdef MIGRAPHX_MLIR
#include <mlir-c/IR.h>
#include <mlir-c/BuiltinAttributes.h>
#include <mlir-c/BuiltinTypes.h>
#include <mlir-c/Diagnostics.h>
#include <mlir-c/Dialect/MIGraphX.h>
#include <mlir-c/Dialect/Rock.h>
#include <mlir-c/IntegerSet.h>
#include <mlir-c/Pass.h>
#include <mlir-c/Support.h>
#include <mutex>
#if !defined(MLIR_MIGRAPHX_DIALECT_API_VERSION) || MLIR_MIGRAPHX_DIALECT_API_VERSION != 4
#warning "Incompatible version of rocMLIR library used, disabling"
// Only undefine when not using cppcheck
#ifndef CPPCHECK
#undef MIGRAPHX_MLIR
#endif
#else
#include <mlir-c/RegisterRocMLIR.h>
#endif
#endif

#include <migraphx/env.hpp>
#include <migraphx/manage_ptr.hpp>
#include <migraphx/module.hpp>
#include <migraphx/program.hpp>
#include <migraphx/load_save.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/config.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/gpu/code_object_op.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/compile_gen.hpp>
#include <migraphx/gpu/device_name.hpp>
#include <migraphx/gpu/perfdb.hpp>
#include <migraphx/gpu/tuning_config.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/permutation.hpp>
#include <migraphx/file_buffer.hpp>
#include <deque>
#include <variant>
#include <fstream>
#include <sstream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_MLIR);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_MLIR_TUNE_EXHAUSTIVE);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_MLIR_TUNE_LIMIT);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_MLIR_TUNING_DB);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_MLIR_TUNING_CFG);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_MLIR_ENABLE_SPLITK);

#ifdef MIGRAPHX_MLIR
template <class T, class F, F f> // NOLINT
struct mlir_handle
{
    struct ptr
    {
        ptr() = default;
        ptr(std::nullptr_t) {}
        ptr(T x) : obj(x) {}

        std::intptr_t get_value() const
        {
            static_assert(sizeof(T) == sizeof(std::intptr_t), "MLIR Handle different size");
            return reinterpret_cast<const std::intptr_t&>(obj);
        }

        T get() const { return obj; }

        friend bool operator==(ptr x, ptr y) { return x.get_value() == y.get_value(); }

        friend bool operator!=(ptr x, ptr y) { return not(x == y); }

        explicit operator bool() const noexcept { return obj != ptr(); }
        T obj{};
    };

    struct deleter
    {
        using pointer = ptr;

        void operator()(pointer x) const
        {
            if(x != nullptr)
            {
                (void)f(x.obj);
            }
        }
    };

    mlir_handle() : handle(nullptr) {}

    mlir_handle(T p) : handle(ptr{p}) {}

    T get() const
    {
        return handle.get().get(); // NOLINT(readability-redundant-smartptr-get)
    }

    T release() { return handle.release().get(); }

    private:
    std::unique_ptr<ptr, deleter> handle;
};

#define MIGRAPHX_MANAGE_MLIR_HANDLE(T, F) migraphx::gpu::mlir_handle<T, decltype(&F), &F> // NOLINT

using mlir_context     = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirContext, mlirContextDestroy);
using mlir_thread_pool = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirLlvmThreadPool, mlirLlvmThreadPoolDestroy);
using mlir_dialect_registry  = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirDialectRegistry,
                                                          mlirDialectRegistryDestroy);
using mlir_module            = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirModule, mlirModuleDestroy);
using mlir_operation         = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirOperation, mlirOperationDestroy);
using mlir_op_printing_flags = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirOpPrintingFlags,
                                                           mlirOpPrintingFlagsDestroy);
using mlir_region            = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirRegion, mlirRegionDestroy);
using mlir_block             = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirBlock, mlirBlockDestroy);
using mlir_pass_manager      = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirPassManager, mlirPassManagerDestroy);
using mlir_tuning_table      = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirRockTuningTable,
                                                      mlirRockTuningTableDestroy);
using mlir_tuning_space      = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirRockTuningSpace,
                                                      mlirRockTuningSpaceDestroy);
using mlir_tuning_param      = MIGRAPHX_MANAGE_MLIR_HANDLE(MlirRockTuningParam,
                                                      mlirRockTuningParamDestroy);

std::string_view to_string_view(MlirStringRef s) { return {s.data, s.length}; }

MlirStringRef make_mlir_string_ref(const std::string_view& s)
{
    return mlirStringRefCreate(s.data(), s.size());
}

template <class F, class T, class Printer>
void mlir_print(F f, T x, Printer printer)
{
    f(
        x,
        +[](MlirStringRef s, void* data) {
            (*reinterpret_cast<Printer*>(data))(to_string_view(s));
        },
        &printer);
}

template <class F, class T>
void mlir_print(F f, T x, std::ostream& os)
{
    mlir_print(f, x, [&](auto s) { os << s; });
}

template <class F, class T>
std::string mlir_print(F f, T x)
{
    std::stringstream ss;
    mlir_print(f, x, [&](auto s) { ss << s; });
    return ss.str();
}

struct mlir_logger
{
    std::stringstream ss;
    mlir_context* ctx;
    std::optional<MlirDiagnosticHandlerID> id;

    mlir_logger() : ctx(nullptr), id(std::nullopt) {}

    mlir_logger(mlir_context* context) : ctx(context)
    {
        id =
            mlirContextAttachDiagnosticHandler(ctx->get(), mlir_diagnostic_print_cb, this, nullptr);
    }

    ~mlir_logger()
    {
        if(id.has_value())
            mlirContextDetachDiagnosticHandler(ctx->get(), *id);
    }

    mlir_logger(const mlir_logger& other)            = delete;
    mlir_logger& operator=(const mlir_logger& other) = delete;

    mlir_logger(mlir_logger&& other) noexcept
        : ss(std::move(other.ss)), ctx(other.ctx), id(other.id)
    {
        other.ctx = nullptr;
        other.id  = std::nullopt;
    }

    mlir_logger& operator=(mlir_logger other) noexcept
    {
        std::swap(ss, other.ss);
        std::swap(ctx, other.ctx);
        std::swap(id, other.id);
        return *this;
    }

    std::string str() const { return ss.str(); }

    void clear() { ss = std::stringstream{}; }

    static MlirLogicalResult mlir_diagnostic_print_cb(MlirDiagnostic diag, void* logger);

    MlirLogicalResult handle(MlirDiagnostic diag);
};

MlirLogicalResult mlir_logger::mlir_diagnostic_print_cb(MlirDiagnostic diag, void* logger)
{
    return reinterpret_cast<mlir_logger*>(logger)->handle(diag);
}

MlirLogicalResult mlir_logger::handle(MlirDiagnostic diag)
{
    MlirDiagnosticSeverity sev = mlirDiagnosticGetSeverity(diag);
    switch(sev)
    {
    case MlirDiagnosticSeverity::MlirDiagnosticError: ss << "Error: "; break;
    case MlirDiagnosticSeverity::MlirDiagnosticWarning: ss << "Warning: "; break;
    case MlirDiagnosticSeverity::MlirDiagnosticNote: ss << "Note: "; break;
    case MlirDiagnosticSeverity::MlirDiagnosticRemark: ss << "Remark: "; break;
    }
    mlir_print(mlirDiagnosticPrint, diag, [&](auto s) { ss << s; });
    ss << std::endl;
    for(intptr_t i = 0, e = mlirDiagnosticGetNumNotes(diag); i < e; ++i)
    {
        (void)handle(mlirDiagnosticGetNote(diag, i));
    }
    return mlirLogicalResultSuccess();
}

struct mlir_program
{
    mlir_program()
        : ctx(mlirContextCreateWithRegistry(get_dialect_registry().get(),
                                            /*threadingEnable=*/false)),
          location(mlirLocationUnknownGet(ctx.get())),
          mmodule(mlirModuleCreateEmpty(location)),
          logger(&ctx)
    {
        mlirContextSetThreadPool(ctx.get(), get_thread_pool().get());
        mlirContextLoadAllAvailableDialects(ctx.get());
    }

    static mlir_dialect_registry& get_dialect_registry()
    {
        static std::once_flag init_guard;
        static mlir_dialect_registry the_registry;
        // The MLIR registration functions (for dialects and passes) are not
        // necessarily thread-safe and need to be executed exactly once
        // (especially since they eventually call non-thread-safe LLVM
        // initilizations).
        std::call_once(init_guard, [&]() {
            the_registry = mlirDialectRegistryCreate();
            mlirRegisterRocMLIRDialects(the_registry.get());
            mlirRegisterRocMLIRPasses();
        });
        return the_registry;
    }

    static mlir_thread_pool& get_thread_pool()
    {
        // To save on overhead, we create one LLVM thread pool and reuse it
        // across all MLIR contexts as recommended by MLIR upstream.
        // Note that this is thread-safe as of C++11.
        static mlir_thread_pool the_pool = mlirLlvmThreadPoolCreate();
        return the_pool;
    }

    MlirType make_type(shape::type_t t) const
    {
        MlirType result;
        shape::visit(t, [&](auto as) {
            if(as.type_enum() == shape::float_type)
                result = mlirF32TypeGet(ctx.get());
            else if(as.type_enum() == shape::half_type)
                result = mlirF16TypeGet(ctx.get());
            else if(as.type_enum() == shape::bf16_type)
                result = mlirBF16TypeGet(ctx.get());
            else if(as.type_enum() == shape::fp8e4m3fnuz_type)
                result = mlirFloat8E4M3FNUZTypeGet(ctx.get());
            else if(as.type_enum() == shape::fp8e5m2fnuz_type)
                result = mlirFloat8E5M2FNUZTypeGet(ctx.get());
            else if(as.type_enum() == shape::fp8e4m3fn_type)
                result = mlirFloat8E4M3FNTypeGet(ctx.get());
            else if(as.type_enum() == shape::fp8e5m2_type)
                result = mlirFloat8E5M2TypeGet(ctx.get());
            else if(as.type_enum() == shape::double_type)
                result = mlirF64TypeGet(ctx.get());
            else if(as.is_integral())
            {
                if(as.is_unsigned())
                {
                    result = mlirIntegerTypeUnsignedGet(ctx.get(), as.size() * 8);
                }
                else
                {
                    result = mlirIntegerTypeSignedGet(ctx.get(), as.size() * 8);
                }
            }
            else
                MIGRAPHX_THROW("Unsupported type: " + std::to_string(as.type_enum()));
        });
        return result;
    }

    MlirType make_mlir_shaped(const shape& s) const
    {
        if(s.dynamic())
            MIGRAPHX_THROW("MLIR does not support dynamic shapes");
        std::vector<int64_t> lens(s.lens().begin(), s.lens().end());
        std::vector<int64_t> strides(s.strides().begin(), s.strides().end());
        return rocmlirMIXRShapedTypeGet(
            lens.size(), lens.data(), strides.data(), make_type(s.type()));
    }

    template <class Range>
    std::vector<MlirType> make_mlir_shapeds(const Range& r)
    {
        std::vector<MlirType> result;
        std::transform(r.begin(), r.end(), std::back_inserter(result), [&](const auto& s) {
            return make_mlir_shaped(s);
        });
        return result;
    }

    MlirType make_function_type(const std::vector<shape>& inputs, const std::vector<shape>& outputs)
    {
        auto in  = make_mlir_shapeds(inputs);
        auto out = make_mlir_shapeds(outputs);
        return mlirFunctionTypeGet(ctx.get(), in.size(), in.data(), out.size(), out.data());
    }

    MlirIdentifier id(const std::string_view& s) const
    {
        return mlirIdentifierGet(ctx.get(), make_mlir_string_ref(s));
    }

    MlirAttribute attribute(std::int64_t i) const
    {
        return mlirIntegerAttrGet(mlirIntegerTypeGet(ctx.get(), 64), i);
    }
    MlirAttribute attribute(std::uint64_t i) const
    {
        if(i > (std::numeric_limits<std::uint64_t>::max() / 2))
            MIGRAPHX_THROW("MLIR cant handle large integer values since they are ambiguous");
        return mlirIntegerAttrGet(mlirIntegerTypeGet(ctx.get(), 64), i);
    }
    MlirAttribute attribute(unsigned char i) const { return attribute(std::uint64_t(i)); }
    MlirAttribute attribute(bool b) const { return mlirBoolAttrGet(ctx.get(), b ? 1 : 0); }
    MlirAttribute attribute(double d) const
    {
        return mlirFloatAttrDoubleGet(ctx.get(), mlirF64TypeGet(ctx.get()), d);
    }
    MlirAttribute attribute(const std::string& s) const
    {
        return mlirStringAttrGet(ctx.get(), make_mlir_string_ref(s));
    }
    MlirAttribute attribute(std::nullptr_t) const { return {}; }
    template <class T>
    MlirAttribute attribute(const std::vector<T>& v) const
    {
        std::vector<MlirAttribute> attributes;
        attributes.reserve(v.size());
        std::transform(v.begin(), v.end(), std::back_inserter(attributes), [&](auto&& x) {
            return attribute(x);
        });
        return mlirArrayAttrGet(ctx.get(), attributes.size(), attributes.data());
    }
    MlirAttribute attribute(const value& v) const
    {
        MlirAttribute attr;
        v.visit_value([&](auto&& x) { attr = attribute(x); });
        return attr;
    }
    MlirAttribute attribute(const std::vector<value>& v) const
    {
        if(v.empty())
        {
            return mlirArrayAttrGet(ctx.get(), 0, nullptr);
        }
        if(not v.front().get_key().empty())
        {
            std::vector<MlirNamedAttribute> attributes = name_attributes(v);
            return mlirDictionaryAttrGet(ctx.get(), attributes.size(), attributes.data());
        }
        else
        {
            std::vector<MlirAttribute> attributes;
            attributes.reserve(v.size());
            std::transform(v.begin(), v.end(), std::back_inserter(attributes), [&](auto&& x) {
                return attribute(x);
            });
            return mlirArrayAttrGet(ctx.get(), attributes.size(), attributes.data());
        }
    }

    MlirAttribute attribute(MlirType t) const { return mlirTypeAttrGet(t); }

    MlirAttribute attribute(MlirAttribute a) const { return a; }

    template <class T>
    MlirNamedAttribute name_attribute(const std::string_view& key, const T& x) const
    {
        MlirNamedAttribute attr;
        attr.name      = id(key);
        attr.attribute = attribute(x);
        return attr;
    }

    using attribute_t       = std::variant<std::nullptr_t,
                                           std::uint64_t,
                                           unsigned char,
                                           bool,
                                           double,
                                           std::string,
                                           value,
                                           std::vector<value>,
                                           MlirType,
                                           MlirAttribute>;
    using named_attribute_t = std::pair<std::string_view, attribute_t>;

    MlirNamedAttribute name_attribute(const named_attribute_t& na) const
    {
        return name_attribute(na.first,
                              std::visit([&](const auto& x) { return attribute(x); }, na.second));
    }

    std::vector<MlirNamedAttribute>
    name_attributes(const std::vector<named_attribute_t>& named_attrs) const
    {
        std::vector<MlirNamedAttribute> attributes;
        attributes.reserve(named_attrs.size());
        std::transform(named_attrs.begin(),
                       named_attrs.end(),
                       std::back_inserter(attributes),
                       [&](const named_attribute_t& a) { return name_attribute(a); });
        return attributes;
    }

    std::vector<MlirNamedAttribute> name_attributes(const value& v) const
    {
        std::vector<MlirNamedAttribute> attributes;
        attributes.reserve(v.size());
        migraphx::transform_if(
            v.begin(),
            v.end(),
            std::back_inserter(attributes),
            [&](const value& x) { return not x.is_null(); },
            [&](const value& x) { return name_attribute(x.get_key(), x.without_key()); });
        return attributes;
    }

    struct mlir_operation_state
    {
        mlir_operation_state(mlir_program& p, const std::string_view& name)
            : prog(&p), op_state(mlirOperationStateGet(make_mlir_string_ref(name), p.location))
        {
        }

        mlir_operation_state& add_attributes(const std::vector<named_attribute_t>& named_attrs)
        {
            auto attributes = prog->name_attributes(named_attrs);
            if(not attributes.empty())
            {
                mlirOperationStateAddAttributes(&op_state, attributes.size(), attributes.data());
            }
            return *this;
        }

        mlir_operation_state& add_attribute_value(const value& v)
        {
            auto attributes = prog->name_attributes(v);
            if(not attributes.empty())
            {
                mlirOperationStateAddAttributes(&op_state, attributes.size(), attributes.data());
            }
            return *this;
        }

        mlir_operation_state& add_regions(std::vector<mlir_region> rs)
        {
            regions = std::move(rs);
            return *this;
        }

        mlir_operation_state& add_region(mlir_region r)
        {
            regions.emplace_back(std::move(r));
            return *this;
        }

        mlir_operation_state& add_results(const std::vector<shape>& outputs)
        {
            auto x = prog->make_mlir_shapeds(outputs);
            if(not x.empty())
            {
                mlirOperationStateAddResults(&op_state, x.size(), x.data());
            }
            return *this;
        }

        mlir_operation_state& add_operands(const std::vector<MlirValue>& inputs)
        {
            if(not inputs.empty())
            {
                mlirOperationStateAddOperands(&op_state, inputs.size(), inputs.data());
            }
            return *this;
        }

        mlir_operation create_operation()
        {
            std::vector<MlirRegion> mregions(regions.size());
            std::transform(regions.begin(), regions.end(), mregions.begin(), [](const auto& r) {
                return r.get();
            });
            if(not mregions.empty())
            {
                mlirOperationStateAddOwnedRegions(&op_state, mregions.size(), mregions.data());
            }
            mlir_operation op(mlirOperationCreate(&op_state));
            // Release memory since mlir_operation owns it
            for(auto& r : regions)
                r.release();
            regions.clear();
            return op;
        }

        mlir_program* prog;
        MlirOperationState op_state;
        std::vector<mlir_region> regions = {};
    };

    mlir_operation_state create_operation_state(const std::string_view& name)
    {
        return {*this, name};
    }

    std::vector<MlirValue> insert(MlirBlock body, mlir_operation_state ops)
    {
        std::vector<MlirValue> result;
        mlir_operation op = ops.create_operation();
        auto weak_op      = op.get();
        mlirBlockAppendOwnedOperation(body, op.release());

        auto n = mlirOperationGetNumResults(weak_op);
        result.reserve(n);
        transform(range(n), std::back_inserter(result), [&](auto i) {
            return mlirOperationGetResult(weak_op, i);
        });
        return result;
    }

    MlirBlock
    insert(MlirBlock body, const module& m, std::unordered_map<instruction_ref, MlirValue>& ins_map)
    {
        auto names = m.get_parameter_names();
        std::sort(names.begin(), names.end());
        std::vector<shape> inputs;
        std::transform(names.begin(),
                       names.end(),
                       std::back_inserter(inputs),
                       [&](const std::string& name) { return m.get_parameter_shape(name); });
        std::vector<shape> outputs = m.get_output_shapes();

        std::vector<MlirLocation> arg_locs(inputs.size(), location);
        auto body_inputs   = make_mlir_shapeds(inputs);
        mlir_region region = mlirRegionCreate();
        mlir_block fbody = mlirBlockCreate(body_inputs.size(), body_inputs.data(), arg_locs.data());
        MlirBlock result = fbody.get();
        mlirRegionAppendOwnedBlock(region.get(), fbody.release());

        auto ops = create_operation_state("func.func");
        ops.add_attributes({{"function_type", make_function_type(inputs, outputs)},
                            {"sym_name", sym_name},
                            {"kernel", std::string("mixr")},
                            {"arch", target_arch},
                            {"num_cu", num_cu}});
        if(enabled(MIGRAPHX_MLIR_ENABLE_SPLITK{}))
        {
            ops.add_attributes({{"enable_splitk_for_tuning", mlirUnitAttrGet(ctx.get())}});
        }
        ops.add_region(std::move(region));
        insert(body, std::move(ops));

        for(auto i : range(names.size()))
            ins_map[m.get_parameter(names[i])] = mlirBlockGetArgument(result, i);
        return result;
    }

    static bool is_reshape(const std::string& name)
    {
        return contains({"reshape", "lazy_reshape", "squeeze", "unsqueeze", "flatten"}, name);
    }

    static std::string get_name(instruction_ref ins)
    {
        if(ins->name() == "@return")
            return "func.return";
        if(ins->name() == "@literal")
            return "migraphx.literal";
        if(ins->name() == "unpack_int4")
            return "migraphx.unpack";
        if(is_reshape(ins->name()))
            return "migraphx.reshape";
        return "migraphx." + ins->name();
    }

    static value get_operator_value(instruction_ref ins)
    {
        const operation& op = ins->get_operator();
        auto v              = op.to_value();

        // Reshape operator can have dim 0 or -1.
        // Avoid passing those on to MLIR:
        if(is_reshape(op.name()))
            v = {{"dims", ins->get_shape().lens()}};

        if(op.name() == "convolution" or op.name() == "quant_convolution")
        {
            // Adjust symetrical padding
            if(v.at("padding").size() == v.at("stride").size())
            {
                auto padding = v.at("padding");
                std::copy(padding.begin(), padding.end(), std::back_inserter(v.at("padding")));
            }
        }

        if(op.name() == "unpack_int4")
            v["axis"] = ins->get_shape().ndim() - 1;

        return v;
    }

    static shape get_shape(instruction_ref ins)
    {
        if(ins->name() == "@return")
        {
            assert(ins->inputs().size() == 1);
            return ins->inputs().front()->get_shape();
        }
        return ins->get_shape();
    }

    static std::string get_symbol_name(const module& m)
    {
        return "mlir_" + gen::generate_name_from_ops(m);
    }

    static void validate(const module& m)
    {
        if(m.begin() == m.end())
            MIGRAPHX_THROW("Empty module");
        auto last = std::prev(m.end());
        if(last->name() != "@return")
            MIGRAPHX_THROW("Missing @return as last instruction.");
    }

    void parse(const module& m)
    {
        validate(m);
        sym_name   = get_symbol_name(m);
        auto mbody = mlirModuleGetBody(mmodule.get());
        std::unordered_map<instruction_ref, MlirValue> ins_map;
        auto fbody = insert(mbody, m, ins_map);

        for(auto ins : iterator_for(m))
        {
            if(ins->name() == "@param")
                continue;
            if(ins->name() == "contiguous")
            {
                ins_map[ins] = ins_map[ins->inputs().at(0)];
                continue;
            }
            auto name = get_name(ins);
            auto ops  = create_operation_state(name);
            ops.add_attribute_value(get_operator_value(ins));
            if(ins->name() != "@return")
                ops.add_results({get_shape(ins)});

            if(ins->name() == "@literal")
            {
                literal r = ins->get_literal();
                auto sh   = ins->get_shape();

                MlirType shaped_type = make_mlir_shaped(sh);
                MlirType tensor_type = rocmlirMIXRShapedTypeAsTensor(shaped_type);
                MlirAttribute mlir_value_attr =
                    mlirDenseElementsAttrRawBufferGet(tensor_type, r.get_shape().bytes(), r.data());
                ops.add_attributes({{"value", mlir_value_attr}});
            }

            if(ins->name() == "convolution" or ins->name() == "dot")
            {
                pp =
                    problem_params{ins->get_operator(), to_shapes(ins->inputs()), ins->get_shape()};
            }

            std::vector<MlirValue> inputs;
            transform(
                ins->inputs(), std::back_inserter(inputs), [&](auto i) { return ins_map.at(i); });
            ops.add_operands(inputs);

            auto outputs = insert(fbody, std::move(ops));
            if(ins->name() != "@return")
            {
                assert(outputs.size() == 1);
                ins_map[ins] = outputs.front();
            }
        }
    }

    void run_high_level_pipeline()
    {
        mlir_pass_manager pm_front{mlirPassManagerCreate(ctx.get())};
        mlirMIGraphXAddHighLevelPipeline(pm_front.get());
        logger.clear();
        if(mlirLogicalResultIsFailure(
               mlirPassManagerRunOnOp(pm_front.get(), mlirModuleGetOperation(mmodule.get()))))
        {
            std::string error = "Invalid MLIR created: " + logger.str();
            if(enabled(MIGRAPHX_TRACE_MLIR{}))
            {
                std::cout << error << std::endl;
            }
            MIGRAPHX_THROW(error);
        }
    }

    void run_backend_pipeline()
    {
        mlir_pass_manager pm_back{mlirPassManagerCreate(ctx.get())};
        mlirMIGraphXAddBackendPipeline(pm_back.get(), target_arch.c_str());
        logger.clear();
        const size_t trace = value_of(MIGRAPHX_TRACE_MLIR{});
        static std::mutex mutex;
        auto mod_op = mlirModuleGetOperation(mmodule.get());
        if(trace >= 2)
        {
            const std::lock_guard<std::mutex> lock(mutex);
            std::cout << mlir_print(&mlirOperationPrint, mod_op) << std::endl;
        }

        if(mlirLogicalResultIsFailure(mlirPassManagerRunOnOp(pm_back.get(), mod_op)))
        {
            std::string error = "MLIR backend compilation failed: " + logger.str();
            if(enabled(MIGRAPHX_TRACE_MLIR{}))
            {
                std::cout << error << std::endl;
            }
            MIGRAPHX_THROW(error);
        }
    }

    code_object_op compile(const value& solution)
    {
        // 1st pipeline to call
        run_high_level_pipeline();
        if(solution.is_null())
            get_module_tuned();
        else
            set_tuning(solution);
        // 2nd pipeline to call
        run_backend_pipeline();

        code_object_op op{};
        op.symbol_name                = sym_name;
        op.code_object                = get_binary();
        std::tie(op.global, op.local) = get_launch_params();
        return op;
    }

    void set_gpu_properties(const context& migraphx_ctx)
    {
        const auto& device = migraphx_ctx.get_current_device();
        target_arch        = device.get_device_name();
        num_cu             = device.get_cu_count();
    }

    std::pair<std::size_t, std::size_t> get_launch_params() const
    {
        uint32_t attrs[2];
        // returns block and grid sizes
        mlirGetKernelAttrs(mmodule.get(), attrs);
        std::size_t local  = attrs[0];
        std::size_t global = local * attrs[1];
        return {global, local};
    }

    value::binary get_binary() const
    {
        size_t size = 0;
        mlirGetBinary(mmodule.get(), &size, nullptr);
        value::binary result(size);
        if(mlirGetBinary(mmodule.get(), &size, reinterpret_cast<char*>(result.data())))
            return result;
        MIGRAPHX_THROW("Failed to compile mlir program");
    }

    void set_tuning(const value& v) MIGRAPHX_TIDY_CONST
    {
        const auto* str = v.if_string();
        if(str == nullptr)
            MIGRAPHX_THROW("mlir tuning solutions must be strings");
        if(not mlirRockTuningSetFromStr(mmodule.get(), make_mlir_string_ref(*str)))
            MIGRAPHX_THROW("Failed setting tuning key: " + *str);
    }

    tuning_config get_tuning_config(bool exhaustive)
    {
        tuning_config tc;
        run_high_level_pipeline();
        auto tuning_mode =
            exhaustive ? RocmlirTuningParamSetKindFull : RocmlirTuningParamSetKindQuick;
        if(enabled(MIGRAPHX_MLIR_TUNE_EXHAUSTIVE{}))
            tuning_mode = RocmlirTuningParamSetKindExhaustive;
        mlir_tuning_space params{mlirRockTuningSpaceCreate(mmodule.get(), tuning_mode)};
        const auto limit =
            value_of(MIGRAPHX_MLIR_TUNE_LIMIT{}, std::numeric_limits<std::size_t>::max());
        for(auto i : range(std::min<std::size_t>(limit, mlirRockTuningGetNumParams(params.get()))))
        {
            mlir_tuning_param param{mlirRockTuningParamCreate()};
            if(not mlirRockTuningParamGet(params.get(), i, param.get()))
                MIGRAPHX_THROW("Incorrect mlir tuning parameter: " + std::to_string(i));
            std::array<char, ROCMLIR_TUNING_KEY_BUFSZ> perf_key;
            size_t perf_key_bytes =
                mlirRockTuningParamToString(param.get(), perf_key.data(), perf_key.size());
            if(perf_key_bytes > perf_key.size())
                MIGRAPHX_THROW("Tuning perf key was " + std::to_string(perf_key_bytes) +
                               " bytes and thus too long");
            tc.solutions.emplace_back(
                std::string(perf_key.begin(), perf_key.begin() + perf_key_bytes));
        }
        std::array<char, ROCMLIR_TUNING_KEY_BUFSZ> tuning_key;
        size_t tuning_key_bytes =
            mlirRockTuningGetKey(mmodule.get(), tuning_key.data(), tuning_key.size());
        if(tuning_key_bytes > tuning_key.size())
            MIGRAPHX_THROW("Tuning table key was " + std::to_string(tuning_key_bytes) +
                           " bytes and thus too long");
        tc.problem = std::string(tuning_key.begin(), tuning_key.begin() + tuning_key_bytes);
        return tc;
    }

    std::string get_tune_params(bool xdlops) const { return get_mlir_perf_for_conv(pp, xdlops); }

    // This function appends to tuning cfg file that could be
    // used with rocMLIR tuning scripts.
    void dump_tuning_cfg(const std::string& prob_config) const
    {
        std::string tuning_cfg_path = string_value_of(MIGRAPHX_MLIR_TUNING_CFG{});
        if(not tuning_cfg_path.empty())
        {
            std::vector<std::string> tokens = split_string(prob_config, '\t');
            std::string prob                = tokens[2];

            if(starts_with(prob, "conv"))
            {
                tuning_cfg_path += ".conv";
            }
            else
            {
                tuning_cfg_path += ".gemm";
            }
            std::ofstream tuning_cfg(tuning_cfg_path, std::ios::app);
            prob =
                trim(prob, [](unsigned char c) { return (c == '\0') or (std::isspace(c) != 0); });
            tuning_cfg << prob << std::endl;
        }
    }

    static std::pair<mlir_tuning_table, bool> load_tuning_table()
    {
        mlir_tuning_table tuning_table{mlirRockTuningTableCreate()};
        bool found_table           = false;
        std::string tuning_db_path = string_value_of(MIGRAPHX_MLIR_TUNING_DB{});
        if(not tuning_db_path.empty())
        {
            std::ifstream tuning_db_tsv(tuning_db_path);
            if(tuning_db_tsv)
            {
                found_table = true;
                std::string line;
                while(std::getline(tuning_db_tsv, line))
                {
                    std::vector<std::string> tokens = split_string(line, '\t');
                    std::string arch                = tokens[0];
                    std::string num_cu              = tokens[1];
                    std::string prob                = tokens[2];
                    std::string perf                = tokens[3];
                    std::string key = arch.append("\t").append(num_cu).append("\t").append(prob);
                    mlirRockTuningUpdateTable(tuning_table.get(),
                                              make_mlir_string_ref(key),
                                              make_mlir_string_ref(perf),
                                              1.0);
                }
            }
        }
        else
        {
            found_table = false;
            std::cerr
                << "WARNING: MLIR tuning db not found. Please set MIGRAPHX_MLIR_TUNING_DB for "
                   "optimal performance."
                << std::endl;
        }
        return std::make_pair(std::move(tuning_table), found_table);
    }

    bool get_module_tuned() const
    {
        static std::pair<mlir_tuning_table, bool> tuning_table = load_tuning_table();
        if(not mlirRockTuningSetFromTable(tuning_table.first.get(), mmodule.get()))
        {
            std::array<char, ROCMLIR_TUNING_KEY_BUFSZ> prob_config;
            size_t prob_config_bytes =
                mlirRockTuningGetKey(mmodule.get(), prob_config.data(), prob_config.size());
            if(prob_config_bytes >= prob_config.size())
            {
                std::cerr << "MLIR tuning key overflowed buffer, needed " << prob_config_bytes
                          << " bytes" << std::endl;
                return false;
            }
            std::string prob_config_str(prob_config.begin(),
                                        prob_config.begin() + prob_config_bytes);
            if(tuning_table.second)
            {
                std::cerr << "NOTE: MLIR tuning table did not include a key for " << prob_config_str
                          << std::endl;
            }
            dump_tuning_cfg(prob_config_str);
            return false;
        }
        return true;
    }

    mlir_context ctx;
    MlirLocation location;
    mlir_module mmodule;
    mlir_logger logger;
    problem_params pp;
    std::deque<std::string> strings{};
    std::string target_arch = "";
    std::size_t num_cu      = 0;
    std::string sym_name;
};

bool is_reduce(const instruction& ins) { return contains(ins.name(), "reduce"); }

static void rewrite_reduce(module& m)
{
    for(auto i : iterator_for(m))
    {
        if(is_reduce(*i))
        {
            auto reduce_op   = i->get_operator().to_value();
            auto reduce_axes = reduce_op["axes"].to_vector<size_t>();
            auto reduce_lens = i->get_shape().lens();
            auto in_shape    = i->inputs().front()->get_shape();
            auto in_lens     = in_shape.lens();
            assert(in_shape.standard());
            assert(reduce_lens.size() == in_lens.size());
            assert(std::adjacent_find(
                       reduce_axes.begin(), reduce_axes.end(), [](auto axis_1, auto axis_2) {
                           return axis_2 - axis_1 > 1;
                       }) == reduce_axes.end());

            std::vector<int64_t> new_rsp_dims;
            std::vector<int64_t> new_reduce_axes;
            for(const auto axis : range(in_shape.ndim()))
            {
                if(reduce_lens[axis] == in_lens[axis])
                {
                    new_rsp_dims.push_back(in_lens[axis]);
                }
                else if(new_reduce_axes.empty())
                {
                    assert(reduce_lens[axis] == 1);
                    new_rsp_dims.push_back(-1);
                    new_reduce_axes.push_back(axis);
                }
            }
            auto rsp_ins = m.insert_instruction(
                i, migraphx::make_op("reshape", {{"dims", new_rsp_dims}}), i->inputs().front());
            auto collapsed_reduce = m.insert_instruction(
                i, migraphx::make_op("reduce_sum", {{"axes", new_reduce_axes}}), rsp_ins);
            auto rsp_back = m.insert_instruction(
                i, migraphx::make_op("reshape", {{"dims", reduce_lens}}), collapsed_reduce);
            m.replace_instruction(i, rsp_back);
        }
    }
    migraphx::run_passes(m, {migraphx::dead_code_elimination{}});
}

bool is_module_fusible(const module& m, const context& migraphx_ctx, const value& solution)
{
    auto mm = m;
    rewrite_reduce(mm);
    mlir_program mp;
    mp.set_gpu_properties(migraphx_ctx);
    mp.parse(mm);
    mp.run_high_level_pipeline();
    return mlirIsModuleFusible(mp.mmodule.get(), make_mlir_string_ref(*solution.if_string()));
}

void adjust_param_shapes(module& m, const std::vector<shape>& inputs)
{
    auto names = m.get_parameter_names();
    std::sort(names.begin(), names.end());
    for(auto i : range(names.size()))
    {
        const auto& name  = names[i];
        const auto& input = inputs[i];
        auto param        = m.get_parameter(name);
        assert(param->get_shape().standard());
        if(input.standard())
            continue;
        auto new_param = m.add_parameter(name + ".0", input);
        m.replace_instruction(param, new_param);
        m.remove_instruction(param);
    }
}

void replace_params_with_literals(module& m, const std::vector<instruction_ref>& inputs)
{
    auto names = m.get_parameter_names();
    std::sort(names.begin(), names.end());
    for(auto i : range(names.size()))
    {
        const auto& name  = names[i];
        const auto& input = inputs[i];
        if(input->name() != "@literal")
            continue;
        auto param = m.get_parameter(name);
        auto lit   = m.add_literal(input->get_literal());
        m.replace_instruction(param, lit);
        m.remove_instruction(param);
    }
}

std::string dump_mlir(module m, const std::vector<shape>& inputs)
{
    const_module_ref mr = &m;
    if(not inputs.empty())
    {
        adjust_param_shapes(m, inputs);
    }
    rewrite_reduce(m);
    mlir_program mp;
    mp.parse(*mr);
    auto mod_op = mlirModuleGetOperation(mp.mmodule.get());
    return mlir_print(&mlirOperationPrint, mod_op);
}

static std::string compute_dump_name(const module& m, const std::string& ext)
{
    std::vector<instruction_ref> sizes;
    for(auto ins : iterator_for(m))
    {
        if(contains({"quant_convolution", "quant_dot", "convolution", "dot"}, ins->name()))
            sizes.insert(sizes.end(), ins->inputs().begin(), ins->inputs().end());
    }
    auto name =
        mlir_program::get_symbol_name(m) + "_" + shape::to_sizes_string(to_shapes(sizes)) + ext;
    replace_string_inplace(name, ", ", "_");
    replace_string_inplace(name, ":", "s");
    return name;
}

void dump_mlir_to_file(module m, const std::vector<shape>& inputs, const fs::path& location)
{
    static std::mutex mutex;
    const std::lock_guard<std::mutex> lock(mutex);

    if(not inputs.empty())
    {
        adjust_param_shapes(m, inputs);
    }
    rewrite_reduce(m);

    auto name = compute_dump_name(m, ".mlir");
    auto f    = location / name;
    std::cout << "Dumping MLIR file to: " << f << std::endl;

    mlir_program mp;
    mp.parse(m);
    auto mod_op = mlirModuleGetOperation(mp.mmodule.get());

    std::string mlir_str = mlir_print(&mlirOperationPrint, mod_op);

    write_string(f, mlir_str);
}

std::string dump_mlir(module m) { return dump_mlir(std::move(m), {}); }

mlir_code_object compile_mlir(const context& migraphx_ctx,
                              module m,
                              const std::vector<shape>& in_shapes,
                              const value& solution)
{
    adjust_param_shapes(m, in_shapes);
    rewrite_reduce(m);
    const bool trace = enabled(MIGRAPHX_TRACE_MLIR{});

    static std::mutex mutex;
    if(trace)
    {
        const std::lock_guard<std::mutex> lock(mutex);
        std::cout << m << std::endl;
    }

    mlir_program mp;

    mp.set_gpu_properties(migraphx_ctx);
    mp.parse(m);
    auto mod_op = mlirModuleGetOperation(mp.mmodule.get());
    if(trace)
    {
        const std::lock_guard<std::mutex> lock(mutex);
        std::cout << mlir_print(&mlirOperationPrint, mod_op) << std::endl;
    }
    auto co = mp.compile(solution);

    co.expected_inputs = in_shapes;
    auto out_shapes    = m.get_output_shapes();
    if(out_shapes.size() == 1)
    {
        co.output = m.get_output_shapes().front();
    }
    else
    {
        co.output = shape{out_shapes};
    }
    mlir_code_object mco;
    mco.cop                 = co;
    size_t num_prefill_args = mlirGetNumPrefillArgs(mp.mmodule.get());
    if(num_prefill_args > 0)
    {
        std::vector<size_t> prefill_indices(num_prefill_args);
        std::vector<MlirAttribute> prefill_mlir_values(num_prefill_args);
        mlirGetPrefillArgsInfo(
            mp.mmodule.get(), prefill_indices.data(), prefill_mlir_values.data(), num_prefill_args);
        std::vector<value> prefill_values(prefill_mlir_values.size());
        std::transform(prefill_mlir_values.begin(),
                       prefill_mlir_values.end(),
                       prefill_values.begin(),
                       [](const auto& v) {
                           // mlir sets fill attribute as float but migx hip::fill operator only
                           // supports integer type.
                           // TODO: Need to add checks that it is indeed an integer.
                           double dv = mlirFloatAttrGetValueDouble(v);
                           return static_cast<int>(dv);
                       });
        mco.prefill_indices = prefill_indices;
        mco.prefill_values  = prefill_values;
    }
    return mco;
}

instruction_ref insert_mlir(module& m,
                            instruction_ref ins,
                            code_object_op co,
                            const std::vector<instruction_ref>& inputs)
{

    std::vector<instruction_ref> refs;
    std::size_t last = 0;
    refs.reserve(inputs.size());
    std::copy(inputs.begin(), inputs.end(), std::back_inserter(refs));
    last               = refs.size() - 1;
    co.expected_inputs = to_shapes(refs);
    co.output_arg      = last;
    return m.insert_instruction(ins, co, refs);
}

tuning_config get_tuning_config_mlir(const context& migraphx_ctx,
                                     module m,
                                     const std::vector<shape>& inputs,
                                     bool exhaustive)
{
    adjust_param_shapes(m, inputs);
    rewrite_reduce(m);
    mlir_program mp;
    mp.set_gpu_properties(migraphx_ctx);
    mp.parse(m);
    auto tc          = mp.get_tuning_config(exhaustive);
    const bool trace = enabled(MIGRAPHX_TRACE_MLIR{});
    static std::mutex mutex;
    if(trace)
    {
        const std::lock_guard<std::mutex> lock(mutex);
        std::cout << "Problem: " << tc.problem << std::endl;
        auto mod_op = mlirModuleGetOperation(mp.mmodule.get());
        std::cout << mlir_print(&mlirOperationPrint, mod_op) << std::endl;
    }
    return tc;
}

void dump_mlir_to_mxr(module m,
                      const std::vector<instruction_ref>& inputs,
                      const fs::path& location)
{
    static std::mutex mutex;
    const std::lock_guard<std::mutex> lock(mutex);

    adjust_param_shapes(m, to_shapes(inputs));
    replace_params_with_literals(m, inputs);
    std::vector<instruction_ref> sizes;
    for(auto ins : iterator_for(m))
    {
        if(contains({"quant_convolution", "quant_dot", "convolution", "dot"}, ins->name()))
            sizes.insert(sizes.end(), ins->inputs().begin(), ins->inputs().end());
    }
    auto name = compute_dump_name(m, ".mxr");
    auto f    = location / name;
    std::cout << "Dumping MXR file to: " << f << std::endl;
    save(program{std::move(m)}, f.string());
}

#else

template <class T>
void use(T&)
{
}

std::string dump_mlir(module) { return {}; }

std::string dump_mlir(module m, const std::vector<shape>& inputs)
{
    use(m);
    use(inputs);
    return {};
}

// Disabling clang-tidy warning on non-real useage.
// NOLINTBEGIN(performance-unnecessary-value-param)
mlir_code_object compile_mlir(const context&, module, const std::vector<shape>&, const value&)
{
    return {};
}

instruction_ref
// cppcheck-suppress funcArgNamesDifferent
insert_mlir(module& m, instruction_ref, code_object_op co, const std::vector<instruction_ref>&)
{
    use(co);
    use(m);
    return m.end();
}

tuning_config get_tuning_config_mlir(const context&, module, const std::vector<shape>&, bool)
{
    return {};
}
// NOLINTEND(performance-unnecessary-value-param)

#endif

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
