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
#include <iterator>
#include <migraphx/simplify_reshapes.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/op/as_shape.hpp>
#include <migraphx/op/transpose.hpp>
#include <migraphx/op/concat.hpp>
#include <migraphx/op/slice.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/matcher.hpp>
#include <migraphx/permutation.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <unordered_set>
#include <migraphx/make_op.hpp>
#include <migraphx/tune_axis.hpp>
#include <migraphx/shape_transform_descriptor.hpp>

#include <map>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

namespace {
const auto& reshaper_names()
{
    // clang-format off
    static const std::unordered_set<std::string> names = {
        "flatten",
        "reshape",
        "contiguous",
        "squeeze",
        "unsqueeze"
    };
    // clang-format on
    return names;
}
} // namespace

bool is_reshaper(instruction_ref ins) { return contains(reshaper_names(), ins->name()); }

instruction_ref find_transpose_input(instruction_ref ins)
{
    if(ins->inputs().size() != 1)
        return ins;
    if(ins->inputs().front()->name() == "contiguous")
        return find_transpose_input(ins->inputs().front());
    if(ins->inputs().front()->name() == "transpose")
        return ins->inputs().front();
    return ins;
}

auto get_transpose_dims(instruction_ref ins)
{
    return any_cast<const op::transpose&>(ins->get_operator()).dims;
}

bool is_no_transpose(const std::vector<int64_t>& dims)
{
    if(dims.empty())
        return true;
    if(dims.front() != 0)
        return false;
    return std::adjacent_find(
               dims.begin(), dims.end(), [](auto x, auto y) { return (y - x) != 1; }) == dims.end();
}

struct find_nested_shape_transforms
{
    static const auto& shape_transform_ops()
    {
        static const std::unordered_set<std::string> names = {
            "flatten",
            "reshape",
            "squeeze",
            "unsqueeze",
            "transpose",
            "broadcast",
            "multibroadcast",
        };
        return names;
    }
    auto matcher() const
    {
        auto shape_transform = match::name(shape_transform_ops());
        auto output_not_shape_transform =
            match::none_of(match::skip_output(match::name("contiguous"))(shape_transform));
        auto input_has_shape_transform =
            match::args(match::skip(match::name("contiguous"))(shape_transform));
        return shape_transform(output_not_shape_transform, input_has_shape_transform);
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins = mr.result;

        std::vector<operation> ops;
        auto x = ins;
        while(contains(shape_transform_ops(), x->get_operator().name()) or
              x->get_operator().name() == "contiguous")
        {
            ops.push_back(x->get_operator());
            x = x->inputs().front();
        }
        if(x->get_shape().scalar())
        {
            m.replace_instruction(
                ins, make_op("multibroadcast", {{"out_lens", ins->get_shape().lens()}}), x);
        }
        else if(x->get_shape().elements() == 1 and ins->get_shape().elements() == 1)
        {
            // TODO: Use squeeze or unsqueeze
            m.replace_instruction(ins, make_op("reshape", {{"dims", ins->get_shape().lens()}}), x);
        }
        else
        {
            std::reverse(ops.begin(), ops.end());
            auto opt_ops = optimize_shape_transforms(x->get_shape().lens(), ops);
            if(ops == opt_ops)
                return;
            auto y = x;
            for(const auto& op : opt_ops)
                y = m.insert_instruction(ins, op, y);
            m.replace_instruction(ins, y);
        }
    }
};

struct find_nop_reshapes
{
    auto matcher() const
    {
        auto reshapes = reshaper_names();
        reshapes.insert("as_shape");
        reshapes.insert("broadcast");
        reshapes.insert("concat");
        reshapes.insert("convert");
        reshapes.insert("multibroadcast");
        reshapes.insert("pad");
        reshapes.insert("slice");
        reshapes.insert("step");
        reshapes.insert("transpose");
        reshapes.insert("reduce_mean");
        reshapes.insert("reduce_max");
        reshapes.insert("reduce_min");
        reshapes.insert("reduce_sum");
        reshapes.insert("reduce_prod");
        return match::name(reshapes)(match::same_shape(match::arg(0)));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins = mr.result;
        m.replace_instruction(ins, ins->inputs().front());
    }
};

struct find_nested_slice
{
    auto matcher() const { return match::name("slice")(match::arg(0)(match::name("slice"))); }

    using axes_map = std::map<std::size_t, std::pair<std::size_t, std::size_t>>;

    static axes_map get_axes(instruction_ref ins)
    {
        axes_map result;
        auto op = any_cast<op::slice>(ins->get_operator());
        for(std::size_t i = 0; i < op.axes.size(); i++)
        {
            result[op.axes[i]] = std::make_pair(op.starts[i], op.ends[i]);
        }
        return result;
    }

