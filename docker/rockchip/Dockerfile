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

ARG ROCKCHIP_FFMPEG_RELEASE=rockchip-20260913-34752088530-1
ADD --checksum=sha256:825830538f1fa42b703cb5191b37f5b68dcea7ff6a3330285226fa48e8b8b9eb https://github.com/oDestroyeRo/ffmpeg-rockchip/releases/download/${ROCKCHIP_FFMPEG_RELEASE}/ffmpeg-6.1.6-rockchip-linux-arm64-debian12.tar.xz /tmp/ffmpeg-6.1.6.tar.xz
ADD --checksum=sha256:bd9c4d9dbde9d7083e902f59995654a85112829a84ad2e95dc8c461077ea9884 https://github.com/oDestroyeRo/ffmpeg-rockchip/releases/download/${ROCKCHIP_FFMPEG_RELEASE}/ffmpeg-7.1.5-rockchip-linux-arm64-debian12.tar.xz /tmp/ffmpeg-7.1.5.tar.xz
ADD --checksum=sha256:25a63fba1038948ad62e76be557153bfea086547ddbc1fdbf90b0a2f683010c3 https://github.com/oDestroyeRo/ffmpeg-rockchip/releases/download/${ROCKCHIP_FFMPEG_RELEASE}/ffmpeg-8.1.2-rockchip-linux-arm64-debian12.tar.xz /tmp/ffmpeg-8.1.2.tar.xz
# Python can unpack xz archives without adding extraction tools to the image.
RUN set -eux; \
    for version in 6.1.6 7.1.5 8.1.2; do \
        python3 -m tarfile -e "/tmp/ffmpeg-${version}.tar.xz" /tmp; \
        cp -a "/tmp/ffmpeg-${version}-rockchip-linux-arm64-debian12/." "/usr/lib/ffmpeg/${version%%.*}.0"; \
        rm -rf "/tmp/ffmpeg-${version}-rockchip-linux-arm64-debian12" "/tmp/ffmpeg-${version}.tar.xz"; \
    done
ENV DEFAULT_FFMPEG_VERSION="6.0"
ENV INCLUDED_FFMPEG_VERSIONS="${DEFAULT_FFMPEG_VERSION}:${INCLUDED_FFMPEG_VERSIONS}"
