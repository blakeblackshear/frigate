# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

# Globally set pip break-system-packages option to avoid having to specify it every time
ARG PIP_BREAK_SYSTEM_PACKAGES=1

FROM wheels AS synap1680-wheels
ARG TARGETARCH

# Install dependencies
RUN wget -qO- "https://github.com/GaryHuang-ASUS/synaptics_astra_sdk/releases/download/v1.5.0/Synaptics-SL1680-v1.5.0-rt.tar" | tar -C / -xzf -
RUN wget -P /wheels/ "https://github.com/synaptics-synap/synap-python/releases/download/v0.0.4-preview/synap_python-0.0.4-cp311-cp311-manylinux_2_35_aarch64.whl"

FROM deps AS synap1680-deps
ARG TARGETARCH
ARG PIP_BREAK_SYSTEM_PACKAGES

RUN --mount=type=bind,from=synap1680-wheels,source=/wheels,target=/deps/synap-wheels \
pip3 install --no-deps -U /deps/synap-wheels/*.whl

WORKDIR /opt/frigate/
COPY --from=rootfs / /

COPY --from=synap1680-wheels /rootfs/usr/local/lib/*.so /usr/lib

ADD https://raw.githubusercontent.com/synaptics-astra/synap-release/v1.5.0/models/dolphin/object_detection/coco/model/mobilenet224_full80/model.synap /synaptics/mobilenet.synap