    static axes_map merge(const axes_map& m1, const axes_map& m2)
    {
        axes_map result;
        // Non overlapping
        for(auto&& p : m1)
        {
            if(contains(m2, p.first))
                continue;
            result[p.first] = p.second;
        }
        for(auto&& p : m2)
        {
            if(contains(m1, p.first))
                continue;
            result[p.first] = p.second;
        }
        // Overlapping
        for(auto&& p1 : m1)
        {
            if(not contains(m2, p1.first))
                continue;
            auto&& v1        = p1.second;
            auto&& v2        = m2.at(p1.first);
            auto start       = v1.first + v2.first;
            auto end         = start + (v2.second - v2.first);
            result[p1.first] = std::make_pair(start, end);
        }
        return result;
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins   = mr.result;
        auto slice = ins->inputs().front();
        auto input = slice->inputs().front();

        auto a1 = get_axes(ins);
        auto a2 = get_axes(slice);

        auto axes = merge(a2, a1);

        auto op = op::slice{};
        for(auto&& pp : axes)
        {
            op.axes.push_back(pp.first);
            op.starts.push_back(pp.second.first);
            op.ends.push_back(pp.second.second);
        }
        m.replace_instruction(ins, op, input);
    }
};

/**
 *  Example case
 *  From:
 *  param0: lens = [3, 4], strides = [4, 1]
 *  param1: lens = [3, 4], strides = [4, 1]
 *  mb0: multibroadcast(param0, output_lens = [2, 3, 4])
 *  mb1: multibroadcast(param1, output_lens = [2, 3, 4])
 *  concat(mb0, mb1, axis = 2)
 *
 *  To:
 *  param0: lens = [3, 4], strides = [4, 1]
 *  param1: lens = [3, 4], strides = [4, 1]
 *  con0: concat(param0, param1, axis = 1)
 *  multibroadcast(con0, lens = [2, 3, 4])
 */
struct find_concat_multibroadcasts
{
    auto matcher() const
    {
        return match::name("concat")(
            match::all_of[match::inputs()](match::name("multibroadcast", "broadcast")));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto concat_ins       = mr.result;
        auto concat_op        = any_cast<op::concat>(concat_ins->get_operator());
        auto concat_out_lens  = concat_ins->get_shape().lens();
        auto concat_inputs    = concat_ins->inputs();
        auto front_mb_strides = concat_inputs.front()->get_shape().strides();
        assert(concat_op.axis >= 0);

        // Only apply when concat axis is not a broadcasted dimension
        if(std::any_of(concat_inputs.begin(), concat_inputs.end(), [&](auto i) {
               return i->get_shape().strides()[concat_op.axis] == 0;
           }))
        {
            return;
        }

        // Skip if the broadcasts are different
        auto broadcast       = concat_inputs.front()->get_operator();
        auto broadcast_value = broadcast.to_value();
        if(not std::all_of(concat_inputs.begin() + 1, concat_inputs.end(), [&](instruction_ref b) {
               if(b->name() != broadcast.name())
                   return false;
               if(broadcast.name() == "broadcast")
                   return b->get_operator().to_value()["axis"] == broadcast_value["axis"];
               return true;
           }))
        {
            return;
        }

        // Get the inputs of multibroadcast ops. Will be used as inputs to new concat op
        std::vector<instruction_ref> inputs(concat_inputs.size());
        std::transform(concat_inputs.begin(), concat_inputs.end(), inputs.begin(), [](auto i) {
            return i->inputs().front();
        });

        // Check that the inputs into the broadcasts have the same rank
        const auto& first_shape = inputs.front()->get_shape();
        if(not std::all_of(inputs.begin() + 1, inputs.end(), [&](auto input) {
               return input->get_shape().ndim() == first_shape.ndim();
           }))
        {
            return;
        }

        // Reduce axis by number of leading broadcasted dimensions
        if(inputs.front()->get_shape().lens().size() < concat_out_lens.size())
        {
            concat_op.axis -=
                std::count(front_mb_strides.begin(), front_mb_strides.begin() + concat_op.axis, 0);
        }

        // Inputs to broadcasts should have the same dimensions except for the axis to
        // concatenate over
        const auto& front_in_lens = inputs.front()->get_shape().lens();
        if(not std::all_of(inputs.begin() + 1, inputs.end(), [&](auto input_to_mb) {
               const auto& lens = input_to_mb->get_shape().lens();
               return std::equal(
                          lens.begin(), lens.begin() + concat_op.axis, front_in_lens.begin()) and
                      std::equal(lens.begin() + concat_op.axis + 1,
                                 lens.end(),
                                 front_in_lens.begin() + concat_op.axis + 1);
           }))
        {
            return;
        }

        auto new_concat_ins = m.insert_instruction(concat_ins, concat_op, inputs);
        broadcast.from_value({{"out_lens", concat_ins->get_shape().lens()}});
        m.replace_instruction(concat_ins, broadcast, new_concat_ins);
    }
};

