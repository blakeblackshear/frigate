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
#include <migraphx/gpu/compile_gen.hpp>
#include <migraphx/gpu/context.hpp>
#include <migraphx/gpu/compile_hip_code_object.hpp>
#include <migraphx/gpu/prepare_reduce.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/shape.hpp>
#include <migraphx/permutation.hpp>
#include <migraphx/stringutils.hpp>
#include <migraphx/module.hpp>
#include <migraphx/rewrite_quantization.hpp>
#include <migraphx/optimize_module.hpp>
#include <migraphx/cpp_generator.hpp>
#include <migraphx/pass_manager.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/array.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/fp8_types.hpp>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
namespace gen {

static std::vector<std::size_t> vector_sizes(const std::vector<shape>& inputs)
{
    // If all inputs are half then only use half2
    if(std::all_of(inputs.begin(), inputs.end(), [](const auto& s) {
           return s.type() == shape::half_type;
       }))
        return {2};
    return {4, 2};
}

vectorize vectorize::elements(std::size_t axis,
                              const std::vector<shape>& inputs,
                              const std::vector<std::size_t>& sizes)
{
    // disable vectorization for fp8 types
    if(std::any_of(inputs.begin(), inputs.end(), [&](auto ishape) {
           return contains(fp8_types{}.get(), ishape.type());
       }))
        return {1, axis};
    if(std::all_of(
           inputs.begin(), inputs.end(), [&](const auto& s) { return s.lens()[axis] == 1; }))
        return {1, axis};
    std::vector<std::size_t> max_vec_size;
    std::transform(inputs.begin(),
                   inputs.end(),
                   std::back_inserter(max_vec_size),
                   [&](const auto& input) -> std::size_t {
                       auto stride = input.strides()[axis];
                       auto len    = input.lens()[axis];
                       if(not contains({0, 1}, stride))
                           return 1;
                       if(len == 1 and input.elements() > sizes.front())
                           return sizes.front();
                       auto it = std::find_if(sizes.begin(), sizes.end(), [&](auto vsize) {
                           // The len is divisible by the size and all the strides are divisible by
                           // the size
                           return (len % vsize) == 0 and
                                  std::all_of(
                                      input.strides().begin(), input.strides().end(), [&](auto i) {
                                          return contains({0, 1}, i) or i % vsize == 0;
                                      });
                       });
                       if(it != sizes.end())
                           return *it;
                       return 1;
                   });
    return {*std::min_element(max_vec_size.begin(), max_vec_size.end()), axis};
}

vectorize vectorize::elements(context& ctx, std::size_t axis, const std::vector<shape>& inputs)
{
    // disable vectorization for fp8 types
    if(std::any_of(inputs.begin(), inputs.end(), [&](auto ishape) {
           return contains(fp8_types{}.get(), ishape.type());
       }))
        return {1, axis};
    if(inputs.empty())
        return {1, axis};
    std::size_t n = std::max_element(inputs.begin(),
                                     inputs.end(),
                                     by(std::less<>{}, [](const auto& s) { return s.elements(); }))
                        ->elements();
    std::size_t max_global = ctx.get_current_device().get_cu_count() *
                             ctx.get_current_device().get_max_workitems_per_cu();
    std::size_t over = n / max_global;
    bool broadcasted =
        std::any_of(inputs.begin(), inputs.end(), [](const auto& s) { return s.broadcasted(); });
    std::vector<std::size_t> sizes;
    if(broadcasted and over > 8)
        sizes.push_back(8);
    if(over > 4)
        sizes.push_back(4);
    sizes.push_back(2);
    return elements(axis, inputs, sizes);
}

vectorize vectorize::elements(std::size_t axis, const std::vector<shape>& inputs)
{
    return elements(axis, inputs, vector_sizes(inputs));
}

std::string vectorize::str() const
{
    return "vectorize<" + to_string(size) + ", " + to_string(axis) + ">()";
}

preload preload::broadcasts(std::size_t axis, const std::vector<shape>& inputs)
{
    const std::size_t max_lds_bytes = 4096;
    std::vector<bool> result(inputs.size());
    std::vector<std::size_t> preloaded;
    auto idxs = range(inputs.size());
    std::copy_if(idxs.begin(), idxs.end(), std::back_inserter(preloaded), [&](auto i) {
        return inputs[i].strides()[axis] == 0;
    });
    std::sort(preloaded.begin(), preloaded.end(), by(std::less<>{}, [&](auto i) {
                  return inputs[i].bytes();
              }));

    std::size_t bytes = 0;
    for(auto i : preloaded)
    {
        const auto& input = inputs[i];
        bytes += input.bytes();
        if(bytes > max_lds_bytes)
            break;
        result[i] = true;
    }
    return {result};
}

std::string preload::str() const
{
    std::vector<std::string> bool_strs;
    std::transform(args.begin(), std::prev(args.end()), std::back_inserter(bool_strs), [](bool b) {
        if(b)
            return "true";
        return "false";
    });
    return "auto_preload<false, " + join_strings(bool_strs, ", ") + ">(idx)";
}

bool preload::is_preloading() const
{
    return std::accumulate(args.begin(), args.end(), false, std::logical_or<>{});
}

static std::size_t integer_divide_ceil(std::size_t x, std::size_t y)
{
    return (x + y - std::size_t{1}) / y;
}

static std::size_t compute_tile_factor(std::size_t r, std::size_t max_size = 64)
{
    std::size_t n = 1;
    auto factors  = make_array(2, 3, 5, 7, 11);
    while(n < max_size)
    {
        // NOLINTNEXTLINE(readability-qualified-auto)
        auto it = std::find_if(factors.begin(), factors.end(), [&](auto d) { return r % d == 0; });
        if(it == factors.end())
            break;
        r /= *it;
        n *= *it;
    }
    return n;
}

tile tile::elements(const std::vector<shape>& inputs, std::size_t noutputs)
{
    tile result;
    auto ndim = inputs.front().ndim();
    std::vector<std::size_t> faxes;
    std::transform(
        inputs.begin(), inputs.end(), std::back_inserter(faxes), MIGRAPHX_LIFT(find_fast_axis));
    result.axis = std::accumulate(faxes.begin(), faxes.end(), ndim, MIGRAPHX_LIFT(std::min));
    if(result.axis >= (ndim - 1))
        return {};
    auto select = [&](auto m) {
        return [&, m](std::size_t faxis, shape input) {
            if(input.broadcasted())
                return none;
            if(faxis < (ndim - 1))
                return m;
            return none;
        };
    };
    std::transform(faxes.begin(),
                   faxes.end() - noutputs,
                   inputs.begin(),
                   std::back_inserter(result.args),
                   select(load));
    std::transform(faxes.end() - noutputs,
                   faxes.end(),
                   inputs.end() - noutputs,
                   std::back_inserter(result.args),
                   select(store));

    auto nargs = std::count_if(
        result.args.begin(), result.args.end(), [](auto m) { return m != mode::none; });
    // TODO: Handle tiling more than one arguments
    if(nargs != 1)
        return {};

    const auto& s = inputs.front();
    auto dim1     = compute_tile_factor(s.lens()[result.axis]);
    auto dim2     = compute_tile_factor(s.lens().back(), 4096 / dim1);
    if(dim1 == 1 or dim2 == 1)
        return {};

    result.inner = s.lens();
    std::fill(result.inner.begin(), result.inner.end(), 1);
    result.inner[result.axis] = dim1;
    result.inner.back()       = dim2;

    result.outer = s.lens();
    result.outer[result.axis] /= dim1;
    result.outer.back() /= dim2;

    auto tile_size = dim1 * dim2;
    result.ntiles  = s.elements() / tile_size;
    // equivalent to dim1 * (dim2 + 1) to avoid bank conflicts
    auto tile_bytes = (tile_size + dim1) * s.type_size();
    if(tile_bytes > 65536)
        return {};

    result.block_size = std::min<std::size_t>(256, integer_divide_ceil(tile_size / 4, 64) * 64);
    return result;
}

std::string tile::str() const
{
    if(args.empty())
        return "transform_args()";
    std::vector<std::string> strs;
    std::transform(args.begin(), args.end(), std::back_inserter(strs), [](mode m) {
        switch(m)
        {
        case load: return "tile::load";
        case store: return "tile::store";
        case none: return "tile::none";
        }
        MIGRAPHX_THROW("Invalid mode");
    });
    const std::string auto_tile = "auto_tile<${modes}>(${inner}, ${outer})";
    return interpolate_string(auto_tile,
                              {{"modes", join_strings(strs, ", ")},
                               {"inner", generate_index_ints(inner)},
                               {"outer", generate_index_ints(outer)}});
}

std::size_t find_fast_axis(const shape& input)
{
    if(input.scalar())
        return input.ndim() - 1;
    if(input.broadcasted())
    {
        auto stride_it = std::min_element(
            input.strides().begin(), input.strides().end(), by(std::less<>{}, [](std::size_t i) {
                if(i == 0)
                    return std::numeric_limits<std::size_t>::max();
                return i;
            }));
        return stride_it - input.strides().begin();
    }
    auto permutation = invert_permutation(find_permutation(input));
    auto it          = std::max_element(permutation.begin(), permutation.end());
    return it - permutation.begin();
}

std::size_t find_fast_axis(const std::vector<shape>& inputs)
{
    auto permutation = invert_permutation(find_permutation(inputs));
    auto it          = std::max_element(permutation.begin(), permutation.end());
    return it - permutation.begin();
}

std::string make_transformer_args(std::vector<std::string> transformers)
{
    return join_strings(std::move(transformers), ", ");
}

static void generate_pointwise(cpp_generator& gg,
                               const module& pm,
                               const std::string& name,
                               bool always_return_tuple = false)
{
    module m = pm;
    run_passes(m, {rewrite_quantization{}, optimize_module{}});
    m.sort();
    cpp_generator g;
    g.always_return_tuple(always_return_tuple);
    g.fmap([](const std::string& fname) { return "migraphx::" + fname; });
    g.add_point_op("where", "${function:where}(${0}, ${1}, ${2})");
    g.add_point_op("prelu", "${function:where}(${0} < 0, ${0} * ${1}, ${0})");
    g.add_point_op("sign", "${function:where}(${0} > 0, 1, ${function:where}(${0} < 0, -1, 0))");
    g.add_point_op("equal", "migraphx::abs(${0} == ${1})");
    g.add_point_op("less", "migraphx::abs(${0} < ${1})");
    g.add_point_op("greater", "migraphx::abs(${0} > ${1})");
    g.add_point_op("not", "migraphx::abs(not ${0})");
    // Add explict conversions
    g.fresult(
        [](const shape& s) { return "migraphx::convert<" + shape::cpp_type(s.type()) + ">"; });
    gg.create_function(g.generate_module(m)
                           .set_attributes({"__device__", "__attribute__((const))"})
                           .set_generic_types(m)
                           .set_name(name));
}
std::string generate_pointwise(const module& pm, const std::string& name, bool always_return_tuple)
{
    cpp_generator g;
    generate_pointwise(g, pm, name, always_return_tuple);
    return g.str();
}

std::string reduce_op::str() const
{
    return write + "(r.reduce(" + reduction + ", " + init + ", " + read + ")(" +
           join_strings(inputs, ", ") + "))";
}
void reduce_op::set(const std::string& name, const shape& input, const shape& output)
{
    assert(input.type() != shape::tuple_type);
    assert(output.type() != shape::tuple_type);
    if(name == "reduce_sum")
    {
        reduction = "op::sum{}";
    }
    else if(name == "reduce_mean")
    {
        auto reduce_elements = input.elements() / output.elements();
        auto reduce_type     = input.type();
        reduction            = "op::sum{}";
        std::string mean     = "op::mean<" + std::to_string(reduce_elements) + ">{}";
        // Use float accumulator when reduction size is too large for half
        if(reduce_type == shape::half_type and reduce_elements > 16384)
            read = "compose(" + mean + ", op::convert_to<float>{})";
        else if(contains({shape::float_type, shape::half_type, shape::double_type}, reduce_type))
            read = mean;
        else
            write = mean;
    }
    else if(name == "reduce_max")
    {
        reduction = "op::max{}";
        init      = "lowest{}";
    }
    else if(name == "reduce_min")
    {
        reduction = "op::min{}";
        init      = "highest{}";
    }
    else if(name == "reduce_prod")
    {
        reduction = "op::product{}";
        init      = "1";
    }
    else if(name == "reduce_any")
    {
        reduction = "op::logical_or{}";
        init      = "bool{false}";
    }
    else if(name == "reduce_all")
    {
        reduction = "op::logical_and{}";
        init      = "bool{true}";
    }
    else
    {
        MIGRAPHX_THROW("Unsupported reduce");
    }
}

void reduce_op::set(instruction_ref ins, const operation& op)
{
    if(op.name() == "gpu::parallel_reduce")
    {
        auto rop    = from_value<operation>(op.to_value().at("op"));
        auto input  = ins->inputs().front()->get_shape();
        auto output = ins->get_shape().sub_shapes().front();
        set(rop.name(), input, output);
        read = "compose(array_apply(" + read + "), MIGRAPHX_LIFT(make_array))";
    }
    else
    {
        set(op.name(), ins->inputs().front()->get_shape(), ins->get_shape());
    }
}
std::string reduce_op::generate(instruction_ref ins, const std::vector<std::string>& x)
{
    reduce_op r{x};
    r.set(ins, ins->get_operator());
    return r.str();
}

static bool use_lazy_inner(instruction_ref ins)
{
    if(ins->outputs().size() != 1)
        return false;
    // When the inputs are broadcasted, it means the lambda will capture SGPRs
    // when doing block/wave reduction. This can cause register spilling in
    // the compiler when the lambda is evaluated at a later time although it
    // shouldn't. Instead, use `inner` to workaround this issue in the
    // compiler.
    if(std::any_of(ins->inputs().begin(), ins->inputs().end(), [](instruction_ref input) {
           return input->get_shape().broadcasted();
       }))
        return false;
    auto output = ins->outputs().front();
    return contains(output->name(), "reduce") or output->name() == "@return";
}

void preload_params(module& m)
{
    for(auto ins : iterator_for(m))
    {
        if(ins->name() != "@param")
            continue;
        if(ins->outputs().size() <= 1)
            continue;
        auto id = m.insert_instruction(std::next(ins), make_op("identity"), ins);
        m.replace_instruction(ins, id);
    }
}

std::string generate_reduce(module m, const std::string& name)
{
    preload_params(m);
    run_passes(m, {optimize_module{}, prepare_reduce{}, optimize_module{}});
    m.sort();
    cpp_generator g;
    g.always_return_tuple();
    auto param_shapes = m.get_parameter_shapes();
    auto max_shape =
        std::max_element(param_shapes.begin(),
                         param_shapes.end(),
                         by(std::less<>{}, [](const auto& p) { return p.second.elements(); }));
    auto ilens    = max_shape->second.lens();
    std::size_t i = 0;
    auto f        = g.generate_module(m, [&](instruction_ref ins, const auto& names) {
        if(contains(ins->name(), "reduce"))
        {
            return reduce_op::generate(ins, cpp_generator::to_args(ins->inputs(), names));
        }
        if(ins->name() == "pointwise")
        {
            auto pointwise_name = "pointwise" + std::to_string(i);
            i++;
            generate_pointwise(g, *ins->module_inputs().front(), pointwise_name);
            std::vector<instruction_ref> tensors;
            std::copy_if(ins->inputs().begin(),
                         ins->inputs().end(),
                         std::back_inserter(tensors),
                         [&](auto input) {
                             return input->get_shape().lens() == ilens and
                                    not input->get_shape().broadcasted();
                         });
            auto inner_names = names;
            for(auto input : ins->inputs())
            {
                if(input->name() != "@param")
                    continue;
                if(contains(tensors, input))
                    continue;
                inner_names[input] += "[out_idx]";
            }
            for(auto input : tensors)
                inner_names[input] += "_lambda_param";
            auto call_function =
                pointwise_name + "(" +
                join_strings(cpp_generator::to_args(ins->inputs(), inner_names), ", ") + ")";
            if(tensors.empty())
                return call_function;
            const std::string inner_template =
                "r.${inner}([=](${params}) { return ${call}; })(${args})";
            std::string inner_name = use_lazy_inner(ins) ? "lazy_inner" : "inner";
            auto args              = cpp_generator::to_args(tensors, names);
            auto params            = cpp_generator::to_args(tensors, inner_names);
            std::transform(
                params.begin(), params.end(), params.begin(), [](auto s) { return "auto " + s; });
            return interpolate_string(inner_template,
                                      {{"inner", inner_name},
                                       {"params", join_strings(params, ", ")},
                                       {"args", join_strings(args, ", ")},
                                       {"call", call_function}});
        }
        if(ins->name() == "multibroadcast")
        {
            return names.at(ins->inputs().front());
        }
        if(ins->name() == "get_tuple_elem")
        {
            const auto& x = names.at(ins->inputs().front());
            auto index    = ins->get_operator().to_value()["index"].to<std::size_t>();
            return interpolate_string("${x}[${index}]",
                                      {{"x", x}, {"index", std::to_string(index)}});
        }
        if(ins->name() == "identity")
        {
            const auto& x = names.at(ins->inputs().front());
            return "r.inner(op::id{})(" + x + ")";
        }
        MIGRAPHX_THROW("Unknown operator: " + ins->name());
    });
    f.set_attributes({"__device__", "__attribute__((const))"}).set_generic_types(m).set_name(name);
    f.add_generic_param("r");
    f.add_generic_param("out_idx");
    f.unused_param("out_idx");
    g.create_function(f);
    return g.str();
}

static std::vector<std::string> get_op_names(const module& m)
{
    std::vector<std::string> result;
    for(auto& ins : m)
    {
        if(starts_with(ins.name(), "@"))
            continue;
        if(contains({"multibroadcast", "contiguous", "identity"}, ins.name()))
            continue;
        if(ins.name() == "pointwise")
        {
            auto names = get_op_names(*ins.module_inputs().front());
            result.insert(result.end(), names.begin(), names.end());
        }
        else
        {
            result.push_back(ins.name());
        }
    }
    return result;
}

std::string generate_name_from_ops(const module& m, const std::string& postname)
{
    auto op_names = get_op_names(m);
    if(not postname.empty())
        op_names.push_back(postname);
    if(op_names.empty())
        return "noop";
    return join_strings(op_names, "_");
}

} // namespace gen
} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
