# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM deps AS rpi-deps
ARG TARGETARCH

RUN if [[ "${TARGETARCH}" == "arm64" ]]; then rm -rf /usr/lib/btbn-ffmpeg/; fi

# Install dependencies
RUN --mount=type=bind,source=docker/rpi/install_deps.sh,target=/deps/install_deps.sh \
    /deps/install_deps.sh

WORKDIR /opt/frigate/
COPY --from=rootfs / /
