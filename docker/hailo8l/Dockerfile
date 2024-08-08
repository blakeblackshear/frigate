# syntax=docker/dockerfile:1.6

ARG DEBIAN_FRONTEND=noninteractive

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
    git checkout v4.17.0 && \
    cmake -H. -Bbuild -DCMAKE_BUILD_TYPE=Release -DHAILO_BUILD_PYBIND=1 -DPYBIND11_PYTHON_VERSION=${PYTHON_VERSION} && \
    cmake --build build --config release --target libhailort && \
    cmake --build build --config release --target _pyhailort && \
    cp build/hailort/libhailort/bindings/python/src/_pyhailort.cpython-${PYTHON_VERSION_NO_DOT}-$(if [ $TARGETARCH == "amd64" ]; then echo 'x86_64'; else echo 'aarch64'; fi )-linux-gnu.so hailort/libhailort/bindings/python/platform/hailo_platform/pyhailort/ && \
    cp build/hailort/libhailort/src/libhailort.so hailort/libhailort/bindings/python/platform/hailo_platform/pyhailort/

RUN ls -ahl /opt/hailort/build/hailort/libhailort/src/
RUN ls -ahl /opt/hailort/hailort/libhailort/bindings/python/platform/hailo_platform/pyhailort/

# Remove the existing setup.py if it exists in the target directory
RUN rm -f /opt/hailort/hailort/libhailort/bindings/python/platform/setup.py

# Copy generate_wheel_conf.py and setup.py
COPY docker/hailo8l/pyhailort_build_scripts/generate_wheel_conf.py /opt/hailort/hailort/libhailort/bindings/python/platform/generate_wheel_conf.py
COPY docker/hailo8l/pyhailort_build_scripts/setup.py /opt/hailort/hailort/libhailort/bindings/python/platform/setup.py

# Run the generate_wheel_conf.py script
RUN python3 /opt/hailort/hailort/libhailort/bindings/python/platform/generate_wheel_conf.py

# Create a wheel file using pip3 wheel
RUN cd /opt/hailort/hailort/libhailort/bindings/python/platform && \
    python3 setup.py bdist_wheel --dist-dir /hailo-wheels

# Use deps as the base image
FROM deps AS h8l-frigate

# Copy the wheels from the wheels stage
COPY --from=h8l-wheels /h8l-wheels /deps/h8l-wheels
COPY --from=build-hailort /hailo-wheels /deps/hailo-wheels
COPY --from=build-hailort /etc/environment /etc/environment
RUN CC=$(python3 -c "import sysconfig; import shlex; cc = sysconfig.get_config_var('CC'); cc_cmd = shlex.split(cc)[0]; print(cc_cmd[:-4] if cc_cmd.endswith('-gcc') else cc_cmd)") && \
    echo "CC=$CC" >> /etc/environment

# Install the wheels
RUN pip3 install -U /deps/h8l-wheels/*.whl
RUN pip3 install -U /deps/hailo-wheels/*.whl

RUN . /etc/environment && \
    mv /usr/local/lib/python${PYTHON_VERSION}/dist-packages/hailo_platform/pyhailort/libhailort.so /usr/lib/${CC} && \
    cd /usr/lib/${CC}/ && \
    ln -s libhailort.so libhailort.so.4.17.0

# Copy base files from the rootfs stage
COPY --from=rootfs / /

# Set environment variables for Hailo SDK
ENV PATH="/opt/hailort/bin:${PATH}"
ENV LD_LIBRARY_PATH="/usr/lib/$(if [ $TARGETARCH == "amd64" ]; then echo 'x86_64'; else echo 'aarch64'; fi )-linux-gnu:${LD_LIBRARY_PATH}"

# Set workdir
WORKDIR /opt/frigate/
