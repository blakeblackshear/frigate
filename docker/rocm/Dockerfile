# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive
ARG ROCM
ARG HSA_OVERRIDE_GFX_VERSION
ARG HSA_OVERRIDE

#######################################################################
FROM wget AS rocm

ARG ROCM

# Install ROCm using repository
RUN apt update && apt install -qq -y wget gpg
RUN mkdir -p --mode=0755 /etc/apt/keyrings && \
    wget https://repo.radeon.com/rocm/rocm.gpg.key -O - | gpg --dearmor | tee /etc/apt/keyrings/rocm.gpg > /dev/null
RUN echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/rocm.gpg] https://repo.radeon.com/rocm/apt/$(echo "$ROCM" | sed -E 's/^([0-9]+\.[0-9]+)\.0$/\1/') jammy main" > /etc/apt/sources.list.d/rocm-$ROCM.list
RUN printf "Package: *\nPin: release o=repo.radeon.com\nPin-Priority: 600" > /etc/apt/preferences.d/rocm-pin-600

# Install ROCm libraries
RUN apt update && \
    apt install -qq -y --no-install-recommends hipfft rocm-libs rocprofiler roctracer hip-dev

# Install migraphx built with gfx900 included as a target
WORKDIR /tmp
RUN wget https://github.com/garymathews/AMDMIGraphX/releases/download/v7.2.0/migraphx-v7.2.0.tar.gz && \
    tar -xvzf migraphx-*.tar.gz -C /opt/rocm-$ROCM

# Copy rocBLAS libraries for gfx900 from ROCm 6.3.4 (last version with gfx900 support)
WORKDIR /tmp
RUN apt install -qq -y --no-install-recommends rsync && \
    wget https://repo.radeon.com/rocm/apt/6.3.4/pool/main/r/rocblas/rocblas_4.3.0.60304-76~22.04_amd64.deb && \
    mkdir rocblas && \
    dpkg-deb -x rocblas_*.deb rocblas && \
    rsync -av \
        --include='*gfx900*' \
        --exclude='*' \
        rocblas/opt/rocm-*/lib/rocblas/library/ \
        /opt/rocm-$ROCM/lib/rocblas/library/

# Copy ROCm libraries
RUN mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/lib
RUN cd /opt/rocm-$ROCM/lib && cp -dpr \
    libMIOpen*.so* \
    libamd*.so* \
    libhip*.so* \
    libhsa*.so* \
    librocblas*.so* \
    librocfft*.so* \
    librocm*.so* \
    librocprofiler*.so* \
    librocsolver*.so* \
    libroctracer*.so* \
    libroctx*.so* \
    libmigraphx*.so* \
    # NOTE: Include migraphx directory (only ROCm 6.2+)
    migraphx \
    # NOTE: Include rocRoller library (only ROCm 7.0+)
    librocroller*.so* \
    # NOTE: Include libdnnl for migraphx CPU device type support
    libdnnl*.so* \
    /opt/rocm-dist/opt/rocm-$ROCM/lib/

# Copy ROCm HIP include (only ROCm 7.2+)
RUN mkdir -p /opt/rocm-dist/opt/rocm-$ROCM/include
RUN cd /opt/rocm-$ROCM/include && cp -dpr \
    hip \
    /opt/rocm-dist/opt/rocm-$ROCM/include

# Create symlink to /opt/rocm
RUN cd /opt/rocm-dist/opt && \
    ln -s rocm-$ROCM rocm

RUN mkdir -p /opt/rocm-dist/etc/ld.so.conf.d/
RUN printf "/opt/rocm/lib\n/opt/rocm/lib/migraphx/lib" | tee /opt/rocm-dist/etc/ld.so.conf.d/rocm.conf
RUN printf "/usr/lib/llvm-14/lib" | tee /opt/rocm-dist/etc/ld.so.conf.d/llvm.conf

# Build migraphx python bindings for our python version
# NOTE: AMDMIGraphX repo does not contain a tag for all ROCm versions, hence the fallback to lower patch versions
WORKDIR /tmp/migraphx_py
RUN apt install -qq -y --no-install-recommends g++ python3-dev python3-pybind11 cmake make
COPY docker/rocm/CMakeLists.txt .
RUN for i in 0 1 2; do \
    VERSION=$(echo $ROCM | awk -F. -v d=$i '{OFS="."; $3-=d; print}') && \
    wget https://raw.githubusercontent.com/ROCm/AMDMIGraphX/refs/tags/rocm-$VERSION/src/py/migraphx_py.cpp && break; \
    done
RUN cmake . -DCMAKE_INSTALL_PREFIX=/opt/rocm-dist/opt/rocm-$ROCM && \
    make install

#######################################################################
FROM deps AS deps-prelim

COPY docker/rocm/debian-backports.sources /etc/apt/sources.list.d/debian-backports.sources
RUN apt update && \
    # Install backported MESA VA and Vulkan drivers for video decoding acceleration
    apt install -qq -y -t bookworm-backports mesa-va-drivers mesa-vulkan-drivers && \
    # Install C++ standard library headers for HIPRTC kernel compilation fallback
    apt install -qq -y libstdc++-12-dev libnuma1 && \
    # Install libomp for migraphx CPU device type support
    apt install -qq -y libomp-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/frigate
COPY --from=rootfs / /

# Install onnxruntime built with ROCm
COPY docker/rocm/requirements-wheels-rocm.txt /requirements.txt
RUN pip3 uninstall --break-system-packages -y onnxruntime && \
    pip3 install --break-system-packages -r /requirements.txt

#######################################################################
FROM scratch AS rocm-dist

ARG ROCM

# Copy MIOpen database files
COPY --from=rocm /opt/rocm-$ROCM/share/miopen/db/ /opt/rocm-$ROCM/share/miopen/db/

# Copy rocBLAS library files
# NOTE: Do not filter this copy to specific gfx versions, some fallback tensile libraries are necessary.
COPY --from=rocm /opt/rocm-$ROCM/lib/rocblas/library/ /opt/rocm-$ROCM/lib/rocblas/library/

# Copy ROCm binary files
COPY --from=rocm /opt/rocm-$ROCM/bin/ /opt/rocm-$ROCM/bin/

# Copy stripped ROCm
COPY --from=rocm /opt/rocm-dist/ /

#######################################################################
FROM deps-prelim AS rocm-prelim-hsa-override0
ENV MIGRAPHX_DISABLE_MIOPEN_FUSION=1
ENV MIGRAPHX_DISABLE_SCHEDULE_PASS=1
ENV MIGRAPHX_DISABLE_REDUCE_FUSION=1
ENV MIGRAPHX_ENABLE_HIPRTC_WORKAROUNDS=1

COPY --from=rocm-dist / /

RUN ldconfig

#######################################################################
FROM rocm-prelim-hsa-override0 AS rocm-prelim-hsa-override1

ARG HSA_OVERRIDE_GFX_VERSION
ENV HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION

#######################################################################
FROM rocm-prelim-hsa-override$HSA_OVERRIDE as rocm-deps
