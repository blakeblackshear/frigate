/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/gpu/fuse_mlir.hpp>
#include <migraphx/gpu/mlir.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/env.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/eliminate_common_subexpression.hpp>
#include <migraphx/common.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/output_iterator.hpp>
#include <migraphx/param_utils.hpp>
#include <migraphx/match/softmax.hpp>
#include <migraphx/fp8_types.hpp>
#include <optional>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

struct module;

namespace gpu {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_EXTRA_MLIR);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_MLIR_INPUT_FUSION);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_ENABLE_MLIR_REDUCE_FUSION);
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_DISABLE_MLIR);
/**
 * @brief Declares a new MIGraphX environment variable which forces to generate
 * only specific MLIR operations.
 *
 * The variable, if defined, forces MIGraphX to use only specific operations
 * with MLIR regardless of the underlying GPU architecture. The variable accepts
 * a list of operations separated by comma. The variable recognizes the following
 * operations: "fused", "convolution", "dot". If the variable is not defined MIGraphX
 * will decide by itself which operations to delegate to MLIR. The variable is
 * intended to be primarily used by rocMLIR developers.
 */
MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_MLIR_USE_SPECIFIC_OPS);

bool mlir_enabled()
{
#ifdef MIGRAPHX_MLIR
    const bool mlir_disabled = enabled(MIGRAPHX_DISABLE_MLIR{});
    return not mlir_disabled;
#else
    return false;
#endif
}

namespace {
struct requested
{
};
struct rejected
{
};
} // namespace

static bool is_negated_op(const std::string& s)
{
    if(s.empty())
        return false;
    return contains({'!', '~'}, s[0]);
}

template <class Action>
static std::vector<std::string> get_usage()
{
    static const auto options =
        split_string(string_value_of(MIGRAPHX_MLIR_USE_SPECIFIC_OPS{}, ""), ',');
    static const bool enabled = std::is_same<Action, requested>{};
    std::vector<std::string> result;
    auto remove_not_symbol = [&](const std::string& s) {
        if(is_negated_op(s))
            return s.substr(1);
        return s;
    };
    transform_if(
        options.begin(),
        options.end(),
        std::back_inserter(result),
        [&](const std::string& option) {
            if(option.empty())
                return false;
            if(is_negated_op(option))
                return not enabled;
            return enabled;
        },
        remove_not_symbol);
    return result;
}

template <class Action>
static bool specific_op(std::string_view option, bool fallback = false)
{
    static const auto options = get_usage<Action>();
    if(options.empty())
        return fallback;
    if(contains(option, "fused") and contains(options, "fused"))
        return true;
    return contains(options, option);
}

bool mlir_attention_enabled(context* ctx)
{
#ifdef MIGRAPHX_MLIR
    if(not mlir_enabled())
        return false;
    if(specific_op<rejected>("attention"))
        return false;
    // Enable attention by default for mi300
    if(ctx != nullptr and starts_with(ctx->get_current_device().get_gfx_name(), "gfx94"))
        return true;
    return specific_op<requested>("attention");
#else
    return false;
#endif
}

#ifdef MIGRAPHX_MLIR

struct mlir_op
{
    std::string name() const { return "gpu::mlir_op"; }
    operation op = make_op("convolution");

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.op, "op"));
    }

    // Check if the shape can be created from a transpose/broadcast/slice
    static bool is_mlir_compatible(const shape& s)
    {
        if(s.standard() or s.packed() or s.scalar() or s.ndim() == 1)
            return true;
        auto ns = reorder_shape(s, find_permutation(s));
        std::vector<std::size_t> stride_ratios;
        auto last = std::find(ns.strides().begin(), ns.strides().end(), 0);
        if(*std::prev(last) != 1)
            return false;
        std::adjacent_difference(ns.strides().begin(),
                                 last,
                                 std::back_inserter(stride_ratios),
                                 [](auto y, auto x) -> std::size_t {
                                     assert(y != 0);
                                     if((x % y) != 0)
                                         return 0;
                                     return x / y;
                                 });
        return std::equal(stride_ratios.begin() + 1,
                          stride_ratios.end(),
                          ns.lens().begin() + 1,
                          [](auto ratio, auto len) { return ratio >= len; });
    }

    shape compute_shape(const std::vector<shape>& inputs, const std::vector<module_ref>& mods) const
    {
        module_ref mod = mods[0];
        check_shapes{inputs, *this}.has_at_least(1);
        if(mods.size() != 1)
            MIGRAPHX_THROW("should have one submodule.");

        if(not std::all_of(inputs.begin(), inputs.end(), &is_mlir_compatible))
            MIGRAPHX_THROW("Shape is not mlir compatible.");

        auto result =
            mod->compute_shapes(inputs, {.name = name(), .strict_type = true, .strict_lens = true});
        if(result.size() == 1)
            return result.front();
        return shape{result};
    }
};
MIGRAPHX_REGISTER_OP(mlir_op);

