# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM deps AS rpi-deps
ARG TARGETARCH

# Install dependencies
RUN --mount=type=bind,source=docker/rpi/install_deps.sh,target=/deps/install_deps.sh \
    /deps/install_deps.sh

ENV DEFAULT_FFMPEG_VERSION="rpi"
ENV INCLUDED_FFMPEG_VERSIONS="${DEFAULT_FFMPEG_VERSION}:${INCLUDED_FFMPEG_VERSIONS}"

WORKDIR /opt/frigate/
COPY --from=rootfs / /
