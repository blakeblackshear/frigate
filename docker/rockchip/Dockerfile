# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

ARG SLIM_BASE=debian:11-slim
FROM ${SLIM_BASE} AS slim-base

# Add wheels for RKNN-Toolkit-Lite2
FROM wheels AS wheels-rk
COPY docker/rockchip/requirements-wheels-rk.txt /requirements-wheels-rk.txt
RUN pip3 wheel --wheel-dir=/wheels -r /requirements-wheels-rk.txt

FROM wget as rk-libs
RUN wget -qO librknnrt.so https://github.com/MarcA711/rknpu2/raw/master/runtime/RK3588/Linux/librknn_api/aarch64/librknnrt.so

# Collect deps in a single layer
FROM deps-rootfs AS deps-rootfs-rk
COPY docker/rockchip/yolov8n-320x320.rknn /models/
# ToDo: Download librknnrt.so using wget; depends on RKNN-Toolkit-Lite2 wheel
COPY --from=rk-libs /rootfs/librknnrt.so /usr/lib/

# Frigate deps (ffmpeg, python, nginx, go2rtc, s6-overlay, etc)
FROM slim-base AS deps
ARG TARGETARCH

ARG DEBIAN_FRONTEND

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

# Frigate final container
FROM deps AS frigate

WORKDIR /opt/frigate/
COPY --from=rootfs / /
COPY docker/rockchip/rknn.py /opt/frigate/frigate/detectors/plugins/
