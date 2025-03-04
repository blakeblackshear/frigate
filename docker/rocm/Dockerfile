# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG ROCM=6.3.3
ARG AMDGPU=gfx900
ARG HSA_OVERRIDE_GFX_VERSION
ARG HSA_OVERRIDE

#######################################################################
FROM wget AS rocm

ARG ROCM
ARG AMDGPU

RUN apt update && \
    apt install -y wget gpg && \
    wget -O rocm.deb https://repo.radeon.com/amdgpu-install/$ROCM/ubuntu/jammy/amdgpu-install_6.3.60303-1_all.deb && \
    apt install -y ./rocm.deb && \
    apt update && \
    apt install -y rocm

RUN mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/lib
RUN cd /opt/rocm-$ROCM/lib && \
    cp -dpr libMIOpen*.so* libamd*.so* libhip*.so* libhsa*.so* libmigraphx*.so* librocm*.so* librocblas*.so* libroctracer*.so* librocfft*.so* librocprofiler*.so* libroctx*.so* /opt/rocm-dist/opt/rocm-$ROCM/lib/ && \
    mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/lib/migraphx/lib && \
    cp -dpr migraphx/lib/* /opt/rocm-dist/opt/rocm-$ROCM/lib/migraphx/lib
RUN cd /opt/rocm-dist/opt/ && ln -s rocm-$ROCM rocm

RUN mkdir -p /opt/rocm-dist/etc/ld.so.conf.d/
RUN echo /opt/rocm/lib|tee /opt/rocm-dist/etc/ld.so.conf.d/rocm.conf

#######################################################################
FROM deps AS deps-prelim

RUN apt-get update && apt-get install -y libnuma1

WORKDIR /opt/frigate
COPY --from=rootfs / /

RUN wget -q https://bootstrap.pypa.io/get-pip.py -O get-pip.py \
    && python3 get-pip.py "pip" --break-system-packages
RUN python3 -m pip config set global.break-system-packages true

COPY docker/rocm/requirements-wheels-rocm.txt /requirements.txt
RUN pip3 uninstall -y onnxruntime-openvino \
    && pip3 install -r /requirements.txt

#######################################################################
FROM scratch AS rocm-dist

ARG ROCM
ARG AMDGPU

COPY --from=rocm /opt/rocm-$ROCM/bin/rocminfo /opt/rocm-$ROCM/bin/migraphx-driver /opt/rocm-$ROCM/bin/
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*$AMDGPU* /opt/rocm-$ROCM/share/miopen/db/
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*gfx908* /opt/rocm-$ROCM/share/miopen/db/
COPY --from=rocm /opt/rocm-$ROCM/lib/rocblas/library/*$AMDGPU* /opt/rocm-$ROCM/lib/rocblas/library/
COPY --from=rocm /opt/rocm-dist/ /

#######################################################################
FROM deps-prelim AS rocm-prelim-hsa-override0
ENV HSA_ENABLE_SDMA=0
ENV MIGRAPHX_ENABLE_NHWC=1

COPY --from=rocm-dist / /

RUN ldconfig

#######################################################################
FROM rocm-prelim-hsa-override0 as rocm-prelim-hsa-override1

ARG HSA_OVERRIDE_GFX_VERSION
ENV HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION

#######################################################################
FROM rocm-prelim-hsa-override$HSA_OVERRIDE as rocm-deps