namespace {

const auto& reshaper_names()
{
    // clang-format off
    static const std::unordered_set<std::string> names = {
        "slice",
        "transpose",
        "multibroadcast",
        "broadcast",
        "contiguous",
        "reshape",
        "lazy_reshape",
        "squeeze",
        "flatten",
        "unsqueeze"
    };
    // clang-format on
    return names;
}

std::tuple<instruction_ref, std::vector<operation>>
get_fusable_input_op_stream(instruction_ref lower_input)
{
    instruction_ref upper_input = lower_input;
    std::vector<operation> op_stream;
    while(contains(reshaper_names(), upper_input->name()))
    {
        operation op = upper_input->get_operator();
        op_stream.push_back(op);
        upper_input = upper_input->inputs().at(0);
    }
    return {upper_input, op_stream};
}

void fuse_input_ops(module_ref mm,
                    const std::vector<instruction_ref>& inputs,
                    std::unordered_map<instruction_ref, instruction_ref>* map_ins)
{
    assert(map_ins != nullptr);
    size_t input_cnt = mm->get_parameters().size();
    for(instruction_ref input : inputs)
    {
        if(contains(*map_ins, input))
            continue;
        auto [upper_input, op_stream] = get_fusable_input_op_stream(input);
        if(not contains(*map_ins, upper_input))
            (*map_ins)[upper_input] =
                mm->add_parameter(param_name(input_cnt++), upper_input->get_shape().as_standard());
        instruction_ref prev_input = (*map_ins)[upper_input];
        for(const auto& op : reverse(op_stream))
        {
            prev_input = mm->add_instruction(op, {prev_input});
        }
        (*map_ins)[input] = prev_input;
    }
}

std::tuple<instruction_ref, std::vector<instruction_ref>>
fuse_input_ops_and_gemm_based_op(module_ref mm,
                                 const std::vector<instruction_ref>& gemm_based_op_inputs,
                                 const operation& gemm_based_op)
{
    std::vector<instruction_ref> top_inputs;
    std::vector<instruction_ref> imm_inputs;
    size_t input_cnt = 0;
    for(instruction_ref input : gemm_based_op_inputs)
    {
        auto [upper_input, op_stream] = get_fusable_input_op_stream(input);
        top_inputs.push_back(upper_input);
        instruction_ref prev_input =
            mm->add_parameter(param_name(input_cnt++, "y"), upper_input->get_shape().as_standard());
        for(const auto& op : reverse(op_stream))
        {
            prev_input = mm->add_instruction(op, {prev_input});
        }
        imm_inputs.push_back(prev_input);
    }
    instruction_ref new_gemm_based_op = mm->add_instruction(gemm_based_op, imm_inputs);
    return {new_gemm_based_op, top_inputs};
}

enum class mlir_mode
{
    all,
    fast,
    int8,
    none
};

auto is_mlir_dot(mlir_mode mode)
{
    return match::make_basic_pred_matcher([=](instruction_ref ins) {
        if(mode == mlir_mode::none)
            return false;
        if(ins->name() != "dot" and ins->name() != "quant_dot")
            return false;
        // dot operation where (FP8 * FP8 = FP8) is not available in MLIR. rocBLAS/hipBLASLt should
        // have the support for it.
        if(contains(fp8_types{}.get(), ins->get_shape().type()))
            return false;
        if(mode != mlir_mode::fast)
            return true;
        auto a = ins->inputs().front()->get_shape();
        auto b = ins->inputs().back()->get_shape();
        // auto m = a.lens()[a.lens().size() - 2];
        // auto n = b.lens().back();
        auto k = a.lens().back();
        // Skipping GEMMs with a K dimension greater than 2048 is a course-grained strategy
        // to avoid poor-performing GEMM kernels from MLIR
        // To-do: Investigate a more precise strategy
        return k <= 1024;
    });
}

auto is_mlir_conv(mlir_mode mode)
{
    return match::make_basic_pred_matcher([=](instruction_ref ins) {
        if(mode == mlir_mode::none)
            return false;
        if(ins->name() != "convolution" and ins->name() != "quant_convolution")
            return false;
        auto input = ins->inputs().front()->get_shape();
        value v    = ins->get_operator().to_value();
        auto group = v.at("group").to<int>();
        // Avoid MLIR assertion: Index < Length && "Invalid index!"
        if(ins->get_shape().lens().size() != 4 and group > 1)
            return false;
        std::set<shape::type_t> supported_types = fp8_types{}.get();
        supported_types.insert(shape::int8_type);
        if(contains(supported_types, input.type()))
            return true;
        if(mode == mlir_mode::all)
            return true;
        // No winograd for group convolution
        if(group > 1)
            return true;
        auto w = ins->inputs().at(1)->get_shape();
        if(w.lens().size() != 4)
            return true;
        if(w.lens()[2] != w.lens()[3])
            return true;
        return (w.lens()[3] % 3) != 0;
    });
}

std::unordered_map<instruction_ref, instruction_ref>
create_param_map_with_literals(module_ref mm, const module* pm, const shape& shape)
{
    std::unordered_map<instruction_ref, instruction_ref> ins_map;
    for(auto ins : iterator_for(*pm))
    {
        if(ins->name() != "@literal")
        {
            continue;
        }
        literal r               = ins->get_literal();
        instruction_ref literal = mm->add_literal(r);
        instruction_ref mbcast =
            mm->add_instruction(make_op("multibroadcast", {{"out_lens", shape.lens()}}), literal);
        ins_map[ins] = mbcast;
    }
    return ins_map;
}

instruction_ref unroll_pointwise(module& main_mod,
                                 instruction_ref pos,
                                 const operation& op,
                                 const std::vector<instruction_ref>& inputs,
                                 const std::vector<module_ref>& mod_args)
{
    if(op.name() == "pointwise")
    {
        auto* sub_pm     = mod_args.front();
        auto param_map_2 = create_param_map_with_literals(
            &main_mod, sub_pm, op.compute_shape(to_shapes(inputs), mod_args));
        return main_mod.insert_inline(pos, *sub_pm, inputs, &param_map_2)
            .front(); // cppcheck-suppress returnDanglingLifetime;
    }
    return main_mod.insert_instruction(pos, op, inputs, mod_args);
}

// Whitelist supported fusion options, including imposing type constraints
// for cases where MLIR only supports an operation (usually a pointwise function)
// on particular types.
bool is_pointwise_op_supported_by_mlir(const instruction& i)
{
    using type_t                                      = shape::type_t;
    const auto& name                                  = i.name();
    const auto result_type                            = i.get_shape().type();
    const std::initializer_list<type_t> allowed_types = {type_t::float_type,
                                                         type_t::bf16_type,
                                                         type_t::half_type,
                                                         type_t::fp8e4m3fnuz_type,
                                                         type_t::fp8e5m2fnuz_type,
                                                         type_t::fp8e4m3fn_type,
                                                         type_t::fp8e5m2_type,
                                                         type_t::int8_type,
                                                         type_t::uint8_type,
                                                         type_t::int32_type,
                                                         type_t::uint32_type,
                                                         type_t::bool_type};
    // Preliminary type check.
    if(not contains(allowed_types, result_type))
    {
        return false;
    }
    const std::initializer_list<std::string> any_type_ops = {"@literal", "@param", "@return"};
    const std::initializer_list<std::string> no_bool_ops  = {
        "convolution",
        "quant_convolution",
        "dot",
        "quant_dot",
        "add",
        "clip",
        "relu",
        "sub",
        "mul",
        "div",
        "pow",
        "where",
        "quantizelinear",
        "dequantizelinear",
        "abs",
        "neg",
    };
    const std::initializer_list<std::string> fp_only_ops = {
        "ceil",
        "erf",
        "exp",
        "floor",
        "log",
        "recip",
        "sqrt",
        "rsqrt",
        "sigmoid",
        "softmax",
        "tanh",
    };
    std::set<shape::type_t> float_types = {type_t::float_type,
                                           type_t::half_type,
                                           type_t::bf16_type,
                                           type_t::fp8e4m3fnuz_type,
                                           type_t::fp8e5m2fnuz_type,
                                           type_t::fp8e4m3fn_type,
                                           type_t::fp8e5m2_type};
    bool is_float                       = contains(float_types, result_type);
    if(contains(any_type_ops, name))
        return true;
    if(result_type != type_t::bool_type and contains(no_bool_ops, name))
        return true;
    if(is_float and contains(fp_only_ops, name))
        return true;
    // Only conversions between floating types are known to be unambigiously
    // supported.
    if(is_float and name == "convert")
    {
        if(contains(fp8_types{}.get(), result_type))
        {
            return false;
        } // else
        return std::all_of(i.inputs().begin(), i.inputs().end(), [](const auto& arg) {
            return contains({type_t::float_type, type_t::half_type, type_t::bf16_type},
                            arg->get_shape().type());
        });
    }
    return false;
}

bool is_reduce_op_supported_by_mlir(const instruction& i)
{
    using type_t                                      = shape::type_t;
    const auto& name                                  = i.name();
    const auto result_type                            = i.get_shape().type();
    const std::initializer_list<type_t> allowed_types = {type_t::float_type,
                                                         type_t::half_type,
                                                         type_t::bf16_type,
                                                         type_t::fp8e4m3fnuz_type,
                                                         type_t::fp8e5m2fnuz_type,
                                                         type_t::fp8e4m3fn_type,
                                                         type_t::fp8e5m2_type};

    // Preliminary type check.
    if(not contains(allowed_types, result_type))
    {
        return false;
    }
    const std::initializer_list<std::string> reduce_ops = {"reduce_mean", "reduce_sum"};
    return contains(reduce_ops, i.name());
}

// A separate function so we can remove operators that are supported by mlir
// but not supported for an input fusion.
bool is_pointwise_op_supported_by_mlir_for_input(const instruction& i)
{
    return is_pointwise_op_supported_by_mlir(i);
}

MIGRAPHX_PRED_MATCHER(mlir_split_reduce, instruction_ref ins)
{
    if(ins->name() != "split_fused_reduce")
        return false;
    auto* mod_arg           = ins->module_inputs().front();
    auto supported_reshapes = reshaper_names();
    supported_reshapes.erase("slice");
    std::unordered_set<std::string> builtins = {"@param", "@literal", "@return"};
    for(const auto i : iterator_for(*mod_arg))
    {
        if(is_reduce(*i))
        {
            if(not is_reduce_op_supported_by_mlir(*i))
                return false;
        }
        else if(i->name() == "pointwise")
        {
            if(not std::all_of(i->module_inputs().front()->begin(),
                               i->module_inputs().front()->end(),
                               &is_pointwise_op_supported_by_mlir))
                return false;
        }
        else if(not contains(reshaper_names(), i->name()) and not contains(builtins, i->name()))
        {
            return false;
        }
    }
    return true;
}

MIGRAPHX_PRED_MATCHER(mlir_pointwise, instruction_ref ins)
{
    if(ins->name() != "pointwise")
        return false;
    auto* pm = ins->module_inputs().front();
    return std::all_of(pm->begin(), pm->end(), &is_pointwise_op_supported_by_mlir);
}

MIGRAPHX_PRED_MATCHER(mlir_input_pointwise, instruction_ref ins)
{
    if(ins->name() != "pointwise")
        return false;
    auto* pm = ins->module_inputs().front();
    return std::all_of(pm->begin(), pm->end(), &is_pointwise_op_supported_by_mlir_for_input);
}

std::vector<instruction_ref> mlir_contiguous(module_pass_manager& mpm,
                                             const std::vector<instruction_ref>& inputs)
{
    std::vector<instruction_ref> result;
    std::transform(
        inputs.begin(), inputs.end(), std::back_inserter(result), [&](instruction_ref input) {
            if(input->get_shape().packed() or input->get_shape().broadcasted())
                return input;
            return mpm.get_module().insert_instruction(
                std::next(input), make_op("contiguous"), input);
        });
    return result;
}

struct find_mlir_split_reduce
{
    mlir_mode conv_mode = mlir_mode::none;
    mlir_mode dot_mode  = mlir_mode::none;
    auto matcher() const
    {
        auto dot_or_conv = match::name("gpu::mlir_op");
        // TODO: Handle reshapes inbetween
        return mlir_split_reduce()(match::any_of[match::inputs()](dot_or_conv.bind("gemm")));
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto reduce_ins = r.result;
        auto gemm_ins   = r.instructions["gemm"];
        assert(gemm_ins->get_shape().sub_shapes().empty());
        auto* rm   = reduce_ins->module_inputs().front();
        auto names = rm->get_parameter_names();
        std::sort(names.begin(), names.end());
        module_ref gemm_old_mm = gemm_ins->module_inputs().front();
        module_ref mm = mpm.create_module(gemm_old_mm->name() + "_" + rm->name(), *gemm_old_mm);
        // remove last return instruction
        if(std::prev(mm->end())->name() == "@return")
        {
            mm->remove_instruction(std::prev(mm->end()));
        }
        mm->set_bypass();
        std::unordered_map<instruction_ref, instruction_ref> param_map;
        param_map[gemm_ins]      = std::prev(mm->end());
        bool gemm_has_multi_outs = gemm_ins->outputs().size() > 1;
        auto return_vals = mm->fuse(*rm, reduce_ins->inputs(), &param_map, &unroll_pointwise);
        if(gemm_has_multi_outs)
        {
            return_vals.insert(return_vals.end(), param_map[gemm_ins]);
        }
        mm->add_return(return_vals);
        std::vector<instruction_ref> inputs;
        std::copy_if(reduce_ins->inputs().begin(),
                     reduce_ins->inputs().end(),
                     std::back_inserter(inputs),
                     [&](auto input) { return input != gemm_ins; });
        inputs.insert(inputs.end(), gemm_ins->inputs().begin(), gemm_ins->inputs().end());
        if(gemm_has_multi_outs)
        {
            auto fused_ins = mpm.get_module().insert_instruction(
                reduce_ins, mlir_op{gemm_ins->get_operator()}, mlir_contiguous(mpm, inputs), {mm});
            auto dot_ins = mpm.get_module().insert_instruction(
                reduce_ins,
                migraphx::make_op("get_tuple_elem", {{"index", return_vals.size() - 1}}),
                fused_ins);

            mpm.get_module().replace_instruction(gemm_ins, dot_ins);
            for(const auto& outs : reduce_ins->outputs())
            {
                assert(outs->get_operator().name() == "get_tuple_elem");
                mpm.get_module().replace_instruction(outs, outs->get_operator(), fused_ins);
            }
        }
        else
        {
            mpm.get_module().replace_instruction(
                reduce_ins, mlir_op{gemm_ins->get_operator()}, mlir_contiguous(mpm, inputs), {mm});
        }
    }
};

struct find_mlir_fused_ops
{
    mlir_mode conv_mode = mlir_mode::none;
    mlir_mode dot_mode  = mlir_mode::none;
    auto matcher() const
    {
        auto reshapes = reshaper_names();
        // slice is not supported
        reshapes.erase("slice");
        auto dot_or_conv = match::skip(match::name(reshapes))(
            match::any_of(is_mlir_dot(dot_mode), is_mlir_conv(conv_mode)).bind("gemm_based_op"));
        return mlir_pointwise()(match::any_of[match::inputs()](dot_or_conv.bind("x")));
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto pw_ins        = r.result;
        auto gemm_based_op = r.instructions["gemm_based_op"];
        auto x_ins         = r.instructions["x"]; // input to pointwise after reshaper op stream
        auto* pm           = pw_ins->module_inputs().front();
        auto pw_inputs     = pw_ins->inputs();
        // only of one of the inputs to pointwise module should be dependent on conv/gemm that is
        // being fused, otherwise it can create invalid graph transformation
        if(std::any_of(pw_inputs.begin(), pw_inputs.end(), [&](const auto& i) {
               return i != x_ins and reaches(gemm_based_op, i);
           }))
            return;
        auto names = pm->get_parameter_names();
        std::sort(names.begin(), names.end());
        module_ref mm = mpm.create_module("mlir_" + pm->name());
        mm->set_bypass();
        auto [anchor_op, top_inputs] = fuse_input_ops_and_gemm_based_op(
            mm, gemm_based_op->inputs(), gemm_based_op->get_operator());
        std::unordered_map<instruction_ref, instruction_ref> param_map =
            create_param_map_with_literals(mm, pm, pw_ins->get_shape());
        auto [upper_input, op_stream] = get_fusable_input_op_stream(x_ins);
        assert(upper_input == gemm_based_op);
        auto prev_input = anchor_op;
        for(const auto& op : reverse(op_stream))
        {
            prev_input = mm->add_instruction(op, {prev_input});
        }
        assert(prev_input->get_shape().lens() == x_ins->get_shape().lens());
        param_map[x_ins] = prev_input; // this is to avoid adding parameter for gemm/conv reshaped
                                       // input to pointwise in new fused module
        bool gemm_has_multi_outs = gemm_based_op->outputs().size() > 1;
        auto reshaped_gemm       = x_ins;
        std::vector<instruction_ref> reshapes_vec;
        while(reshaped_gemm != gemm_based_op)
        {
            reshapes_vec.push_back(reshaped_gemm);
            gemm_has_multi_outs = gemm_has_multi_outs or reshaped_gemm->outputs().size() > 1;
            reshaped_gemm       = reshaped_gemm->inputs().at(0);
        }
        reshapes_vec.push_back(reshaped_gemm);

        auto return_vals = mm->fuse(*pm, pw_ins->inputs(), &param_map);
        if(gemm_has_multi_outs)
        {
            return_vals.insert(return_vals.begin(), anchor_op);
        }
        mm->add_return(return_vals);

        std::vector<instruction_ref> inputs;
        std::copy_if(pw_ins->inputs().begin(),
                     pw_ins->inputs().end(),
                     std::back_inserter(inputs),
                     [&](auto input) { return input != x_ins; });
        inputs.insert(inputs.end(), top_inputs.begin(), top_inputs.end());
        if(gemm_has_multi_outs)
        {
            auto fused_ins = mpm.get_module().insert_instruction(
                pw_ins, mlir_op{gemm_based_op->get_operator()}, mlir_contiguous(mpm, inputs), {mm});
            mpm.get_module().replace_instruction(
                pw_ins, migraphx::make_op("get_tuple_elem", {{"index", 1}}), fused_ins);
            auto dot_ins = mpm.get_module().insert_instruction(
                pw_ins, migraphx::make_op("get_tuple_elem", {{"index", 0}}), fused_ins);
            // move all the reshape instructions and original GEMM instruction after the fused op to
            // avoid generating invalid migraphx program
            for(const auto& orig_i : reverse(reshapes_vec))
            {
                mpm.get_module().move_instruction(orig_i, pw_ins);
            }
            mpm.get_module().replace_instruction(gemm_based_op, dot_ins);
        }
        else
        {
            mpm.get_module().replace_instruction(
                pw_ins, mlir_op{gemm_based_op->get_operator()}, mlir_contiguous(mpm, inputs), {mm});
        }
    }
};

template <auto Matcher>
struct find_mlir_standalone_op
{
    mlir_mode mode       = mlir_mode::none;
    std::size_t* counter = nullptr;
    auto matcher() const { return Matcher(mode); }

