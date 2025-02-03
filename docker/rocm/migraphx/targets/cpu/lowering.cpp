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

#include <migraphx/cpu/lowering.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/dfor.hpp>
#include <migraphx/op/identity.hpp>
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/convolution_backwards.hpp>
#include <migraphx/op/quant_convolution.hpp>
#include <migraphx/op/dot.hpp>
#include <migraphx/op/quant_dot.hpp>
#include <migraphx/op/elu.hpp>
#include <migraphx/op/im2col.hpp>
#include <migraphx/op/leaky_relu.hpp>
#include <migraphx/op/logsoftmax.hpp>
#include <migraphx/op/lrn.hpp>
#include <migraphx/op/pad.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/op/softmax.hpp>
#include <migraphx/op/argmax.hpp>
#include <migraphx/op/argmin.hpp>
#include <migraphx/op/rnn_var_sl_last_output.hpp>
#include <migraphx/op/mod.hpp>
#include <migraphx/op/fmod.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/par_dfor.hpp>
#include <migraphx/clamp.hpp>
#include <migraphx/cpu/context.hpp>
#include <migraphx/register_op.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/program.hpp>
#include <migraphx/tune_axis.hpp>
#include <migraphx/match/layernorm.hpp>
#include <migraphx/match/gelu_erf.hpp>
#include <migraphx/match/gelu_tanh.hpp>
#include <migraphx/matcher.hpp>
#include <unordered_map>
#include <utility>
#include <iostream>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace cpu {

template <typename T>
T zero(const T&)
{
    return T(0);
}

template <class T>
typename std::conditional_t<std::is_integral<T>{}, std::make_signed<T>, std::enable_if<true, T>>::
    type
    make_signed(T x)
{
    return x;
}

struct cpu_im2col
{
    op::im2col op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return migraphx::reflect(self.op, f);
    }

    static std::string name() { return "cpu::im2col"; }
    shape compute_shape(const std::vector<shape>& inputs) const
    {
        return op.normalize_compute_shape(inputs);
    }

    argument compute(context&, const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        auto input_shape   = args[0].get_shape();
        auto weights_shape = args[1].get_shape();
        visit_all(result, args[0])([&](auto col, auto input) {
            const std::size_t& height   = input_shape.lens()[2];
            const std::size_t& width    = input_shape.lens()[3];
            const std::size_t& channels = weights_shape.lens()[1];
            const std::size_t& kernel_h = weights_shape.lens()[2];
            const std::size_t& kernel_w = weights_shape.lens()[3];
            const std::size_t& pad_h    = op.padding[0];
            const std::size_t& pad_w    = op.padding[1];
            const std::size_t& stride_h = op.stride[0];
            const std::size_t& stride_w = op.stride[1];

            long kdiv2_h = long(kernel_h) / 2;
            long kdiv2_w = long(kernel_w) / 2;
            // calculate output sizes
            const std::size_t col_height = (height - kernel_h + 2 * pad_h) / stride_h + 1;
            const std::size_t col_width  = (width - kernel_w + 2 * pad_w) / stride_w + 1;
            // account for padding for the starting position of the input pixels
            long iinput = kdiv2_h - long(pad_h);
            // loop over output pixels (ioutput, joutput)
            for(std::size_t ioutput = 0; ioutput < col_height; ioutput++, iinput += stride_h)
            {
                long jinput = kdiv2_w - long(pad_w);
                for(std::size_t joutput = 0; joutput < col_width; joutput++, jinput += stride_w)
                {
                    // compute linear index for output
                    std::size_t ldx = ioutput * col_width + joutput;
                    std::size_t p   = 0;
                    dfor(channels,
                         kernel_h,
                         kernel_w)([&](std::size_t c, std::size_t koffset, std::size_t loffset) {
                        auto idx    = iinput + long(koffset) - kdiv2_h;
                        auto jdx    = jinput + long(loffset) - kdiv2_w;
                        col(ldx, p) =
                            ((idx >= 0) and (idx < height) and (jdx >= 0) and (jdx < width))
                                ? input(0, c, idx, jdx)
                                : 0;
                        p++;
                    });
                }
            }
        });
        return result;
    }
};
MIGRAPHX_REGISTER_OP(cpu_im2col)

