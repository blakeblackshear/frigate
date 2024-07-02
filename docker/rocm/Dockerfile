# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG ROCM=5.7.3
ARG AMDGPU=gfx900
ARG HSA_OVERRIDE_GFX_VERSION
ARG HSA_OVERRIDE

#######################################################################
FROM ubuntu:focal as rocm

ARG ROCM

RUN apt-get update && apt-get -y upgrade
RUN apt-get -y install gnupg wget

RUN mkdir --parents --mode=0755 /etc/apt/keyrings

RUN wget https://repo.radeon.com/rocm/rocm.gpg.key -O - | gpg --dearmor | tee /etc/apt/keyrings/rocm.gpg > /dev/null
COPY docker/rocm/rocm.list /etc/apt/sources.list.d/
COPY docker/rocm/rocm-pin-600 /etc/apt/preferences.d/

RUN apt-get update

RUN apt-get -y install --no-install-recommends migraphx
RUN apt-get -y install --no-install-recommends migraphx-dev

RUN mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/lib
RUN cd /opt/rocm-$ROCM/lib && cp -dpr libMIOpen*.so* libamd*.so* libhip*.so* libhsa*.so* libmigraphx*.so* librocm*.so* librocblas*.so* /opt/rocm-dist/opt/rocm-$ROCM/lib/
RUN cd /opt/rocm-dist/opt/ && ln -s rocm-$ROCM rocm

RUN mkdir -p /opt/rocm-dist/etc/ld.so.conf.d/
RUN echo /opt/rocm/lib|tee /opt/rocm-dist/etc/ld.so.conf.d/rocm.conf

#######################################################################
FROM --platform=linux/amd64 debian:11 as debian-base

RUN apt-get update && apt-get -y upgrade
RUN apt-get -y install --no-install-recommends libelf1 libdrm2 libdrm-amdgpu1 libnuma1 kmod

RUN apt-get -y install python3

#######################################################################
# ROCm does not come with migraphx wrappers for python 3.9, so we build it here
FROM debian-base as debian-build

ARG ROCM

COPY --from=rocm /opt/rocm-$ROCM /opt/rocm-$ROCM
RUN ln -s /opt/rocm-$ROCM /opt/rocm

RUN apt-get -y install g++ cmake
RUN apt-get -y install python3-pybind11 python3.9-distutils python3-dev

WORKDIR /opt/build

COPY docker/rocm/migraphx .

RUN mkdir build && cd build && cmake .. && make install

#######################################################################
FROM deps AS deps-prelim

# need this to install libnuma1
RUN apt-get update
# no ugprade?!?!
RUN apt-get -y install libnuma1

WORKDIR /opt/frigate/
COPY --from=rootfs / /

#######################################################################
FROM scratch AS rocm-dist

ARG ROCM
ARG AMDGPU

COPY --from=rocm /opt/rocm-$ROCM/bin/rocminfo /opt/rocm-$ROCM/bin/migraphx-driver /opt/rocm-$ROCM/bin/
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*$AMDGPU* /opt/rocm-$ROCM/share/miopen/db/
COPY --from=rocm /opt/rocm-$ROCM/lib/rocblas/library/*$AMDGPU* /opt/rocm-$ROCM/lib/rocblas/library/
COPY --from=rocm /opt/rocm-dist/ /
COPY --from=debian-build /opt/rocm/lib/migraphx.cpython-39-x86_64-linux-gnu.so /opt/rocm-$ROCM/lib/

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

# Request yolov8 download at startup
ENV DOWNLOAD_YOLOV8=1