    std::string get_count() const
    {
        if(counter == nullptr)
            MIGRAPHX_THROW("Invalid counter");
        return std::to_string((*counter)++);
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto gemm_based_op = r.result;
        // enable only for fp32/fp16/i8/fp8 types
        if(std::any_of(gemm_based_op->inputs().begin(), gemm_based_op->inputs().end(), [&](auto i) {
               return not contains({shape::type_t::float_type,
                                    shape::type_t::half_type,
                                    shape::type_t::bf16_type,
                                    shape::type_t::int8_type,
                                    shape::type_t::fp8e4m3fnuz_type,
                                    shape::type_t::fp8e5m2fnuz_type,
                                    shape::type_t::fp8e4m3fn_type,
                                    shape::type_t::fp8e5m2_type},
                                   i->get_shape().type());
           }))
            return;
        std::string module_name = "mlir_" + gemm_based_op->name() + get_count();
        if(mpm.get_module().name() != "main")
            module_name = mpm.get_module().name() + ":" + module_name;
        module_ref mm = mpm.create_module(module_name);
        mm->set_bypass();
        auto [anchor_op, top_inputs] = fuse_input_ops_and_gemm_based_op(
            mm, gemm_based_op->inputs(), gemm_based_op->get_operator());
        mm->add_return({anchor_op});
        mpm.get_module().replace_instruction(gemm_based_op,
                                             mlir_op{gemm_based_op->get_operator()},
                                             mlir_contiguous(mpm, top_inputs),
                                             {mm});
    }
};

using find_mlir_standalone_convolution_op = find_mlir_standalone_op<&is_mlir_conv>;
using find_mlir_standalone_dot_op         = find_mlir_standalone_op<&is_mlir_dot>;

struct find_mlir_standalone_attention_op
{
    mlir_mode dot_mode = mlir_mode::none;