struct cpu_op
{
    operation op = op::identity{};
    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return migraphx::reflect(self.op, f);
    }
    std::string name() const { return "cpu::op"; }
    shape compute_shape(const std::vector<shape>& inputs) const { return op.compute_shape(inputs); }
    argument compute(context&, const shape& output_shape, const std::vector<argument>& args) const
    {
        return op.compute(output_shape, args);
    }
    value to_value() const
    {
        value v;
        v["name"]     = op.name();
        v["operator"] = op.to_value();
        return v;
    }
    void from_value(const value& v)
    {
        op = make_op(v.at("name").to<std::string>(), v.at("operator"));
    }
    friend std::ostream& operator<<(std::ostream& os, const cpu_op& x)
    {
        os << "cpu::" << x.op;
        return os;
    }
};
MIGRAPHX_REGISTER_OP(cpu_op)

struct cpu_pad
{
    op::pad op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return migraphx::reflect(self.op, f);
    }

    std::string name() const { return "cpu::pad"; }
    shape compute_shape(const std::vector<shape>& inputs) const { return op.compute_shape(inputs); }
    argument compute(context&, const shape& output_shape, std::vector<argument> args) const
    {
        assert(output_shape.standard());
        argument result{output_shape};
        result.visit([&](auto output) {
            using type = typename decltype(output)::value_type;
            std::fill(output.begin(), output.end(), pad_clamp<type>(op.value));
        });

        visit_all(result, args[0])([&](auto output, auto input) {
            shape_for_each(input.get_shape(), [&](const auto& idx) {
                std::vector<std::size_t> new_idx(idx.size());
                std::transform(
                    idx.begin(), idx.end(), op.pads.begin(), new_idx.begin(), [](auto i, auto j) {
                        return i + j;
                    });
                output(new_idx.begin(), new_idx.end()) = input(idx.begin(), idx.end());
            });
        });

        return result;
    }
};
MIGRAPHX_REGISTER_OP(cpu_pad)

struct cpu_rnn_var_sl_last_output
{
    op::rnn_var_sl_last_output op;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return migraphx::reflect(self.op, f);
    }

    std::string name() const { return "cpu::rnn_var_sl_last_output"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        return op.compute_shape(std::move(inputs));
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        argument result{output_shape};
        auto out_comp_lens = args[0].get_shape().lens();
        out_comp_lens[0]   = 1;
        shape out_comp_s{output_shape.type(), out_comp_lens};

        visit_all(result, args[0])([&](auto output, auto input) {
            args[1].visit([&](auto seq_lens) {
                par_for(output_shape.elements(), [&](auto i) {
                    auto idx = out_comp_s.multi(i);
                    auto b   = idx[2];
                    if(op.direction == op::rnn_direction::reverse or idx[1] == 1)
                    {
                        idx[0] = 0;
                    }
                    else
                    {
                        idx[0] = seq_lens[b] - 1;
                    }
                    output[i] = input(idx.begin(), idx.end());
                });
            });
        });

        return result;
    }
};
MIGRAPHX_REGISTER_OP(cpu_rnn_var_sl_last_output)

struct cpu_apply
{
    module* modl;
    std::unordered_map<std::string, std::function<instruction_ref(instruction_ref)>> apply_map{};
    instruction_ref last{};

    void extend_op(const std::string& op_name, const std::string& cpu_name, bool allocate = true)
    {
        apply_map.emplace(op_name, [=](instruction_ref ins) {
            auto&& op = ins->get_operator();
            if(allocate)
                return replace(ins, make_op(cpu_name, op.to_value()));
            return modl->replace_instruction(ins, make_op(cpu_name, op.to_value()), ins->inputs());
        });
    }

