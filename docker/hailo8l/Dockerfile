# syntax=docker/dockerfile:1.6

ARG DEBIAN_FRONTEND=noninteractive

# NOTE: also update user_installation.sh
ARG HAILO_VERSION=4.19.0

# Build Python wheels
FROM wheels AS h8l-wheels

COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
COPY docker/hailo8l/requirements-wheels-h8l.txt /requirements-wheels-h8l.txt

RUN sed -i "/https:\/\//d" /requirements-wheels.txt

# Create a directory to store the built wheels
RUN mkdir /h8l-wheels

# Build the wheels
RUN pip3 wheel --wheel-dir=/h8l-wheels -c /requirements-wheels.txt -r /requirements-wheels-h8l.txt

# Build HailoRT and create wheel
FROM wheels AS build-hailort
ARG TARGETARCH
ARG HAILO_VERSION

SHELL ["/bin/bash", "-c"]

# Install necessary APT packages
RUN apt-get -qq update \
    && apt-get -qq install -y \
    apt-transport-https \
    gnupg \
    wget \
    # the key fingerprint can be obtained from https://ftp-master.debian.org/keys.html
    && wget -qO- "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xA4285295FC7B1A81600062A9605C66F00D6C9793" | \
    gpg --dearmor > /usr/share/keyrings/debian-archive-bullseye-stable.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/debian-archive-bullseye-stable.gpg] http://deb.debian.org/debian bullseye main contrib non-free" | \
    tee /etc/apt/sources.list.d/debian-bullseye-nonfree.list \
    && apt-get -qq update \
    && apt-get -qq install -y \
    python3.9 \
    python3.9-dev \
    build-essential cmake git \
    && rm -rf /var/lib/apt/lists/*

# Extract Python version and set environment variables
RUN PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2) && \
    PYTHON_VERSION_NO_DOT=$(echo $PYTHON_VERSION | sed 's/\.//') && \
    echo "PYTHON_VERSION=$PYTHON_VERSION" > /etc/environment && \
    echo "PYTHON_VERSION_NO_DOT=$PYTHON_VERSION_NO_DOT" >> /etc/environment

# Clone and build HailoRT
RUN . /etc/environment && \
    git clone https://github.com/hailo-ai/hailort.git /opt/hailort && \
    cd /opt/hailort && \
    git checkout v${HAILO_VERSION} && \
    cmake -H. -Bbuild -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config release --target libhailort && \
    cmake --build build --config release --target hailortcli && \
    cmake --build build --config release --target install

# Create a wheel file using pip3 wheel
RUN cd /opt/hailort/hailort/libhailort/bindings/python/platform && \
    python3 setup.py bdist_wheel --dist-dir /hailo-wheels

RUN mkdir -p /rootfs/usr/local/lib /rootfs/usr/local/bin && \
    cp /usr/local/lib/libhailort.so* /rootfs/usr/local/lib && \
    cp /usr/local/bin/hailortcli /rootfs/usr/local/bin

# Use deps as the base image
FROM deps AS h8l-frigate
ARG HAILO_VERSION

# Copy the wheels from the wheels stage
COPY --from=h8l-wheels /h8l-wheels /deps/h8l-wheels
COPY --from=build-hailort /hailo-wheels /deps/hailo-wheels
COPY --from=build-hailort /rootfs/ /

# Install the wheels
RUN pip3 install -U /deps/h8l-wheels/*.whl
RUN pip3 install -U /deps/hailo-wheels/*.whl

# Copy base files from the rootfs stage
COPY --from=rootfs / /

# Set workdir
WORKDIR /opt/frigate/
