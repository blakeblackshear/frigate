# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG ROCM=1
ARG HSA_OVERRIDE_GFX_VERSION
ARG HSA_OVERRIDE

#######################################################################
FROM wget AS rocm

ARG ROCM

RUN apt update -qq && \
    apt install -y wget gpg && \
    wget -O rocm.deb https://repo.radeon.com/amdgpu-install/7.1.1/ubuntu/jammy/amdgpu-install_7.1.1.70101-1_all.deb && \
    apt install -y ./rocm.deb && \
    apt update && \
    apt install -qq -y rocm

RUN mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/lib
RUN cd /opt/rocm-$ROCM/lib && \
    cp -dpr libMIOpen*.so* libamd*.so* libhip*.so* libhsa*.so* libmigraphx*.so* librocm*.so* librocblas*.so* libroctracer*.so* librocsolver*.so* librocfft*.so* librocprofiler*.so* libroctx*.so*  librocroller.so* /opt/rocm-dist/opt/rocm-$ROCM/lib/ && \
    mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/lib/migraphx/lib && \
    cp -dpr migraphx/lib/* /opt/rocm-dist/opt/rocm-$ROCM/lib/migraphx/lib
RUN cd /opt/rocm-dist/opt/ && ln -s rocm-$ROCM rocm

RUN mkdir -p /opt/rocm-dist/etc/ld.so.conf.d/
RUN echo /opt/rocm/lib|tee /opt/rocm-dist/etc/ld.so.conf.d/rocm.conf

#######################################################################
FROM deps AS deps-prelim

COPY docker/rocm/debian-backports.sources /etc/apt/sources.list.d/debian-backports.sources
RUN apt-get update && \
    apt-get install -y libnuma1 && \
    apt-get install -qq -y -t bookworm-backports mesa-va-drivers mesa-vulkan-drivers && \
    # Install C++ standard library headers for HIPRTC kernel compilation fallback
    apt-get install -qq -y libstdc++-12-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/frigate
COPY --from=rootfs / /

RUN wget -q https://bootstrap.pypa.io/get-pip.py -O get-pip.py \
    && sed -i 's/args.append("setuptools")/args.append("setuptools==77.0.3")/' get-pip.py \
    && python3 get-pip.py "pip" --break-system-packages
RUN python3 -m pip config set global.break-system-packages true

COPY docker/rocm/requirements-wheels-rocm.txt /requirements.txt
RUN pip3 uninstall -y onnxruntime \
    && pip3 install -r /requirements.txt

#######################################################################
FROM scratch AS rocm-dist

ARG ROCM

COPY --from=rocm /opt/rocm-$ROCM/bin/rocminfo /opt/rocm-$ROCM/bin/migraphx-driver /opt/rocm-$ROCM/bin/
# Copy MIOpen database files for gfx10xx and gfx11xx only (RDNA2/RDNA3)
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*gfx10* /opt/rocm-$ROCM/share/miopen/db/
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*gfx11* /opt/rocm-$ROCM/share/miopen/db/
# Copy rocBLAS library files for gfx10xx and gfx11xx only
COPY --from=rocm /opt/rocm-$ROCM/lib/rocblas/library/*gfx10* /opt/rocm-$ROCM/lib/rocblas/library/
COPY --from=rocm /opt/rocm-$ROCM/lib/rocblas/library/*gfx11* /opt/rocm-$ROCM/lib/rocblas/library/
COPY --from=rocm /opt/rocm-dist/ /

#######################################################################
FROM deps-prelim AS rocm-prelim-hsa-override0
ENV MIGRAPHX_DISABLE_MIOPEN_FUSION=1
ENV MIGRAPHX_DISABLE_SCHEDULE_PASS=1
ENV MIGRAPHX_DISABLE_REDUCE_FUSION=1
ENV MIGRAPHX_ENABLE_HIPRTC_WORKAROUNDS=1

COPY --from=rocm-dist / /

RUN ldconfig

#######################################################################
FROM rocm-prelim-hsa-override0 as rocm-prelim-hsa-override1

ARG HSA_OVERRIDE_GFX_VERSION
ENV HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION

#######################################################################
FROM rocm-prelim-hsa-override$HSA_OVERRIDE as rocm-deps