struct find_concat_slice
{
    auto matcher() const
    {
        return match::name("concat")(match::any_of[match::outputs()](match::name("slice")));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins    = mr.result;
        auto inputs = ins->inputs();
        auto outs   = ins->outputs();
        std::vector<migraphx::instruction_ref> slice_ins;
        migraphx::transform_if(
            outs.begin(),
            outs.end(),
            std::back_inserter(slice_ins),
            [&](const auto& oins) { return oins->name() == "slice"; },
            [&](const auto& oins) { return oins; });
        int concat_axis = any_cast<op::concat>(ins->get_operator()).axis;
        // prune slice candidates
        std::vector<migraphx::instruction_ref> slice_candidates;
        for(const auto& sins : range(slice_ins.begin(), slice_ins.end()))
        {
            auto sop = any_cast<op::slice>(sins->get_operator());
            // slices with only one axis is allowed, because concat happens only one axis
            if(sop.axes.size() != 1 or sop.axes.front() != concat_axis)
            {
                continue;
            }
            slice_candidates.push_back(sins);
        }
        if(slice_candidates.empty())
        {
            return;
        }
        std::vector<size_t> prefix_scan = {0};
        std::transform(
            inputs.begin(), inputs.end(), std::back_inserter(prefix_scan), [&](const auto& i) {
                return prefix_scan.back() + i->get_shape().lens()[concat_axis];
            });
        for(const auto& sins : slice_candidates)
        {
            auto sop           = any_cast<op::slice>(sins->get_operator());
            size_t slice_start = sop.starts.front();
            size_t slice_len   = sop.ends.front() - slice_start;
            auto fii = std::find_if(prefix_scan.begin(), prefix_scan.end(), [&](const auto& j) {
                return j == slice_start;
            });
            if(fii == prefix_scan.end())
            {
                continue;
            }
            // slice_len == 0
            else if(fii == prefix_scan.end() - 1)
            {
                assert(slice_len == 0 or slice_start >= prefix_scan.back());
                continue;
            }
            else
            {
                size_t idx = std::distance(prefix_scan.begin(), fii);
                if(inputs[idx]->get_shape().lens()[concat_axis] == slice_len)
                {
                    assert((prefix_scan[idx + 1] - prefix_scan[idx]) == slice_len);
                    m.replace_instruction(sins, inputs[idx]);
                }
            }
        }
    }
};

struct find_concat_transpose
{
    auto matcher() const
    {
        return match::name("concat")(match::all_of[match::inputs()](match::name("transpose")));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins          = mr.result;
        auto trans_inputs = ins->inputs();
        auto s            = trans_inputs.front()->get_shape();
        assert(s.transposed());
        auto op          = any_cast<op::concat>(ins->get_operator());
        auto permutation = find_permutation(s);

        // permutation should be the same for all inputs
        if(not std::all_of(trans_inputs.begin(), trans_inputs.end(), [&](auto in) {
               return (find_permutation(in->get_shape()) == permutation);
           }))
        {
            return;
        }

        // axis could be a negative value
        int64_t n_dim = s.lens().size();
        op.axis       = tune_axis(n_dim, op.axis, op.name());

        auto ipermutation = invert_permutation(permutation);
        op.axis           = ipermutation[op.axis];

        std::vector<instruction_ref> inputs;
        std::transform(
            ins->inputs().begin(), ins->inputs().end(), std::back_inserter(inputs), [&](auto i) {
                return m.insert_instruction(
                    ins, make_op("transpose", {{"permutation", permutation}}), i);
            });
        auto concat = m.insert_instruction(ins, op, inputs);
        auto t      = m.insert_instruction(
            ins, make_op("transpose", {{"permutation", ipermutation}}), concat);
        assert(ins->get_shape().lens() == t->get_shape().lens());
        m.replace_instruction(ins, t);
    }
};

