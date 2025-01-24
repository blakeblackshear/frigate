# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG ROCM=6.3.1
ARG AMDGPU=gfx900
ARG HSA_OVERRIDE_GFX_VERSION
ARG HSA_OVERRIDE

#######################################################################
FROM wget as rocm

ARG ROCM
ARG AMDGPU

RUN apt update && \
    apt install -y "linux-headers-$(uname -r)" && \
    apt install -y wget gpg && \
    wget https://repo.radeon.com/amdgpu-install/6.3.1/ubuntu/jammy/amdgpu-install_6.3.60301-1_all.deb && \
    apt install -y ./amdgpu-install_6.3.60301-1_all.deb && \
    apt update && \
    apt install -y rocm

RUN mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/lib
RUN cd /opt/rocm-$ROCM/lib && cp -dpr libMIOpen*.so* libamd*.so* libhip*.so* libhsa*.so* libmigraphx*.so* librocm*.so* librocblas*.so* libroctracer*.so* librocfft*.so* /opt/rocm-dist/opt/rocm-$ROCM/lib/
RUN cd /opt/rocm-dist/opt/ && ln -s rocm-$ROCM rocm

RUN mkdir -p /opt/rocm-dist/etc/ld.so.conf.d/
RUN echo /opt/rocm/lib|tee /opt/rocm-dist/etc/ld.so.conf.d/rocm.conf

#######################################################################
# ROCm does not come with migraphx wrappers for python 3.9, so we build it here
# FROM debian-base as debian-build

# ARG ROCM

# COPY --from=rocm /opt/rocm-$ROCM /opt/rocm-$ROCM
# RUN ln -s /opt/rocm-$ROCM /opt/rocm

# RUN apt-get -y install g++ cmake
# RUN apt-get -y install python3-pybind11 python3-distutils python3-dev

# WORKDIR /opt/build

# COPY docker/rocm/migraphx .

# RUN mkdir build && cd build && cmake .. && make install

#######################################################################
FROM deps AS deps-prelim

# need this to install libnuma1
RUN apt-get update
# no ugprade?!?!
RUN apt-get -y install libnuma1

WORKDIR /opt/frigate/
COPY --from=rootfs / /

COPY docker/rocm/requirements-wheels-rocm.txt /requirements.txt
RUN wget https://repo.radeon.com/rocm/manylinux/rocm-rel-6.3.1/onnxruntime_rocm-1.19.0-cp312-cp312-linux_x86_64.whl && \
   python3 -m pip install --upgrade pip && \
   pip3 uninstall -y onnxruntime-openvino && \
   pip3 install onnxruntime_rocm-1.19.0-cp312-cp312-linux_x86_64.whl

#######################################################################
FROM scratch AS rocm-dist

ARG ROCM
ARG AMDGPU

COPY --from=rocm /opt/rocm-$ROCM/bin/rocminfo /opt/rocm-$ROCM/bin/migraphx-driver /opt/rocm-$ROCM/bin/
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*$AMDGPU* /opt/rocm-$ROCM/share/miopen/db/
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*gfx908* /opt/rocm-$ROCM/share/miopen/db/
COPY --from=rocm /opt/rocm-$ROCM/lib/rocblas/library/*$AMDGPU* /opt/rocm-$ROCM/lib/rocblas/library/
COPY --from=rocm /opt/rocm-dist/ /
#COPY --from=debian-build /opt/rocm/lib/migraphx.cpython-311-x86_64-linux-gnu.so /opt/rocm-$ROCM/lib/

#######################################################################
FROM deps-prelim AS rocm-prelim-hsa-override0
ENV HSA_ENABLE_SDMA=0

COPY --from=rocm-dist / /

RUN ldconfig

#######################################################################
FROM rocm-prelim-hsa-override0 as rocm-prelim-hsa-override1

ARG HSA_OVERRIDE_GFX_VERSION
ENV HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION

#######################################################################
FROM rocm-prelim-hsa-override$HSA_OVERRIDE as rocm-deps

