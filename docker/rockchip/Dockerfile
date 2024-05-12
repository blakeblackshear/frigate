# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM wheels as rk-wheels
COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
COPY docker/rockchip/requirements-wheels-rk.txt /requirements-wheels-rk.txt
RUN sed -i "/https:\/\//d" /requirements-wheels.txt
RUN pip3 wheel --wheel-dir=/rk-wheels -c /requirements-wheels.txt -r /requirements-wheels-rk.txt

FROM deps AS rk-frigate
ARG TARGETARCH

RUN --mount=type=bind,from=rk-wheels,source=/rk-wheels,target=/deps/rk-wheels \
    pip3 install -U /deps/rk-wheels/*.whl

WORKDIR /opt/frigate/
COPY --from=rootfs / /

ADD https://github.com/MarcA711/rknpu2/releases/download/v1.5.2/librknnrt_rk356x.so /usr/lib/
ADD https://github.com/MarcA711/rknpu2/releases/download/v1.5.2/librknnrt_rk3588.so /usr/lib/

# TODO removed models, other models support may need to be added back in

RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffmpeg
RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffprobe
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-3/ffmpeg /usr/lib/btbn-ffmpeg/bin/
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-3/ffprobe /usr/lib/btbn-ffmpeg/bin/