    auto matcher() const
    {
        auto gemm1 =
            match::skip(match::name("contiguous"))(match::used_once(), is_mlir_dot(dot_mode))
                .bind("gemm1");
        auto fused_reduce =
            match::name("fused_reduce")(match::used_once(),
                                        match::any_of[match::inputs()](
                                            match::skip(match::name("reshape").bind("rsp"))(gemm1)))
                .bind("fused_reduce");
        return is_mlir_dot(dot_mode)(match::arg(0)(fused_reduce)).bind("gemm2");
    }

    std::unordered_map<instruction_ref, instruction_ref>
    invert_map_ins(const std::unordered_map<instruction_ref, instruction_ref>& map_ins) const
    {
        std::unordered_map<instruction_ref, instruction_ref> inverse_map;
        for(auto const& [key, value] : map_ins)
        {
            assert(not contains(inverse_map, value));
            inverse_map[value] = key;
        }
        return inverse_map;
    }

    auto finalize_attention_module(module_ref m) const
    {
        eliminate_common_subexpression{}.apply(*m);
        dead_code_elimination{}.apply(*m);
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto gemm2        = r.instructions["gemm2"];
        auto fused_reduce = r.instructions["fused_reduce"];
        auto gemm1        = r.instructions["gemm1"];

        auto axes = fused_reduce->get_operator().to_value()["axes"];
        if(axes.size() != 1)
            return;

        module m_attn;
        std::unordered_map<instruction_ref, instruction_ref> map_main_to_mattn;

        // Add first gemm and fuse any input shape ops
        module fuse_gemm1;
        auto [anchor_op, top_inputs] =
            fuse_input_ops_and_gemm_based_op(&fuse_gemm1, gemm1->inputs(), gemm1->get_operator());
        fuse_gemm1.add_return({anchor_op});
        m_attn.add_params(top_inputs, &map_main_to_mattn);

        std::unordered_map<instruction_ref, instruction_ref> map_gemm1_to_mattn(map_main_to_mattn);
        auto m_gemm1             = m_attn.fuse(fuse_gemm1, top_inputs, &map_gemm1_to_mattn).front();
        map_main_to_mattn[gemm1] = m_gemm1;

        if(contains(r.instructions, "rsp"))
        {
            auto rsp               = r.instructions["rsp"];
            auto m_rsp             = m_attn.add_instruction(rsp->get_operator(), {m_gemm1});
            map_main_to_mattn[rsp] = m_rsp;
        }
        // Add pointwise-softmax, unroll any pointwise modules back to base ops
        m_attn.add_params(fused_reduce->inputs(), &map_main_to_mattn);
        std::unordered_map<instruction_ref, instruction_ref> map_mfr_to_mattn(map_main_to_mattn);
        auto pw_softmax = m_attn
                              .fuse(*fused_reduce->module_inputs().front(),
                                    fused_reduce->inputs(),
                                    &map_mfr_to_mattn,
                                    &unroll_pointwise)
                              .front();

        // fused_reduce submodule should end with a softmax
        auto result = match::match_instruction(m_attn, pw_softmax, match::softmax());
        if(result.result != pw_softmax)
            return;

        // Insert explict softmax op - required for MLIR
        auto softmax_in = result.instructions["x"];
        auto softmax    = m_attn.insert_instruction(
            std::next(softmax_in), make_op("softmax", {{"axis", axes.front()}}), softmax_in);
        map_main_to_mattn[fused_reduce] = softmax;

        // all preceeding ops should be fusable ops
        if(not std::all_of(m_gemm1, softmax, [](auto i) {
               return (is_pointwise_op_supported_by_mlir(i) or
                       contains(reshaper_names(), i.name()));
           }))
            return;

        // Add second gemm and fuse any input shape ops
        module fuse_gemm2;
        auto [anchor_op2, top_inputs2] =
            fuse_input_ops_and_gemm_based_op(&fuse_gemm2, gemm2->inputs(), gemm2->get_operator());
        fuse_gemm2.add_return({anchor_op2});
        m_attn.add_params(top_inputs2, &map_main_to_mattn);

        std::unordered_map<instruction_ref, instruction_ref> map_gemm2_to_mattn(map_main_to_mattn);
        auto m_gemm2 = m_attn.fuse(fuse_gemm2, top_inputs2, &map_gemm2_to_mattn).front();
        map_main_to_mattn[gemm2] = m_gemm2;

        // Fuse any succeeding pointwise module
        if(contains(r.instructions, "trailing_pm"))
        {
            auto trailing_pm_ins = r.instructions["trailing_pm"];
            auto lit_map         = create_param_map_with_literals(
                &m_attn, trailing_pm_ins->module_inputs().front(), trailing_pm_ins->get_shape());
            m_attn.add_params(trailing_pm_ins->inputs(), &map_main_to_mattn);
            map_main_to_mattn.insert(lit_map.begin(), lit_map.end());
            std::unordered_map<instruction_ref, instruction_ref> map_pm_to_mattn(map_main_to_mattn);
            auto fused_pw_outs = m_attn
                                     .fuse(*trailing_pm_ins->module_inputs().front(),
                                           trailing_pm_ins->inputs(),
                                           &map_pm_to_mattn)
                                     .front();
            map_main_to_mattn[trailing_pm_ins] = fused_pw_outs;
            m_attn.add_return({fused_pw_outs});
        }
        else
        {
            m_attn.add_return({m_gemm2});
        }

        finalize_attention_module(&m_attn);
        auto map_mattn_to_main = invert_map_ins(map_main_to_mattn);
        auto new_inputs        = m_attn.get_inputs(map_mattn_to_main);

        module_ref mpm_attn = mpm.create_module(
            "mlir_attn_" + fused_reduce->module_inputs().front()->name(), std::move(m_attn));
        mpm_attn->set_bypass();

        mpm.get_module().replace_instruction(
            r.result, mlir_op{gemm1->get_operator()}, mlir_contiguous(mpm, new_inputs), {mpm_attn});
    }
};

struct find_mlir_attention_fused_ops : public find_mlir_standalone_attention_op
{
    auto matcher() const
    {
        auto standalone_matcher = find_mlir_standalone_attention_op::matcher();
        return mlir_pointwise()(
            match::any_of[match::inputs()](standalone_matcher).bind("trailing_pm"));
        ;
    }
};

struct find_pointwise_mlir
{
    auto supported_pointwise() const { return mlir_input_pointwise(match::used_once()); }