    void extend_dnnl_algos(const std::string& dnnl_name,
                           const std::vector<std::pair<std::string, std::string>>& algos)
    {
        for(auto&& pp : algos)
        {
            std::string op_name = pp.first;
            std::string algo    = pp.second;
            apply_map.emplace(op_name, [=](instruction_ref ins) {
                auto v = ins->get_operator().to_value();
                if(not v.is_object())
                    return ins;
                v["algo"] = algo;
                auto op   = make_op(dnnl_name, v);
                return replace(ins, op);
            });
        }
    }

    template <class M>
    auto fuse_match(M matcher, const operation& op, const std::vector<std::string>& bind_inputs)
    {
        return match::make_match_finder(matcher, [=](auto&, const auto& r) {
            auto ins = r.result;
            std::vector<instruction_ref> inputs;
            std::transform(bind_inputs.begin(),
                           bind_inputs.end(),
                           std::back_inserter(inputs),
                           [&](const auto& s) { return r.instructions[s]; });
            inputs.push_back(this->insert_allocation(ins, ins->get_shape()));
            modl->replace_instruction(ins, op, inputs);
        });
    }

    void init()
    {
        extend_dnnl_algos("dnnl::binary",
                          {
                              {"add", "binary_add"},
                              {"div", "binary_div"},
                              {"max", "binary_max"},
                              {"min", "binary_min"},
                              {"mul", "binary_mul"},
                          });

        extend_dnnl_algos("dnnl::eltwise",
                          {
                              {"abs", "eltwise_abs"},
                              {"elu", "eltwise_elu"},
                              {"exp", "eltwise_exp"},
                              {"log", "eltwise_log"},
                              {"relu", "eltwise_relu"},
                              {"sqrt", "eltwise_sqrt"},
                              {"tanh", "eltwise_tanh"},
                          });

        extend_dnnl_algos("dnnl::reduction",
                          {
                              {"reduce_max", "reduction_max"},
                              {"reduce_mean", "reduction_mean"},
                              {"reduce_min", "reduction_min"},
                              {"reduce_sum", "reduction_sum"},
                          });
        extend_op("concat", "dnnl::concat");
        extend_op("contiguous", "dnnl::reorder");
        extend_op("convolution", "dnnl::convolution");
#ifndef MIGRAPHX_ENABLE_ZENDNN
        extend_op("convolution_backwards", "dnnl::convolution_backwards");
        extend_op("dot", "dnnl::dot");
#endif
        extend_op("erf", "cpu::erf");
        extend_op("gather", "cpu::gather");
        extend_op("logsoftmax", "dnnl::logsoftmax");
        extend_op("lrn", "dnnl::lrn");
        extend_op("softmax", "dnnl::softmax");

        extend_op("im2col", "cpu::im2col", false);
        extend_op("leaky_relu", "cpu::leaky_relu", false);
        extend_op("pad", "cpu::pad", false);
        extend_op("rnn_var_sl_last_output", "cpu::rnn_var_sl_last_output", false);
    }

    void apply()
    {
        init();
        // Apply fusion matchers first
        match::find_matches(*modl,
                            fuse_match(match::gelu_erf(),
                                       make_op("dnnl::eltwise", {{"algo", "eltwise_gelu_erf"}}),
                                       {"x"}),
                            fuse_match(match::gelu_tanh(),
                                       make_op("dnnl::eltwise", {{"algo", "eltwise_gelu_tanh"}}),
                                       {"x"}),
                            fuse_match(match::layernorm(), make_op("dnnl::layernorm"), {"x"}));
        // Apply these operators first so the inputs can be const folded
        for(auto it : iterator_for(*modl))
        {
            // skip lowering if input has fp8 as one of the inputs since oneDNN doesn't have fp8
            // supported yet.
            if(std::any_of(it->inputs().begin(), it->inputs().end(), [](const auto& i) {
                   return contains(fp8_types{}.get(), i->get_shape().type());
               }))
                continue;
            if(it->name() == "pow")
            {
                apply_pow(it);
            }
        }
        for(auto it : iterator_for(*modl))
        {
            // skip lowering if input has fp8 as one of the inputs since oneDNN doesn't have fp8
            // supported yet.
            if(std::any_of(it->inputs().begin(), it->inputs().end(), [](const auto& i) {
                   return contains(fp8_types{}.get(), i->get_shape().type());
               }))
                continue;
            if(it->name() == "pooling")
            {
                apply_pooling(it);
            }
            else if(it->name() == "reshape")
            {
                apply_reshape(it);
            }
            else if(apply_map.count(it->name()) > 0)
            {
                apply_map.at(it->name())(it);
            }
        }
    }

