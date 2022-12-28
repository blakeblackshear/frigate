# syntax=docker/dockerfile:1.2

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

FROM debian:11 AS base

FROM --platform=linux/amd64 debian:11 AS base_amd64

FROM debian:11-slim AS slim-base

FROM slim-base AS wget
ARG DEBIAN_FRONTEND
RUN apt-get update \
    && apt-get install -y wget xz-utils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /rootfs

FROM base AS nginx
ARG DEBIAN_FRONTEND
ARG NGINX_VERSION=1.22.1
ARG VOD_MODULE_VERSION=1.30
ARG SECURE_TOKEN_MODULE_VERSION=1.4
ARG RTMP_MODULE_VERSION=1.2.1

RUN cp /etc/apt/sources.list /etc/apt/sources.list.d/sources-src.list \
    && sed -i 's|deb http|deb-src http|g' /etc/apt/sources.list.d/sources-src.list \
    && apt-get update

RUN apt-get -yqq build-dep nginx

RUN apt-get -yqq install --no-install-recommends ca-certificates wget \
    && update-ca-certificates -f \
    && mkdir /tmp/nginx \
    && wget https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz \
    && tar -zxf nginx-${NGINX_VERSION}.tar.gz -C /tmp/nginx --strip-components=1 \
    && rm nginx-${NGINX_VERSION}.tar.gz \
    && mkdir /tmp/nginx-vod-module \
    && wget https://github.com/kaltura/nginx-vod-module/archive/refs/tags/${VOD_MODULE_VERSION}.tar.gz \
    && tar -zxf ${VOD_MODULE_VERSION}.tar.gz -C /tmp/nginx-vod-module --strip-components=1 \
    && rm ${VOD_MODULE_VERSION}.tar.gz \
    # Patch MAX_CLIPS to allow more clips to be added than the default 128
    && sed -i 's/MAX_CLIPS (128)/MAX_CLIPS (1080)/g' /tmp/nginx-vod-module/vod/media_set.h \
    && mkdir /tmp/nginx-secure-token-module \
    && wget https://github.com/kaltura/nginx-secure-token-module/archive/refs/tags/${SECURE_TOKEN_MODULE_VERSION}.tar.gz \
    && tar -zxf ${SECURE_TOKEN_MODULE_VERSION}.tar.gz -C /tmp/nginx-secure-token-module --strip-components=1 \
    && rm ${SECURE_TOKEN_MODULE_VERSION}.tar.gz \
    && mkdir /tmp/nginx-rtmp-module \
    && wget https://github.com/arut/nginx-rtmp-module/archive/refs/tags/v${RTMP_MODULE_VERSION}.tar.gz \
    && tar -zxf v${RTMP_MODULE_VERSION}.tar.gz -C /tmp/nginx-rtmp-module --strip-components=1 \
    && rm v${RTMP_MODULE_VERSION}.tar.gz

WORKDIR /tmp/nginx

RUN ./configure --prefix=/usr/local/nginx \
    --with-file-aio \
    --with-http_sub_module \
    --with-http_ssl_module \
    --with-threads \
    --add-module=../nginx-vod-module \
    --add-module=../nginx-secure-token-module \
    --add-module=../nginx-rtmp-module \
    --with-cc-opt="-O3 -Wno-error=implicit-fallthrough"

