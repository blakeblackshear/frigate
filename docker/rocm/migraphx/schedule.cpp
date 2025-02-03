/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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
#include <migraphx/schedule.hpp>
#include <migraphx/program.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/iterator.hpp>
#include <migraphx/dfor.hpp>
#include <migraphx/simple_par_for.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/dom_info.hpp>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <thread>
#include <mutex>
#include <migraphx/make_op.hpp>

#include <set>
#include <deque>
#include <chrono>
#include <iomanip>

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_TRACE_SCHEDULE)

auto get_inputs()
{
    return [](auto i) { return i->inputs(); };
}

auto get_outputs()
{
    return [](auto i) { return i->outputs(); };
}

struct stream_info
{
    std::unordered_map<instruction_ref, std::size_t> ins2stream;
    std::unordered_map<instruction_ref, std::size_t> weights;
    std::unordered_map<instruction_ref, std::size_t> iweights;
    ins_dep_map mod_implicit_deps;

    void calc_implicit_deps(const module& m) { mod_implicit_deps = m.calc_implicit_deps(); }

    void accumulate_weights(instruction_ref last, const schedule_model& model)
    {
        fix<std::size_t>([&](auto self, auto ins) -> std::size_t {
            if(not contains(weights, ins))
            {
                std::size_t weight = 0;
                auto&& op          = ins->get_operator();
                if(not is_context_free(op) and op.name()[0] != '@')
                    weight = model.weight(op);
                // This will ensure a stream will be assigned to return
                if(op.name() == "@return")
                    weight = 1;
                iweights[ins] = weight;
                auto inputs   = ins->inputs();
                if(contains(mod_implicit_deps, ins))
                {
                    const auto& impl_deps = mod_implicit_deps.at(ins);
                    inputs.insert(inputs.end(), impl_deps.begin(), impl_deps.end());
                }

                weights[ins] = std::accumulate(
                    inputs.begin(), inputs.end(), weight, [&](std::size_t w, instruction_ref i) {
                        return w + self(i);
                    });
            }
            return weights[ins];
        })(last);
    }

    template <class Compare>
    void sort_args_by_weight(std::vector<instruction_ref>& args, Compare compare) const
    {
        if(args.size() < 2)
            return;
        std::sort(args.begin(), args.end(), by(compare, [this](auto x) {
                      return std::make_tuple(
                          this->weights.at(x), x->inputs().size(), std::addressof(*x));
                  }));
    }

    std::vector<instruction_ref>::iterator sort_args(std::vector<instruction_ref>& args)
    {
        if(args.size() < 2)
        {
            return args.end();
        }

        const std::size_t min_partition_threshold = 2;
        sort_args_by_weight(args, std::greater<>{});

        auto it = std::lower_bound(std::next(args.begin()),
                                   args.end(),
                                   min_partition_threshold,
                                   [&](auto i, std::size_t w) { return this->weights[i] > w; });
        assert(it == args.end() or this->weights[*it] <= min_partition_threshold);
        assert(it == args.end() or std::prev(it) == args.begin() or
               this->weights[*std::prev(it)] > min_partition_threshold);
        return it;
    }

    struct partition
    {
        std::size_t weight = 0;
        std::vector<instruction_ref> instructions{};

        void add(instruction_ref ins, std::size_t w)
        {
            weight += w;
            instructions.push_back(ins);
        }
    };

    std::size_t assign_streams(module& m, std::size_t n)
    {
        assert(n > 0);
        partition critical;
        std::unordered_map<instruction_ref, std::deque<partition>> partitions;
        partitions.reserve(weights.size());
        fix([&](auto self, auto ins, auto& part) {
            assert(not is_end(ins, m.end()));
            if(not m.has_instruction(ins))
                return;
            if(contains(partitions, ins))
                return;

            // Add an entry so we know the instruction was visited
            partitions[ins];
            part.add(ins, this->iweights[ins]);

            auto args         = ins->inputs();
            auto threshold_it = this->sort_args(args);

            if(not args.empty())
            {
                assert(threshold_it != args.begin());
                self(args.front(), part);
                for(auto i : range(std::next(args.begin()), threshold_it))
                {
                    partitions[ins].emplace_back();
                    self(i, partitions[ins].back());
                }
                for(auto i : range(threshold_it, args.end()))
                {
                    self(i, part);
                }
            }
            // Sort instructions
            m.move_instruction(ins, m.end());
        })(std::prev(m.end()), critical);

        // Set the critical partition to stream 0
        set_stream(critical, 0);
        if(n == 1)
        {
            // Assign streams for the other partitions
            for(auto&& ins_part : partitions)
                for(auto&& part : ins_part.second)
                    set_stream(part, 0);
            return 1;
        }
        else
        {
            std::vector<std::size_t> streams(n - 1);
            // Assign streams for the other partitions
            for(auto&& ins_part : partitions)
            {
                std::sort(ins_part.second.begin(),
                          ins_part.second.end(),
                          by(std::greater<>{}, [](auto&& x) {
                              return std::make_tuple(x.weight, x.instructions.size());
                          }));
                for(auto&& part : ins_part.second)
                {
                    auto stream =
                        std::min_element(streams.begin(), streams.end()) - streams.begin();
                    set_stream(part, stream + 1);
                    streams[stream] += part.weight;
                }
            }
            return 1 + std::count_if(streams.begin(), streams.end(), [](auto x) { return x > 0; });
        }
    }

