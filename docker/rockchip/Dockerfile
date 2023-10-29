# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

ARG SLIM_BASE=debian:11-slim
FROM ${SLIM_BASE} AS slim-base

# Add wheels for RKNN-Toolkit-Lite2
FROM wheels AS wheels-rk
COPY docker/rockchip/requirements-wheels-rk.txt /requirements-wheels-rk.txt
RUN pip3 wheel --wheel-dir=/wheels -r /requirements-wheels-rk.txt
# ToDo: download RKNN-Toolkit-Lite2 wheel using requirements-wheels-rk.txt
COPY docker/rockchip/rknn_toolkit_lite2-1.5.2-cp39-cp39-linux_aarch64.whl /wheels/

# Collect deps in a single layer
FROM deps-rootfs AS deps-rootfs-rk
COPY docker/rockchip/yolov8n-320x320.rknn /models/
# ToDo: Download librknnrt.so using wget; depends on RKNN-Toolkit-Lite2 wheel
COPY docker/rockchip/librknnrt.so /usr/lib/

# Frigate deps (ffmpeg, python, nginx, go2rtc, s6-overlay, etc)
FROM slim-base AS deps
ARG TARGETARCH

ARG DEBIAN_FRONTEND
# http://stackoverflow.com/questions/48162574/ddg#49462622
ARG APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn

# https://github.com/NVIDIA/nvidia-docker/wiki/Installation-(Native-GPU-Support)
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES="compute,video,utility"

ENV PATH="/usr/lib/btbn-ffmpeg/bin:/usr/local/go2rtc/bin:/usr/local/nginx/sbin:${PATH}"

# Install dependencies
RUN --mount=type=bind,source=docker/main/install_deps.sh,target=/deps/install_deps.sh \
    /deps/install_deps.sh

RUN --mount=type=bind,from=wheels-rk,source=/wheels,target=/deps/wheels \
    python3 -m pip install --upgrade pip && \
    pip3 install -U /deps/wheels/*.whl

COPY --from=deps-rootfs-rk / /

RUN ldconfig

EXPOSE 5000
EXPOSE 1935
EXPOSE 8554
EXPOSE 8555/tcp 8555/udp

# Configure logging to prepend timestamps, log to stdout, keep 0 archives and rotate on 10MB
ENV S6_LOGGING_SCRIPT="T 1 n0 s10000000 T"

ENTRYPOINT ["/init"]
CMD []

HEALTHCHECK --start-period=120s --start-interval=5s --interval=15s --timeout=5s --retries=3 \
    CMD curl --fail --silent --show-error http://127.0.0.1:5000/api/version || exit 1

# Frigate deps with Node.js and NPM for devcontainer
FROM deps AS devcontainer

# Do not start the actual Frigate service on devcontainer as it will be started by VSCode
# But start a fake service for simulating the logs
COPY docker/main/fake_frigate_run /etc/s6-overlay/s6-rc.d/frigate/run

# Create symbolic link to the frigate source code, as go2rtc's create_config.sh uses it
RUN mkdir -p /opt/frigate \
    && ln -svf /workspace/frigate/frigate /opt/frigate/frigate

# Install Node 16
RUN apt-get update \
    && apt-get install wget -y \
    && wget -qO- https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@9

WORKDIR /workspace/frigate

RUN apt-get update \
    && apt-get install make -y \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=bind,source=./docker/main/requirements-dev.txt,target=/workspace/frigate/requirements-dev.txt \
    pip3 install -r requirements-dev.txt

CMD ["sleep", "infinity"]

# Frigate final container
FROM deps AS frigate

WORKDIR /opt/frigate/
COPY --from=rootfs / /
COPY docker/rockchip/rknn.py /opt/frigate/frigate/detectors/plugins/
