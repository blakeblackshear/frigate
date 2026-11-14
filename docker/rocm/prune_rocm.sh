#!/bin/bash

# Remove the parts of AMD's ROCm wheels that MIGraphX inference never loads:
# compilers, debuggers, profilers, management tools, and the math libraries
# (sparse, solver, FFT, random, RCCL, image processing) outside MIGraphX's
# dependencies. Runs in the same layer as the install so the files never
# reach the image.

set -euo pipefail

site_packages="$1"
core="${site_packages}/_rocm_sdk_core"
libraries="${site_packages}/_rocm_sdk_libraries"

# rocminfo stays for checking that the GPU is visible in the container
find "${core}/bin" -mindepth 1 -maxdepth 1 \
    ! -name rocminfo ! -name rocm_agent_enumerator -exec rm -rf {} +

# hiprtc compiles MIGraphX's kernels through comgr, which needs libLLVM,
# libclang-cpp, the clang resource headers, and the amdgcn device libraries
rm -rf "${core}/lib/llvm/bin" "${core}/lib/llvm/include"
find "${core}/lib/llvm/lib" -mindepth 1 -maxdepth 1 \
    ! -name 'libLLVM.so*' ! -name 'libclang-cpp.so*' ! -name clang \
    -exec rm -rf {} +
rm -rf "${core}"/lib/llvm/lib/clang/*/lib

rm -rf \
    "${core}/lib/host-math" \
    "${core}"/lib/python3* \
    "${core}/lib/rocprofiler-sdk" \
    "${core}"/lib/librocprofiler-sdk*.so* \
    "${core}"/lib/librocprof-trace-decoder.so* \
    "${core}"/lib/librocm-dbgapi.so* \
    "${core}"/lib/librocm-debug-agent.so* \
    "${core}"/lib/libamd_smi*.so* \
    "${core}"/lib/libgoamdsmi_shim64.so* \
    "${core}"/lib/librocdecode.so* \
    "${core}"/lib/librocjpeg.so* \
    "${core}"/lib/librocdxg.so* \
    "${core}"/lib/librocjitsu_*.so* \
    "${core}"/lib/libhsa_hotswap_rocjitsu.so* \
    "${core}"/lib/*.a

rm -rf \
    "${libraries}"/lib/librpp.so* \
    "${libraries}"/lib/librocsparse.so* \
    "${libraries}"/lib/libhipsparse.so* \
    "${libraries}"/lib/libhipsparselt.so* \
    "${libraries}/lib/rocsparse" \
    "${libraries}"/lib/librocsolver.so* \
    "${libraries}"/lib/libhipsolver.so* \
    "${libraries}"/lib/libhipblas.so* \
    "${libraries}"/lib/librocrand.so* \
    "${libraries}"/lib/libhiprand.so* \
    "${libraries}"/lib/librocfft.so* \
    "${libraries}"/lib/libhipfft.so* \
    "${libraries}"/lib/libhipfftw.so* \
    "${libraries}"/lib/librccl.so* \
    "${libraries}"/.kpack/sparse_lib_*.kpack \
    "${libraries}"/.kpack/solver_lib_*.kpack \
    "${libraries}"/.kpack/rand_lib_*.kpack \
    "${libraries}"/.kpack/fft_lib_*.kpack \
    "${libraries}"/.kpack/rccl_lib_*.kpack