    using weight_ins = std::pair<std::size_t, instruction_ref>;
    struct compare_weight_ins
    {
        bool operator()(const weight_ins& x, const weight_ins& y) const
        {
            return std::make_pair(x.first, std::addressof(*x.second)) <
                   std::make_pair(y.first, std::addressof(*y.second));
        }
    };

    void sort(module& m, std::size_t)
    {
        std::set<weight_ins, compare_weight_ins> children;
        std::unordered_map<instruction_ref, std::size_t> visited;
        auto last      = std::prev(m.end());
        auto mw        = this->weights.at(last);
        auto nw        = mw / (m.size() + 1);
        auto add_child = [&](auto ins) {
            auto x  = 1 + (mw - this->weights.at(ins)) / (nw + 1);
            auto w  = x * this->iweights.at(ins);
            auto& v = visited[ins];
            auto it = children.find(std::make_pair(v * w, ins));
            if(it == children.end())
            {
                v++;
                children.insert(std::make_pair(v * w, ins));
            }
        };
        add_child(last);

        while(not children.empty())
        {
            // Pop the first element
            auto top = children.begin()->second;
            children.erase(children.begin());
            m.move_instruction(top, m.begin());
            for(auto ins : top->inputs())
            {
                if(not m.has_instruction(ins))
                    continue;
                add_child(ins);
            }

            if(contains(mod_implicit_deps, top))
            {
                for(auto ins : mod_implicit_deps.at(top))
                {
                    assert(m.has_instruction(ins));
                    add_child(ins);
                }
            }
        }

        // move dangling parameter to the front so as not be removed
        auto ins = std::next(last);
        while(ins != m.end())
        {
            auto next = std::next(ins);
            if(ins->name() == "@param")
            {
                m.move_instruction(ins, m.begin());
            }
            ins = next;
        }
    }

    void set_stream(const partition& p, std::size_t n)
    {
        for(auto ins : p.instructions)
            if(iweights[ins] > 0)
                set_stream(ins, n);
    }

    void set_stream(instruction_ref ins, std::size_t n)
    {
        assert(iweights[ins] > 0);
        ins2stream[ins] = n;
    }

    std::size_t get_stream(instruction_ref ins) const { return ins2stream.at(ins); }

    bool has_stream(instruction_ref ins) const { return contains(ins2stream, ins); }

    template <class F>
    bool different(F f, std::size_t stream) const
    {
        bool result = false;
        f([&](auto s) {
            if(s != stream)
            {
                result = true;
                return false;
            }
            // cppcheck-suppress uselessAssignmentArg
            stream = s;
            return true;
        });
        return result;
    }

    template <class F>
    bool different(F f) const
    {
        bool result = false;
        f([&](auto s) {
            result = this->different(f, s);
            return false;
        });
        return result;
    }

    template <class Selector>
    auto get_streams_from(instruction_ref start, Selector select) const
    {
        return [=](auto f) {
            return fix<bool>([&](auto self, auto ins) {
                return all_of(select(ins), [&](auto i) {
                    if(has_stream(i))
                        return f(this->get_stream(i));
                    else
                        return self(i);
                });
            })(start);
        };
    }

    std::unordered_set<std::size_t> get_streams(instruction_ref ins) const
    {
        if(has_stream(ins))
            return {get_stream(ins)};
        std::unordered_set<std::size_t> result;
        get_streams_from(ins, get_inputs())([&](auto s) {
            result.insert(s);
            return true;
        });
        return result;
    }

    template <class... Ts>
    bool is_merge_point(instruction_ref ins, Ts... xs) const
    {
        return different(get_streams_from(ins, get_inputs()), xs...);
    }

