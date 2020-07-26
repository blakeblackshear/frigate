FROM ubuntu:18.04
LABEL maintainer "blakeb@blakeshome.com"

ENV DEBIAN_FRONTEND=noninteractive
# Install packages for apt repo
RUN apt -qq update && apt -qq install --no-install-recommends -y \
    software-properties-common \
    # apt-transport-https ca-certificates \
    build-essential \
    gnupg wget unzip tzdata \
    # libcap-dev \
    && add-apt-repository ppa:deadsnakes/ppa -y \
    && apt -qq install --no-install-recommends -y \
        python3.7 \
        python3.7-dev \
        python3-pip \
        ffmpeg \
        # VAAPI drivers for Intel hardware accel
        libva-drm2 libva2 i965-va-driver vainfo \
    && python3.7 -m pip install -U wheel setuptools \
    && python3.7 -m pip install -U \
        opencv-python-headless \
        # python-prctl \
        numpy \
        imutils \
        scipy \
    && python3.7 -m pip install -U \
        Flask \
        paho-mqtt \
        PyYAML \
        matplotlib \
        pyarrow \
    && echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" > /etc/apt/sources.list.d/coral-edgetpu.list \
    && wget -q -O - https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
    && apt -qq update \
    && echo "libedgetpu1-max libedgetpu/accepted-eula boolean true" | debconf-set-selections \
    && apt -qq install --no-install-recommends -y \
        libedgetpu1-max \
    ## Tensorflow lite (python 3.7 only)
    && wget -q https://dl.google.com/coral/python/tflite_runtime-2.1.0.post1-cp37-cp37m-linux_x86_64.whl \
    && python3.7 -m pip install tflite_runtime-2.1.0.post1-cp37-cp37m-linux_x86_64.whl \
    && rm tflite_runtime-2.1.0.post1-cp37-cp37m-linux_x86_64.whl \
    && rm -rf /var/lib/apt/lists/* \
    && (apt-get autoremove -y; apt-get autoclean -y)

# get model and labels
RUN wget -q https://github.com/google-coral/edgetpu/raw/master/test_data/ssd_mobilenet_v2_coco_quant_postprocess_edgetpu.tflite -O /edgetpu_model.tflite --trust-server-names
RUN wget -q https://dl.google.com/coral/canned_models/coco_labels.txt -O /labelmap.txt --trust-server-names
RUN wget -q https://github.com/google-coral/edgetpu/raw/master/test_data/ssd_mobilenet_v2_coco_quant_postprocess.tflite -O /cpu_model.tflite 


WORKDIR /opt/frigate/
ADD frigate frigate/
COPY detect_objects.py .
COPY benchmark.py .

CMD ["python3.7", "-u", "detect_objects.py"]
