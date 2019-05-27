FROM ubuntu:18.04

# Install packages for apt repo
RUN apt-get -qq update && apt-get -qq install --no-install-recommends -y \
    apt-transport-https \
    ca-certificates \
    curl \
    wget \
    gnupg-agent \
    dirmngr \
    software-properties-common

RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys D986B59D

RUN echo "deb http://deb.odroid.in/5422-s bionic main" > /etc/apt/sources.list.d/odroid.list

RUN apt-get -qq update && apt-get -qq install --no-install-recommends -y \
 python3 \ 
 # OpenCV dependencies
 ffmpeg \
 build-essential \
 cmake \
 unzip \
 pkg-config \
 libjpeg-dev \
 libpng-dev \
 libtiff-dev \
 libavcodec-dev \
 libavformat-dev \
 libswscale-dev \
 libv4l-dev \
 libxvidcore-dev \
 libx264-dev \
 libgtk-3-dev \
 libatlas-base-dev \
 gfortran \
 python3-dev \
 # Coral USB Python API Dependencies
 libusb-1.0-0 \
 python3-pip \
 python3-pil \
 python3-numpy \
 libc++1 \
 libc++abi1 \
 libunwind8 \
 libgcc1 \
 && rm -rf /var/lib/apt/lists/* 

# Install core packages 
RUN wget -q -O /tmp/get-pip.py --no-check-certificate https://bootstrap.pypa.io/get-pip.py && python3 /tmp/get-pip.py
RUN  pip install -U pip \
 numpy \
 Flask \
 paho-mqtt \
 PyYAML \
 ffmpeg-python

# Download & build OpenCV
RUN wget -q -P /usr/local/src/ --no-check-certificate https://github.com/opencv/opencv/archive/4.0.1.zip
RUN cd /usr/local/src/ \
 && unzip 4.0.1.zip \
 && rm 4.0.1.zip \
 && cd /usr/local/src/opencv-4.0.1/ \
 && mkdir build \
 && cd /usr/local/src/opencv-4.0.1/build \ 
 && cmake -D CMAKE_INSTALL_TYPE=Release -D CMAKE_INSTALL_PREFIX=/usr/local/ .. \
 && make -j4 \
 && make install \
 && ldconfig \
 && rm -rf /usr/local/src/opencv-4.0.1

# Download and install EdgeTPU libraries for Coral
RUN wget https://dl.google.com/coral/edgetpu_api/edgetpu_api_latest.tar.gz -O edgetpu_api.tar.gz --trust-server-names

RUN tar xzf edgetpu_api.tar.gz \
  && cd edgetpu_api \
  && cp -p libedgetpu/libedgetpu_arm32.so /usr/lib/arm-linux-gnueabihf/libedgetpu.so.1.0 \
  && ldconfig \
  && python3 -m pip install --no-deps "$(ls edgetpu-*-py3-none-any.whl 2>/dev/null)"

RUN cd /usr/local/lib/python3.6/dist-packages/edgetpu/swig/ \
  && ln -s _edgetpu_cpp_wrapper.cpython-35m-arm-linux-gnueabihf.so _edgetpu_cpp_wrapper.cpython-36m-arm-linux-gnueabihf.so

# symlink the model and labels
RUN wget https://dl.google.com/coral/canned_models/mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite -O mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite --trust-server-names
RUN wget https://dl.google.com/coral/canned_models/coco_labels.txt -O coco_labels.txt --trust-server-names
RUN ln -s mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite /frozen_inference_graph.pb
RUN ln -s /coco_labels.txt /label_map.pbtext

# Minimize image size 
RUN (apt-get autoremove -y; \
     apt-get autoclean -y)

WORKDIR /opt/frigate/
ADD frigate frigate/
COPY detect_objects.py .

CMD ["python3", "-u", "detect_objects.py"]
