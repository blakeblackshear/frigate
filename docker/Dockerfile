FROM blakeblackshear/frigate-nginx:1.0.2 as nginx

FROM debian:11 as wheels
ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive

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
    gcc gfortran libopenblas-dev liblapack-dev

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

# Frigate Container
FROM debian:11-slim
ARG TARGETARCH

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND="noninteractive"
# http://stackoverflow.com/questions/48162574/ddg#49462622
ARG APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn
# https://github.com/NVIDIA/nvidia-docker/wiki/Installation-(Native-GPU-Support)
ENV NVIDIA_DRIVER_CAPABILITIES="compute,video,utility"

ENV FLASK_ENV=development

COPY --from=wheels /wheels /wheels

# Install ffmpeg
RUN apt-get -qq update \
    && apt-get -qq install --no-install-recommends -y \
    apt-transport-https \
    gnupg \
    wget \
    unzip tzdata libxml2 xz-utils \
    python3-pip \
    # add raspberry pi repo
    && apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 9165938D90FDDD2E \
    && echo "deb http://raspbian.raspberrypi.org/raspbian/ bullseye main contrib non-free rpi" | tee /etc/apt/sources.list.d/raspi.list \
    # add coral repo
    && apt-key adv --fetch-keys https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    && echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" > /etc/apt/sources.list.d/coral-edgetpu.list \
    && echo "libedgetpu1-max libedgetpu/accepted-eula select true" | debconf-set-selections \
    # enable non-free repo
    && sed -i -e's/ main/ main contrib non-free/g' /etc/apt/sources.list \
    && apt-get -qq update \
    && apt-get -qq install --no-install-recommends --no-install-suggests -y \
    # coral drivers
    libedgetpu1-max python3-tflite-runtime python3-pycoral \
    && pip3 install -U /wheels/*.whl \
    # btbn-ffmpeg -> amd64 / arm64
    && if [ "${TARGETARCH}" = "amd64" ] || [ "${TARGETARCH}" = "arm64" ]; then \
    mkdir -p /usr/lib/btbn-ffmpeg \
    && wget -O btbn-ffmpeg.tar.xz "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2022-07-31-12-37/ffmpeg-n5.1-2-g915ef932a3-linux$( [ "$TARGETARCH" = "amd64" ] && echo "64" || echo "arm64" )-gpl-5.1.tar.xz" \
    && tar -xf btbn-ffmpeg.tar.xz -C /usr/lib/btbn-ffmpeg --strip-components 1 \
    && rm btbn-ffmpeg.tar.xz; \
    fi \
    # ffmpeg -> arm32
    && if [ "${TARGETARCH}" = "arm" ]; then \
    apt-get -qq install --no-install-recommends --no-install-suggests -y ffmpeg; \
    fi \
    # arch specific packages
    && if [ "${TARGETARCH}" = "amd64" ]; then \
    echo 'deb http://deb.debian.org/debian testing main non-free' >> /etc/apt/sources.list.d/deb.list \
    && apt-get -qq update \
    && apt-get -qq install --no-install-recommends --no-install-suggests -y \
    mesa-va-drivers libva-drm2 intel-media-va-driver-non-free i965-va-driver libmfx1; \
    fi \
    && if [ "${TARGETARCH}" = "arm64" ]; then \
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
    libva-drm2 mesa-va-drivers; \
    fi \
    # not sure why 32bit arm requires all these
    && if [ "${TARGETARCH}" = "arm" ]; then \
    apt-get -qq install --no-install-recommends --no-install-suggests -y \
    libgtk-3-dev \
    libavcodec-dev libavformat-dev libswscale-dev libv4l-dev \
    libxvidcore-dev libx264-dev libjpeg-dev libpng-dev libtiff-dev \
    gfortran openexr libatlas-base-dev libssl-dev\
    libtbb2 libtbb-dev libdc1394-22-dev libopenexr-dev \
    libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev; \
    fi \
    && rm -rf /wheels \
    && apt-get remove gnupg apt-transport-https -y \
    && apt-get clean autoclean -y \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

ENV PATH=$PATH:/usr/lib/btbn-ffmpeg/bin

COPY --from=nginx /usr/local/nginx/ /usr/local/nginx/

# get model and labels
COPY labelmap.txt /labelmap.txt
RUN wget -q https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess_edgetpu.tflite -O /edgetpu_model.tflite
RUN wget -q https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess.tflite -O /cpu_model.tflite

WORKDIR /opt/frigate/
ADD frigate frigate/
ADD migrations migrations/

COPY web/dist web/

COPY docker/rootfs/ /

# s6-overlay
RUN S6_ARCH="${TARGETARCH}" \
    && if [ "${TARGETARCH}" = "amd64" ]; then S6_ARCH="amd64"; fi \
    && if [ "${TARGETARCH}" = "arm" ]; then S6_ARCH="armhf"; fi \
    && if [ "${TARGETARCH}" = "arm64" ]; then S6_ARCH="aarch64"; fi \
    && wget -O /tmp/s6-overlay-installer "https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.3/s6-overlay-${S6_ARCH}-installer" \
    && chmod +x /tmp/s6-overlay-installer && /tmp/s6-overlay-installer /

EXPOSE 5000
EXPOSE 1935

ENTRYPOINT ["/init"]

CMD ["python3", "-u", "-m", "frigate"]
