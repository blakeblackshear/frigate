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
    libaom0 \
    libx265-179 \
    && rm -rf /var/lib/apt/lists/* \
    && (apt-get autoremove -y; apt-get autoclean -y)

# s6-overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.3/s6-overlay-armhf-installer /tmp/
RUN chmod +x /tmp/s6-overlay-armhf-installer && /tmp/s6-overlay-armhf-installer /

ENTRYPOINT ["/init"]

CMD ["python3", "-u", "-m", "frigate"]