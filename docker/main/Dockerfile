# syntax=docker/dockerfile:1.6

ARG BASE_IMAGE=debian:testing
ARG SLIM_BASE=debian:testing-slim

FROM ${BASE_IMAGE} AS base

FROM --platform=${BUILDPLATFORM} ${BASE_IMAGE} AS base_host

FROM ${SLIM_BASE} AS slim-base

FROM slim-base AS wget
RUN set -eux; \
    DEBIAN_FRONTEND=noninteractive; \
    export DEBIAN_FRONTEND; \
    apt -y update; \
    apt -y install wget xz-utils; \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*
WORKDIR /rootfs

FROM base AS nginx
ARG DEBIAN_FRONTEND
ENV CCACHE_DIR /root/.ccache
ENV CCACHE_MAXSIZE 2G

# bind /var/cache/apt to tmpfs to speed up nginx build
RUN --mount=type=tmpfs,target=/tmp --mount=type=tmpfs,target=/var/cache/apt \
    --mount=type=bind,source=docker/main/build_nginx.sh,target=/deps/build_nginx.sh \
    --mount=type=cache,target=/root/.ccache \
    set -eux; \
    /deps/build_nginx.sh

FROM scratch AS go2rtc
ARG TARGETARCH
WORKDIR /rootfs/usr/local/go2rtc/bin
ADD --link --chmod=755 "https://github.com/AlexxIT/go2rtc/releases/download/v1.9.2/go2rtc_linux_${TARGETARCH}" go2rtc

FROM wget AS tempio
ARG TARGETARCH
RUN --mount=type=bind,source=docker/main/install_tempio.sh,target=/deps/install_tempio.sh \
    set -eux; \
    /deps/install_tempio.sh

####
#
# OpenVino Support
#
# 1. Download and convert a model from Intel's Public Open Model Zoo
#
####
# Download and Convert OpenVino model
FROM base_host AS ov-converter

