# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM wheels as rk-wheels
COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
COPY docker/rockchip/requirements-wheels-rk.txt /requirements-wheels-rk.txt
RUN sed -i "/https:\/\//d" /requirements-wheels.txt
RUN pip3 wheel --wheel-dir=/rk-wheels -c /requirements-wheels.txt -r /requirements-wheels-rk.txt

FROM wget as rk-downloads
RUN wget -qO ffmpeg https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/latest/ffmpeg
RUN wget -qO ffprobe https://github.com/MarcA711/Rockchip-FFmpeg-Builds/releases/download/latest/ffprobe

RUN wget -qO librknnrt_rk356x.so https://github.com/MarcA711/rknpu2/releases/download/v1.5.2/librknnrt_rk356x.so
RUN wget -qO librknnrt_rk3588.so https://github.com/MarcA711/rknpu2/releases/download/v1.5.2/librknnrt_rk3588.so

RUN wget -qO yolov8n-320x320-rk3562.rknn https://github.com/MarcA711/rknn-models/releases/download/v1.5.2-rk3562/yolov8n-320x320-rk3562.rknn
RUN wget -qO yolov8n-320x320-rk3566.rknn https://github.com/MarcA711/rknn-models/releases/download/v1.5.2-rk3566/yolov8n-320x320-rk3566.rknn
RUN wget -qO yolov8n-320x320-rk3568.rknn https://github.com/MarcA711/rknn-models/releases/download/v1.5.2-rk3568/yolov8n-320x320-rk3568.rknn
RUN wget -qO yolov8n-320x320-rk3588.rknn https://github.com/MarcA711/rknn-models/releases/download/v1.5.2-rk3588/yolov8n-320x320-rk3588.rknn

FROM deps AS rk-deps
ARG TARGETARCH

RUN --mount=type=bind,from=rk-wheels,source=/rk-wheels,target=/deps/rk-wheels \ 
    pip3 install -U /deps/rk-wheels/*.whl 

WORKDIR /opt/frigate/
COPY --from=rootfs / /

COPY --from=rk-downloads /rootfs/librknnrt_rk356x.so /usr/lib/
COPY --from=rk-downloads /rootfs/librknnrt_rk3588.so /usr/lib/

COPY --from=rk-downloads /rootfs/yolov8n-320x320-rk3562.rknn /models/
COPY --from=rk-downloads /rootfs/yolov8n-320x320-rk3566.rknn /models/
COPY --from=rk-downloads /rootfs/yolov8n-320x320-rk3568.rknn /models/
COPY --from=rk-downloads /rootfs/yolov8n-320x320-rk3588.rknn /models/

RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffmpeg
RUN rm -rf /usr/lib/btbn-ffmpeg/bin/ffprobe
COPY --from=rk-downloads /rootfs/ffmpeg /usr/lib/btbn-ffmpeg/bin/
COPY --from=rk-downloads /rootfs/ffprobe /usr/lib/btbn-ffmpeg/bin/
RUN chmod +x /usr/lib/btbn-ffmpeg/bin/ffmpeg
RUN chmod +x /usr/lib/btbn-ffmpeg/bin/ffprobe
