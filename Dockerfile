FROM debian:buster-slim
LABEL maintainer "blakeb@blakeshome.com"

ENV DEBIAN_FRONTEND=noninteractive
# Install packages for apt repo
RUN apt -qq update && apt -qq install --no-install-recommends -y \
    gnupg wget \
    ffmpeg \
    python3 \
    python3-pip \
    python3-dev \
    python3-numpy \
    # python-prctl
    build-essential libcap-dev \
    # pillow-simd
    # zlib1g-dev libjpeg-dev \
    # VAAPI drivers for Intel hardware accel
    libva-drm2 libva2 i965-va-driver vainfo \
    && echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" > /etc/apt/sources.list.d/coral-edgetpu.list \
    && wget -q -O - https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
    && apt -qq update \
    && echo "libedgetpu1-max libedgetpu/accepted-eula boolean true" | debconf-set-selections \
    && apt -qq install --no-install-recommends -y \
    libedgetpu1-max \
    python3-edgetpu \
    && rm -rf /var/lib/apt/lists/* \
    && (apt-get autoremove -y; apt-get autoclean -y)

# needs to be installed before others
RUN pip3 install -U wheel setuptools

RUN pip3 install -U \
    opencv-python \
    python-prctl \
    Flask \
    paho-mqtt \
    PyYAML \
    matplotlib \
    scipy

# symlink the model and labels
RUN wget -q https://github.com/google-coral/edgetpu/raw/master/test_data/mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite -O mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite --trust-server-names
RUN wget -q https://dl.google.com/coral/canned_models/coco_labels.txt -O coco_labels.txt --trust-server-names
RUN ln -s mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite /frozen_inference_graph.pb
RUN ln -s /coco_labels.txt /label_map.pbtext

WORKDIR /opt/frigate/
ADD frigate frigate/
COPY detect_objects.py .
COPY benchmark.py .

CMD ["python3", "-u", "detect_objects.py"]
