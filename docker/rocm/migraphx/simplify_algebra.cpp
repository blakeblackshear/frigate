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
#include <migraphx/simplify_algebra.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/program.hpp>
#include <migraphx/op/concat.hpp>
#include <migraphx/op/slice.hpp>
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/broadcast.hpp>
#include <migraphx/op/reshape.hpp>
#include <migraphx/op/transpose.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/common.hpp>
#include <migraphx/literal.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/serialize.hpp>

#include <migraphx/algorithm.hpp>
#include <unordered_set>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

auto lit_broadcast() { return match::any_of(match::is_constant(), match::name("broadcast")); }
auto not_lit_broadcast() { return match::none_of(match::is_constant(), match::name("broadcast")); }
auto op_lit_broadcast(std::string op, std::string x, std::string y)
{
    return match::name(std::move(op))(match::either_arg(0, 1)(
        lit_broadcast().bind(std::move(x)), not_lit_broadcast().bind(std::move(y))));
}

auto conv_const_weights()
{
    return match::name("convolution")(
        match::used_once(),
        match::args(match::none_of(match::is_constant()), match::is_constant().bind("w")));
}

auto from_int4()
{
    return match::make_predicate_matcher([](instruction_ref start) {
        return fix<bool>([&](auto self, instruction_ref ins) {
            auto alias = instruction::get_output_alias(ins);
            if(contains({"reshape", "dequantizelinear"}, alias->name()))
                return self(alias->inputs().front());
            if(alias->name() == "concat")
                return all_of(alias->inputs(), self);
            return alias->name() == "unpack_int4";
        })(start);
    });
}

auto not_from_int4() { return match::none_of(from_int4()); }

auto reduction() { return match::name_contains("reduce"); }

