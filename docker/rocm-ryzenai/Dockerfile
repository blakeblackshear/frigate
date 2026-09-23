# syntax=docker/dockerfile:1.4

ARG HSA_OVERRIDE_GFX_VERSION
ARG HSA_OVERRIDE

#######################################################################
FROM deps AS deps-prelim

COPY docker/rocm/debian-backports.sources /etc/apt/sources.list.d/debian-backports.sources
RUN echo "deb http://deb.debian.org/debian trixie main" > /etc/apt/sources.list.d/trixie.list && \
    apt-get update && \
    apt-get install -y libnuma1 && \
    apt-get install -qq -y -t bookworm-backports mesa-va-drivers mesa-vulkan-drivers && \
    apt-get install -qq -y -t trixie libstdc++-14-dev && \
    rm -f /etc/apt/sources.list.d/trixie.list && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends \
    ocl-icd-libopencl1 libdrm2 libudev1 libjson-c5 \
    && rm -rf /var/lib/apt/lists/*

# XRT with the XDNA plugin and xrt-smi, prebuilt in AMD's PPA (noble packages)
RUN echo "deb http://deb.debian.org/debian trixie main" > /etc/apt/sources.list.d/trixie.list && \
    wget -qO /usr/share/keyrings/amd-xrt.asc "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xF83FE7BE8F1A44E83CDA3625D47169167A18444E" && \
    echo "deb [signed-by=/usr/share/keyrings/amd-xrt.asc] https://ppa.launchpadcontent.net/amd-team/xrt/ubuntu noble main" > /etc/apt/sources.list.d/amd-xrt.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends libxrt2 libxrt-npu2 && \
    apt-get install -y --no-install-recommends -t trixie libboost-filesystem1.83.0 libboost-program-options1.83.0 && \
    (cd /tmp && apt-get download libxrt-utils libxrt-utils-npu && \
     dpkg -i --ignore-depends=libssl3t64 libxrt-utils*.deb && rm -f /tmp/*.deb) && \
    rm -f /etc/apt/sources.list.d/trixie.list /etc/apt/sources.list.d/amd-xrt.list && \
    rm -rf /var/lib/apt/lists/*

# Ryzen AI runtime (VOE) and xclbins from the archive, RYZENAI_PATH in the build
RUN --mount=type=bind,from=ryzenai,source=ryzen_ai-1.7.1.tgz,target=/tmp/ryzen_ai-1.7.1.tgz \
    mkdir -p /tmp/ryzenai /opt/voe/lib /opt/voe/config/xclbins/phx && \
    tar -xzf /tmp/ryzen_ai-1.7.1.tgz --no-same-owner -C /tmp/ryzenai \
        ./voe-cpp.tar.gz ./voe-min.tar.gz ./device_essentials_phx-1.7.1-py3-none-any.whl && \
    tar -xzf /tmp/ryzenai/voe-cpp.tar.gz --no-same-owner -C /tmp/ryzenai voe-cpp/onnxruntime/lib && \
    cp -r /tmp/ryzenai/voe-cpp/onnxruntime/lib/. /opt/voe/lib/ && \
    tar -xzf /tmp/ryzenai/voe-min.tar.gz --no-same-owner -C /opt/voe/config --strip-components=1 && \
    python3 -m zipfile -e /tmp/ryzenai/device_essentials_phx-1.7.1-py3-none-any.whl /tmp/ryzenai/whl && \
    cp /tmp/ryzenai/whl/data/parts/xilinx/xclbin/phx/* /opt/voe/config/xclbins/phx/ && \
    rm -rf /tmp/ryzenai

WORKDIR /opt/frigate
COPY --from=rootfs / /

RUN wget -q https://bootstrap.pypa.io/get-pip.py -O get-pip.py \
    && sed -i 's/args.append("setuptools")/args.append("setuptools==77.0.3")/' get-pip.py \
    && python3 get-pip.py "pip" --break-system-packages
RUN python3 -m pip config set global.break-system-packages true

COPY docker/rocm-ryzenai/requirements-wheels-rocm-ryzenai.txt /requirements.txt
RUN pip3 uninstall -y onnxruntime onnxruntime-gpu || true \
    && pip3 install -r /requirements.txt

# Clear the executable-stack flag; some host kernels reject RWE stacks
RUN <<'PYEOF'
python3 <<'INNER'
import struct, glob
paths = []
for pattern in (
    '/usr/local/lib/python3.*/dist-packages/onnxruntime/**/*.so',
    '/opt/voe/lib/**/*.so*',
):
    paths += glob.glob(pattern, recursive=True)