    template <class... Ts>
    bool is_split_point(instruction_ref ins, Ts... xs) const
    {
        return different(get_streams_from(ins, get_outputs()), xs...);
    }

    std::vector<instruction_ref> get_recorded_instructions(instruction_ref start)
    {
        std::vector<instruction_ref> result;
        std::unordered_map<std::size_t, instruction_ref> m;
        fix([&](auto self, auto ins) {
            for(auto i : ins->inputs())
            {
                if(iweights.at(i) == 0)
                {
                    self(i);
                    continue;
                }
                auto stream = this->get_stream(i);
                if(not contains(m, stream))
                    m[stream] = i;
                else
                    m[stream] = std::min(m[stream], i, by(std::less<>{}, [&](auto x) {
                                             return std::distance(x, start);
                                         }));
            }
        })(start);
        std::transform(
            m.begin(), m.end(), std::back_inserter(result), [](auto&& p) { return p.second; });
        return result;
    }

    std::unordered_map<instruction_ref, std::vector<std::vector<instruction_ref>>>
    find_concurrent_instructions(module& m) const
    {
        std::unordered_map<instruction_ref, std::vector<std::vector<instruction_ref>>> result;
        std::unordered_map<instruction_ref, std::unordered_set<instruction_ref>> merge_from;
        dominator_info di = compute_dominator(m);
        result.reserve(m.size());
        merge_from.reserve(m.size());
        for(auto ins : reverse_iterator_for(m))
        {
            for(auto&& arg : ins->outputs())
            {
                if(not m.has_instruction(arg))
                    continue;
                if(is_merge_point(arg))
                    merge_from[ins].insert(arg);
                merge_from[ins].insert(merge_from[arg].begin(), merge_from[arg].end());
            }

            if(is_split_point(ins))
            {
                erase_if(merge_from[ins],
                         [&](auto merge) { return di.strictly_dominate(ins, merge); });
            }

            auto streams = this->get_streams(ins);
            // Collect concur instructions for each merge point.
            for(const auto& merge : merge_from[ins])
            {
                for(auto stream : streams)
                {
                    if(result[merge].size() <= stream)
                        result[merge].resize(stream + 1);
                    auto&& r = result[merge][stream];
                    r.push_back(ins);
                    // Copy inputs if they dont have a stream(and are not a builtin and context
                    // free). Inputs without a stream can have a implicit dependency
                    std::copy_if(ins->inputs().begin(),
                                 ins->inputs().end(),
                                 std::back_inserter(r),
                                 [&](auto x) {
                                     return not this->has_stream(x) and
                                            not is_context_free(x->get_operator()) and
                                            x->name().front() != '@';
                                 });
                }
            }
        }
        return result;
    }

    std::unordered_map<instruction_ref, std::unordered_set<instruction_ref>>
    get_conflicts(module& m)
    {

        using conflict_table_type =
            std::unordered_map<instruction_ref, std::unordered_set<instruction_ref>>;
        conflict_table_type conflict_table;
        auto concur_ins = this->find_concurrent_instructions(m);

        // Compute an index for each instruction
        std::unordered_map<instruction_ref, std::size_t> ins2index;
        std::size_t index_total = 0;
        for(auto ins : iterator_for(m))
            ins2index[ins] = index_total++;

        std::vector<conflict_table_type> thread_conflict_tables(
            std::thread::hardware_concurrency());
        std::vector<instruction_ref> index_to_ins;
        index_to_ins.reserve(concur_ins.size());
        std::transform(concur_ins.begin(),
                       concur_ins.end(),
                       std::back_inserter(index_to_ins),
                       [](auto&& it) { return it.first; });

        simple_par_for(concur_ins.size(), [&](auto ins_index, auto tid) {
            auto merge_first = index_to_ins[ins_index];
            assert(concur_ins.count(merge_first) > 0);
            auto& merge_second = concur_ins.at(merge_first);

            // ensure there are enough elements for different threads
            assert(tid < thread_conflict_tables.size());
            auto& thrd_table = thread_conflict_tables.at(tid);

            std::unordered_set<instruction_ref> checked_ins_set;
            auto range_i = range(merge_second.begin(), std::prev(merge_second.end()));
            for(auto it_i : iterator_for(range_i))
            {
                std::unordered_set<instruction_ref> ins1_set;
                std::copy_if(it_i->begin(),
                             it_i->end(),
                             std::inserter(ins1_set, ins1_set.end()),
                             [&](auto i) { return not contains(checked_ins_set, i); });
                checked_ins_set.insert(ins1_set.begin(), ins1_set.end());

                auto range_j = range(std::next(it_i), merge_second.end());
                std::unordered_set<instruction_ref> ins2_set;
                for(auto it_j : iterator_for(range_j))
                {
                    std::copy_if(it_j->begin(),
                                 it_j->end(),
                                 std::inserter(ins2_set, ins2_set.end()),
                                 [&](auto i) { return not contains(checked_ins_set, i); });
                }

                for(auto ins1 : ins1_set)
                {
                    auto p1 = ins2index.at(ins1);
                    for(auto ins2 : ins2_set)
                    {
                        if(ins1 == ins2)
                            continue;
                        auto p2 = ins2index.at(ins2);
                        if(p2 > p1)
                            thrd_table[ins2].insert(ins1);
                        else
                            thrd_table[ins1].insert(ins2);
                    }
                }
            }
        });

        // merge thread_conflict_tables together
        for(auto& tbl : thread_conflict_tables)
        {
            for(auto& it : tbl)
            {
                conflict_table[it.first].insert(it.second.begin(), it.second.end());
            }
        }

        // Remove instructions from the conflict table of an ealier instruction
        for(auto&& ip : conflict_table)
        {
            auto ins1 = ip.first;
            for(auto ins2 : ip.second)
                if(contains(conflict_table[ins2], ins1))
                    conflict_table[ins2].erase(ins1);
        }

        return conflict_table;
    }
};

