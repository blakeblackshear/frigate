FROM frigate-base
LABEL maintainer "blakeb@blakeshome.com"

# By default, use the i965 driver
ENV LIBVA_DRIVER_NAME=i965
# Install packages for apt repo

RUN wget -qO - https://repositories.intel.com/graphics/intel-graphics.key | apt-key add - \
    && echo 'deb [arch=amd64] https://repositories.intel.com/graphics/ubuntu focal main' > /etc/apt/sources.list.d/intel-graphics.list \
    && apt-key adv --keyserver keyserver.ubuntu.com --recv-keys F63F0F2B90935439 \
    && echo 'deb http://ppa.launchpad.net/kisak/kisak-mesa/ubuntu focal main' > /etc/apt/sources.list.d/kisak-mesa-focal.list

RUN apt-get -qq update \
    && apt-get -qq install --no-install-recommends -y \
    # ffmpeg dependencies
    libgomp1 \
    # VAAPI drivers for Intel hardware accel
    libva-drm2 libva2 libmfx1 i965-va-driver vainfo intel-media-va-driver-non-free mesa-vdpau-drivers mesa-va-drivers mesa-vdpau-drivers libdrm-radeon1 \
    && rm -rf /var/lib/apt/lists/* \
    && (apt-get autoremove -y; apt-get autoclean -y)

# s6-overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.3/s6-overlay-amd64-installer /tmp/
RUN chmod +x /tmp/s6-overlay-amd64-installer && /tmp/s6-overlay-amd64-installer /

ENTRYPOINT ["/init"]

CMD ["python3", "-u", "-m", "frigate"]