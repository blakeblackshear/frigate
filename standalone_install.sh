#!/bin/bash
#Script to setup Frigate in Proxmox LXC, on a Debian 11 standard image
#LXC config: Debian 11, 20Gb disk, 4 cores, 4Gb memory
#Make sure the LXC is already set up with Nvidia drivers (and appropriate rights to the gpu)
#Test with command: nvidia-smi
#It should show a table with the GPU
#Tutorial to setup GPU passthrough to LXC: https://passbe.com/2020/02/19/gpu-nvidia-passthrough-on-proxmox-lxc-container/
#For reference, I needed to append this in my LXC config:
#lxc.cgroup2.devices.allow: c 195:* rwm
#lxc.cgroup2.devices.allow: c 507:* rwm
#lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
#lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
#lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
#lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file
#lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file

#Command to launch script:
#wget -O- https://raw.githubusercontent.com/remz1337/frigate/dev/standalone_install.sh | bash -

#Run everything as root
sudo su

#Work from root home dir
cd /opt

apt update
apt upgrade -y
apt install -y git autoconf automake cmake build-essential wget xz-utils yasm libtool libc6 libc6-dev unzip libnuma1 libnuma-dev python3 python3-distutils python3-dev pkg-config libgtk-3-dev libavcodec-dev libavformat-dev libswscale-dev libv4l-dev libxvidcore-dev libx264-dev libjpeg-dev libpng-dev libtiff-dev gfortran openexr libatlas-base-dev libssl-dev libtbb2 libtbb-dev libdc1394-22-dev libopenexr-dev libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev gcc libopenblas-dev liblapack-dev
apt install -y --no-install-recommends libusb-1.0-0-dev

#Build latest ffmpeg with nvenc/nvdec support
mkdir -p /opt/ffmpeg
cd /opt/ffmpeg


#cd /opt/ffmpeg
git clone https://github.com/FFmpeg/nv-codec-headers.git
cd nv-codec-headers
make -j$(nproc)
make install

cd /opt/ffmpeg

git clone https://github.com/FFmpeg/FFmpeg.git ffmpeg

cd ffmpeg

#ffmpeg will automatically detect nvidia drivers
./configure

make -j$(nproc)
make install

#Test
#wget https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_10MB.mp4
#ffmpeg -y -hwaccel cuda -i Big_Buck_Bunny_1080_10s_10MB.mp4 Big_Buck_Bunny_1080_10s_10MB.avi    

cd /opt

#Pull Frigate from  repo
git clone https://github.com/blakeblackshear/frigate.git

cd /opt/frigate

#Used in build dependencies scripts
export TARGETARCH=amd64

docker/build_nginx.sh


mkdir -p /usr/local/go2rtc/bin
cd /usr/local/go2rtc/bin

wget -qO go2rtc "https://github.com/AlexxIT/go2rtc/releases/download/v1.5.0/go2rtc_linux_${TARGETARCH}"
chmod +x go2rtc

cd /opt/frigate

### OpenVino
wget -q https://bootstrap.pypa.io/get-pip.py -O get-pip.py
python3 get-pip.py "pip"
pip install -r requirements-ov.txt


# Get OpenVino Model
mkdir -p /opt/frigate/models 
cd /opt/frigate/models && omz_downloader --name ssdlite_mobilenet_v2 
cd /opt/frigate/models && omz_converter --name ssdlite_mobilenet_v2 --precision FP16

# Build libUSB without udev.  Needed for Openvino NCS2 support
cd /opt/frigate

wget -q https://github.com/libusb/libusb/archive/v1.0.25.zip -O v1.0.25.zip
unzip v1.0.25.zip
cd libusb-1.0.25
./bootstrap.sh
./configure --disable-udev --enable-shared
make -j $(nproc --all)


cd /opt/frigate/libusb-1.0.25/libusb

mkdir -p /usr/local/lib
/bin/bash ../libtool  --mode=install /usr/bin/install -c libusb-1.0.la '/usr/local/lib'
mkdir -p /usr/local/include/libusb-1.0
/usr/bin/install -c -m 644 libusb.h '/usr/local/include/libusb-1.0'
mkdir -p /usr/local/lib/pkgconfig
cd /opt/frigate/libusb-1.0.25/
/usr/bin/install -c -m 644 libusb-1.0.pc '/usr/local/lib/pkgconfig'
ldconfig


######## Frigate expects model files at root of filesystem
#cd /opt/frigate/models
cd /

# Get model and labels
wget -qO edgetpu_model.tflite https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess_edgetpu.tflite
wget -qO cpu_model.tflite https://github.com/google-coral/test_data/raw/release-frogfish/ssdlite_mobiledet_coco_qat_postprocess.tflite

#cp /opt/frigate/labelmap.txt .
cp /opt/frigate/labelmap.txt /labelmap.txt
cp -r /opt/frigate/models/public/ssdlite_mobilenet_v2/FP16 openvino-model

wget -q https://github.com/openvinotoolkit/open_model_zoo/raw/master/data/dataset_classes/coco_91cl_bkgr.txt -O openvino-model/coco_91cl_bkgr.txt
sed -i 's/truck/car/g' openvino-model/coco_91cl_bkgr.txt

# opencv & scipy dependencies
cd /opt/frigate

pip3 install -r requirements.txt

pip3 wheel --wheel-dir=/wheels -r /opt/frigate/requirements-wheels.txt
pip3 wheel --wheel-dir=/trt-wheels -r /opt/frigate/requirements-tensorrt.txt

#Copy preconfigured files
cp -a /opt/frigate/docker/rootfs/. /

# Install dependencies
/opt/frigate/docker/install_deps.sh

pip3 install -U /wheels/*.whl
ldconfig

# Install Node 16
wget -qO- https://deb.nodesource.com/setup_16.x | bash -

apt install -y nodejs 
npm install -g npm@9

pip3 install -r /opt/frigate/requirements-dev.txt

# Frigate web build
# This should be architecture agnostic, so speed up the build on multiarch by not using QEMU.
cd /opt/frigate/web

npm install

npm run build

cp -r dist/BASE_PATH/monacoeditorwork/* dist/assets/

cd /opt/frigate/

cp -r /opt/frigate/web/dist/* /opt/frigate/web/

pip3 install -U /trt-wheels/*.whl
ln -s libnvrtc.so.11.2 /usr/local/lib/python3.9/dist-packages/nvidia/cuda_nvrtc/lib/libnvrtc.so
ldconfig

pip3 install -U /trt-wheels/*.whl

### BUILD COMPLETE, NOW INITIALIZE

mkdir /config
cp -r /opt/frigate/config/. /config
cp /config/config.yml.example /config/config.yml

################### EDIT CONFIG FILE HERE ################
#mqtt:
#  enabled: False
#
#cameras:
#  Camera1:
#    ffmpeg:
#      inputs:
#        - path: rtsp://user:password@192.168.1.123:554/h264Preview_01_main
#          roles:
#            - detect
#    detect:
#      enabled: False
#      width: 2560
#      height: 1920
########################

cd /opt/frigate

/opt/frigate/.devcontainer/initialize.sh

### POST_CREATE SCRIPT

############## Skip the ssh known hosts editing commands when running as root
######/opt/frigate/.devcontainer/post_create.sh

# Frigate normal container runs as root, so it have permission to create
# the folders. But the devcontainer runs as the host user, so we need to
# create the folders and give the host user permission to write to them.
#sudo mkdir -p /media/frigate
#sudo chown -R "$(id -u):$(id -g)" /media/frigate

make version

cd /opt/frigate/web

npm install

npm run build

cd /opt/frigate

#####Start order should be:
#1. Go2rtc
#2. Frigate
#3. Nginx

### Starting go2rtc
#Create systemd service. If done manually, edit the file (nano /etc/systemd/system/go2rtc.service) then copy/paste the service configuraiton
go2rtc_service="$(cat << EOF

[Unit]
Description=go2rtc service
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=root
ExecStart=bash /opt/frigate/docker/rootfs/etc/s6-overlay/s6-rc.d/go2rtc/run

[Install]
WantedBy=multi-user.target

EOF
)"

echo "${go2rtc_service}" > /etc/systemd/system/go2rtc.service
	
systemctl start go2rtc
systemctl enable go2rtc

#Test go2rtc access at
#http://<machine_ip>:1984/


### Starting Frigate
#First, comment the call to S6 in the run script
sed -i '/^s6-svc -O \.$/s/^/#/' /opt/frigate/docker/rootfs/etc/s6-overlay/s6-rc.d/frigate/run

#Second, install yq, needed by script to check database path
wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
chmod a+x /usr/local/bin/yq

#Create systemd service
frigate_service="$(cat << EOF

[Unit]
Description=Frigate service
After=go2rtc.service
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=root
ExecStart=bash /opt/frigate/docker/rootfs/etc/s6-overlay/s6-rc.d/frigate/run

[Install]
WantedBy=multi-user.target

EOF
)"

echo "${frigate_service}" > /etc/systemd/system/frigate.service
	
systemctl start frigate
systemctl enable frigate


### Starting Nginx

## Call nginx from absolute path
## nginx --> /usr/local/nginx/sbin/nginx
sed -i 's/exec nginx/exec \/usr\/local\/nginx\/sbin\/nginx/g' /opt/frigate/docker/rootfs/etc/s6-overlay/s6-rc.d/nginx/run

#Can't log to /dev/stdout with systemd, so log to file
sed -i 's/error_log \/dev\/stdout warn\;/error_log nginx\.err warn\;/' /usr/local/nginx/conf/nginx.conf
sed -i 's/access_log \/dev\/stdout main\;/access_log nginx\.log main\;/' /usr/local/nginx/conf/nginx.conf

#Create systemd service
nginx_service="$(cat << EOF

[Unit]
Description=Nginx service
After=frigate.service
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=root
ExecStart=bash /opt/frigate/docker/rootfs/etc/s6-overlay/s6-rc.d/nginx/run

[Install]
WantedBy=multi-user.target

EOF
)"

echo "${nginx_service}" > /etc/systemd/system/nginx.service
	
systemctl start nginx
systemctl enable nginx


#Test frigate through Nginx access at
#http://<machine_ip>:5000/


######## FULL FRIGATE CONFIG EXAMPLE:
#https://docs.frigate.video/configuration/

echo "Don't forget to edit the Frigate config file (/config/config.yml) and reboot."
echo "Frigate standalone installation complete! You can access the web interface at http://<machine_ip>:5000"
