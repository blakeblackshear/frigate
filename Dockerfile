FROM ubuntu:16.04

# Install system packages
RUN apt-get -qq update && apt-get -qq install --no-install-recommends -y python3 \
 python3-dev \
 python-pil \
 python-lxml \
 python-tk \
 build-essential \
 cmake \
 git \
 libgtk2.0-dev \
 pkg-config \
 libavcodec-dev \
 libavformat-dev \
 libswscale-dev \
 libtbb2 \
 libtbb-dev \
 libjpeg-dev \
 libpng-dev \
 libtiff-dev \
 libjasper-dev \
 libdc1394-22-dev \
 x11-apps \
 wget \
 vim \
 ffmpeg \
 unzip \
 libusb-1.0-0-dev \
 python3-setuptools \
 python3-numpy \
 zlib1g-dev \
 libgoogle-glog-dev \
 swig \
 libunwind-dev \
 libc++-dev \
 libc++abi-dev \
 build-essential \
 && rm -rf /var/lib/apt/lists/*

# Install core packages
RUN wget -q -O /tmp/get-pip.py --no-check-certificate https://bootstrap.pypa.io/get-pip.py && python3 /tmp/get-pip.py
RUN  pip install -U pip \
 numpy \
 pillow \
 matplotlib \
 notebook \
 Flask \
 imutils \
 paho-mqtt \
 PyYAML

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
 && rm -rf /usr/local/src/opencv-4.0.1

# Download and install EdgeTPU libraries
RUN wget -q -O edgetpu_api.tar.gz --no-check-certificate http://storage.googleapis.com/cloud-iot-edge-pretrained-models/edgetpu_api.tar.gz

RUN tar xzf edgetpu_api.tar.gz \
  && rm -rf edgetpu_api.tar.gz \
  && cd python-tflite-source \
  && cp -p libedgetpu/libedgetpu_x86_64.so /lib/x86_64-linux-gnu/libedgetpu.so \
  && cp edgetpu/swig/compiled_so/_edgetpu_cpp_wrapper_x86_64.so edgetpu/swig/_edgetpu_cpp_wrapper.so \
  && cp edgetpu/swig/compiled_so/edgetpu_cpp_wrapper.py edgetpu/swig/ \
  && python3 setup.py develop --user

# symlink the model and labels
RUN ln -s /python-tflite-source/edgetpu/test_data/mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite /mobilenet_ssd_v2_coco.tflite
RUN ln -s /python-tflite-source/edgetpu/test_data/coco_labels.txt /coco_labels.txt

# Minimize image size
RUN (apt-get autoremove -y; \
     apt-get autoclean -y)

WORKDIR /opt/frigate/
ADD frigate frigate/
COPY detect_objects.py .

CMD ["python3", "-u", "detect_objects.py"]
