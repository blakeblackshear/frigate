# syntax=docker/dockerfile:1.6

ARG DEBIAN_FRONTEND=noninteractive

# Build Python wheels
FROM wheels AS h8l-wheels

RUN python3 -m pip config set global.break-system-packages true
COPY docker/main/requirements-wheels.txt /requirements-wheels.txt
COPY docker/hailo8l/requirements-wheels-h8l.txt /requirements-wheels-h8l.txt

RUN sed -i "/https:\/\//d" /requirements-wheels.txt

# Create a directory to store the built wheels
RUN mkdir /h8l-wheels

# Build the wheels
RUN pip3 wheel --wheel-dir=/h8l-wheels -c /requirements-wheels.txt -r /requirements-wheels-h8l.txt

FROM wget AS hailort
ARG TARGETARCH
RUN --mount=type=bind,source=docker/hailo8l/install_hailort.sh,target=/deps/install_hailort.sh \
    /deps/install_hailort.sh

# Use deps as the base image
FROM deps AS h8l-frigate

# Copy the wheels from the wheels stage
COPY --from=h8l-wheels /h8l-wheels /deps/h8l-wheels
COPY --from=hailort /hailo-wheels /deps/hailo-wheels
COPY --from=hailort /rootfs/ /

# Install the wheels
RUN python3 -m pip config set global.break-system-packages true
RUN pip3 install -U /deps/h8l-wheels/*.whl
RUN pip3 install -U /deps/hailo-wheels/*.whl

# Copy base files from the rootfs stage
COPY --from=rootfs / /

# Set workdir
WORKDIR /opt/frigate/
