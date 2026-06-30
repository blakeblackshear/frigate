# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

# Globally set pip break-system-packages option to avoid having to specify it every time
ARG PIP_BREAK_SYSTEM_PACKAGES=1

FROM wheels AS qualcomm-wheels
ARG TARGETARCH

# No extra wheels needed — ai-edge-litert is already in the base image
# and the QNN delegate library (libQnnTFLiteDelegate.so) is provided
# by the host via CDI bind mounts at runtime.

FROM deps AS qualcomm-deps
ARG TARGETARCH
ARG PIP_BREAK_SYSTEM_PACKAGES

WORKDIR /opt/frigate/
COPY --from=rootfs / /
