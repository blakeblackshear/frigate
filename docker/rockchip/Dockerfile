# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM wheels as rk-wheels
COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
COPY docker/rockchip/requirements-wheels-rk.txt /requirements-wheels-rk.txt
RUN sed -i "/https:\/\//d" /requirements-wheels.txt
RUN sed -i "/onnxruntime/d" /requirements-wheels.txt
RUN pip3 wheel --wheel-dir=/rk-wheels -c /requirements-wheels.txt -r /requirements-wheels-rk.txt
RUN rm -rf /rk-wheels/opencv_python-*

FROM deps AS rk-frigate
ARG TARGETARCH

RUN --mount=type=bind,from=rk-wheels,source=/rk-wheels,target=/deps/rk-wheels \
    pip3 install --no-deps -U /deps/rk-wheels/*.whl

WORKDIR /opt/frigate/
COPY --from=rootfs / /
COPY docker/rockchip/COCO /COCO
COPY docker/rockchip/conv2rknn.py /opt/conv2rknn.py

ADD https://github.com/MarcA711/rknn-toolkit2/releases/download/v2.3.0/librknnrt.so /usr/lib/

RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffmpeg
RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffprobe
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-7/ffmpeg /usr/lib/ffmpeg/6.0/bin/
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-7/ffprobe /usr/lib/ffmpeg/6.0/bin/
ENV PATH="/usr/lib/ffmpeg/6.0/bin/:${PATH}"
