# syntax=docker/dockerfile:1.2

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG BASE_IMAGE

FROM ${BASE_IMAGE} as base
ARG TARGETARCH

RUN rm -rf /usr/lib/btbn-ffmpeg/

# Install dependencies
RUN --mount=type=bind,source=docker/build/rpi/install_deps.sh,target=/deps/install_deps.sh \
    /deps/install_deps.sh
