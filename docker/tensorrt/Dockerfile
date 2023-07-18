# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

# Make this a separate target so it can be built/cached optionally
FROM wheels as trt-wheels
ARG DEBIAN_FRONTEND
ARG TARGETARCH

# Add TensorRT wheels to another folder
COPY docker/tensorrt/requirements.txt /requirements-tensorrt.txt
RUN mkdir -p /trt-wheels && pip3 wheel --wheel-dir=/trt-wheels -r /requirements-tensorrt.txt

# Build TensorRT-specific library
FROM nvcr.io/nvidia/tensorrt:23.03-py3 AS trt-deps

RUN --mount=type=bind,source=docker/tensorrt/detector/tensorrt_libyolo.sh,target=/tensorrt_libyolo.sh \
    /tensorrt_libyolo.sh

# Frigate w/ TensorRT Support as separate image
FROM deps AS frigate-tensorrt

#Disable S6 Global timeout
ENV S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0

ENV TRT_VER=8.5.3
ENV YOLO_MODELS="yolov7-tiny-416"

COPY --from=trt-deps /usr/local/lib/libyolo_layer.so /usr/local/lib/libyolo_layer.so
COPY --from=trt-deps /usr/local/src/tensorrt_demos /usr/local/src/tensorrt_demos
COPY docker/tensorrt/detector/rootfs/ /

RUN --mount=type=bind,from=trt-wheels,source=/trt-wheels,target=/deps/trt-wheels \
    pip3 install -U /deps/trt-wheels/*.whl && \
    ldconfig

WORKDIR /opt/frigate/
COPY --from=rootfs / /

# Dev Container w/ TRT
FROM devcontainer AS devcontainer-trt

COPY --from=trt-deps /usr/local/lib/libyolo_layer.so /usr/local/lib/libyolo_layer.so
COPY --from=trt-deps /usr/local/src/tensorrt_demos /usr/local/src/tensorrt_demos
COPY docker/tensorrt/detector/rootfs/ /
COPY --from=trt-deps /usr/local/lib/libyolo_layer.so /usr/local/lib/libyolo_layer.so
RUN --mount=type=bind,from=trt-wheels,source=/trt-wheels,target=/deps/trt-wheels \
    pip3 install -U /deps/trt-wheels/*.whl