    auto matcher() const
    {
        return match::name("gpu::mlir_op")(match::any_of[match::inputs()](supported_pointwise()));
    }

    static bool is_simple_op(const_module_ref pm, std::initializer_list<std::string> op_names)
    {
        auto last = std::prev(pm->end());
        assert(last->name() == "@return");
        if(last->inputs().size() != 1)
            return false;
        auto rins   = last->inputs().front();
        auto op_ins = std::find_if(pm->begin(), pm->end(), [](const instruction& x) {
            return not contains({"@param", "@literal", "broadcast", "multibroadcast"}, x.name());
        });
        if(op_ins != rins)
            return false;
        return contains(op_names, op_ins->name());
    }

    static instruction_ref insert_pointwise(module& m,
                                            instruction_ref ins,
                                            const operation& op,
                                            const std::vector<instruction_ref>& inputs,
                                            const std::vector<module_ref>& mod_args)
    {
        // Only used in assert
        (void)mod_args;
        assert(mod_args.empty());
        return insert_common_op(m, ins, op, inputs, {.common_type = false});
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto ins = r.result;

        auto* mm = ins->module_inputs().front();
        std::vector<instruction_ref> pws;
        std::copy_if(
            ins->inputs().begin(),
            ins->inputs().end(),
            std::back_inserter(pws),
            [&](instruction_ref input) {
                if(not match::instruction_matches(mpm.get_module(), input, supported_pointwise()))
                    return false;
                auto* pm = input->module_inputs().front();
                if(input->inputs().size() > 1 and not is_simple_op(pm, {"dequantizelinear"}))
                {
                    if(not enabled(MIGRAPHX_ENABLE_MLIR_INPUT_FUSION{}))
                        return false;
                }
                return true;
            });
        if(pws.empty())
            return;

        std::string module_name;
        std::transform(
            pws.begin(), pws.end(), join_back_inserter(module_name), [](instruction_ref pw) {
                return pw->module_inputs().front()->name() + ":";
            });
        module_name += mm->name();
        module_ref m = mpm.create_module(module_name);
        m->set_bypass();

        std::unordered_map<instruction_ref, instruction_ref> map_ins;
        for(auto pw : pws)
        {
            auto* pm = pw->module_inputs().front();
            fuse_input_ops(m, pw->inputs(), &map_ins);
            auto rins   = m->fuse(*pm, pw->inputs(), &map_ins, &insert_pointwise).front();
            map_ins[pw] = rins;
        }

        auto ret = m->fuse(*mm, ins->inputs(), &map_ins);
        m->add_return({ret});

        auto inputs = find_inputs(map_ins, &mpm.get_module(), m);
        mpm.get_module().replace_instruction(
            ins, ins->get_operator(), mlir_contiguous(mpm, inputs), {m});
    }
};

struct find_unpack_int4_mlir_op
{
    auto matcher() const
    {
        return match::name("gpu::mlir_op")(
            match::any_of[match::inputs()](match::name("unpack_int4").bind("unpack_int4")));
    }

