# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

# Globally set pip break-system-packages option to avoid having to specify it every time
ARG PIP_BREAK_SYSTEM_PACKAGES=1

# QAIRT 2.37.1 runtime tarball + qai_appbuilder source pinned to a known-good
# commit that builds against this SDK version. Override at build time via
# --build-arg if a downstream maintainer hosts these elsewhere.
ARG QAIRT_RUNTIME_URL=https://github.com/notori0us/qairt-runtime/releases/download/v2.37.1.250807/qairt-runtime-2.37.1.250807-aarch64.tar.gz
ARG QAI_APPBUILDER_REF=942bc0d

# ---------- stage: builder ----------
# Build the qai_appbuilder Python wheel inside the Frigate image so its C++
# ABI (libstdc++/glibc) matches Frigate's runtime stage.
FROM deps AS qcs6490-wheels
ARG DEBIAN_FRONTEND
ARG PIP_BREAK_SYSTEM_PACKAGES
ARG QAIRT_RUNTIME_URL
ARG QAI_APPBUILDER_REF

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential cmake git ca-certificates curl \
        python3-dev libyaml-0-2 \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
        wheel==0.45.1 setuptools==80.9.0 pybind11==2.13.6 build==1.4.0

# Fetch QAIRT runtime (libQnnHtp*, libQnnSystem, hexagon-v68 skel, fastrpc shell).
RUN mkdir -p /opt/qairt \
 && curl -fsSL "${QAIRT_RUNTIME_URL}" | tar -C /opt/qairt -xzf -

# Fetch qai_appbuilder source at a pinned commit. Patch out the Genie target
# (its headers don't match QAIRT 2.37.1) and ensure dist/ exists for the build.
RUN git clone --filter=blob:none https://github.com/quic/ai-engine-direct-helper.git /tmp/aedh \
 && cd /tmp/aedh \
 && git checkout "${QAI_APPBUILDER_REF}" \
 && sed -i '/add_subdirectory(genie)/d' pybind/CMakeLists.txt \
 && sed -i 's|zip_package|os.makedirs("dist", exist_ok=True)\n    zip_package|' setup.py

ENV QNN_SDK_ROOT=/opt/qairt \
    QAI_TOOLCHAINS=aarch64-oe-linux-gcc11.2 \
    QAI_HEXAGONARCH=68
RUN cd /tmp/aedh && python3 -m build -w

# ---------- stage: runtime ----------
FROM deps AS qcs6490-frigate
ARG DEBIAN_FRONTEND
ARG PIP_BREAK_SYSTEM_PACKAGES

# Runtime libs: libcdsprpc.so dlopen path + QNN SDK libs need libyaml-0.so.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libyaml-0-2 \
 && rm -rf /var/lib/apt/lists/*

# QAIRT runtime layout. ADSP_LIBRARY_PATH below points cDSP firmware here for
# the QNN HTP backend skel (libQnnHtpV68Skel.so) and the fastrpc shell.
COPY --from=qcs6490-wheels /opt/qairt/lib          /opt/qairt/lib/
COPY --from=qcs6490-wheels /opt/qairt/hexagon-v68  /opt/qairt/hexagon-v68/

# Make libcdsprpc.so visible to the dynamic linker without polluting LD_LIBRARY_PATH.
RUN ln -sf /opt/qairt/lib/libcdsprpc.so /usr/lib/libcdsprpc.so && ldconfig

# Install the qai_appbuilder wheel built in the previous stage.
RUN --mount=type=bind,from=qcs6490-wheels,source=/tmp/aedh/dist,target=/wheels \
    pip3 install --no-cache-dir /wheels/qai_appbuilder-*.whl

WORKDIR /opt/frigate/
COPY --from=rootfs / /

# fastrpc separator gotcha: ADSP_LIBRARY_PATH is split by ';' (semicolon),
# not the usual ':'. The cDSP firmware also requires its skel + libc++ files
# at host paths /usr/lib/dsp/cdsp and /usr/lib/rfsa/adsp; bind-mount these
# from the host (see docs/docs/frigate/installation.md#qualcomm-platform).
ENV ADSP_LIBRARY_PATH="/opt/qairt/hexagon-v68;/usr/lib/dsp/cdsp;/usr/lib/rfsa/adsp" \
    LD_LIBRARY_PATH="/opt/qairt/lib"