# Install OpenVino Runtime and Dev library
COPY docker/main/requirements-ov.txt /requirements-ov.txt
RUN set -eux; \
    DEBIAN_FRONTEND=noninteractive; \
    export DEBIAN_FRONTEND; \
    apt -qq update; \
    apt -qq -y install wget python3 python3-dev python3-setuptools python3-pip gcc pkg-config libhdf5-dev; \
    pip install --break-system-packages -r /requirements-ov.txt; \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/* ~/.cache/pip

# Get OpenVino Model
RUN --mount=type=bind,source=docker/main/build_ov_model.py,target=/build_ov_model.py \
    set -eux; \
    mkdir -p /models; \
    cd /models; \
    weights_tarball=ssdlite_mobilenet_v2_coco_2018_05_09.tar.gz; \
    wget http://download.tensorflow.org/models/object_detection/$weights_tarball; \
    tar xzf $weights_tarball; \
    python3 /build_ov_model.py; \
    rm -f $weights_tarball

####
#
# Coral Compatibility
#
# Builds libusb without udev. Needed for synology and other devices with USB coral
####
# libUSB - No Udev
FROM wget as libusb-build
ARG TARGETARCH
ARG DEBIAN_FRONTEND
ENV CCACHE_DIR /root/.ccache
ENV CCACHE_MAXSIZE 2G

# Build libUSB without udev.  Needed for Openvino NCS2 support
WORKDIR /opt
RUN --mount=type=cache,target=/root/.ccache \
    set -eux; \
    DEBIAN_FRONTEND=noninteractive; \
    export DEBIAN_FRONTEND; \
    apt -y update; \
    apt -y install unzip build-essential automake libtool ccache pkg-config; \
    apt -y install --no-install-recommends libusb-1.0-0-dev; \
    libusb_version=1.0.27; \
    wget -q https://github.com/libusb/libusb/archive/v${libusb_version}.zip -O v${libusb_version}.zip; \
    unzip v${libusb_version}.zip; \
    cd libusb-${libusb_version}; \
    ./bootstrap.sh; \
    ./configure CC='ccache gcc' CCX='ccache g++' --disable-udev --enable-shared; \
    make -j $(nproc --all); \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*
WORKDIR /opt/libusb-1.0.27/libusb
RUN set -eux; \
    /bin/mkdir -p '/usr/local/lib'; \
    /bin/bash ../libtool  --mode=install /usr/bin/install -c libusb-1.0.la '/usr/local/lib'; \
    /bin/mkdir -p '/usr/local/include/libusb-1.0'; \
    /usr/bin/install -c -m 644 libusb.h '/usr/local/include/libusb-1.0'; \
    /bin/mkdir -p '/usr/local/lib/pkgconfig'; \
    cd /opt/libusb-1.0.27/; \
    /usr/bin/install -c -m 644 libusb-1.0.pc '/usr/local/lib/pkgconfig'; \
    ldconfig

FROM wget AS models

# Get model and labels
RUN set -eux; \
    wget -qO edgetpu_model.tflite https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess_edgetpu.tflite; \
    wget -qO cpu_model.tflite https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess.tflite
COPY labelmap.txt .
# Copy OpenVino model
COPY --from=ov-converter /models/ssdlite_mobilenet_v2.xml openvino-model/
COPY --from=ov-converter /models/ssdlite_mobilenet_v2.bin openvino-model/
RUN set -eux; \
    wget -q https://github.com/openvinotoolkit/open_model_zoo/raw/master/data/dataset_classes/coco_91cl_bkgr.txt -O openvino-model/coco_91cl_bkgr.txt; \
    sed -i 's/truck/car/g' openvino-model/coco_91cl_bkgr.txt; \
    wget -qO - https://www.kaggle.com/api/v1/models/google/yamnet/tfLite/classification-tflite/1/download | \
        tar xzf -; \
    mv 1.tflite cpu_audio_model.tflite # Get Audio Model and labels
COPY audio-labelmap.txt .


FROM wget AS s6-overlay
ARG TARGETARCH
RUN --mount=type=bind,source=docker/main/install_s6_overlay.sh,target=/deps/install_s6_overlay.sh \
    set -eux; \
    /deps/install_s6_overlay.sh


FROM base AS wheels
ARG TARGETARCH

# Use a separate container to build wheels to prevent build dependencies in final image
RUN set -eux; \
    DEBIAN_FRONTEND=noninteractive; \
    export DEBIAN_FRONTEND; \
    apt -qq -y update; \
    apt -qq -y install apt-transport-https gnupg wget ca-certificates; \
    (echo "deb https://cdn-aws.deb.debian.org/debian testing main contrib non-free non-free-firmware"; \
     echo "deb https://cdn-aws.deb.debian.org/debian stable main contrib non-free non-free-firmware"; \
     echo "deb https://cdn-aws.deb.debian.org/debian stable-updates main contrib non-free non-free-firmware"; \
     echo "deb https://cdn-aws.deb.debian.org/debian-security/ stable-security main contrib non-free non-free-firmware") | \
        tee /etc/apt/sources.list.d/debian-testing-nonfree.list; \

    apt -y -qq update; \
    apt -y -qq install python3 python3-dev python3-pip python3-setuptools \
    # opencv dependencies
        build-essential cmake git pkg-config libgtk-3-dev \
        libavcodec-dev libavformat-dev libswscale-dev libv4l-dev \
        libxvidcore-dev libx264-dev libjpeg-dev libpng-dev libtiff-dev \
        gfortran openexr libatlas-base-dev libssl-dev\
        libtbbmalloc2 libtbb-dev libdc1394-dev libopenexr-dev \
        libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev \
    # sqlite3 dependencies
        tclsh \
    # scipy dependencies
        gcc gfortran libopenblas-dev liblapack-dev; \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

COPY docker/main/requirements.txt /requirements.txt
RUN set -eux; \
    mkdir -p /root/wheel-build; \
    cd /root/wheel-build; \
    pip3 download nvidia-pyindex==1.0.9; \
    tar xzf nvidia-pyindex-1.0.9.tar.gz; \
    cd nvidia-pyindex-1.0.9; \
    pip3 wheel .; \
    pip3 install --break-system-packages nvidia_pyindex*whl; \
    mkdir -p /wheels; \
    mv *.whl /wheels; \
    cd; \
    pip3 install --break-system-packages -r /requirements.txt; \
    rm -rf /root/.cache/pip /root/wheel-build

# Build pysqlite3 from source to support ChromaDB
COPY docker/main/build_pysqlite3.sh /build_pysqlite3.sh
RUN set -eux; \
    /build_pysqlite3.sh

COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
RUN set -eux; \
    pip3 wheel --wheel-dir=/wheels -r /requirements-wheels.txt

# Collect deps in a single layer
FROM scratch AS deps-rootfs
COPY --from=nginx /usr/local/nginx/ /usr/local/nginx/
COPY --from=go2rtc /rootfs/ /
COPY --from=libusb-build /usr/local/lib /usr/local/lib
COPY --from=tempio /rootfs/ /
COPY --from=s6-overlay /rootfs/ /
COPY --from=models /rootfs/ /
COPY docker/main/rootfs/ /


# Frigate deps (ffmpeg, python, nginx, go2rtc, s6-overlay, etc)
FROM slim-base AS deps
ARG TARGETARCH

# http://stackoverflow.com/questions/48162574/ddg#49462622
ARG APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn

# https://github.com/NVIDIA/nvidia-docker/wiki/Installation-(Native-GPU-Support)
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES="compute,video,utility"

# Turn off Chroma Telemetry: https://docs.trychroma.com/telemetry#opting-out
ENV ANONYMIZED_TELEMETRY=False
# Allow resetting the chroma database
ENV ALLOW_RESET=True
# Disable tokenizer parallelism warning
ENV TOKENIZERS_PARALLELISM=true

ENV PATH="/usr/local/go2rtc/bin:/usr/local/tempio/bin:/usr/local/nginx/sbin:${PATH}"

# Install dependencies
RUN --mount=type=bind,source=docker/main/install_deps.sh,target=/deps/install_deps.sh \
    set -eux; \
    DEBIAN_FRONTEND=noninteractive; \
    export DEBIAN_FRONTEND; \
    keyring_pkg=deb-multimedia-keyring_2016.8.1_all.deb; \
    apt -y update; \
    apt -y install wget; \
    wget -O /root/$keyring_pkg https://www.deb-multimedia.org/pool/main/d/deb-multimedia-keyring/$keyring_pkg; \
    dpkg -i /root/$keyring_pkg; \
    rm -f /root/$keyring_pkg; \
    echo 'deb https://debian-mirrors.sdinet.de/deb-multimedia testing main non-free' > /etc/apt/sources.list.d/deb-multimedia.list; \
    apt -y update; \
    apt -y install ffmpeg; \
    /deps/install_deps.sh

RUN --mount=type=bind,from=wheels,source=/wheels,target=/deps/wheels \
    set -eux; \
    DEBIAN_FRONTEND=noninteractive; \
    export DEBIAN_FRONTEND; \
    apt -y update; \
    apt -y install python3-pip; \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    pip3 install --break-system-packages -U /deps/wheels/*.whl

COPY --from=deps-rootfs / /

RUN set -eux; \
    ldconfig

EXPOSE 5000
EXPOSE 8554
EXPOSE 8555/tcp 8555/udp

# Configure logging to prepend timestamps, log to stdout, keep 0 archives and rotate on 10MB
ENV S6_LOGGING_SCRIPT="T 1 n0 s10000000 T"
# Do not fail on long-running download scripts
ENV S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0

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
RUN set -eux; \
    mkdir -p /opt/frigate; \
    ln -sf /workspace/frigate/frigate /opt/frigate/frigate

# Install Node 20
RUN set -eux; \
    DEBIAN_FRONTEND=noninteractive; \
    export DEBIAN_FRONTEND; \
    apt -y update; \
    apt -y install nodejs npm make; \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    npm install -g npm@10

WORKDIR /workspace/frigate

RUN --mount=type=bind,source=./docker/main/requirements-dev.txt,target=/workspace/frigate/requirements-dev.txt \
    set -eux; \
    pip3 install -r requirements-dev.txt

HEALTHCHECK NONE

CMD ["sleep", "infinity"]


# Frigate web build
# This should be architecture agnostic, so speed up the build on multiarch by not using QEMU.
FROM --platform=$BUILDPLATFORM node:20 AS web-build

WORKDIR /work
COPY web/package.json web/package-lock.json ./
RUN set -eux; \
    npm install

COPY web/ ./
RUN set -eux; \
    npm run build; \
    mv dist/BASE_PATH/monacoeditorwork/* dist/assets/; \
    rm -rf dist/BASE_PATH

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
