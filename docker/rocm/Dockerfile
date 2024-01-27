# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG ROCM=5.7.3
ARG AMDGPU=gfx900
ARG HSA_OVERRIDE_GFX_VERSION

#######################################################################
FROM ubuntu:focal as rocm

RUN apt-get update && apt-get -y upgrade
RUN apt-get -y install gnupg wget

RUN mkdir --parents --mode=0755 /etc/apt/keyrings

RUN wget https://repo.radeon.com/rocm/rocm.gpg.key -O - | gpg --dearmor | tee /etc/apt/keyrings/rocm.gpg > /dev/null
COPY docker/rocm/rocm.list /etc/apt/sources.list.d/
COPY docker/rocm/rocm-pin-600 /etc/apt/preferences.d/

RUN apt-get update

RUN apt-get -y install --no-install-recommends migraphx
RUN apt-get -y install --no-install-recommends migraphx-dev

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
FROM deps AS rocm-prelim

# need this to install libnuma1
RUN apt-get update
# no ugprade?!?!
RUN apt-get -y install libnuma1

WORKDIR /opt/frigate/
COPY --from=rootfs / /

# Could compose them directly from https://github.com/ultralytics/assets/releases/tag/v8.1.0
# but would need to use a torch image of some sorts
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8n_320x320.onnx /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8n_labels.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8n_labels-frigate.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8s_320x320.onnx /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8s_labels.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8s_labels-frigate.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8m_320x320.onnx /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8m_labels.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8m_labels-frigate.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8n-oiv7_320x320.onnx /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8n-oiv7_labels.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8n-oiv7_labels-frigate.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8s-oiv7_320x320.onnx /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8s-oiv7_labels.txt /
ADD --chmod=0644 https://github.com/harakas/models/raw/main/ultralytics/yolov8.1/yolov8s-oiv7_labels-frigate.txt /

#######################################################################
FROM rocm-prelim AS rocm-deps

ARG ROCM
ARG AMDGPU
ARG HSA_OVERRIDE_GFX_VERSION

ENV HSA_ENABLE_SDMA=0
ENV HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION

RUN mkdir -p /opt/rocm-$ROCM

# Docker does not copy symbolic links so have to resort to tar
RUN --mount=from=rocm,src=/opt/rocm-$ROCM,dst=/opt/rocm-copy cd /opt/rocm-copy && tar cf - lib/libMIOpen*.so* lib/libamd*.so* lib/libhip*.so* lib/libhsa*.so* lib/libmigraphx*.so* lib/librocm*.so* lib/librocblas*.so* | (cd /opt/rocm-$ROCM/ && tar xf -)

COPY --from=rocm /opt/rocm-$ROCM/bin/rocminfo /opt/rocm-$ROCM/bin/migraphx-driver /opt/rocm-$ROCM/bin/
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/*$AMDGPU* /opt/rocm-$ROCM/share/miopen/db/
COPY --from=rocm /opt/rocm-$ROCM/lib/rocblas/library/*$AMDGPU* /opt/rocm-$ROCM/lib/rocblas/library/

COPY --from=debian-build /opt/rocm/lib/migraphx.cpython-39-x86_64-linux-gnu.so /opt/rocm-$ROCM/lib/

RUN ln -s /opt/rocm-$ROCM /opt/rocm