RUN make && make install
RUN rm -rf /usr/local/nginx/html /usr/local/nginx/conf/*.default

FROM wget AS go2rtc
ARG TARGETARCH
WORKDIR /rootfs/usr/local/go2rtc/bin
RUN wget -qO go2rtc "https://github.com/AlexxIT/go2rtc/releases/download/v0.1-rc.5/go2rtc_linux_${TARGETARCH}" \
    && chmod +x go2rtc


####
#
# OpenVino Support
#
# 1. Download and convert a model from Intel's Public Open Model Zoo
# 2. Build libUSB without udev to handle NCS2 enumeration
#
####
# Download and Convert OpenVino model
FROM base_amd64 AS ov-converter
ARG DEBIAN_FRONTEND

# Install OpenVino Runtime and Dev library
COPY requirements-ov.txt /requirements-ov.txt
RUN apt-get -qq update \
    && apt-get -qq install -y wget python3 python3-distutils \
    && wget -q https://bootstrap.pypa.io/get-pip.py -O get-pip.py \
    && python3 get-pip.py "pip" \
    && pip install -r /requirements-ov.txt

# Get OpenVino Model
RUN mkdir /models \
    && cd /models && omz_downloader --name ssdlite_mobilenet_v2 \
    && cd /models && omz_converter --name ssdlite_mobilenet_v2 --precision FP16


# libUSB - No Udev
FROM wget as libusb-build
ARG TARGETARCH
ARG DEBIAN_FRONTEND

# Build libUSB without udev.  Needed for Openvino NCS2 support
WORKDIR /opt
RUN apt-get update && apt-get install -y unzip build-essential automake libtool
RUN wget -q https://github.com/libusb/libusb/archive/v1.0.25.zip -O v1.0.25.zip && \
    unzip v1.0.25.zip && cd libusb-1.0.25 && \
    ./bootstrap.sh && \
    ./configure --disable-udev --enable-shared && \
    make -j $(nproc --all)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libusb-1.0-0-dev && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /opt/libusb-1.0.25/libusb
RUN /bin/mkdir -p '/usr/local/lib' && \
    /bin/bash ../libtool  --mode=install /usr/bin/install -c libusb-1.0.la '/usr/local/lib' && \
    /bin/mkdir -p '/usr/local/include/libusb-1.0' && \
    /usr/bin/install -c -m 644 libusb.h '/usr/local/include/libusb-1.0' && \
    /bin/mkdir -p '/usr/local/lib/pkgconfig' && \
    cd  /opt/libusb-1.0.25/ && \
    /usr/bin/install -c -m 644 libusb-1.0.pc '/usr/local/lib/pkgconfig' && \
    ldconfig

FROM wget AS models

# Get model and labels
RUN wget -qO edgetpu_model.tflite https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess_edgetpu.tflite
RUN wget -qO cpu_model.tflite https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess.tflite
COPY labelmap.txt .
# Copy OpenVino model
COPY --from=ov-converter /models/public/ssdlite_mobilenet_v2/FP16 openvino-model
RUN wget -q https://github.com/openvinotoolkit/open_model_zoo/raw/master/data/dataset_classes/coco_91cl_bkgr.txt -O openvino-model/coco_91cl_bkgr.txt



FROM wget AS s6-overlay
ARG TARGETARCH
RUN --mount=type=bind,source=docker/install_s6_overlay.sh,target=/deps/install_s6_overlay.sh \
    /deps/install_s6_overlay.sh


FROM base AS wheels
ARG DEBIAN_FRONTEND
ARG TARGETARCH

# Use a separate container to build wheels to prevent build dependencies in final image
RUN apt-get -qq update \
    && apt-get -qq install -y \
    apt-transport-https \
    gnupg \
    wget \
    && apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 9165938D90FDDD2E \
    && echo "deb http://raspbian.raspberrypi.org/raspbian/ bullseye main contrib non-free rpi" | tee /etc/apt/sources.list.d/raspi.list \
    && apt-get -qq update \
    && apt-get -qq install -y \
    python3 \
    python3-dev \
    wget \
    # opencv dependencies
    build-essential cmake git pkg-config libgtk-3-dev \
    libavcodec-dev libavformat-dev libswscale-dev libv4l-dev \
    libxvidcore-dev libx264-dev libjpeg-dev libpng-dev libtiff-dev \
    gfortran openexr libatlas-base-dev libssl-dev\
    libtbb2 libtbb-dev libdc1394-22-dev libopenexr-dev \
    libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev \
    # scipy dependencies
    gcc gfortran libopenblas-dev liblapack-dev && \
    rm -rf /var/lib/apt/lists/*

RUN wget -q https://bootstrap.pypa.io/get-pip.py -O get-pip.py \
    && python3 get-pip.py "pip"

RUN if [ "${TARGETARCH}" = "arm" ]; \
    then echo "[global]" > /etc/pip.conf \
    && echo "extra-index-url=https://www.piwheels.org/simple" >> /etc/pip.conf; \
    fi

COPY requirements.txt /requirements.txt
RUN pip3 install -r requirements.txt

COPY requirements-wheels.txt /requirements-wheels.txt
RUN pip3 wheel --wheel-dir=/wheels -r requirements-wheels.txt

# Add TensorRT wheels to another folder
COPY requirements-tensorrt.txt /requirements-tensorrt.txt
RUN mkdir -p /trt-wheels && pip3 wheel --wheel-dir=/trt-wheels -r requirements-tensorrt.txt


# Collect deps in a single layer
FROM scratch AS deps-rootfs
COPY --from=nginx /usr/local/nginx/ /usr/local/nginx/
COPY --from=go2rtc /rootfs/ /
COPY --from=libusb-build /usr/local/lib /usr/local/lib
COPY --from=s6-overlay /rootfs/ /
COPY --from=models /rootfs/ /
COPY docker/rootfs/ /


# Frigate deps (ffmpeg, python, nginx, go2rtc, s6-overlay, etc)
FROM slim-base AS deps
ARG TARGETARCH

ARG DEBIAN_FRONTEND
# http://stackoverflow.com/questions/48162574/ddg#49462622
ARG APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn

# https://github.com/NVIDIA/nvidia-docker/wiki/Installation-(Native-GPU-Support)
ENV NVIDIA_DRIVER_CAPABILITIES="compute,video,utility"

ENV PATH="/usr/lib/btbn-ffmpeg/bin:/usr/local/go2rtc/bin:/usr/local/nginx/sbin:${PATH}"

# Install dependencies
RUN --mount=type=bind,source=docker/install_deps.sh,target=/deps/install_deps.sh \
    /deps/install_deps.sh

RUN --mount=type=bind,from=wheels,source=/wheels,target=/deps/wheels \
    pip3 install -U /deps/wheels/*.whl

COPY --from=deps-rootfs / /

RUN ldconfig

EXPOSE 5000
EXPOSE 1935
EXPOSE 8554
EXPOSE 8555

# Fails if cont-init.d fails
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2
# Wait indefinitely for cont-init.d to finish before starting services
ENV S6_CMD_WAIT_FOR_SERVICES=1
ENV S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0
# Give services (including Frigate) 30 seconds to stop before killing them
# But this is not working currently because of:
# https://github.com/just-containers/s6-overlay/issues/503
ENV S6_SERVICES_GRACETIME=30000
# Configure logging to prepend timestamps, log to stdout, keep 0 archives and rotate on 10MB
ENV S6_LOGGING_SCRIPT="T 1 n0 s10000000 T"
# TODO: remove after a new version of s6-overlay is released. See:
# https://github.com/just-containers/s6-overlay/issues/460#issuecomment-1327127006
ENV S6_SERVICES_READYTIME=50

ENTRYPOINT ["/init"]
CMD []

# Frigate deps with Node.js and NPM for devcontainer
FROM deps AS devcontainer

# Do not start the actual Frigate service on devcontainer as it will be started by VSCode
# But start a fake service for simulating the logs
COPY docker/fake_frigate_run /etc/services.d/frigate/run

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

RUN --mount=type=bind,source=./requirements-dev.txt,target=/workspace/frigate/requirements-dev.txt \
    pip3 install -r requirements-dev.txt

CMD ["sleep", "infinity"]


# Frigate web build
# force this to run on amd64 because QEMU is painfully slow
FROM --platform=linux/amd64 node:16 AS web-build

WORKDIR /work
COPY web/package.json web/package-lock.json ./
RUN npm install

COPY web/ ./
RUN npm run build \
    && mv dist/BASE_PATH/monacoeditorwork/* dist/assets/ \
    && rm -rf dist/BASE_PATH

# Collect final files in a single layer
FROM scratch AS rootfs

WORKDIR /opt/frigate/
COPY frigate frigate/
COPY migrations migrations/
COPY --from=web-build /work/dist/ web/

# Frigate final container
FROM deps AS frigate

WORKDIR /opt/frigate/
COPY --from=rootfs / /

# Frigate w/ TensorRT Support as separate image
FROM frigate AS frigate-tensorrt
RUN --mount=type=bind,from=wheels,source=/trt-wheels,target=/deps/trt-wheels \
    pip3 install -U /deps/trt-wheels/*.whl