struct find_concat_reshape
{
    auto matcher() const
    {
        return match::name("concat")(match::all_of[match::inputs()](
            match::name("reshape", "unsqueeze", "squeeze", "lazy_reshape")));
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins          = mr.result;
        auto concat_shape = ins->get_shape();
        auto reshapes     = ins->inputs();
        if(reshapes.empty())
            return;
        auto input_shape = reshapes.front()->inputs().front()->get_shape();
        // All inputs should have the same dimensions
        if(not std::all_of(
               std::next(reshapes.begin()), reshapes.end(), [&](instruction_ref reshape) {
                   return reshape->inputs().front()->get_shape().lens() == input_shape.lens();
               }))
            return;
        // axis could be a negative value
        auto op       = any_cast<op::concat>(ins->get_operator());
        int64_t n_dim = reshapes.front()->get_shape().lens().size();
        auto axis     = tune_axis(n_dim, op.axis, op.name());

        auto predims  = std::accumulate(concat_shape.lens().begin(),
                                       concat_shape.lens().begin() + axis,
                                       std::size_t{1},
                                       std::multiplies<>{});
        auto postdims = std::accumulate(concat_shape.lens().begin() + axis + 1,
                                        concat_shape.lens().end(),
                                        std::size_t{1},
                                        std::multiplies<>{});

        // Find the axis on the input
        std::size_t x = 1;
        auto it = std::find_if(input_shape.lens().begin(), input_shape.lens().end(), [&](auto d) {
            x *= d;
            return x > predims;
        });
        if(it == input_shape.lens().end())
            return;
        op.axis       = it - input_shape.lens().begin();
        auto ipredims = std::accumulate(input_shape.lens().begin(),
                                        input_shape.lens().begin() + op.axis,
                                        std::size_t{1},
                                        std::multiplies<>{});
        if(ipredims != predims)
            return;
        auto ipostdims = std::accumulate(input_shape.lens().begin() + op.axis + 1,
                                         input_shape.lens().end(),
                                         std::size_t{1},
                                         std::multiplies<>{});
        if(ipostdims != postdims)
            return;

        std::vector<instruction_ref> inputs;
        std::transform(reshapes.begin(),
                       reshapes.end(),
                       std::back_inserter(inputs),
                       [&](instruction_ref i) { return i->inputs().front(); });
        auto concat = m.insert_instruction(ins, op, inputs);
        m.replace_instruction(ins, make_op("reshape", {{"dims", concat_shape.lens()}}), concat);
    }
};

struct find_nested_concat
{
    auto matcher() const
    {
        return match::name("concat")(match::any_of[match::inputs()](match::name("concat")));
    }

    static std::size_t get_axis(instruction_ref ins)
    {
        auto op = any_cast<op::concat>(ins->get_operator());
        return op.axis;
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins  = mr.result;
        auto axis = get_axis(ins);
        std::vector<instruction_ref> args;
        fix([&](auto self, auto&& inputs) {
            for(auto&& i : inputs)
            {
                if(i->name() == "concat" and get_axis(i) == axis and i->outputs().size() == 1)
                    self(i->inputs());
                else
                    args.push_back(i);
            }
        })(ins->inputs());
        m.replace_instruction(ins, ins->get_operator(), args);
    }
};

