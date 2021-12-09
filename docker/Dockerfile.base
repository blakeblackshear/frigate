ARG ARCH=amd64
ARG WHEELS_VERSION
ARG FFMPEG_VERSION
ARG NGINX_VERSION
FROM blakeblackshear/frigate-wheels:${WHEELS_VERSION}-${ARCH} as wheels
FROM blakeblackshear/frigate-ffmpeg:${FFMPEG_VERSION}-${ARCH} as ffmpeg
FROM blakeblackshear/frigate-nginx:${NGINX_VERSION} as nginx
FROM frigate-web as web

FROM ubuntu:20.04
LABEL maintainer "blakeb@blakeshome.com"

COPY --from=ffmpeg /usr/local /usr/local/

COPY --from=wheels /wheels/. /wheels/

ENV FLASK_ENV=development
# ENV FONTCONFIG_PATH=/etc/fonts
ENV DEBIAN_FRONTEND=noninteractive
# Install packages for apt repo
RUN apt-get -qq update \
    && apt-get upgrade -y \
    && apt-get -qq install --no-install-recommends -y gnupg wget unzip tzdata libxml2 \
    && apt-get -qq install --no-install-recommends -y python3-pip \
    && pip3 install -U /wheels/*.whl \
    && APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn apt-key adv --fetch-keys https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    && echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" > /etc/apt/sources.list.d/coral-edgetpu.list \
    && echo "libedgetpu1-max libedgetpu/accepted-eula select true" | debconf-set-selections \
    && apt-get -qq update && apt-get -qq install --no-install-recommends -y libedgetpu1-max python3-tflite-runtime python3-pycoral \
    && rm -rf /var/lib/apt/lists/* /wheels \
    && (apt-get autoremove -y; apt-get autoclean -y)

RUN pip3 install \
    peewee_migrate \
    pydantic \
    zeroconf \
    ws4py

COPY --from=nginx /usr/local/nginx/ /usr/local/nginx/

# get model and labels
COPY labelmap.txt /labelmap.txt
RUN wget -q https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess_edgetpu.tflite -O /edgetpu_model.tflite
RUN wget -q https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess.tflite -O /cpu_model.tflite

WORKDIR /opt/frigate/
ADD frigate frigate/
ADD migrations migrations/

COPY --from=web /opt/frigate/build web/

COPY docker/rootfs/ /

EXPOSE 5000
EXPOSE 1935
