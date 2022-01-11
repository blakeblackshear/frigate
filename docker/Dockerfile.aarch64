FROM frigate-base
LABEL maintainer "blakeb@blakeshome.com"

ENV DEBIAN_FRONTEND=noninteractive
# Install packages for apt repo
RUN apt-get -qq update \
    && apt-get -qq install --no-install-recommends -y \
    # ffmpeg runtime dependencies
    libgomp1 \
    # runtime dependencies
    libopenexr24 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libopenblas-base \
    libjpeg-turbo8 \
    libpng16-16 \
    libtiff5 \
    libdc1394-22 \
    && rm -rf /var/lib/apt/lists/* \
    && (apt-get autoremove -y; apt-get autoclean -y)

# s6-overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.3/s6-overlay-aarch64-installer /tmp/
RUN chmod +x /tmp/s6-overlay-aarch64-installer && /tmp/s6-overlay-aarch64-installer /

ENTRYPOINT ["/init"]

CMD ["python3", "-u", "-m", "frigate"]