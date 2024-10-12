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

ADD https://github.com/MarcA711/rknn-toolkit2/releases/download/v2.0.0/librknnrt.so /usr/lib/

RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffmpeg
RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffprobe
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-5/ffmpeg /usr/lib/ffmpeg/6.0/bin/
ADD --chmod=111 https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/6.1-5/ffprobe /usr/lib/ffmpeg/6.0/bin/
ENV PATH="/usr/lib/ffmpeg/6.0/bin/:${PATH}"
