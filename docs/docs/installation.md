---
id: installation
title: Installation
---

Frigate is a Docker container that can be run on any Docker host including as a [HassOS Addon](https://www.home-assistant.io/addons/). See instructions below for installing the HassOS addon.

For HomeAssistant users, there is also a [custom component (aka integration)](https://github.com/blakeblackshear/frigate-hass-integration). This custom component adds tighter integration with HomeAssistant by automatically setting up camera entities, sensors, media browser for clips and recordings, and a public API to simplify notifications.

Note that HassOS Addons and custom components are different things. If you are already running Frigate with Docker directly, you do not need the Addon since the Addon would run another instance of Frigate.

## HassOS Addon

HassOS users can install via the addon repository. Frigate requires an MQTT server.

1. Navigate to Supervisor > Add-on Store > Repositories
1. Add https://github.com/blakeblackshear/frigate-hass-addons
1. Setup your configuration in the `Configuration` tab
1. Start the addon container
1. If you are using hardware acceleration for ffmpeg, you will need to disable "Protection mode"

## Docker

Make sure you choose the right image for your architecture:

|Arch|Image Name|
|-|-|
|amd64|blakeblackshear/frigate:stable-amd64|
|amd64nvidia|blakeblackshear/frigate:stable-amd64nvidia|
|armv7|blakeblackshear/frigate:stable-armv7|
|aarch64|blakeblackshear/frigate:stable-aarch64|

It is recommended to run with docker-compose:

```yaml
version: '3.9'
services:
  frigate:
    container_name: frigate
    restart: unless-stopped
    image: blakeblackshear/frigate:<specify_version_tag>
    devices:
      - /dev/bus/usb:/dev/bus/usb
      - /dev/dri/renderD128 # for intel hwaccel, needs to be updated for your hardware
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - <path_to_config_file>:/config/config.yml:ro
      - <path_to_directory_for_media>:/media/frigate
      - type: tmpfs # Optional: 1GB of memory, reduces SSD/SD Card wear
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ports:
      - '5000:5000'
      - '1935:1935' # RTMP feeds
    environment:
      FRIGATE_RTSP_PASSWORD: 'password'
```

If you can't use docker compose, you can run the container with something similar to this:

```bash
docker run -d \
  --name frigate \
  --restart=unless-stopped \
  --mount type=tmpfs,target=/tmp/cache,tmpfs-size=1000000000 \
  --device /dev/bus/usb:/dev/bus/usb \
  --device /dev/dri/renderD128
  -v <path_to_directory_for_media>:/media/frigate \
  -v <path_to_config_file>:/config/config.yml:ro \
  -v /etc/localtime:/etc/localtime:ro \
  -e FRIGATE_RTSP_PASSWORD='password' \
  -p 5000:5000 \
  -p 1935:1935 \
  blakeblackshear/frigate:<specify_version_tag>
```

### Calculating shm-size

The default shm-size of 64m is fine for setups with 3 or less 1080p cameras. If frigate is exiting with "Bus error" messages, it could be because you have too many high resolution cameras and you need to specify a higher shm size.

You can calculate the necessary shm-size for each camera with the following formula:

```
(width * height * 1.5 * 7 + 270480)/1048576 = <shm size in mb>
```

The shm size cannot be set per container for HomeAssistant Addons. You must set `default-shm-size` in `/etc/docker/daemon.json` to increase the default shm size. This will increase the shm size for all of your docker containers. This may or may not cause issues with your setup. https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file

## Kubernetes

Use the [helm chart](https://github.com/blakeblackshear/blakeshome-charts/tree/master/charts/frigate).

## Virtualization

For ideal performance, Frigate needs access to underlying hardware for the Coral and GPU devices for ffmpeg decoding. Running Frigate in a VM on top of Proxmox, ESXi, Virtualbox, etc. is not recommended. The virtualization layer typically introduces a sizable amount of overhead for communication with Coral devices.

### Proxmox

Some people have had success running Frigate in LXC directly with the following config:

```
arch: amd64
cores: 2
features: nesting=1
hostname: FrigateLXC
memory: 4096
net0: name=eth0,bridge=vmbr0,firewall=1,hwaddr=2E:76:AE:5A:58:48,ip=dhcp,ip6=auto,type=veth
ostype: debian
rootfs: local-lvm:vm-115-disk-0,size=12G
swap: 512
lxc.cgroup.devices.allow: c 189:385 rwm
lxc.mount.entry: /dev/dri/renderD128 dev/dri/renderD128 none bind,optional,create=file
lxc.mount.entry: /dev/bus/usb/004/002 dev/bus/usb/004/002 none bind,optional,create=file
lxc.apparmor.profile: unconfined
lxc.cgroup.devices.allow: a
lxc.cap.drop:
```

### ESX
For details on running Frigate under ESX, see details [here](https://github.com/blakeblackshear/frigate/issues/305).