struct find_resize
{
    auto matcher() const
    {
        return match::name("gather")(
            match::args(match::name("reshape").bind("data"), match::is_constant().bind("ind")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins     = r.result;
        auto ins_rsp = r.instructions["data"];
        auto ins_ind = r.instructions["ind"];

        // resize input shape
        if(ins_rsp->get_shape().lens().size() != 1)
        {
            return;
        }

        // resize output shape
        const auto& in_shape  = ins_rsp->inputs().front()->get_shape();
        const auto& out_shape = ins->get_shape();
        // check if output shape is multiple of input shape
        const auto& in_lens  = in_shape.lens();
        const auto& out_lens = out_shape.lens();
        if(in_lens.size() != out_lens.size())
        {
            return;
        }

        // output shape must be multiple of input shape
        std::vector<bool> is_multi(in_lens.size());
        std::transform(
            in_lens.begin(), in_lens.end(), out_lens.begin(), is_multi.begin(), [](auto x, auto y) {
                return (y % x == 0);
            });
        if(not std::all_of(is_multi.begin(), is_multi.end(), [](auto b) { return b; }))
        {
            return;
        }

        // output must be multiple of inputs
        std::vector<std::size_t> scales(in_lens.size());
        std::transform(
            in_lens.begin(), in_lens.end(), out_lens.begin(), scales.begin(), [](auto x, auto y) {
                return y / x;
            });

        // if ind is not constant, cannot optimize
        std::vector<int> vec_ind;
        auto arg_ind = ins_ind->eval();
        if(arg_ind.empty())
        {
            return;
        }
        arg_ind.visit([&](auto v) { vec_ind.assign(v.begin(), v.end()); });
        if(not all_of(range(out_shape.elements()), [&](auto i) {
               auto out_idx = out_shape.multi(i);
               auto in_idx  = out_idx;
               std::transform(out_idx.begin(),
                              out_idx.end(),
                              scales.begin(),
                              in_idx.begin(),
                              [&](auto io, auto scale) { return io - (io % scale); });
               return vec_ind[i] == vec_ind[out_shape.index(in_idx)];
           }))
        {
            return;
        }

        // wrap up shapes for multibroadcast
        std::vector<std::pair<std::size_t, std::size_t>> dim_scales;
        std::transform(in_lens.begin(),
                       in_lens.end(),
                       out_lens.begin(),
                       std::back_inserter(dim_scales),
                       [](auto x, auto y) { return std::make_pair(x, y / x); });

        std::vector<int64_t> in_dims;
        std::vector<int64_t> out_dims;
        for(auto& isp : dim_scales)
        {
            in_dims.push_back(isp.first);
            out_dims.push_back(isp.first * isp.second);
            if(isp.first == 1 or isp.second == 1)
            {
                continue;
            }

            out_dims.back() = isp.first;
            in_dims.push_back(1);
            out_dims.push_back(isp.second);
        }

        auto in_rsp   = ins_rsp->inputs().front();
        auto rsp_data = m.insert_instruction(
            ins_rsp, migraphx::make_op("reshape", {{"dims", in_dims}}), in_rsp);
        auto mb_rsp = m.insert_instruction(
            ins_rsp, migraphx::make_op("multibroadcast", {{"out_lens", out_dims}}), rsp_data);
        std::vector<int64_t> rsp_dims(out_lens.begin(), out_lens.end());
        m.replace_instruction(ins, migraphx::make_op("reshape", {{"dims", rsp_dims}}), mb_rsp);
    }
};

struct find_where_op
{
    auto matcher() const
    {
        return match::name("gather")(
            match::args(match::name("reshape")(match::arg(0)(match::name("concat").bind("data"))),
                        match::is_constant().bind("ind")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins     = r.result;
        auto concat  = r.instructions["data"];
        auto ins_ind = r.instructions["ind"];
        std::vector<bool> vec_ind;
        auto arg_ind = ins_ind->eval();
        arg_ind.visit([&](auto v) { vec_ind.assign(v.begin(), v.end()); });
        // ind has to be the same value
        auto val = vec_ind.front();
        if(not std::all_of(vec_ind.begin(), vec_ind.end(), [&](auto v) { return (v == val); }))
        {
            return;
        }

        // concat axis must be 0
        auto op = any_cast<op::concat>(concat->get_operator());
        if(op.axis != 0)
        {
            return;
        }

        // check concat inputs, it has to be 2 and have the same shape
        const auto& inputs = concat->inputs();
        if(inputs.size() != 2)
        {
            return;
        }
        if(inputs.at(0)->get_shape() != inputs.at(1)->get_shape())
        {
            return;
        }
        if(inputs.at(0)->get_shape().lens() != ins_ind->get_shape().lens())
        {
            return;
        }

        if(val)
        {
            m.replace_instruction(ins, inputs.at(0));
        }
        else
        {
            m.replace_instruction(ins, inputs.at(1));
        }
    }
};

struct find_reshape_cont
{
    auto matcher() const
    {
        auto contiguous = match::skip(match::name("contiguous"))(
            match::none_of(match::standard_shape()).bind("input"));
        auto reshape_contiguous = match::name("reshape")(match::args(contiguous));
        return match::pointwise(
            match::nargs(2), match::either_arg(0, 1)(reshape_contiguous.bind("rsp"), match::any()));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins      = r.result;
        auto cont_input = r.instructions["input"];
        auto in_ins   = r.instructions["rsp"];

        auto lens       = cont_input->get_shape().lens();
        std::vector<int64_t> dims(lens.begin(), lens.end());

        if(in_ins->get_shape() != ins->get_shape())
        {
            return;
        }

        if(not std::all_of(ins->inputs().begin(), ins->inputs().end(), [](auto i) {
               return i->get_shape().standard();
           }))
        {
            return;
        }

        auto out_lens = ins->get_shape().lens();
        std::vector<int64_t> out_dims(out_lens.begin(), out_lens.end());
        std::vector<instruction_ref> inputs;
        for(const auto& in : ins->inputs())
        {
            if(in == in_ins)
            {
                inputs.push_back(cont_input);
            }
            else
            {
                inputs.push_back(
                    m.insert_instruction(ins, make_op("reshape", {{"dims", dims}}), in));
            }
        }
        auto out = m.insert_instruction(ins, ins->get_operator(), inputs);
        m.replace_instruction(ins, make_op("reshape", {{"dims", out_dims}}), out);
    }
};

struct find_unary_shape_transforms
{
    static const auto& shape_transforms()
    {
        static const std::unordered_set<std::string> names = {
            "flatten",
            "reshape",
            "squeeze",
            "unsqueeze",
            "transpose",
            "broadcast",
            "multibroadcast",
        };
        return names;
    }
    auto matcher() const
    {
        auto output_not_pointwise =
            match::none_of(match::skip_output(match::name("contiguous"))(match::pointwise()));
        auto shape_transform = match::name(shape_transforms());
        auto input_has_shape_transform =
            match::args(match::skip(match::name("contiguous"))(shape_transform));
        auto not_layout = match::none_of(match::name("layout"));
        return match::pointwise(
            match::used_once(), not_layout, input_has_shape_transform, output_not_pointwise);
    }

    static bool is_shape_transform(instruction_ref ins)
    {
        return ins->inputs().size() == 1 and
               (contains(shape_transforms(), ins->name()) or ins->name() == "contiguous");
    }

    static bool can_fuse_unary(instruction_ref ins)
    {
        return ins->name() == "@literal" or
               ins->get_operator().attributes().contains("pointwise") or
               contains(ins->name(), "reduce");
    }

    void apply(module& m, const match::matcher_result& mr) const
    {
        auto ins = mr.result;
        if(ins->outputs().empty())
            return;
        auto input  = ins->inputs().front();
        auto output = ins->outputs().front();

        auto insert_ops = [&](const auto& ops, instruction_ref z) {
            for(const auto& op : ops)
            {
                z = m.insert_instruction(ins, op, z);
            }
            return z;
        };

        std::vector<operation> xops;
        auto x = input;
        while(is_shape_transform(x))
        {
            xops.push_back(x->get_operator());
            x = x->inputs().front();
        }
        std::reverse(xops.begin(), xops.end());

        std::vector<operation> yops;
        auto y              = output;
        auto last_transform = m.end();
        while(is_shape_transform(y) and y->outputs().size() == 1)
        {
            yops.push_back(y->get_operator());
            last_transform = y;
            y              = y->outputs().front();
        }

        bool move_up   = can_fuse_unary(x);
        bool move_down = can_fuse_unary(y);

        if(move_up and move_down)
        {
            if(x->name() == "@literal")
                move_down = false; // NOLINT(bugprone-branch-clone)
            else if(yops.empty())
                move_up = false;
            else
                move_down = false;
        }
        else if(not move_up and not move_down)
        {
            if(not yops.empty())
                move_up = true;
        }

        if(move_up)
        {
            auto z = m.insert_instruction(ins, ins->get_operator(), x);
            z      = insert_ops(xops, z);
            m.replace_instruction(ins, z);
        }
        else if(move_down and not yops.empty())
        {
            auto z = insert_ops(yops, input);
            m.replace_instruction(last_transform, ins->get_operator(), z);
        }
    }
};

struct find_slice_transpose
{
    auto matcher() const
    {
        auto transpose = match::output(match::name("transpose"));
        return match::any(match::any_of[match::outputs()](match::name("slice")(transpose)));
    }

    static std::vector<int64_t> find_common_perm(const std::vector<instruction_ref>& transposes)
    {
        std::map<std::vector<int64_t>, int64_t> count;
        for(auto t : transposes)
        {
            auto perm = t->get_operator().to_value()["permutation"].to_vector<int64_t>();
            count[perm]++;
        }
        return std::max_element(
                   count.begin(), count.end(), by(std::less<>{}, [](auto&& p) { return p.second; }))
            ->first;
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins = r.result;
        std::vector<instruction_ref> splits;
        std::copy_if(ins->outputs().begin(),
                     ins->outputs().end(),
                     std::back_inserter(splits),
                     [&](instruction_ref out) {
                         return out->name() == "slice" and out->outputs().size() == 1 and
                                out->outputs().front()->name() == "transpose";
                     });
        if(splits.size() < 2)
            return;
        std::vector<instruction_ref> transposes;
        std::transform(splits.begin(),
                       splits.end(),
                       std::back_inserter(transposes),
                       [](auto split) { return split->outputs().front(); });
        auto perm  = find_common_perm(transposes);
        auto iperm = invert_permutation(perm);
        auto pre   = m.insert_instruction(
            std::next(ins), make_op("transpose", {{"permutation", perm}}), ins);
        for(auto i : range(transposes.size()))
        {
            auto split = splits[i];
            auto t     = transposes[i];
            auto op    = any_cast<op::slice>(split->get_operator());
            std::transform(op.axes.begin(), op.axes.end(), op.axes.begin(), [&](auto axis) {
                return iperm[axis];
            });
            auto new_ins = m.insert_instruction(t, op, pre);
            if(t->get_operator() != pre->get_operator())
            {
                auto curr = t->get_operator().to_value()["permutation"].to_vector<int64_t>();
                new_ins   = m.insert_instruction(
                    t, make_op("transpose", {{"permutation", reorder_dims(iperm, curr)}}), new_ins);
            }
            m.replace_instruction(t, new_ins);
        }
    }
};

struct find_transpose_slice
{
    auto matcher() const
    {
        return match::name("transpose")(match::all_of[match::outputs()](match::name("slice")));
    }

    static std::vector<int64_t> slice_distance(const op::slice& op)
    {
        assert(op.starts.size() == op.ends.size());
        std::vector<int64_t> result(op.starts.size());
        std::transform(
            op.ends.begin(), op.ends.end(), op.starts.begin(), result.begin(), std::minus<>{});
        return result;
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto ins    = r.result;
        auto slices = ins->outputs();
        if(slices.empty())
            return;
        auto slice     = any_cast<op::slice>(slices.front()->get_operator());
        auto sdistance = slice_distance(slice);
        // Check all distances and axes are the same
        if(std::any_of(slices.begin(), slices.end(), [&](auto sins) {
               auto s = any_cast<op::slice>(sins->get_operator());
               return s.axes != slice.axes or slice_distance(s) != sdistance;
           }))
            return;
        // Check distances are divisible by lens of corresponding axes
        auto mod_by_distance = [&](const auto& v, auto f) {
            return std::inner_product(v.begin(),
                                      v.end(),
                                      sdistance.begin(),
                                      0,
                                      std::plus<>{},
                                      [&](auto x, auto d) -> uint64_t {
                                          if(d == 0)
                                              return 1;
                                          return f(x) % d;
                                      });
        };
        if(mod_by_distance(slice.axes, [&](auto x) { return ins->get_shape().lens()[x]; }) != 0 or
           mod_by_distance(slice.starts, id{}) != 0 or mod_by_distance(slice.ends, id{}) != 0)
            return;
        // TODO: Handle multiple axes
        if(sdistance.size() != 1)
            return;
        auto axis = slice.axes.front();
        // Skip if axis would be packed
        if(std::all_of(ins->get_shape().lens().begin(),
                       ins->get_shape().lens().begin() + axis,
                       [](auto x) { return x == 1; }))
            return;
        // Compute axis before transpose to use for unsqueeze
        auto perm    = ins->get_operator().to_value()["permutation"].to_vector<int64_t>();
        auto preaxis = perm[axis];
        // Make unsqueeze
        std::vector<int64_t> steps(sdistance.size());
        std::transform(
            slice.axes.begin(),
            slice.axes.end(),
            sdistance.begin(),
            steps.begin(),
            [&](const auto ax, const auto sdis) { return ins->get_shape().lens().at(ax) / sdis; });
        auto unsqueeze = m.insert_instruction(
            ins, make_op("unsqueeze", {{"axes", {preaxis}}, {"steps", steps}}), ins->inputs());
        // Make transpose
        std::transform(perm.begin(), perm.end(), perm.begin(), [&](auto i) {
            if(i >= preaxis)
                return i + 1;
            return i;
        });
        perm.insert(perm.begin(), preaxis);
        auto transpose =
            m.insert_instruction(ins, make_op("transpose", {{"permutation", perm}}), unsqueeze);
        // Slice and squeeze
        for(auto s : slices)
        {
            auto op        = any_cast<op::slice>(s->get_operator());
            op.axes        = {0};
            op.starts      = {op.starts.front() / sdistance.front()};
            op.ends        = {op.ends.front() / sdistance.front()};
            auto slice_ins = m.insert_instruction(ins, op, transpose);
            auto squeeze =
                m.insert_instruction(ins, make_op("squeeze", {{"axes", {0}}}), slice_ins);
            m.replace_instruction(s, squeeze);
        }
    }
};

struct find_reshape_dot
{
    auto matcher() const
    {
        auto rsp   = match::name("reshape").bind("rsp");
        auto other = match::skip_broadcasts(match::any().bind("other"));
        return match::name("dot")(match::used_once(), match::either_arg(0, 1)(rsp, other));
    }

    // Gemm axis should not be altered by the reshape
    auto is_valid_reshape(instruction_ref inp, instruction_ref rsp, size_t dot_axis) const
    {
        auto inp_lens = inp->get_shape().lens();
        auto rsp_lens = rsp->get_shape().lens();

        return (inp_lens.size() >= dot_axis and
                rsp_lens[rsp_lens.size() - dot_axis] == inp_lens[inp_lens.size() - dot_axis]);
    }

    // Same batch dims
    auto has_same_batch_dims(instruction_ref in1, instruction_ref in2) const
    {
        auto in1_lens = in1->get_shape().lens();
        auto in2_lens = in2->get_shape().lens();

        return (
            in1_lens.size() == in2_lens.size() and
            std::equal(in1_lens.begin(), in1_lens.end() - 2, in2_lens.begin(), in2_lens.end() - 2));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto dot   = r.result;
        auto rsp   = r.instructions["rsp"];
        auto other = r.instructions["other"];

        auto rsp_lens = rsp->get_shape().lens();
        auto inp      = rsp->inputs().front();
        auto inp_lens = inp->get_shape().lens();

        // Gemm axis should not be altered by the reshape
        bool flipped    = rsp == dot->inputs().back();
        size_t dot_axis = (flipped) ? 2 : 1;

        if(not is_valid_reshape(inp, rsp, dot_axis))
            return;

        instruction_ref new_other;
        if(other->get_operator().name() == "reshape")
        {
            auto other_inp        = other->inputs().front();
            size_t other_dot_axis = (flipped) ? 1 : 2;
            if(not is_valid_reshape(other_inp, other, other_dot_axis) or
               not has_same_batch_dims(inp, other_inp))
                return;

            new_other = other_inp;
        }
        else
        {
            auto other_lens = other->get_shape().lens();
            if(other_lens.size() > 2)
                return;

            std::vector<size_t> new_other_lens{inp_lens.begin(), inp_lens.end() - 2};
            operation new_bc_op;

            auto bc_other      = (flipped) ? dot->inputs().front() : dot->inputs().back();
            auto bc_other_lens = bc_other->get_shape().lens();
            new_other_lens.insert(
                new_other_lens.end(), bc_other_lens.end() - 2, bc_other_lens.end());

            // if the original weight is one dimensional, look at the original broadcast
            // to determine the correct broadcast axis
            if(other_lens.size() == 1)
            {
                auto bc_other_strides = bc_other->get_shape().strides();
                auto it               = std::find_if(bc_other_strides.begin(),
                                       bc_other_strides.end(),
                                       [&](auto i) { return i != 0; });
                auto orig_bc_axis     = std::distance(bc_other_strides.begin(), it);

                auto new_bc_axis = new_other_lens.size() - (bc_other_lens.size() - orig_bc_axis);
                new_bc_op =
                    make_op("broadcast", {{"axis", new_bc_axis}, {"out_lens", new_other_lens}});
            }
            else
            {
                new_bc_op = make_op("multibroadcast", {{"out_lens", new_other_lens}});
            }

            new_other = m.insert_instruction(dot, new_bc_op, other);
        }

        instruction_ref new_dot;
        if(flipped)
        {
            new_dot = m.insert_instruction(dot, make_op("dot"), new_other, inp);
        }
        else
        {
            new_dot = m.insert_instruction(dot, make_op("dot"), inp, new_other);
        }
        m.replace_instruction(
            dot, make_op("reshape", {{"dims", dot->get_shape().lens()}}), new_dot);
    }
};

// Remove transposes and converts between mul/add -> dot so simplify_algebra can perform
// const folding simplifications
struct find_mul_add_shape_op_dot
{
    auto matcher() const
    {
        auto shape_ops             = match::name("transpose", "convert");
        auto const_mul_add         = match::name("mul", "add")(match::either_arg(0, 1)(
            match::is_constant().bind("const"), match::any().bind("input")));
        auto match_shape_op        = shape_ops(match::args(const_mul_add.bind("pw")));
        auto skip_shape_op_outputs = match::skip_output(match::any_of(shape_ops));
        return match_shape_op(skip_shape_op_outputs(match::name("dot")));
    }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto shape_ins = r.result;
        auto pw        = r.instructions["pw"];
        auto constant  = r.instructions["const"];
        auto input     = r.instructions["input"];

        auto shape_op  = shape_ins->get_operator();
        auto pw_op     = pw->get_operator();
        auto new_inp   = m.insert_instruction(shape_ins, shape_op, input);
        auto new_const = m.insert_instruction(shape_ins, shape_op, constant);

        m.replace_instruction(shape_ins, pw_op, new_inp, new_const);
    }
};

struct find_flatten
{
    auto matcher() const { return match::name("flatten"); }

    void apply(module& m, const match::matcher_result& r) const
    {
        auto flatten = r.result;
        m.replace_instruction(flatten,
                              make_op("reshape", {{"dims", flatten->get_shape().lens()}}),
                              flatten->inputs());
    }
};

void simplify_reshapes::apply(module& m) const
{
    m.repeat_while_changes(depth, [&] {
        match::find_matches(m,
                            find_where_op{},
                            find_resize{},
                            find_nop_reshapes{},
                            find_flatten{},
                            find_reshape_cont{},
                            find_nested_shape_transforms{},
                            find_concat_slice{},
                            find_concat_transpose{},
                            find_concat_reshape{},
                            find_concat_multibroadcasts{},
                            find_nested_slice{},
                            find_nested_concat{},
                            find_transpose_slice{},
                            find_slice_transpose{},
                            find_unary_shape_transforms{},
                            find_reshape_dot{},
                            find_mul_add_shape_op_dot{});
        dead_code_elimination{}.apply(m);
    });
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