    void apply(module_pass_manager& mpm, const match::matcher_result& r) const
    {
        auto ins      = r.result;
        auto* mm      = ins->module_inputs().front();
        module_ref nm = mpm.create_module("int4:" + mm->name());
        nm->set_bypass();

        std::vector<instruction_ref> x_in;
        std::unordered_map<instruction_ref, instruction_ref> map_ins;
        int ct = 0;

        for(auto input : ins->inputs())
        {
            if(input->get_operator().name() == "unpack_int4")
            {
                auto unpack_input = input->inputs()[0];
                instruction_ref t_ins =
                    nm->add_parameter(param_name(++ct), unpack_input->get_shape().as_standard());
                map_ins[input] = nm->add_instruction(input->get_operator(), t_ins);
                x_in.push_back(unpack_input);
            }
            else
            {
                map_ins[input] =
                    nm->add_parameter(param_name(++ct), input->get_shape().as_standard());
                x_in.push_back(input);
            }
        }
        auto ret = nm->fuse(*mm, ins->inputs(), &map_ins);
        nm->add_return({ret});
        mpm.get_module().replace_instruction(ins, ins->get_operator(), x_in, {nm});
    }
};

} // namespace

#endif // MIGRAPHX_MLIR

void fuse_mlir::apply(module_pass_manager& mpm) const
{
#ifdef MIGRAPHX_MLIR
    std::size_t counter     = 0;
    const auto& device_name = ctx == nullptr ? "" : ctx->get_current_device().get_gfx_name();
    const bool is_navi = starts_with(device_name, "gfx11") or starts_with(device_name, "gfx12");

    auto get_mode = [&](std::string_view option, mlir_mode m1, mlir_mode m2 = mlir_mode::fast) {
        if(specific_op<rejected>(option))
            return mlir_mode::none;
        if(specific_op<requested>(option))
            return mlir_mode::all;
        if(is_navi)
            return mlir_mode::all;
        return std::max(m1, m2);
    };

    // Attention offloads; default disabled
    if(mlir_attention_enabled(ctx) or enable_extra)
    {
        match::find_matches(mpm, find_mlir_attention_fused_ops{mlir_mode::all});
        mpm.run_pass(dead_code_elimination{});
        match::find_matches(mpm, find_mlir_standalone_attention_op{mlir_mode::all});
        mpm.run_pass(dead_code_elimination{});
    }

    match::find_matches(
        mpm,
        find_mlir_fused_ops{.conv_mode = get_mode("fused_convolution", mlir_mode::fast),
                            .dot_mode  = get_mode("fused_dot", mlir_mode::fast)});

    match::find_matches(
        mpm,
        find_mlir_standalone_convolution_op{.mode    = get_mode("convolution", mlir_mode::fast),
                                            .counter = &counter},
        find_mlir_standalone_dot_op{.mode = get_mode("dot", mlir_mode::fast), .counter = &counter});

    mpm.run_pass(dead_code_elimination{});
    if(enabled(MIGRAPHX_ENABLE_MLIR_REDUCE_FUSION{}))
    {
        match::find_matches(
            mpm,
            find_mlir_split_reduce{.conv_mode = get_mode("fused_convolution", mlir_mode::fast),
                                   .dot_mode  = get_mode("fused_dot", mlir_mode::fast)});
    }

    match::find_matches(mpm, find_pointwise_mlir{});
    match::find_matches(mpm, find_unpack_int4_mlir_op{});

#else
    (void)mpm;
#endif
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
