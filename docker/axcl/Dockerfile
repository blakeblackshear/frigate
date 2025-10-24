# syntax=docker/dockerfile:1.6

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

# Globally set pip break-system-packages option to avoid having to specify it every time
ARG PIP_BREAK_SYSTEM_PACKAGES=1


FROM frigate AS frigate-axcl
ARG TARGETARCH
ARG PIP_BREAK_SYSTEM_PACKAGES

# Install axmodels
RUN mkdir -p /axmodels \
    && wget https://github.com/ivanshi1108/assets/releases/download/v0.16.2/yolov5s_320.axmodel -O /axmodels/yolov5s_320.axmodel

# Install axpyengine
RUN wget https://github.com/AXERA-TECH/pyaxengine/releases/download/0.1.3.rc1/axengine-0.1.3-py3-none-any.whl -O /axengine-0.1.3-py3-none-any.whl
RUN pip3 install -i https://mirrors.aliyun.com/pypi/simple/ /axengine-0.1.3-py3-none-any.whl \
    && rm /axengine-0.1.3-py3-none-any.whl

# Install axcl
RUN if [ "$TARGETARCH" = "amd64" ]; then \
        echo "Installing x86_64 version of axcl"; \
        wget https://github.com/ivanshi1108/assets/releases/download/v0.16.2/axcl_host_x86_64_V3.6.5_20250908154509_NO4973.deb -O /axcl.deb; \
    else \
        echo "Installing aarch64 version of axcl"; \
        wget https://github.com/ivanshi1108/assets/releases/download/v0.16.2/axcl_host_aarch64_V3.6.5_20250908154509_NO4973.deb -O /axcl.deb; \
    fi

RUN mkdir /unpack_axcl && \
    dpkg-deb -x /axcl.deb /unpack_axcl && \
    cp -R /unpack_axcl/usr/bin/axcl /usr/bin/ && \
    cp -R /unpack_axcl/usr/lib/axcl /usr/lib/ && \
    rm -rf /unpack_axcl /axcl.deb


# Install axcl ffmpeg
RUN mkdir -p /usr/lib/ffmpeg/axcl

RUN if [ "$TARGETARCH" = "amd64" ]; then \
        wget https://github.com/ivanshi1108/assets/releases/download/v0.16.2/ffmpeg-x64 -O /usr/lib/ffmpeg/axcl/ffmpeg && \
        wget https://github.com/ivanshi1108/assets/releases/download/v0.16.2/ffprobe-x64 -O /usr/lib/ffmpeg/axcl/ffprobe; \
    else \
        wget https://github.com/ivanshi1108/assets/releases/download/v0.16.2/ffmpeg-aarch64 -O /usr/lib/ffmpeg/axcl/ffmpeg && \
        wget https://github.com/ivanshi1108/assets/releases/download/v0.16.2/ffprobe-aarch64 -O /usr/lib/ffmpeg/axcl/ffprobe; \
    fi

RUN chmod +x /usr/lib/ffmpeg/axcl/ffmpeg /usr/lib/ffmpeg/axcl/ffprobe

# Set ldconfig path
RUN echo "/usr/lib/axcl" > /etc/ld.so.conf.d/ax.conf

# Set env
ENV PATH="$PATH:/usr/bin/axcl"
ENV LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/lib/axcl"

ENTRYPOINT ["sh", "-c", "ldconfig && exec /init"]