#ifndef MIGRAPHX_GUARD_DRIVER_MLIR_HPP
#define MIGRAPHX_GUARD_DRIVER_MLIR_HPP

#include <migraphx/config.hpp>
#include <migraphx/program.hpp>

namespace migraphx {
namespace driver {
inline namespace MIGRAPHX_INLINE_NS {

void offload_to_mlir(program& p);

} // namespace MIGRAPHX_INLINE_NS
} // namespace driver
} // namespace migraphx
#endif // MIGRAPHX_GUARD_DRIVER_MLIR_HPP