// conv(x, w) * a => conv(x, a * w)
struct find_mul_conv
{
    auto matcher() const
    {
        return match::name("mul")(
            match::either_arg(0, 1)(conv_const_weights().bind("conv"),
                                    match::name("broadcast", "multibroadcast").bind("a")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins      = r.result;
        auto conv_ins = r.instructions["conv"];
        auto a_ins    = r.instructions["a"];
        auto w_ins    = r.instructions["w"];

        const auto& a_input_lens = a_ins->inputs().front()->get_shape().lens();

        std::size_t num_not_one_dims = std::count_if(
            a_input_lens.cbegin(), a_input_lens.cend(), [](auto dim) { return dim != 1; });
        if(num_not_one_dims > 1)
            return;

        // check broadcasted along channels
        const auto& a_lens    = a_ins->get_shape().lens();
        const auto& a_strides = a_ins->get_shape().strides();

        auto is_broadcasted_axis = [](auto len, auto stride) { return len == 1 or stride == 0; };

        if(a_strides.at(1) != 1)
            return;

        if(not is_broadcasted_axis(a_lens.front(), a_strides.front()))
            return;

        if(not std::equal(a_lens.begin() + 2,
                          a_lens.end(),
                          a_strides.begin() + 2,
                          a_strides.end(),
                          is_broadcasted_axis))
            return;

        auto sq    = m.insert_instruction(ins, make_op("squeeze"), a_ins->inputs().front());
        auto new_a = m.insert_instruction(
            ins, make_op("broadcast", {{"axis", 0}, {"out_lens", w_ins->get_shape().lens()}}), sq);
        auto new_mul  = m.insert_instruction(ins, make_op("mul"), new_a, w_ins);
        auto new_conv = m.insert_instruction(
            ins, conv_ins->get_operator(), conv_ins->inputs().front(), new_mul);
        m.replace_instruction(ins, new_conv);
    }
};

struct find_mul_slice_conv
{
    static auto conv()
    {
        return match::name("convolution")(
            match::all_of[match::outputs()](match::name("slice")),
            match::args(match::any(), match::is_constant().bind("w")));
    }
    auto matcher() const
    {
        return match::name("mul")(match::either_arg(0, 1)(
            match::name("slice")(match::used_once(), match::arg(0)(conv().bind("conv")))
                .bind("slice"),
            match::name("broadcast")(match::is_constant()).bind("a")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins       = r.result;
        auto slice_ins = r.instructions["slice"];
        auto conv_ins  = r.instructions["conv"];
        auto a_ins     = r.instructions["a"];
        auto w_ins     = r.instructions["w"];

        auto broadcast_op = any_cast<op::broadcast>(a_ins->get_operator());
        if(broadcast_op.axis != 1)
            return;

        auto slice_op = any_cast<op::slice>(slice_ins->get_operator());
        if(slice_op.axes.size() != 1)
            return;
        if(slice_op.axes.front() != 1)
            return;

        auto slice_idx = std::distance(conv_ins, slice_ins);
        if(std::any_of(conv_ins->outputs().begin(), conv_ins->outputs().end(), [&](auto i) {
               if(i == slice_ins)
                   return false;
               if(std::distance(conv_ins, i) < slice_idx)
                   return true;
               auto sop = any_cast<op::slice>(i->get_operator());
               if(sop.axes != slice_op.axes)
                   return true;
               if(std::max(sop.starts.front(), slice_op.starts.front()) <
                  std::min(sop.ends.front(), slice_op.ends.front()))
                   return true;
               return false;
           }))
            return;

        auto w_slice_op  = slice_op;
        w_slice_op.axes  = {0};
        auto slice_w_ins = m.insert_instruction(ins, w_slice_op, w_ins);

        auto new_a = m.insert_instruction(
            ins,
            make_op("broadcast", {{"axis", 0}, {"out_lens", slice_w_ins->get_shape().lens()}}),
            a_ins->inputs().front());
        auto new_mul = m.insert_instruction(ins, make_op("mul"), new_a, slice_w_ins);

        std::vector<instruction_ref> sliced_weights;
        if(slice_op.starts.front() != 0)
            sliced_weights.push_back(m.insert_instruction(
                ins,
                make_op("slice", {{"axes", {0}}, {"starts", {0}}, {"ends", slice_op.starts}}),
                w_ins));
        sliced_weights.push_back(new_mul);
        int64_t end_axis = w_ins->get_shape().lens().at(0);
        if(slice_op.ends.front() != end_axis)
            sliced_weights.push_back(m.insert_instruction(
                ins,
                make_op("slice", {{"axes", {0}}, {"starts", slice_op.ends}, {"ends", {end_axis}}}),
                w_ins));

        auto new_weights =
            m.insert_instruction(ins, make_op("concat", {{"axis", 0}}), sliced_weights);

        auto new_conv = m.insert_instruction(
            ins, conv_ins->get_operator(), conv_ins->inputs().front(), new_weights);
        assert(conv_ins->get_shape() == new_conv->get_shape());

        auto slice1 = m.insert_instruction(ins, slice_op, new_conv);
        assert(ins->get_shape().lens() == slice1->get_shape().lens());
        m.replace_instruction(ins, slice1);
        // TODO: Check each slice doesn't overlap and that it occurs after slice_ins
        auto outputs = conv_ins->outputs();
        for(auto output : outputs)
            if(output != slice_ins)
                instruction::replace_argument(output, conv_ins, new_conv);
    }
};

struct find_mul_dot
{
    auto matcher() const
    {
        auto constant            = match::is_constant(not_from_int4());
        auto is_dot_const_inputs = match::name("dot")(match::any_of[match::inputs()](constant));
        return match::name("mul")(match::either_arg(0, 1)(
            is_dot_const_inputs.bind("dot"), match::name("broadcast", "multibroadcast").bind("c")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins     = r.result;
        auto dot_ins = r.instructions["dot"];
        auto a_ins   = dot_ins->inputs()[0];
        auto b_ins   = dot_ins->inputs()[1];
        auto c_ins   = r.instructions["c"];

        const auto& c_strides = c_ins->get_shape().strides();

        // There should only be one stride that is not zero
        if(std::count_if(c_strides.begin(), c_strides.end(), [](auto s) { return s != 0; }) > 1)
            return;

        auto add_mul_const = [&](instruction_ref x_ins) {
            if(not x_ins->can_eval())
                return m.end();
            auto broadcast_v        = c_ins->get_operator().to_value();
            broadcast_v["out_lens"] = x_ins->get_shape().lens();

            auto cb_ins =
                m.insert_instruction(ins, make_op(c_ins->name(), broadcast_v), c_ins->inputs());
            return m.insert_instruction(ins, make_op("mul"), x_ins, cb_ins);
        };

        if(c_strides.back() == 1)
        {
            b_ins = add_mul_const(b_ins);
        }
        else if(c_strides[c_strides.size() - 2] == 1)
        {
            a_ins = add_mul_const(a_ins);
        }
        else if(c_ins->get_shape().scalar())
        {
            if(a_ins->can_eval())
                a_ins = add_mul_const(a_ins);
            else
                b_ins = add_mul_const(b_ins);
        }
        else
        {
            return;
        }

        if(contains({a_ins, b_ins}, m.end()))
            return;

        m.replace_instruction(ins, make_op("dot"), a_ins, b_ins);
    }
};

/*
Moves the slice on the output of the Dot operation to slices on the inputs of the Dot operation to
avoid computing redundant values.
e.g. slice(gemm(a, b)) --> gemm(slice(a), slice(b))
*/
struct find_dot_slice
{
    auto matcher() const
    {
        return match::name("slice")(
            match::args(match::name("dot", "quant_dot")(match::used_once()).bind("dot_ins")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto slice_ins = r.result;
        auto dot_ins   = r.instructions["dot_ins"];
        auto slice_op  = slice_ins->normalized_operator().to_value();
        auto axes      = slice_op["axes"].to_vector<int64_t>();
        auto starts    = slice_op["starts"].to_vector<int64_t>();
        auto ends      = slice_op["ends"].to_vector<int64_t>();
        assert(starts.size() == ends.size() and starts.size() == axes.size());
        auto has_neg_vals = [](auto vec) {
            return std::any_of(vec.begin(), vec.end(), [](auto i) { return i < 0; });
        };
        if(has_neg_vals(starts) or has_neg_vals(ends) or has_neg_vals(axes))
        {
            MIGRAPHX_THROW("FIND_DOT_SLICE: slice is not normalized.");
        }
        auto dot_inputs     = dot_ins->inputs();
        auto num_batch_dims = dot_ins->get_shape().lens().size() - 2;
        std::vector<int64_t> slice_axes_1, starts_1, ends_1; // NOLINT
        std::vector<int64_t> slice_axes_2, starts_2, ends_2; // NOLINT
        for(auto i : range(axes.size()))
        {
            if(axes[i] < num_batch_dims)
            {
                slice_axes_1.push_back(axes[i]);
                starts_1.push_back(starts[i]);
                ends_1.push_back(ends[i]);
                slice_axes_2.push_back(axes[i]);
                starts_2.push_back(starts[i]);
                ends_2.push_back(ends[i]);
            }
            else if(axes[i] == num_batch_dims)
            {
                slice_axes_1.push_back(axes[i]);
                starts_1.push_back(starts[i]);
                ends_1.push_back(ends[i]);
            }
            else if(axes[i] == num_batch_dims + 1)
            {
                slice_axes_2.push_back(axes[i]);
                starts_2.push_back(starts[i]);
                ends_2.push_back(ends[i]);
            }
            else
            {
                MIGRAPHX_THROW("FIND_DOT_SLICE: invalid case");
            }
        }
        auto slice_1 = dot_inputs.at(0);
        if(not slice_axes_1.empty())
        {
            slice_1 = m.insert_instruction(
                slice_ins,
                migraphx::make_op("slice",
                                  {{"axes", slice_axes_1}, {"starts", starts_1}, {"ends", ends_1}}),
                dot_inputs.at(0));
        }
        auto slice_2 = dot_inputs.at(1);
        if(not slice_axes_2.empty())
        {
            slice_2 = m.insert_instruction(
                slice_ins,
                migraphx::make_op("slice",
                                  {{"axes", slice_axes_2}, {"starts", starts_2}, {"ends", ends_2}}),
                dot_inputs.at(1));
        }
        m.replace_instruction(slice_ins, dot_ins->get_operator(), {slice_1, slice_2});
    }
};

struct find_dot_mul
{
    auto matcher() const
    {
        auto const_broadcast = match::name("broadcast", "multibroadcast")(match::is_constant());
        auto mul             = match::name("mul")(
            match::used_once(),
            match::either_arg(0, 1)(const_broadcast.bind("d"),
                                    match::none_of(match::is_constant()).bind("z")));
        return match::name("dot")(
            match::either_arg(0, 1)(mul, match::is_constant(not_from_int4()).bind("c")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto a_ins = ins->inputs()[0];
        auto b_ins = ins->inputs()[1];
        auto d_ins = r.instructions["d"];
        auto c_ins = r.instructions["c"];
        auto z_ins = r.instructions["z"];

        const auto& d_strides = d_ins->get_shape().strides();

        // There should only be one stride that is not zero
        if(std::count_if(d_strides.begin(), d_strides.end(), [](auto s) { return s != 0; }) > 1)
            return;

        if(not d_ins->get_shape().scalar())
        {
            if(d_strides.back() == 1 and not b_ins->can_eval())
                return;
            if(d_strides[d_strides.size() - 2] == 1 and not a_ins->can_eval())
                return;
        }

        auto broadcast_v = d_ins->get_operator().to_value();
        auto c_lens      = c_ins->get_shape().lens();
        std::vector<int64_t> permutation(c_lens.size());
        std::iota(permutation.begin(), permutation.end(), 0);
        std::swap(permutation.back(), permutation[permutation.size() - 2]);
        c_lens                  = reorder_dims(c_lens, permutation);
        broadcast_v["out_lens"] = c_lens;
        auto db_ins =
            m.insert_instruction(ins, make_op(d_ins->name(), broadcast_v), d_ins->inputs());
        auto db_transpose_ins =
            m.insert_instruction(ins, make_op("transpose", {{"permutation", permutation}}), db_ins);
        auto cd_ins = m.insert_instruction(ins, make_op("mul"), c_ins, db_transpose_ins);

        if(c_ins == b_ins)
        {
            a_ins = z_ins;
            b_ins = cd_ins;
        }
        else
        {
            a_ins = cd_ins;
            b_ins = z_ins;
        }

        m.replace_instruction(ins, make_op("dot"), a_ins, b_ins);
    }
};

// ******************************
//  a * (x + b) => a * x + a * b
// ******************************
// When a * (x + b) is followed by another add of constant, then the
// additional add can be const folded. Also, better fusions can be applied
// when the add comes after.
struct find_mul_add
{
    auto matcher() const
    {
        return match::name("mul")(match::either_arg(0, 1)(
            match::name("add")(
                match::either_arg(0, 1)(
                    match::any().bind("x"),
                    match::any_of(conv_const_weights(), match::is_constant()).bind("b")),
                match::none_of(match::args(match::is_constant(), match::is_constant())),
                match::used_once()),
            match::is_constant().bind("a")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto a_ins = r.instructions["a"];
        auto b_ins = r.instructions["b"];
        auto x_ins = r.instructions["x"];
        assert(x_ins != b_ins);

        auto ax_ins = m.insert_instruction(ins, make_op("mul"), a_ins, x_ins);
        auto ab_ins = m.insert_instruction(ins, make_op("mul"), a_ins, b_ins);
        m.replace_instruction(ins, make_op("add"), ax_ins, ab_ins);
    }
};

struct find_dot_add
{
    auto matcher() const
    {
        return match::name("dot")(match::either_arg(0, 1)(
            match::name("add")(
                match::either_arg(0, 1)(match::any().bind("x"),
                                        match::any_of(match::is_constant()).bind("b")),
                match::none_of(match::args(match::is_constant(), match::is_constant())),
                match::used_once()),
            match::is_constant().bind("a")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto a_ins = r.instructions["a"];
        auto b_ins = r.instructions["b"];
        auto x_ins = r.instructions["x"];
        assert(x_ins != b_ins);

        const bool flipped = a_ins == ins->inputs().back();

        auto insert_dot = [&](auto x, auto y) {
            if(flipped)
                return m.insert_instruction(ins, make_op("dot"), y, x);
            else
                return m.insert_instruction(ins, make_op("dot"), x, y);
        };

        auto ax_ins = insert_dot(a_ins, x_ins);
        auto ab_ins = insert_dot(a_ins, b_ins);
        m.replace_instruction(ins, make_op("add"), ax_ins, ab_ins);
    }
};

struct find_conv_add
{
    auto matcher() const
    {
        auto add = match::name("add")(
            match::either_arg(0, 1)(match::any().bind("x"),
                                    match::any_of(match::is_constant()).bind("a")),
            match::used_once());
        return match::name("convolution")(match::used_once(),
                                          match::args(add, match::is_constant().bind("w")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto a_ins = r.instructions["a"];
        auto x_ins = r.instructions["x"];
        auto w_ins = r.instructions["w"];

        auto conv1 = m.insert_instruction(ins, ins->get_operator(), a_ins, w_ins);
        auto conv2 = m.insert_instruction(ins, ins->get_operator(), x_ins, w_ins);

        m.replace_instruction(ins, make_op("add"), conv1, conv2);
    }
};

struct find_add_lit_broadcast
{
    auto matcher() const
    {
        return match::name("add")(
            match::either_arg(0, 1)(op_lit_broadcast("add", "a", "x"), lit_broadcast().bind("b")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto x_ins = r.instructions["x"];
        auto a_ins = r.instructions["a"];
        auto b_ins = r.instructions["b"];

        auto sumab = m.insert_instruction(ins, make_op("add"), a_ins, b_ins);
        m.replace_instruction(ins, make_op("add"), x_ins, sumab);
    }
};

struct find_double_add_lit_broadcast
{
    auto matcher() const
    {
        return match::name("add")(
            match::args(op_lit_broadcast("add", "a", "x"), op_lit_broadcast("add", "b", "y")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto x_ins = r.instructions["x"];
        auto y_ins = r.instructions["y"];
        auto a_ins = r.instructions["a"];
        auto b_ins = r.instructions["b"];

        instruction_ref sumab;

        if(a_ins->name() == "broadcast" and b_ins->name() == "broadcast")
        {
            if(a_ins->inputs().at(0)->get_shape() != b_ins->inputs().at(0)->get_shape())
                return;
            auto op     = a_ins->get_operator();
            auto presum = m.insert_instruction(
                ins, make_op("add"), a_ins->inputs().at(0), b_ins->inputs().at(0));
            sumab = m.insert_instruction(ins, op, presum);
        }
        else
        {
            sumab = m.insert_instruction(ins, make_op("add"), a_ins, b_ins);
        }

        auto sumxy = m.insert_instruction(ins, make_op("add"), x_ins, y_ins);
        m.replace_instruction(ins, make_op("add"), sumxy, sumab);
    }
};

/// Find elementswise operators that have all broadcast inputs. It then
/// rewrites the elementwise to do the computation on the non-broadcasted
/// axes, and then broadcast that result.
struct find_inner_broadcast
{
    auto matcher() const { return pointwise(match::all_of[match::inputs()](match::broadcast())); }

    static auto get_non_broadcast_input(instruction_ref ins)
    {
        if(ins->inputs().size() != 1)
            return ins;
        auto input = ins->inputs().front();
        if(contains(input->name(), "broadcast"))
            return get_non_broadcast_input(input);
        return input;
    }

    static bool is_unsqueeze_needed_for_multibroadcast(const shape& input, const shape& output)
    {
        if(input.elements() == 1)
            return false;
        auto shift = output.ndim() - input.ndim();
        if(shift == 0)
            return false;
        if(std::equal(input.lens().begin(),
                      input.lens().end(),
                      output.lens().begin() + shift,
                      output.lens().end()))
        {
            return std::all_of(output.lens().begin(), output.lens().begin() + shift, [](auto x) {
                return x == 1;
            });
        }
        return true;
    }
    // Simple case
    void apply_same_broadcasts(module& m, instruction_ref ins) const
    {
        const auto& broadcasts = ins->inputs();
        // Scalars can have different ndim, so find the largest ndim input
        auto max_broadcast = *std::max_element(
            broadcasts.begin(), broadcasts.end(), by(std::less<>{}, [](instruction_ref broadcast) {
                return get_non_broadcast_input(broadcast)->get_shape().ndim();
            }));
        auto max_ndim = max_broadcast->get_shape().ndim();
        std::vector<instruction_ref> inputs;
        std::transform(broadcasts.begin(),
                       broadcasts.end(),
                       std::back_inserter(inputs),
                       [&](instruction_ref broadcast) {
                           auto input = get_non_broadcast_input(broadcast);
                           auto s     = input->get_shape();
                           // If scalar doesnt match the other input dims then add a squeeze
                           if(s.elements() == 1 and s.ndim() > 1 and s.ndim() != max_ndim)
                               return m.insert_instruction(broadcast, make_op("squeeze"), input);
                           return input;
                       });
        auto op = insert_common_op(m, ins, ins->get_operator(), inputs);
        // Find broadcast op on a non-scalar instruction if it exists
        auto first =
            std::find_if(broadcasts.begin(), broadcasts.end(), [&](instruction_ref broadcast) {
                return not broadcast->get_shape().scalar();
            });
        if(first != broadcasts.end())
        {
            m.replace_instruction(ins, (*first)->get_operator(), op);
        }
        else
        {
            m.replace_instruction(ins, broadcasts.front()->get_operator(), op);
        }
    }

    void apply_diff_broadcasts(module& m, instruction_ref ins) const
    {
        const auto& broadcasts = ins->inputs();
        auto ndim              = ins->get_shape().ndim();
        // Compute the inner dimensions and axes that the computation will
        // use. Also compute the axes that will be broadcasted
        std::vector<std::size_t> idims;
        std::vector<std::int64_t> iaxes;
        std::vector<std::int64_t> axes;
        for(auto axis : range(ndim))
        {
            if(std::all_of(broadcasts.begin(), broadcasts.end(), [&](instruction_ref i) {
                   auto s = i->get_shape();
                   return s.lens()[axis] == 1 or s.strides()[axis] == 0;
               }))
            {
                axes.push_back(axis);
            }
            else
            {
                iaxes.push_back(axis);
                idims.push_back(ins->get_shape().lens()[axis]);
            }
        }
        // If the inner axes are the same as the original operator then
        // there is no reason to do this transformation.
        if(iaxes.size() == ndim)
            return;
        std::vector<instruction_ref> inputs;
        std::transform(
            broadcasts.begin(),
            broadcasts.end(),
            std::back_inserter(inputs),
            [&](instruction_ref broadcast) {
                auto input = broadcast->inputs().front();
                auto s     = input->get_shape();

                // If its a single element then just return that as an input
                if(s.elements() == 1)
                {
                    if(s.lens().size() > 1)
                        return m.insert_instruction(broadcast, make_op("squeeze"), input);
                    return input;
                }

                // Find how the axes are shifted from the broadcast
                std::int64_t shift = ndim - s.ndim();
                if(broadcast->name() == "broadcast")
                    shift = broadcast->get_operator().to_value()["axis"].to<int64_t>();
                // Compute the squeeze axes to be used by taking the inner
                // axes and shifting to what the axes will be on the
                // input
                std::vector<std::int64_t> sq_axes;
                for(auto axis : axes)
                {
                    auto iaxis = axis - shift;
                    if(iaxis < 0)
                        continue;
                    if(iaxis >= s.ndim())
                        continue;
                    sq_axes.push_back(iaxis);
                }
                instruction_ref result = input;
                if(not sq_axes.empty())
                    result = m.insert_instruction(
                        broadcast, make_op("squeeze", {{"axes", sq_axes}}), result);
                // If the number of dimension are still smaller than the
                // number of inner axes, then we need to insert a
                // broadcast to have the same dimensions for all inputs.
                if(result->get_shape().ndim() < iaxes.size())
                {
                    // We find the first inner axis that can be mapped to the input
                    auto start_axis = std::find_if(iaxes.begin(),
                                                   iaxes.end(),
                                                   [&](auto x) { return x >= shift; }) -
                                      iaxes.begin();
                    result = m.insert_instruction(
                        broadcast,
                        make_op("broadcast", {{"axis", start_axis}, {"out_lens", idims}}),
                        result);
                }
                return result;
            });
        auto op = insert_common_op(m, ins, ins->get_operator(), inputs);
        if(iaxes.size() == 1)
        {
            m.replace_instruction(
                ins,
                make_op("broadcast",
                        {{"axis", iaxes.front()}, {"out_lens", ins->get_shape().lens()}}),
                op);
        }
        else
        {
            auto unsqueeze =
                is_unsqueeze_needed_for_multibroadcast(op->get_shape(), ins->get_shape())
                    ? m.insert_instruction(ins, make_op("unsqueeze", {{"axes", axes}}), op)
                    : op;
            m.replace_instruction(
                ins, make_op("multibroadcast", {{"out_lens", ins->get_shape().lens()}}), unsqueeze);
        }
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins               = r.result;
        if(ins->get_operator().name() == "layout")
            return;
        const auto& broadcasts = ins->inputs();
        if(broadcasts.empty())
            return;
        // Skip if different data types are used
        if(any_of(broadcasts, [&](auto i) {
               return i->get_shape().type() != broadcasts.front()->get_shape().type();
           }))
            return;

        // All inputs should have less elements
        if(not all_of(broadcasts, [&](instruction_ref broadcast) {
               auto input = broadcast->inputs().front();
               return input->get_shape().elements() < ins->get_shape().elements();
           }))
            return;
        // Find first broadcast that is not a scalar
        auto first =
            std::find_if(broadcasts.begin(), broadcasts.end(), [&](instruction_ref broadcast) {
                return not broadcast->get_shape().scalar();
            });
        // Try to see if we can do a simple case that just applies the op to
        // the inputs of the broadcasts, and then just put that same
        // broadcast after the op. For this case we need each of the
        // broadcasts to be the same and the inputs to have the same dimesion
        // (or be scalar).
        const bool same_broadcasts =
            std::all_of(first, broadcasts.end(), [&](instruction_ref broadcast) {
                if(broadcast->get_operator() != (*first)->get_operator())
                    return false;
                auto s1 = get_non_broadcast_input(broadcast)->get_shape();
                auto s2 = get_non_broadcast_input(*first)->get_shape();
                if(s1.elements() == 1)
                    return true;
                return s1.lens() == s2.lens();
            });
        if(same_broadcasts)
        {
            apply_same_broadcasts(m, ins);
        }
        // Skip if any input to the broadcasted inputs is already broadcasted
        // as the below algorithm may not be able to handle such case.
        else if(std::none_of(broadcasts.begin(), broadcasts.end(), [](instruction_ref broadcast) {
                    return broadcast->inputs().front()->get_shape().broadcasted();
                }))
        {
            apply_diff_broadcasts(m, ins);
        }
    }
};

struct find_dot_broadcast
{
    auto matcher() const
    {
        return match::name("dot")(match::all_of[match::inputs()](match::broadcast()));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins = r.result;
        auto a   = ins->inputs()[0];
        auto b   = ins->inputs()[1];
        if(ins->get_shape().lens().size() < 3)
            return;
        auto nbatch_axes      = ins->get_shape().lens().size() - 2;
        const auto& a_strides = a->get_shape().strides();
        const auto& b_strides = b->get_shape().strides();
        // Find leading batch axes that are broadcasted
        auto p =
            std::mismatch(a_strides.begin(),
                          a_strides.begin() + nbatch_axes,
                          b_strides.begin(),
                          b_strides.begin() + nbatch_axes,
                          [](auto astride, auto bstride) { return astride == 0 and bstride == 0; });
        auto naxes = p.first - a_strides.begin();
        assert(naxes <= nbatch_axes);
        std::vector<std::size_t> axes(naxes);
        std::iota(axes.begin(), axes.end(), 0);

        auto insert_broadcast = [&](instruction_ref x_ins) -> instruction_ref {
            auto input = x_ins->inputs()[0];
            std::vector<std::size_t> lens(x_ins->get_shape().lens().begin() + naxes,
                                          x_ins->get_shape().lens().end());

            if(input->get_shape().lens() == lens)
                return input;

            auto input_naxis  = input->get_shape().lens().size();
            auto new_bc_naxis = lens.size();
            if(input_naxis > new_bc_naxis)
            {
                std::vector<std::size_t> axes_to_sq(input_naxis - new_bc_naxis);
                std::iota(axes_to_sq.begin(), axes_to_sq.end(), 0);
                input =
                    m.insert_instruction(ins, make_op("squeeze", {{"axes", axes_to_sq}}), input);
            }

            if(x_ins->name() == "multibroadcast")
            {
                return m.insert_instruction(
                    ins, make_op("multibroadcast", {{"out_lens", lens}}), input);
            }
            else if(x_ins->name() == "broadcast")
            {
                auto v    = x_ins->get_operator().to_value();
                auto axis = v.at("axis").to<std::size_t>() - naxes;
                return m.insert_instruction(
                    ins, make_op("broadcast", {{"axis", axis}, {"out_lens", lens}}), input);
            }
            assert(false);
            return m.end();
        };
        auto a1        = insert_broadcast(a);
        auto b1        = insert_broadcast(b);
        auto dot       = m.insert_instruction(ins, make_op("dot"), a1, b1);
        auto broadcast = m.insert_instruction(
            ins, make_op("multibroadcast", {{"out_lens", ins->get_shape().lens()}}), dot);
        m.replace_instruction(ins, broadcast);
    }
};

struct find_concat_op
{
    auto matcher() const
    {
        return match::name("concat")(match::any_of[match::inputs()](
            match::any_of(match::pointwise(),
                          match::name("broadcast", "multibroadcast", "unpack_int4")),
            match::used_once()));
    }

    template <class Iterator>
    static std::vector<std::size_t> get_output_lens(Iterator start, Iterator last, std::size_t axis)
    {
        assert(start != last);
        std::size_t dim = 0;
        for(auto ins : range(start, last))
        {
            dim += ins->get_shape().lens().at(axis);
        }
        auto lens  = (*start)->get_shape().lens();
        lens[axis] = dim;
        return lens;
    }

    static bool is_valid_op(const operation& op)
    {
        return contains({"broadcast", "multibroadcast", "unpack_int4"}, op.name()) or
               op.attributes().contains("pointwise");
    }

    static bool is_valid_concat(std::vector<instruction_ref> ins, size_t axis)
    {
        auto concat_lens = ins.front()->get_shape().lens();
        concat_lens.erase(concat_lens.begin() + axis);

        return std::all_of(ins.begin(), ins.end(), [&](auto i) {
            auto lens = i->get_shape().lens();
            lens.erase(lens.begin() + axis);
            return lens == concat_lens;
        });
    }

    static bool rejected_inputs(const std::vector<instruction_ref>& inputs)
    {
        if(inputs.empty())
            return true;
        if(inputs.size() < 3)
            return false;
        auto nonconst = std::count_if(
            inputs.begin(), inputs.end(), [](instruction_ref ins) { return not ins->can_eval(); });
        return nonconst > 2;
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins  = r.result;
        auto axis = any_cast<op::concat>(ins->get_operator()).axis;

        auto each = [&](auto start, auto last) -> std::vector<instruction_ref> {
            if(std::distance(start, last) < 2)
                return {start, last};
            auto x = *start;
            if(x->outputs().size() > 1 or rejected_inputs(x->inputs()))
                return {start, last};
            auto op = x->get_operator();
            if(not is_valid_op(op))
                return {start, last};
            auto iaxis = axis;
            // Adjust broadcast lens
            if(op.name() == "broadcast")
            {
                auto b = any_cast<op::broadcast>(op);
                if(b.axis != iaxis)
                    return {start, last};
                b.broadcast_lens = get_output_lens(start, last, iaxis);
                op               = b;
                iaxis            = 0;
            }
            else if(op.name() == "multibroadcast")
            {
                shape bshape = (*start)->get_shape();
                auto input   = (*start)->inputs()[0];
                if(iaxis >= bshape.strides().size() or bshape.strides()[iaxis] == 0)
                    return {start, last};
                op.from_value({{"out_lens", get_output_lens(start, last, iaxis)}});
                auto delta = bshape.lens().size() - input->get_shape().lens().size();
                iaxis -= delta;
            }

            std::vector<instruction_ref> concats;
            for(std::size_t i = 0; i < x->inputs().size(); i++)
            {
                std::vector<instruction_ref> inputs;
                std::transform(start, last, std::back_inserter(inputs), [&](auto j) {
                    return j->inputs().at(i);
                });
                if(not is_valid_concat(inputs, iaxis))
                    return {start, last};
                auto concat =
                    m.insert_instruction(ins, make_op("concat", {{"axis", iaxis}}), inputs);
                concats.push_back(concat);
            }
            auto y = m.insert_instruction(ins, op, concats);
            return {y};
        };

        std::vector<instruction_ref> args;
        auto update_args = [&](auto start, auto last) {
            auto x = each(start, last);
            args.insert(args.end(), x.begin(), x.end());
        };
        auto pred = [](auto i, auto j) {
            return i->get_operator() == j->get_operator() and
                   i->inputs().size() == i->inputs().size() and
                   i->outputs().size() == i->outputs().size();
        };
        group_unique(ins->inputs().begin(), ins->inputs().end(), update_args, pred);
        if(args.size() == 1)
            m.replace_instruction(ins, args.front());
        else
            m.replace_instruction(ins, make_op("concat", {{"axis", axis}}), args);
    }
};

struct find_concat_conv
{
    auto matcher() const
    {
        return match::name("concat")(
            match::all_of[match::inputs()](match::used_once(), match::name("convolution")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins  = r.result;
        auto axis = ins->get_operator().to_value()["axis"].to<int>();
        if(axis != 1)
            return;
        if(ins->inputs().empty())
            return;
        auto conv = ins->inputs().front()->get_operator();
        if(std::any_of(ins->inputs().begin(), ins->inputs().end(), [&](auto conv_ins) {
               return conv_ins->get_operator() != conv;
           }))
            return;
        std::vector<instruction_ref> inputs;
        std::transform(ins->inputs().begin(),
                       ins->inputs().end(),
                       std::back_inserter(inputs),
                       [](auto conv_ins) { return conv_ins->inputs()[0]; });
        if(std::any_of(inputs.begin(), inputs.end(), [&](auto input) {
               return input->get_shape() != inputs.front()->get_shape();
           }))
            return;

        std::vector<instruction_ref> weights;
        std::transform(ins->inputs().begin(),
                       ins->inputs().end(),
                       std::back_inserter(weights),
                       [](auto conv_ins) { return conv_ins->inputs()[1]; });
        if(std::any_of(weights.begin(), weights.end(), [&](auto w) {
               return w->get_shape() != weights.front()->get_shape();
           }))
            return;

        auto original_group = from_value<int>(conv.to_value()["group"]);
        auto x              = m.insert_instruction(ins, make_op("concat", {{"axis", 1}}), inputs);
        auto w              = m.insert_instruction(ins, make_op("concat", {{"axis", 0}}), weights);
        conv.from_value({{"group", original_group * inputs.size()}});
        m.replace_instruction(ins, conv, x, w);
    }
};

void move_instructions_back(module& m, instruction_ref pos, std::vector<instruction_ref> inss)
{
    auto start = range(m.begin(), pos);
    for(auto ins : iterator_for(start))
    {
        auto it = std::find(inss.begin(), inss.end(), ins);
        if(it != inss.end())
            inss.erase(it);
    }
    for(auto ins : inss)
    {
        if(not m.has_instruction(ins))
            continue;
        move_instructions_back(m, pos, ins->inputs());
        m.move_instruction(ins, pos);
    }
}

/** Search for multiple "slice" instructions in an instruction's outputs
 *  which are contiguous slices of the same tensor.
 */
std::vector<instruction_ref> get_splits(instruction_ref ins)
{
    std::vector<instruction_ref> result;
    std::copy_if(ins->outputs().begin(),
                 ins->outputs().end(),
                 std::back_inserter(result),
                 [&](auto i) { return i->name() == "slice"; });
    if(result.size() < 2)
        return {};
    auto get_slice = [](auto& i) -> auto& { return any_cast<op::slice>(i->get_operator()); };
    auto&& axes    = get_slice(result.front()).axes;

    // "slice" instructions must all have the same axes
    if(std::any_of(result.begin(), result.end(), [&](auto i) { return get_slice(i).axes != axes; }))
        return {};
    auto get_start = [&](auto& i) -> auto& { return get_slice(i).starts; };
    auto get_end   = [&](auto& i) -> auto& { return get_slice(i).ends; };

    // Sort the "slice" instructions in order of starts
    std::sort(
        result.begin(), result.end(), [&](auto x, auto y) { return get_start(x) < get_start(y); });
    if(std::any_of(get_start(result.front()).begin(), get_start(result.front()).end(), [&](auto i) {
           return i != 0;
       }))
        return {};

    // one slice must "start" where the last slice "end"
    auto it = std::adjacent_find(
        result.begin(), result.end(), [&](auto x, auto y) { return get_end(x) != get_start(y); });
    if(it != result.end())
        return {};
    for(std::size_t i = 0; i < axes.size(); i++)
    {
        auto axis = axes[i];
        if(ins->get_shape().lens()[axis] != get_slice(result.back()).ends[i])
            return {};
    }
    return result;
}

struct find_splits
{
    auto matcher() const
    {
        auto pointwise_reduction = match::any_of[match::outputs()](
            match::pointwise(match::any_of(match::nargs(1), match::nargs(2))), reduction());
        return match::any(
            match::any_of[match::outputs()](match::name("slice")(pointwise_reduction)));
    }

    static bool is_dependent(const module& m, instruction_ref ins1, instruction_ref ins2)
    {

        std::unordered_set<instruction_ref> traversed;
        return fix<bool>([&](auto self, auto ins) -> bool {
            if(ins == ins2)
                return true;

            if(contains(traversed, ins))
                return false;

            traversed.insert(ins);
            const auto& inputs = ins->inputs();
            return std::any_of(inputs.begin(), inputs.end(), [&](auto in) {
                return m.has_instruction(in) and self(in);
            });
        })(ins1);
    }

    static std::vector<std::vector<instruction_ref>>
    get_split_groups(const module& m, const std::vector<instruction_ref>& splits)
    {
        std::vector<std::vector<instruction_ref>> groups;
        for(auto out : splits.front()->outputs())
        {
            if(out->name() == "slice")
                continue;
            std::vector<instruction_ref> group;
            for(auto split : splits)
            {
                auto it =
                    std::find_if(split->outputs().begin(), split->outputs().end(), [&](auto i) {
                        return i->get_operator() == out->get_operator();
                    });
                if(it == split->outputs().end())
                    break;
                assert((*it)->name() != "slice");

                // If there is a duplicate bail
                // there are should be no dependency between instructions in the group
                if(std::any_of(group.begin(), group.end(), [&](auto i) {
                       return is_dependent(m, *it, i) or is_dependent(m, i, *it);
                   }))
                {
                    return {};
                }

                group.push_back(*it);
            }
            if(group.size() != splits.size())
                continue;
            groups.push_back(group);
        }
        return groups;
    }

    bool is_fusable(instruction_ref start, instruction_ref split_front) const
    {
        auto op = start->get_operator();
        if(contains(op.name(), "reduce"))
        {
            auto slc         = any_cast<op::slice>(split_front->get_operator());
            auto slc_axes    = slc.axes;
            auto reduce_axes = start->get_operator().to_value()["axes"].to_vector<int64_t>();
            // axes of slice and reduce op cannot have overlap
            if(std::any_of(slc_axes.begin(), slc_axes.end(), [&](auto axis) {
                   return (std::find(reduce_axes.begin(), reduce_axes.end(), axis) !=
                           reduce_axes.end());
               }))
            {
                return false;
            }
        }
        else if(not op.attributes().contains("pointwise"))
        {
            return false;
        }

        return true;
    }

    int get_binary_op_split_idx(std::vector<instruction_ref> group,
                                std::vector<instruction_ref> splits) const
    {
        auto first_group_inputs = group.front()->inputs();
        auto arg_it =
            std::find_if(first_group_inputs.begin(), first_group_inputs.end(), [&](auto i) {
                return std::find(splits.begin(), splits.end(), i) != splits.end();
            });
        auto split_idx = arg_it - first_group_inputs.begin();

        // All splits are at the same input index
        if(std::all_of(group.begin() + 1, group.end(), [&](auto i) {
               auto split_idx_input = i->inputs().at(split_idx);
               return std::find(splits.begin(), splits.end(), split_idx_input) != splits.end();
           }))
            return split_idx;

        return -1;
    }

    void align_commutative_op_args(module& m,
                                   std::vector<instruction_ref> group,
                                   std::vector<instruction_ref> splits,
                                   size_t split_idx) const
    {
        auto group_op = group.front()->get_operator();
        assert(std::all_of(
            group.begin(), group.end(), [&](auto i) { return i->get_operator() == group_op; }));

        for(auto i : group)
        {
            if(std::find(splits.begin(), splits.end(), i->inputs().at(split_idx)) == splits.end())
            {
                auto args = i->inputs();
                assert(args.size() == 2);
                std::reverse(args.begin(), args.end());
                m.replace_instruction(i, i->get_operator(), args);
            }
        }
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins    = r.result;
        auto splits = get_splits(ins);
        if(splits.empty())
            return;

        for(const auto& group : get_split_groups(m, splits))
        {
            auto start       = group.front();
            auto split_front = splits.front();
            auto op          = start->get_operator();
            if(not is_fusable(start, split_front))
            {
                continue;
            }

            // Make sure there is no duplicates
            assert(std::none_of(
                std::next(group.begin()), group.end(), [&](auto i) { return i == start; }));

            auto split_idx    = 0;
            instruction_ref c = m.end();
            if(start->inputs().size() == 1)
            {
                c = m.insert_instruction(std::next(ins), op, ins);
            }
            else if(start->inputs().size() == 2)
            {
                assert(not std::none_of(start->inputs().begin(), start->inputs().end(), [](auto i) {
                    return i->name() == "slice";
                }) and "one argument must be a split");

                split_idx = get_binary_op_split_idx(group, splits);
                assert(split_idx < 2);
                size_t data_idx;
                if(split_idx < 0 and op.attributes().contains("commutative"))
                {
                    split_idx = 0;
                    data_idx  = 1;
                    align_commutative_op_args(m, group, splits, split_idx);
                }
                else if(split_idx < 0)
                {
                    return;
                }
                else
                {
                    data_idx = split_idx == 0 ? 1 : 0;
                }

                std::vector<instruction_ref> data_args;
                std::transform(group.begin(),
                               group.end(),
                               std::back_inserter(data_args),
                               [&](auto i) { return i->inputs()[data_idx]; });

                // Data arguments must be a constant
                if(std::any_of(data_args.begin(), data_args.end(), [](auto i) {
                       return not i->can_eval();
                   }))
                    return;

                move_instructions_back(m, ins, data_args);

                auto slice_op = any_cast<op::slice>(splits.front()->get_operator());
                assert(not slice_op.axes.empty());
                if(slice_op.axes.size() > 1)
                    return;
                auto concat_axis = slice_op.axes.front();
                // TODO: Check if axises match
                auto concat = m.insert_instruction(
                    ins, make_op("concat", {{"axis", concat_axis}}), data_args);

                std::vector<instruction_ref> args;
                args.resize(2);
                args[split_idx] = ins;
                args[data_idx]  = concat;
                c               = m.insert_instruction(std::next(ins), op, args);
            }
            if(c != m.end())
            {
                for(auto i : group)
                {
                    auto split = i->inputs()[split_idx];
                    assert(split->name() == "slice");

                    m.replace_instruction(i, split->get_operator(), c);
                }
            }
        }
    }
};

/**
 * Matcher for a sequence of "slice" operations whose outputs are put back
 * together by a "concat".
 */
struct find_split_concat
{
    auto matcher() const
    {
        auto concat = match::all_of[match::outputs()](match::name("concat"));
        return match::any(match::any_of[match::outputs()](match::name("slice")(concat)));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        // Verifies that the slices meet several conditions: they must all output to the same
        // concat instruction, slice on the same (1 only) axis, and the end of one slice
        // must match the start of the next.
        auto ins = r.result;

        auto splits = get_splits(ins);
        if(splits.empty())
            return;
        // Each slice must output to only one instruction
        if(std::any_of(
               splits.begin(), splits.end(), [](auto i) { return i->outputs().size() != 1; }))
            return;
        // The single output instruction for all items in the list must be the same one
        auto concat = splits.front()->outputs().front();
        if(std::any_of(splits.begin(), splits.end(), [&](auto i) {
               return i->outputs().front() != concat;
           }))
            return;

        // The axis for the common output instruction must be the same as for the split ops
        auto concat_op = any_cast<op::concat>(concat->get_operator());
        auto split_op  = any_cast<op::slice>(splits.front()->get_operator());
        if(split_op.axes.size() != 1)
            return;
        if(split_op.axes.front() != concat_op.axis)
            return;

        // Find where the slices are in the concat instruction's inputs (concat can have
        // any number of inputs)
        auto args = concat->inputs();
        auto it =
            std::find_if(args.begin(), args.end(), [&](auto i) { return i == splits.front(); });
        // Verify the slices were found, and the list is long enough
        if(std::distance(it, args.end()) < splits.size())
            return;
        // Don't do anything if the "slice" inputs to the concat op have other operations mixed in
        // among them
        if(std::any_of(it, it + splits.size(), [](instruction_ref x) {
               return x->get_operator().name() != "slice";
           }))
            return;
        // Check that the slices passed to concat are in order.
        if(not std::is_sorted(it, it + splits.size(), [](instruction_ref x, instruction_ref y) {
               auto xop = any_cast<op::slice>(x->get_operator());
               auto yop = any_cast<op::slice>(y->get_operator());
               return std::tie(xop.starts, xop.ends) < std::tie(yop.starts, yop.ends);
           }))
            return;

        // Perform the substitution
        *it = splits.front()->inputs().front();
        args.erase(std::next(it), it + splits.size());

        if(args.size() == 1)
            m.replace_instruction(concat, args.front());
        else
            m.replace_instruction(concat, concat->get_operator(), args);
    }
};

bool axis_equal(const std::vector<std::size_t>& x,
                const std::vector<std::size_t>& y,
                std::size_t axis)
{
    return x.size() == y.size() and x.size() > axis and
           std::equal(x.begin(), x.begin() + axis, y.begin()) and
           std::equal(x.begin() + axis + 1, x.end(), y.begin() + axis + 1);
}

bool axis_shape_equal(const shape& x, const shape& y, std::size_t axis)
{
    // TODO: Check strides
    return axis_equal(x.lens(), y.lens(), axis);
}

struct find_add_convs
{
    auto matcher() const
    {
        return match::name("add")(
            match::args(conv_const_weights().bind("a"), conv_const_weights().bind("b")));
    }

    static bool symmetrical_strides(const op::convolution& op)
    {
        return op.stride[0] == op.stride[1];
    }

    static std::size_t compute_stride_factor(const op::convolution& x, const op::convolution& y)
    {
        if(not symmetrical_strides(x))
            return 0;
        if(not symmetrical_strides(y))
            return 0;
        if((x.stride[0] % y.stride[0]) != 0)
            return 0;
        return x.stride[0] / y.stride[0];
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins       = r.result;
        auto a_conv    = r.instructions["a"];
        auto a_input   = a_conv->inputs().at(0);
        auto a_weights = a_conv->inputs().at(1);
        auto b_conv    = r.instructions["b"];
        auto b_input   = b_conv->inputs().at(0);
        auto b_weights = b_conv->inputs().at(1);

        if(not axis_shape_equal(a_weights->get_shape(), b_weights->get_shape(), 1))
            return;

        auto a_op   = any_cast<op::convolution>(a_conv->get_operator());
        auto b_op   = any_cast<op::convolution>(b_conv->get_operator());
        auto new_op = a_op;

        if(a_op != b_op)
        {
            if(std::tie(a_op.padding, a_op.dilation, a_op.group) ==
                   std::tie(b_op.padding, b_op.dilation, b_op.group) and
               a_weights->get_shape().lens()[2] == 1 and a_weights->get_shape().lens()[3] == 1)
            {
                if(a_op.stride < b_op.stride)
                {
                    auto n = compute_stride_factor(b_op, a_op);
                    if(n == 0)
                        return;
                    new_op  = a_op;
                    b_input = m.insert_instruction(
                        ins, make_op("step", {{"axes", {2, 3}}, {"steps", {n, n}}}), b_input);
                }
                else if(b_op.stride < a_op.stride)
                {
                    auto n = compute_stride_factor(a_op, b_op);
                    if(n == 0)
                        return;
                    new_op  = b_op;
                    a_input = m.insert_instruction(
                        ins, make_op("step", {{"axes", {2, 3}}, {"steps", {n, n}}}), a_input);
                }
                else
                    return;
            }
            else
                return;
        }

        auto concat_input =
            m.insert_instruction(ins, make_op("concat", {{"axis", 1}}), a_input, b_input);
        auto concat_weights =
            m.insert_instruction(ins, make_op("concat", {{"axis", 1}}), a_weights, b_weights);
        m.replace_instruction(ins, new_op, concat_input, concat_weights);
    }
};

MIGRAPHX_PRED_MATCHER(horiz_conv_dot, instruction_ref ins)
{
    auto pred = [&](auto name) {
        return [=](auto i) {
            return i->name() == name and i->inputs().front() == ins and
                   i->inputs().at(1)->can_eval();
        };
    };
    auto dots  = std::count_if(ins->outputs().begin(), ins->outputs().end(), pred("dot"));
    auto qdots = std::count_if(ins->outputs().begin(), ins->outputs().end(), pred("quant_dot"));
    auto convs = std::count_if(ins->outputs().begin(), ins->outputs().end(), pred("convolution"));
    return (dots >= 2 or convs >= 2 or qdots >= 2);
}

struct find_conv_dot_horiz_fusion
{
    auto matcher() const { return horiz_conv_dot(); }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins = r.result;

        auto pred = [](auto i, auto j) {
            if(i->get_operator() != j->get_operator())
                return false;
            if(not contains({"quant_dot", "dot", "convolution"}, i->name()))
                return true;
            auto x = i->inputs()[1]->get_shape().lens();
            auto y = j->inputs()[1]->get_shape().lens();
            if(x.size() != y.size())
                return false;
            // Check that non-axes match
            int axis = 1;
            if(i->name() == "dot" or i->name() == "quant_dot")
            {
                axis = x.size() - 1;
            }
            return axis_equal(x, y, axis);
        };

        auto each = [&](auto start, auto last) {
            if(std::distance(start, last) < 2)
                return;
            auto&& name = (*start)->name();
            if(not contains({"quant_dot", "dot", "convolution"}, name))
                return;
            auto op   = (*start)->get_operator();
            int group = 1;
            if(name == "convolution")
                group = any_cast<op::convolution>(op).group;
            // Skip group convolution
            if(group != 1)
                return;
            auto input = (*start)->inputs().front();
            std::vector<instruction_ref> args;
            std::transform(
                start, last, std::back_inserter(args), [&](auto x) { return x->inputs().at(1); });
            int axis        = 1;
            int concat_axis = 0;
            if(name == "dot" or name == "quant_dot")
            {
                axis        = int(args.front()->get_shape().lens().size() - 1);
                concat_axis = axis;
            }

            move_instructions_back(m, input, args);
            // TODO: Check if axes match
            auto concat =
                m.insert_instruction(input, make_op("concat", {{"axis", concat_axis}}), args);
            auto fused     = m.insert_instruction(std::next(input), op, input, concat);
            int64_t offset = 0;
            for(auto arg : range(start, last))
            {
                auto outputs = arg->outputs();

                int64_t len = arg->get_shape().lens()[axis];
                m.replace_instruction(
                    arg,
                    make_op("slice",
                            {{"axes", {axis}}, {"starts", {offset}}, {"ends", {offset + len}}}),
                    fused);
                offset += len;
            }
        };

        auto outputs = ins->outputs();
        group_by(outputs.begin(), outputs.end(), each, pred);
    }
};

struct find_div_const
{
    auto matcher() const
    {
        return match::name("div")(match::arg(1)(match::is_constant().bind("c")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto c_ins = r.instructions["c"];

        if(shape::is_integral(ins->get_shape().type()))
            return;

        auto recip = m.insert_instruction(std::next(c_ins), make_op("recip"), c_ins);

        auto args = ins->inputs();

        m.replace_instruction(ins, make_op("mul"), args.front(), recip);
    }
};

struct find_unit_ops
{
    auto matcher() const
    {
        auto mul_1 = match::name("mul")(
            match::either_arg(0, 1)(match::has_value(1.0f), match::any().bind("x")));
        auto div_1 =
            match::name("div")(match::args(match::any().bind("x"), match::has_value(1.0f)));
        auto add_0 = match::name("add")(
            match::either_arg(0, 1)(match::has_value(0.0f, 0, 0), match::any().bind("x")));
        auto sub_0 =
            match::name("sub")(match::args(match::any().bind("x"), match::has_value(0.0f, 0, 0)));
        return match::any_of(mul_1, div_1, add_0, sub_0);
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins  = r.result;
        auto c_in = r.instructions["x"];

        m.replace_instruction(ins, c_in);
    }
};

struct find_neg_unit_ops
{
    auto matcher() const
    {
        auto mul_neg_1 = match::name("mul")(
            match::either_arg(0, 1)(match::has_value(-1.0f), match::any().bind("x")));
        auto div_neg_1 =
            match::name("div")(match::args(match::any().bind("x"), match::has_value(-1.0f)));
        auto sub_0 =
            match::name("sub")(match::args(match::has_value(0.0f, 0, 0), match::any().bind("x")));
        return match::any_of(mul_neg_1, div_neg_1, sub_0);
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins  = r.result;
        auto c_in = r.instructions["x"];

        auto neg = m.insert_instruction(ins, make_op("neg"), c_in);
        m.replace_instruction(ins, neg);
    }
};

struct eliminate_zero_point
{
    auto get_qlinear_ops_names() const
    {
        static std::unordered_set<std::string> qdq_names = {"quantizelinear", "dequantizelinear"};
        return qdq_names;
    }
    auto matcher() const
    {
        return match::name(get_qlinear_ops_names())(match::arg(0)(match::any().bind("x")),
                                                    match::arg(1)(match::any().bind("scale")),
                                                    match::arg(2)(match::has_value(0.0f, 0, 0)));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto x     = r.instructions["x"];
        auto scale = r.instructions["scale"];

        auto op = ins->get_operator().to_value();
        if(ins->get_operator().name() == "quantizelinear")
        {
            op["out_type"] = to_value(ins->get_shape().type());
        }
        auto qdq_ins = m.insert_instruction(ins, migraphx::make_op(ins->name(), op), {x, scale});
        m.replace_instruction(ins, qdq_ins);
    }
};

struct find_zero_ops
{
    auto matcher() const
    {
        auto mul_zero = match::name("mul")(
            match::either_arg(0, 1)(match::has_value(0.0f, 0, 0).bind("x"), match::any()));
        auto div_zero =
            match::name("div")(match::args(match::has_value(0.0f, 0, 0).bind("x"), match::any()));
        return match::any_of(mul_zero, div_zero);
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins      = r.result;
        auto zero_ins = r.instructions["x"];

        m.replace_instruction(ins, zero_ins);
    }
};

struct find_sub_const
{
    auto matcher() const
    {
        return match::name("sub")(match::arg(1)(match::is_constant().bind("c")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto c_ins = r.instructions["c"];

        auto neg = m.insert_instruction(std::next(c_ins), make_op("neg"), c_ins);

        auto args = ins->inputs();

        m.replace_instruction(ins, make_op("add"), args.front(), neg);
    }
};

struct find_rsqrt
{
    auto matcher() const
    {
        auto bind_x = match::args(match::any().bind("x"));
        return match::name("recip")(match::args(match::name("sqrt")(match::used_once(), bind_x)));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins   = r.result;
        auto x_ins = r.instructions["x"];

        m.replace_instruction(ins, make_op("rsqrt"), x_ins);
    }
};

static bool same_ops(const std::vector<instruction_ref>& vec_ins)
{
    return std::all_of(vec_ins.begin(), vec_ins.end(), [&](auto i) {
        return i->get_operator() == vec_ins.front()->get_operator();
    });
}

struct find_split_reshape
{
    auto matcher() const
    {
        auto slice_bind_slice = match::arg(0)(match::name("slice").bind("slice"));
        return match::name("reshape")(match::arg(0)(match::name("contiguous")(slice_bind_slice)))
            .bind("reshape");
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto slc   = r.instructions["slice"];
        auto rsp   = r.instructions["reshape"];
        auto input = slc->inputs().front();

        // Only apply simplification when slices are on a single axis
        auto axes = any_cast<op::slice>(slc->get_operator()).axes;
        if(axes.size() > 1)
        {
            return;
        }

        auto split_outputs = get_splits(input);
        if(split_outputs.empty())
        {
            return;
        }

        // Find all the reshapes (similar to rsp) that can be simplified
        std::vector<instruction_ref> conts;
        std::vector<instruction_ref> vec_rsp;

        // Iterate through slice and contiguous outputs to allow simplifications when
        // slice is followed by multiple reshapes
        for(auto& i : split_outputs)
        {
            std::copy_if(i->outputs().begin(),
                         i->outputs().end(),
                         std::back_inserter(conts),
                         [](auto j) { return j->name() == "contiguous"; });
        }

        for(auto& i : conts)
        {
            std::copy_if(i->outputs().begin(),
                         i->outputs().end(),
                         std::back_inserter(vec_rsp),
                         [&](auto j) { return j->get_operator() == rsp->get_operator(); });
        }

        // No simplification needed if there is only one slice -> cont -> reshape
        if(vec_rsp.size() <= 1)
        {
            return;
        }

        // ensure reshape happens after the axis dimension
        auto axis         = axes[0];
        auto slc_lens     = slc->get_shape().lens();
        auto slc_dim_size = std::accumulate(
            slc_lens.begin() + axis, slc_lens.end(), 1, std::multiplies<std::size_t>());
        auto input_lens   = input->get_shape().lens();
        auto input_size   = input->get_shape().elements();
        auto slc_axis_len = input_lens[axis];

        // search the reshape output (standard shape) to decide which axis are
        // in its output corresponding to the slc_dim_size
        auto rsp_lens    = rsp->get_shape().lens();
        auto rsp_strides = rsp->get_shape().strides();
        rsp_strides.insert(rsp_strides.begin(), rsp_strides[0] * rsp_lens[0]);

        auto ait     = std::find(rsp_strides.begin(), rsp_strides.end(), slc_dim_size);
        int rsp_axis = -1;
        if(ait == rsp_strides.end())
        {
            return;
        }
        else if(ait == rsp_strides.end() - 1)
        {
            // edge case
            // slice_dim == 1, in that case it could match with last stride of 1.
            // it should accumulate lengths from last dim in that case. discount 1 to avoid going
            // out of bounds.
            assert(slc_dim_size == 1);
            rsp_axis = std::distance(rsp_strides.begin(), ait) - 1;
        }
        else
        {
            rsp_axis = std::distance(rsp_strides.begin(), ait);
        }

        // Calculate reshape output shape
        // Need to find a reshape such that data represented by instructions in vec_rsp can be
        // written as slices of this new reshape. This is done by holding all the dims constant in
        // rsp_lens to compute the required dim for rsp_axis (axis that will be sliced)

        // ex 1:  Input Shape: {2, 12, 4}, Slice Axis: 1, Slices are: (0:4), (4:8), (8:12),
        //        Reshape Outputs: {2, 2, 2, 4}, {2, 2, 2, 4}, {2, 2, 2, 4}
        //        rsp_axis = 1, rsp_out_lens (initial) = {2, 1, 2, 4}, rsp_fixed_size = 2*1*2*4 = 16
        //        rsp_axis_len = 2*12*4 / 16 = 6
        //        rsp_out_lens (final) = {2, 6, 2, 4}

        // ex 2:  Input Shape: {2, 12, 4}, Slice Axis: 1, Slices are: (0:4), (4:8), (8:12),
        //        Reshape Outputs: {2, 16}, {2, 16}, {2, 16}
        //        rsp_axis = 1, rsp_out_lens (initial) = {2, 1}, rsp_fixed_size = 2*1 = 2
        //        rsp_axis_len = 2*12*4 / 2 = 48
        //        rsp_out_lens (final) = {2, 48}

        std::vector<int64_t> rsp_out_lens(rsp_lens.begin(), rsp_lens.end());
        rsp_out_lens[rsp_axis] = 1;
        auto rsp_fixed_size    = std::accumulate(
            rsp_out_lens.begin(), rsp_out_lens.end(), 1, std::multiplies<std::size_t>());

        // cannot create a valid reshape for simplification
        if(input_size % rsp_fixed_size != 0)
        {
            return;
        }
        auto rsp_axis_len      = input_size / rsp_fixed_size;
        rsp_out_lens[rsp_axis] = rsp_axis_len;

        // Calculate new slice start and end indices. Indices are scaled using the new reshape axis
        // and the original slice axis. See examples:

        // ex 1:  Input Shape: {2, 12, 4}, Slice Axis: 1, Slices are: (0:4), (4:8), (8:12),
        //        Reshape Outputs: {2, 2, 2, 4}, {2, 2, 2, 4}, {2, 2, 2, 4}
        //        slc_axis_len = 12, rsp_axis_len = 6
        //        New Starts: {0*6/12, 4*6/12,  8*6/12} = {0, 2, 4}
        //        New Ends:   {4*6/12, 8*6/12, 12*6/12} = {2, 4, 6}

        // ex 2:  Input Shape: {2, 12, 4}, Slice Axis: 1, Slices are: (0:4), (4:8), (8:12),
        //        Reshape Outputs: {2, 16}, {2, 16}, {2, 16}
        //        slc_axis_len = 12, rsp_axis_len = 48
        //        New Starts: {0*48/12, 4*48/12,  8*48/12} = { 0, 16, 32}
        //        New Ends:   {4*48/12, 8*48/12, 12*48/12} = {16, 32, 48}

        std::vector<int64_t> new_starts(vec_rsp.size());
        std::transform(vec_rsp.begin(), vec_rsp.end(), new_starts.begin(), [&](auto is) {
            auto cont   = is->inputs().front();
            auto og_slc = cont->inputs().front();
            return any_cast<op::slice>(og_slc->get_operator()).starts[0] * rsp_axis_len /
                   slc_axis_len;
        });

        std::vector<int64_t> new_ends(vec_rsp.size());
        std::transform(vec_rsp.begin(), vec_rsp.end(), new_ends.begin(), [&](auto is) {
            auto cont   = is->inputs().front();
            auto og_slc = cont->inputs().front();
            return any_cast<op::slice>(og_slc->get_operator()).ends[0] * rsp_axis_len /
                   slc_axis_len;
        });

        auto rsp_ins = m.insert_instruction(
            std::next(input), make_op("reshape", {{"dims", rsp_out_lens}}), input);

        // replace the original reshape with slice
        for(std::size_t i = 0; i < vec_rsp.size(); ++i)
        {
            m.replace_instruction(
                vec_rsp[i],
                make_op(
                    "slice",
                    {{"axes", {rsp_axis}}, {"starts", {new_starts[i]}}, {"ends", {new_ends[i]}}}),
                rsp_ins);
        }
    }
};

struct find_split_transpose
{
    auto matcher() const
    {
        return match::name("transpose")(match::arg(0)(match::name("slice").bind("slice")))
            .bind("trans");
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto slc   = r.instructions["slice"];
        auto trans = r.instructions["trans"];

        auto input         = slc->inputs().front();
        auto split_outputs = get_splits(input);
        if(split_outputs.empty())
        {
            return;
        }
        if(std::any_of(split_outputs.begin(), split_outputs.end(), [](auto i) {
               return i->outputs().size() != 1;
           }))
            return;

        std::vector<instruction_ref> vec_trans(split_outputs.size());
        std::transform(split_outputs.begin(), split_outputs.end(), vec_trans.begin(), [](auto i) {
            return i->outputs().front();
        });

        // all transpose are the same
        auto perm = any_cast<op::transpose>(trans->get_operator()).dims;
        if(not same_ops(vec_trans))
        {
            return;
        }

        // insert an transpose instruction
        auto tr = m.insert_instruction(
            std::next(input), make_op("transpose", {{"permutation", perm}}), input);

        // compute the axis in the slice
        auto axis = any_cast<op::slice>(slc->get_operator()).axes.front();
        auto it   = std::find(perm.begin(), perm.end(), axis);
        assert(it != perm.end());
        int64_t axis_new = std::distance(perm.begin(), it);

        for(auto in : split_outputs)
        {
            auto oper    = any_cast<op::slice>(in->get_operator());
            auto starts  = oper.starts;
            auto ends    = oper.ends;
            auto tr_orig = in->outputs().front();
            m.replace_instruction(
                tr_orig,
                make_op("slice", {{"axes", {axis_new}}, {"starts", starts}, {"ends", ends}}),
                tr);
        }
    }
};

void simplify_algebra::apply(module& m) const
{
    // Run simplifications multiple times
    m.repeat_while_changes(8, [&] {
        match::find_matches(m,
                            find_inner_broadcast{},
                            find_dot_broadcast{},
                            find_double_add_lit_broadcast{},
                            find_add_lit_broadcast{},
                            find_add_convs{},
                            find_conv_dot_horiz_fusion{},
                            find_mul_conv{},
                            find_mul_slice_conv{},
                            find_mul_dot{},
                            find_dot_slice{},
                            find_dot_mul{},
                            find_mul_add{},
                            find_unit_ops{},
                            find_neg_unit_ops{},
                            eliminate_zero_point{},
                            find_zero_ops{},
                            find_dot_add{},
                            find_conv_add{},
                            find_div_const{},
                            find_sub_const{},
                            find_rsqrt{},
                            find_concat_conv{},
                            find_concat_op{},
                            find_split_concat{},
                            find_splits{},
                            find_split_reshape{},
                            find_split_transpose{});
        dead_code_elimination{}.apply(m);
    });
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
