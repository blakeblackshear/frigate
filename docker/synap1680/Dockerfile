# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM deps AS synap1680-deps
ARG TARGETARCH

# Install dependencies
RUN --mount=type=bind,source=docker/synap1680/install_deps.sh,target=/deps/install_deps.sh \
    /deps/install_deps.sh

WORKDIR /opt/frigate/
COPY --from=rootfs / /
ADD https://raw.githubusercontent.com/synaptics-astra/synap-release/v1.5.0/models/dolphin/object_detection/coco/model/mobilenet224_full80/model.synap /model.synap