for path in paths:
    try:
        f = open(path, 'r+b')
        f.seek(0)
        if f.read(4) != b'\x7fELF':
            f.close()
            continue
        f.seek(32)
        phoff = struct.unpack('<Q', f.read(8))[0]
        f.seek(54)
        phsize = struct.unpack('<H', f.read(2))[0]
        phnum = struct.unpack('<H', f.read(2))[0]
        for i in range(phnum):
            pos = phoff + i * phsize
            f.seek(pos)
            ptype = struct.unpack('<I', f.read(4))[0]
            if ptype == 0x6474e551:  # PT_GNU_STACK
                pflags = struct.unpack('<I', f.read(4))[0]
                if pflags & 1:  # PF_X
                    f.seek(pos + 4)
                    f.write(struct.pack('<I', pflags & ~1))
                    print(f'Fixed: {path}')
                break
        f.close()
    except Exception:
        pass
INNER
PYEOF

#######################################################################
FROM deps-prelim AS rocm-ryzenai-prelim-hsa-override0
ENV MIGRAPHX_DISABLE_MIOPEN_FUSION=1
ENV MIGRAPHX_DISABLE_SCHEDULE_PASS=1
ENV MIGRAPHX_DISABLE_REDUCE_FUSION=1
ENV MIGRAPHX_ENABLE_HIPRTC_WORKAROUNDS=1
ENV MIOPEN_CUSTOM_CACHE_DIR=/config/model_cache/migraphx
ENV MIOPEN_USER_DB_PATH=/config/model_cache/migraphx
ENV AMD_COMGR_CACHE=1
ENV AMD_COMGR_CACHE_DIR=/config/model_cache/migraphx

COPY --from=rocm-dist / /

RUN mkdir -p /opt/xilinx/xclbin /opt/xilinx/xclbins/phoenix && \
    ln -sf /opt/voe/config/xclbins/phx/base.xclbin /opt/xilinx/xclbin/base.xclbin && \
    ln -sf /opt/voe/config/xclbins/phoenix/1x4.xclbin /opt/xilinx/xclbins/phoenix/1x4.xclbin && \
    ln -sf /opt/voe/config/xclbins/phoenix/4x4.xclbin /opt/xilinx/xclbins/phoenix/4x4.xclbin

# onnxruntime >= 1.24 dlopen()s the VitisAI EP from its own capi/ directory
RUN ln -sf /opt/voe/lib/libonnxruntime_vitisai_ep.so \
    "$(python3 -c 'import onnxruntime, os; print(os.path.join(os.path.dirname(onnxruntime.__file__), "capi"))')/libonnxruntime_vitisai_ep.so"

RUN echo "/opt/voe/lib" > /etc/ld.so.conf.d/voe.conf && ldconfig

ENV XILINX_XRT=/usr \
    VITISAI_PATH=/opt/voe \
    LD_LIBRARY_PATH="/opt/voe/lib" \
    XLNX_VART_FIRMWARE=/opt/xilinx/xclbin/base.xclbin \
    XLNX_ENABLE_DEVICES=0 \
    VITISAI_EP_JSON_CONFIG=/opt/voe/config/vaip_config.json

#######################################################################
FROM rocm-ryzenai-prelim-hsa-override0 AS rocm-ryzenai-prelim-hsa-override1

ARG HSA_OVERRIDE_GFX_VERSION
ENV HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION

#######################################################################
FROM rocm-ryzenai-prelim-hsa-override$HSA_OVERRIDE AS rocm-ryzenai
