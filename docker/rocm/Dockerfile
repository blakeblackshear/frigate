# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG HSA_OVERRIDE_GFX_VERSION
ARG HSA_OVERRIDE

#######################################################################
FROM deps AS deps-prelim

COPY docker/rocm/debian-backports.sources /etc/apt/sources.list.d/debian-backports.sources
# install_deps.sh upgraded libstdc++6 from trixie for Battlemage; the matching
# -dev package must also come from trixie or apt refuses to satisfy it.
RUN echo "deb http://deb.debian.org/debian trixie main" > /etc/apt/sources.list.d/trixie.list && \
    apt-get update && \
    apt-get install -y libnuma1 && \
    apt-get install -qq -y -t bookworm-backports mesa-va-drivers mesa-vulkan-drivers && \
    apt-get install -qq -y -t trixie libstdc++-14-dev && \
    rm -f /etc/apt/sources.list.d/trixie.list && \
    rm -rf /var/lib/apt/lists/*

RUN wget -q https://bootstrap.pypa.io/get-pip.py -O get-pip.py \
    && sed -i 's/args.append("setuptools")/args.append("setuptools==77.0.3")/' get-pip.py \
    && python3 get-pip.py "pip" --break-system-packages
RUN python3 -m pip config set global.break-system-packages true

# ROCm installs from AMD's wheels ahead of Frigate's code so code changes
# reuse this layer, and is pruned in the same layer so the removed files never
# reach the image. /opt/rocm links to the runtime for rocminfo and HIP headers.
COPY docker/rocm/requirements-wheels-rocm.txt /requirements.txt
RUN --mount=type=bind,source=docker/rocm/prune_rocm.sh,target=/deps/prune_rocm.sh \
    pip3 uninstall -y onnxruntime \
    && pip3 install --no-cache-dir -r /requirements.txt \
    && ROCM_SDK_CORE="$(python3 -c 'import _rocm_sdk_core, os; print(os.path.dirname(_rocm_sdk_core.__file__))')" \
    && /deps/prune_rocm.sh "$(dirname "${ROCM_SDK_CORE}")" \
    && ln -s "${ROCM_SDK_CORE}" /opt/rocm

WORKDIR /opt/frigate
COPY --from=rootfs / /

#######################################################################
FROM deps-prelim AS rocm-prelim-hsa-override0
ENV MIGRAPHX_DISABLE_MIOPEN_FUSION=1
ENV MIGRAPHX_DISABLE_SCHEDULE_PASS=1
ENV MIGRAPHX_DISABLE_REDUCE_FUSION=1
ENV MIOPEN_CUSTOM_CACHE_DIR=/config/model_cache/migraphx
ENV MIOPEN_USER_DB_PATH=/config/model_cache/migraphx
ENV AMD_COMGR_CACHE=1
ENV AMD_COMGR_CACHE_DIR=/config/model_cache/migraphx

#######################################################################
FROM rocm-prelim-hsa-override0 as rocm-prelim-hsa-override1

ARG HSA_OVERRIDE_GFX_VERSION
ENV HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION

#######################################################################
FROM rocm-prelim-hsa-override$HSA_OVERRIDE as rocm-deps

