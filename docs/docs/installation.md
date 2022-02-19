---
id: installation
title: Installation
---

Frigate is a Docker container that can be run on any Docker host including as a [HassOS Addon](https://www.home-assistant.io/addons/). Note that a Home Assistant Addon is **not** the same thing as the integration. The [integration](integrations/home-assistant) is required to integrate Frigate into Home Assistant.

## Dependencies

**MQTT broker** - Frigate requires an MQTT broker. If using Home Assistant, Frigate and Home Assistant must be connected to the same MQTT broker.

## Preparing your hardware

### Operating System

Frigate runs best with docker installed on bare metal debian-based distributions. For ideal performance, Frigate needs access to underlying hardware for the Coral and GPU devices. Running Frigate in a VM on top of Proxmox, ESXi, Virtualbox, etc. is not recommended. The virtualization layer often introduces a sizable amount of overhead for communication with Coral devices, but [not in all circumstances](https://github.com/blakeblackshear/frigate/discussions/1837).

Windows is not officially supported, but some users have had success getting it to run under WSL or Virtualbox. Getting the GPU and/or Coral devices properly passed to Frigate may be difficult or impossible. Search previous discussions or issues for help.

### Storage

Frigate uses the following locations for read/write operations in the container. Docker volume mappings can be used to map these to any location on your host machine.

:::caution

Note that Frigate does not currently support limiting recordings based on available disk space automatically. If using recordings, you must specify retention settings for a number of days that will fit within the available disk space of your drive or Frigate will crash.

:::

- `/media/frigate/clips`: Used for snapshot storage. In the future, it will likely be renamed from `clips` to `snapshots`. The file structure here cannot be modified and isn't intended to be browsed or managed manually.
- `/media/frigate/recordings`: Internal system storage for recording segments. The file structure here cannot be modified and isn't intended to be browsed or managed manually.
- `/media/frigate/frigate.db`: Default location for the sqlite database. You will also see several files alongside this file while frigate is running. If moving the database location (often needed when using a network drive at `/media/frigate`), it is recommended to mount a volume with docker at `/db` and change the storage location of the database to `/db/frigate.db` in the config file.
- `/tmp/cache`: Cache location for recording segments. Initial recordings are written here before being checked and converted to mp4 and moved to the recordings folder.
- `/dev/shm`: It is not recommended to modify this directory or map it with docker. This is the location for raw decoded frames in shared memory and it's size is impacted by the `shm-size` calculations below.
- `/config/config.yml`: Default location of the config file.

#### Common docker compose storage configurations

Writing to a local disk or external USB drive:

```yaml
version: "3.9"
services:
  frigate:
    ...
    volumes:
      - /path/to/your/config.yml:/config/config.yml:ro
      - /path/to/your/storage:/media/frigate
      - type: tmpfs # Optional: 1GB of memory, reduces SSD/SD Card wear
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ...
```

Writing to a network drive with database on a local drive:

```yaml
version: "3.9"
services:
  frigate:
    ...
    volumes:
      - /path/to/your/config.yml:/config/config.yml:ro
      - /path/to/network/storage:/media/frigate
      - /path/to/local/disk:/db
      - type: tmpfs # Optional: 1GB of memory, reduces SSD/SD Card wear
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ...
```

frigate.yml

```yaml
database:
  path: /db/frigate.db
```

### Calculating required shm-size

Frigate utilizes shared memory to store frames during processing. The default `shm-size` provided by Docker is 64m.

The default shm-size of 64m is fine for setups with 2 or less 1080p cameras. If frigate is exiting with "Bus error" messages, it is likely because you have too many high resolution cameras and you need to specify a higher shm size.

You can calculate the necessary shm-size for each camera with the following formula using the resolution specified for detect:

```
(width * height * 1.5 * 9 + 270480)/1048576 = <shm size in mb>
```

The shm size cannot be set per container for Home Assistant Addons. You must set `default-shm-size` in `/etc/docker/daemon.json` to increase the default shm size. This will increase the shm size for all of your docker containers. This may or may not cause issues with your setup. https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file

### Raspberry Pi 3/4

By default, the Raspberry Pi limits the amount of memory available to the GPU. In order to use ffmpeg hardware acceleration, you must increase the available memory by setting `gpu_mem` to the maximum recommended value in `config.txt` as described in the [official docs](https://www.raspberrypi.org/documentation/computers/config_txt.html#memory-options).

Additionally, the USB Coral draws a considerable amount of power. If using any other USB devices such as an SSD, you will experience instability due to the Pi not providing enough power to USB devices. You will need to purchase an external USB hub with it's own power supply. Some have reported success with <a href="https://amzn.to/3a2mH0P" target="_blank" rel="nofollow noopener sponsored">this</a> (affiliate link).

## Docker

Running in Docker directly is the recommended install method.

Make sure you choose the right image for your architecture:

| Arch        | Image Name                                 |
| ----------- | ------------------------------------------ |
| amd64       | blakeblackshear/frigate:stable-amd64       |
| amd64nvidia | blakeblackshear/frigate:stable-amd64nvidia |
| armv7       | blakeblackshear/frigate:stable-armv7       |
| aarch64     | blakeblackshear/frigate:stable-aarch64     |

It is recommended to run with docker-compose:

```yaml
version: "3.9"
services:
  frigate:
    container_name: frigate
    privileged: true # this may not be necessary for all setups
    restart: unless-stopped
    image: blakeblackshear/frigate:<specify_version_tag>
    shm_size: "64mb" # update for your cameras based on calculation above
    devices:
      - /dev/bus/usb:/dev/bus/usb # passes the USB Coral, needs to be modified for other versions
      - /dev/apex_0:/dev/apex_0 # passes a PCIe Coral, follow driver instructions here https://coral.ai/docs/m2/get-started/#2a-on-linux
      - /dev/dri/renderD128 # for intel hwaccel, needs to be updated for your hardware
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /path/to/your/config.yml:/config/config.yml:ro
      - /path/to/your/storage:/media/frigate
      - type: tmpfs # Optional: 1GB of memory, reduces SSD/SD Card wear
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ports:
      - "5000:5000"
      - "1935:1935" # RTMP feeds
    environment:
      FRIGATE_RTSP_PASSWORD: "password"
```

If you can't use docker compose, you can run the container with something similar to this:

```bash
docker run -d \
  --name frigate \
  --restart=unless-stopped \
  --mount type=tmpfs,target=/tmp/cache,tmpfs-size=1000000000 \
  --device /dev/bus/usb:/dev/bus/usb \
  --device /dev/dri/renderD128 \
  --shm-size=64m \
  -v /path/to/your/storage:/media/frigate \
  -v /path/to/your/config.yml:/config/config.yml:ro \
  -v /etc/localtime:/etc/localtime:ro \
  -e FRIGATE_RTSP_PASSWORD='password' \
  -p 5000:5000 \
  -p 1935:1935 \
  blakeblackshear/frigate:<specify_version_tag>
```

## Home Assistant Operating System (HassOS)

:::caution

Due to limitations in Home Assistant Operating System, utilizing external storage for recordings or snapshots requires [modifying udev rules manually](https://community.home-assistant.io/t/solved-mount-usb-drive-in-hassio-to-be-used-on-the-media-folder-with-udev-customization/258406/46).

:::

:::tip

If possible, it is recommended to run Frigate standalone in Docker and use [Frigate's Proxy Addon](https://github.com/blakeblackshear/frigate-hass-addons/blob/main/frigate_proxy/README.md).

:::

HassOS users can install via the addon repository.

1. Navigate to Supervisor > Add-on Store > Repositories
2. Add https://github.com/blakeblackshear/frigate-hass-addons
3. Install your desired Frigate NVR Addon and navigate to it's page
4. Setup your network configuration in the `Configuration` tab
5. (not for proxy addon) Create the file `frigate.yml` in your `config` directory with your detailed Frigate configuration
6. Start the addon container
7. (not for proxy addon) If you are using hardware acceleration for ffmpeg, you may need to disable "Protection mode"

There are several versions of the addon available:

| Addon Version                  | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| Frigate NVR                    | Current release with protection mode on                    |
| Frigate NVR (Full Access)      | Current release with the option to disable protection mode |
| Frigate NVR Beta               | Beta release with protection mode on                       |
| Frigate NVR Beta (Full Access) | Beta release with the option to disable protection mode    |

## Home Assistant Supervised

:::tip

If possible, it is recommended to run Frigate standalone in Docker and use [Frigate's Proxy Addon](https://github.com/blakeblackshear/frigate-hass-addons/blob/main/frigate_proxy/README.md).

:::

When running Home Assistant with the [Supervised install method](https://github.com/home-assistant/supervised-installer), you can get the benefit of running the Addon along with the ability to customize the storage used by Frigate.

In order to customize the storage location for Frigate, simply use `fstab` to mount the drive you want at `/usr/share/hassio/media`. Here is an example fstab entry:

```shell
UUID=1a65fec6-c25f-404a-b3d2-1f2fcf6095c8 /media/data ext4 defaults 0 0
/media/data/homeassistant/media /usr/share/hassio/media none bind 0 0
```

Then follow the instructions listed for [Home Assistant Operating System](#home-assistant-operating-system-hassos).

## Kubernetes

Use the [helm chart](https://github.com/blakeblackshear/blakeshome-charts/tree/master/charts/frigate).

## Unraid

Many people have powerful enough NAS devices or home servers to also run docker. There is a Unraid Community App.
To install make sure you have the [community app plugin here](https://forums.unraid.net/topic/38582-plug-in-community-applications/). Then search for "Frigate" in the apps section within Unraid - you can see the online store [here](https://unraid.net/community/apps?q=frigate#r)

## Proxmox

It is recommended to run Frigate in LXC for maximum performance. See [this discussion](https://github.com/blakeblackshear/frigate/discussions/1111) for more information.

## ESX

For details on running Frigate under ESX, see details [here](https://github.com/blakeblackshear/frigate/issues/305).
