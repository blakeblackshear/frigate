#include "mlir.hpp"
#include <migraphx/module.hpp>
#include <migraphx/make_op.hpp>
#include <migraphx/iterator_for.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/instruction.hpp>
#include <migraphx/param_utils.hpp>
#include <migraphx/dead_code_elimination.hpp>
#include <migraphx/pass_manager.hpp>
#include <unordered_map>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

void offload_to_mlir(program& p)
{
    auto* mm    = p.get_main_module();
    auto* mlirm = p.create_module("mlir");
    mlirm->set_bypass();
    std::vector<instruction_ref> inputs;
    copy_if(iterator_for(*mm), std::back_inserter(inputs), [&](instruction_ref ins) {
        if(ins->name() == "@param")
            return true;
        if(ins->name() == "@literal")
            return ins->get_shape().elements() != 1;
        return false;
    });

    std::unordered_map<instruction_ref, instruction_ref> map_ins;
    std::size_t n = 0;
    for(auto ins : inputs)
    {
        map_ins[ins] = mlirm->add_parameter(param_name(n++), ins->get_shape().as_standard());
    }

    auto mlir_last = mlirm->add_instructions(mm, &map_ins);
    mlirm->add_return(mlir_last);

    auto last    = std::prev(mm->end());
    auto mlir_op = mm->insert_instruction(last, make_op("gpu::mlir_op"), inputs, {mlirm});
    if(mlir_last.size() > 1)
    {
        std::vector<instruction_ref> outputs;
        transform(range(mlir_last.size()), std::back_inserter(outputs), [&](auto i) {
            return mm->insert_instruction(last, make_op("get_tuple_elem", {{"index", i}}), mlir_op);
        });
        mm->replace_return(outputs);
    }
    else
    {
        mm->replace_return({mlir_op});
    }
    run_passes(*mm, {dead_code_elimination{}});
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx
