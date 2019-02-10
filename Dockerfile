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
 && rm -rf /var/lib/apt/lists/* 

# Install core packages 
RUN wget -q -O /tmp/get-pip.py --no-check-certificate https://bootstrap.pypa.io/get-pip.py && python3 /tmp/get-pip.py
RUN  pip install -U pip \
 numpy \
 matplotlib \
 notebook \
 jupyter \
 pandas \
 moviepy \
 tensorflow \
 keras \
 autovizwidget \
 Flask \
 imutils \
 paho-mqtt

# Install tensorflow models object detection
RUN GIT_SSL_NO_VERIFY=true git clone -q https://github.com/tensorflow/models /usr/local/lib/python3.5/dist-packages/tensorflow/models
RUN wget -q -P /usr/local/src/ --no-check-certificate https://github.com/google/protobuf/releases/download/v3.5.1/protobuf-python-3.5.1.tar.gz

# Download & build protobuf-python
RUN cd /usr/local/src/ \
 && tar xf protobuf-python-3.5.1.tar.gz \
 && rm protobuf-python-3.5.1.tar.gz \
 && cd /usr/local/src/protobuf-3.5.1/ \
 && ./configure \
 && make \
 && make install \
 && ldconfig \
 && rm -rf /usr/local/src/protobuf-3.5.1/

# Add dataframe display widget
RUN jupyter nbextension enable --py --sys-prefix widgetsnbextension

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

# Minimize image size 
RUN (apt-get autoremove -y; \
     apt-get autoclean -y)

# Set TF object detection available
ENV PYTHONPATH "$PYTHONPATH:/usr/local/lib/python3.5/dist-packages/tensorflow/models/research:/usr/local/lib/python3.5/dist-packages/tensorflow/models/research/slim"
RUN cd /usr/local/lib/python3.5/dist-packages/tensorflow/models/research && protoc object_detection/protos/*.proto --python_out=.

COPY detect_objects.py .

CMD ["python3", "-u", "detect_objects.py"]