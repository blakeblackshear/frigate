# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

# Globally set pip break-system-packages option to avoid having to specify it every time
ARG PIP_BREAK_SYSTEM_PACKAGES=1

FROM wheels as rk-wheels
COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
COPY docker/rockchip/requirements-wheels-rk.txt /requirements-wheels-rk.txt
RUN sed -i "/https:\/\//d" /requirements-wheels.txt
RUN sed -i "/onnxruntime/d" /requirements-wheels.txt
RUN sed -i '/\[.*\]/d' /requirements-wheels.txt \
    && pip3 wheel --wheel-dir=/rk-wheels -c /requirements-wheels.txt -r /requirements-wheels-rk.txt
RUN rm -rf /rk-wheels/opencv_python-*
RUN rm -rf /rk-wheels/torch-*

FROM deps AS rk-frigate
ARG TARGETARCH
ARG PIP_BREAK_SYSTEM_PACKAGES

RUN --mount=type=bind,from=rk-wheels,source=/rk-wheels,target=/deps/rk-wheels \
    pip3 install --no-deps -U /deps/rk-wheels/*.whl

WORKDIR /opt/frigate/
COPY --from=rootfs / /
COPY docker/rockchip/COCO /COCO
COPY docker/rockchip/conv2rknn.py /opt/conv2rknn.py

ADD https://github.com/MarcA711/rknn-toolkit2/releases/download/v2.3.2/librknnrt.so /usr/lib/

ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-11/ffmpeg /usr/lib/ffmpeg/6.0/bin/
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-11/ffprobe /usr/lib/ffmpeg/6.0/bin/
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/7.1-1/ffmpeg /usr/lib/ffmpeg/7.0/bin/
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/7.1-1/ffprobe /usr/lib/ffmpeg/7.0/bin/
ENV DEFAULT_FFMPEG_VERSION="6.0"
ENV INCLUDED_FFMPEG_VERSIONS="${DEFAULT_FFMPEG_VERSION}:${INCLUDED_FFMPEG_VERSIONS}"