void schedule::apply(module& m) const
{
    if(not enable)
        return;

    stream_info si;
    si.calc_implicit_deps(m);
    auto last = std::prev(m.end());
    si.accumulate_weights(last, model);
    auto nstreams = si.assign_streams(m, model.concurrency());
    si.sort(m, model.concurrency());

    if(enabled(MIGRAPHX_TRACE_COMPILE{}) or enabled(MIGRAPHX_TRACE_SCHEDULE{}))
    {
        m.annotate(std::cout, [&](auto ins) {
            if(ins->name() == "@param" and not contains(si.weights, ins))
                return;

            std::cout << ":";
            std::cout << " weight=" << si.weights.at(ins);
            std::cout << " input={";
            si.get_streams_from(ins, get_inputs())([&](auto s) {
                std::cout << s << ",";
                return true;
            });
            std::cout << "}";
            if(si.has_stream(ins))
                std::cout << " stream=" << si.get_stream(ins);
        });
        std::cout << std::endl;
    }

    // No concurrency
    if(nstreams < 2)
        return;

    // Schedule instructions
    std::size_t wait_id = 0;
    std::unordered_map<instruction_ref, std::size_t> ins2wait;
    std::unordered_map<std::size_t, std::unordered_set<std::size_t>> waited_for;
    std::unordered_map<instruction_ref, std::unordered_set<std::size_t>> ins2waited;
    ins2wait.reserve(m.size());
    ins2waited.reserve(m.size());
    for(auto ins : iterator_for(m))
    {
        // Only schedule instructions that have a stream
        if(not si.has_stream(ins))
            continue;
        assert(si.weights[ins] > 0);
        // Schedule instruction on the stream
        auto stream = si.get_stream(ins);
        assert(stream < model.concurrency());
        model.sched(m, ins, stream);
        // Insert wait instructions
        if(si.is_merge_point(ins, stream))
        {
            for(auto i : si.get_recorded_instructions(ins))
            {
                if(not si.has_stream(i) or si.get_stream(i) == stream)
                    continue;

                // Create a new event if it hasn't been recorded
                if(not contains(ins2wait, i))
                {
                    ins2wait[i] = wait_id;
                    model.record(m, i, wait_id);
                    wait_id++;
                }
                auto w = ins2wait.at(i);
                // If we already waited for the event on this stream then dont
                // insert another wait event
                if(not contains(waited_for[stream], w))
                    model.wait(m, ins, w);
                // Store the event as waited
                waited_for[stream].insert(w);
                // Store all wait events that have been waited on prior to the recorded instruction
                waited_for[stream].insert(ins2waited[i].begin(), ins2waited[i].end());
            }
        }
        // Store wait events that have already been waited on
        if(si.is_split_point(ins, stream))
        {
            ins2waited[ins] = waited_for[stream];
        }
    }

    // Add memory conflicts
    auto conflict_table = si.get_conflicts(m);
    for(auto&& ip : conflict_table)
    {
        if(ip.second.empty())
            continue;
        std::vector<instruction_ref> args;
        args.push_back(ip.first);
        args.insert(args.end(), ip.second.begin(), ip.second.end());
        m.insert_instruction(std::next(ip.first), make_op("identity"), args);
    }
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
