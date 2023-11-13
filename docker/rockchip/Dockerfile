# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM wheels as rk-wheels
COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
COPY docker/rockchip/requirements-wheels-rk.txt /requirements-wheels-rk.txt
RUN sed -i "/https:\/\//d" /requirements-wheels.txt
RUN pip3 wheel --wheel-dir=/rk-wheels -c /requirements-wheels.txt -r /requirements-wheels-rk.txt

FROM wget as rk-libs
RUN wget -qO librknnrt.so https://github.com/MarcA711/rknpu2/raw/master/runtime/RK3588/Linux/librknn_api/aarch64/librknnrt.so
RUN wget -qO ffmpeg https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/latest/ffmpeg
RUN wget -qO ffprobe https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/latest/ffprobe
FROM deps AS rk-deps
ARG TARGETARCH

RUN --mount=type=bind,from=rk-wheels,source=/rk-wheels,target=/deps/rk-wheels \ 
    pip3 install -U /deps/rk-wheels/*.whl 

WORKDIR /opt/frigate/
COPY --from=rootfs / /
COPY --from=rk-libs /rootfs/librknnrt.so /usr/lib/
COPY docker/rockchip/yolov8n-320x320.rknn /models/

RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffmpeg
RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffprobe
COPY --from=rk-libs /rootfs/ffmpeg /usr/lib/btbn-ffmpeg/bin/
COPY --from=rk-libs /rootfs/ffprobe /usr/lib/btbn-ffmpeg/bin/
RUN chmod +x /usr/lib/btbn-ffmpeg/bin/ffmpeg
RUN chmod +x /usr/lib/btbn-ffmpeg/bin/ffprobe
