ARG FRIGATE_IMAGE
FROM ${FRIGATE_IMAGE} AS runtime
USER root
COPY runtime/ /
ARG RUNTIME_DIRECTORY
ARG CACHE_NAMESPACE
ARG UPSTREAM_COMMIT
ENV FRIGATE_MIGRAPHX_CACHE_NAMESPACE=${CACHE_NAMESPACE} \
    LD_LIBRARY_PATH=/opt/rocm/lib/migraphx/lib:/opt/rocm/lib:/opt/rocm/lib/llvm/lib:${LD_LIBRARY_PATH} \
    HSA_ENABLE_SDMA=0 \
    MIGRAPHX_DISABLE_MIOPEN_FUSION=1 \
    MIGRAPHX_DISABLE_SCHEDULE_PASS=1 \
    MIGRAPHX_DISABLE_REDUCE_FUSION=1 \
    MIGRAPHX_ENABLE_HIPRTC_WORKAROUNDS=1 \
    MIOPEN_CUSTOM_CACHE_DIR=/config/model_cache/migraphx/${CACHE_NAMESPACE} \
    MIOPEN_USER_DB_PATH=/config/model_cache/migraphx/${CACHE_NAMESPACE} \
    AMD_COMGR_CACHE=1 \
    AMD_COMGR_CACHE_DIR=/config/model_cache/migraphx/${CACHE_NAMESPACE} \
    FRIGATE_MIGRAPHX_CONSERVE_CPU=1 \
    FRIGATE_MIGRAPHX_FAST_MATH=1 \
    FRIGATE_MIGRAPHX_EXHAUSTIVE_TUNE=1
RUN --network=none test ! -e /dev/kfd && test ! -e /dev/dri \
    && test ! -e /opt/rocm && ln -s "${RUNTIME_DIRECTORY}" /opt/rocm \
    && printf '/opt/rocm/lib\n/opt/rocm/lib/migraphx/lib\n/opt/rocm/lib/llvm/lib\n' > /etc/ld.so.conf.d/frigate-owned-rocm.conf \
    && ldconfig
WORKDIR /opt/frigate
COPY application/frigate/detectors/plugins/migraphx.py frigate/detectors/plugins/migraphx.py
COPY application/frigate/detectors/legacy_amd.py frigate/detectors/legacy_amd.py
RUN --network=none python3 -m compileall -q frigate/detectors/plugins/migraphx.py frigate/detectors/legacy_amd.py
LABEL org.opencontainers.image.source="https://github.com/jaysqvl/frigate" \
    io.jaysqvl.frigate.upstream="${UPSTREAM_COMMIT}" \
    io.jaysqvl.frigate.runtime="${RUNTIME_DIRECTORY}" \
    io.jaysqvl.frigate.qualification="requires-offline-and-gpu-validation"

FROM runtime AS owned724
ENV HSA_OVERRIDE_GFX_VERSION=9.0.0

FROM runtime AS owned101
ENV FRIGATE_ROCM_NATIVE_GFX90C=1 \
    ROCBLAS_TENSILE_LIBPATH=/opt/rocm/lib/rocblas/library