    instruction_ref apply_pow(instruction_ref ins) const
    {
        auto beta = read_scalar<float>(ins->inputs()[1]);
        if(beta.empty())
            return ins;
        return replace(ins,
                       make_op("dnnl::eltwise",
                               {{"algo", "eltwise_pow"}, {"alpha", 1.0}, {"beta", beta.front()}}),
                       {ins->inputs().front()});
    }

    // TODO:  update lowering to run the reference
    // code when OneDNN can't execute pooling for a CPU

    // OneDNN has a limitation on padding size for pooling.  see
    // https://oneapi-src.github.io/oneDNN/dev_guide_convolution.html#doxid-dev-guide-convolution

    // padding = {2}; stride = {1}; lengths = {3} succeeds in oneDNN but
    // padding = {2}; stride = {1}; lengths = {2} fails.
    // Also, the referenced documentation contains a max. dimension size of 14 for the kernel
    // ("weights tensor") that MIGraphX doesn't enforce.
    instruction_ref apply_pooling(instruction_ref ins) const
    {
        auto&& op = ins->get_operator();
        auto v    = op.to_value();
        if(has_op("dnnl::pooling") and ins->get_shape().type() == shape::type_t::float_type and
           not v["ceil_mode"].to<bool>() and
           v["mode"].to<op::pooling_mode>() != op::pooling_mode::lpnorm)
            return replace(ins, make_op("dnnl::pooling", op.to_value()));
        return ins;
    }
    /*
    Lowers reshape copy operator to reshape lazy by inserting contiguous operators around it.
    Contiguous ops will later by removed by eliminate_contiguous pass.
    */
    instruction_ref apply_reshape(instruction_ref ins) const
    {
        std::vector<instruction_ref> before_contiguous_args = ins->inputs();
        auto before_alloc =
            insert_allocation(ins, before_contiguous_args.front()->get_shape().as_standard());
        before_contiguous_args.push_back(before_alloc);
        auto before_contig =
            modl->insert_instruction(ins, make_op("dnnl::reorder"), {before_contiguous_args});

        auto new_lazy_reshape = modl->insert_instruction(
            ins,
            make_op("reshape_lazy", {{"dims", {ins->get_operator().to_value().at("dims")}}}),
            before_contig);

        std::vector<instruction_ref> after_contiguous_args = {new_lazy_reshape};
        auto after_alloc = insert_allocation(new_lazy_reshape, new_lazy_reshape->get_shape());
        after_contiguous_args.push_back(after_alloc);
        return modl->replace_instruction(ins, make_op("dnnl::reorder"), after_contiguous_args);
    }

    template <class T>
    static std::vector<T> read_scalar(instruction_ref ins)
    {
        if(ins->name() == "contiguous")
            return read_scalar<T>(ins->inputs().front());
        if(ins->get_shape().elements() != 1 and not ins->get_shape().scalar())
            return {};
        auto r = ins->eval();
        if(r.empty())
            return {};
        return {r.at<T>()};
    }

    instruction_ref replace(instruction_ref ins, const operation& op) const
    {
        return replace(ins, op, ins->inputs());
    }

    instruction_ref
    replace(instruction_ref ins, const operation& op, std::vector<instruction_ref> inputs) const
    {
        inputs.push_back(insert_allocation(ins, ins->get_shape()));
        return modl->replace_instruction(ins, op, inputs);
    }

    instruction_ref insert_allocation(instruction_ref ins, const shape& s) const
    {
        return modl->insert_instruction(ins, make_op("allocate", {{"shape", to_value(s)}}));
    }
};

void lowering::apply(module& m) const { cpu_apply{&m}.apply(); }

} // namespace cpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
