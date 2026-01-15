---
id: getting_started
title: Getting started
---

# Getting Started

:::tip

If you already have an environment with Linux and Docker installed, you can continue to [Installing Frigate](#installing-frigate) below.

If you already have Frigate installed through Docker or through a Home Assistant Add-on, you can continue to [Configuring Frigate](#configuring-frigate) below.

:::

## Setting up hardware

This section guides you through setting up a server with Debian Bookworm and Docker.

### Install Debian 12 (Bookworm)

There are many guides on how to install Debian Server, so this will be an abbreviated guide. Connect a temporary monitor and keyboard to your device so you can install a minimal server without a desktop environment.

#### Prepare installation media

1. Download the small installation image from the [Debian website](https://www.debian.org/distrib/netinst)
1. Flash the ISO to a USB device (popular tool is [balena Etcher](https://etcher.balena.io/))
1. Boot your device from USB

#### Install and setup Debian for remote access

1. Ensure your device is connected to the network so updates and software options can be installed
1. Choose the non-graphical install option if you don't have a mouse connected, but either install method works fine
1. You will be prompted to set the root user password and create a user with a password
1. Install the minimum software. Fewer dependencies result in less maintenance.
   1. Uncheck "Debian desktop environment" and "GNOME"
   1. Check "SSH server"
   1. Keep "standard system utilities" checked
1. After reboot, login as root at the command prompt to add user to sudoers
   1. Install sudo
      ```bash
      apt update && apt install -y sudo
      ```
   1. Add the user you created to the sudo group (change `blake` to your own user)
      ```bash
      usermod -aG sudo blake
      ```
1. Shutdown by running `poweroff`

At this point, you can install the device in a permanent location. The remaining steps can be performed via SSH from another device. If you don't have an SSH client, you can install one of the options listed in the [Visual Studio Code documentation](https://code.visualstudio.com/docs/remote/troubleshooting#_installing-a-supported-ssh-client).

#### Finish setup via SSH

1. Connect via SSH and login with your non-root user created during install
1. Setup passwordless sudo so you don't have to type your password for each sudo command (change `blake` in the command below to your user)

   ```bash
   echo 'blake    ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/user
   ```

1. Logout and login again to activate passwordless sudo
1. Setup automatic security updates for the OS (optional)
   1. Ensure everything is up to date by running
      ```bash
      sudo apt update && sudo apt upgrade -y
      ```
   1. Install unattended upgrades
      ```bash
      sudo apt install -y unattended-upgrades
      echo unattended-upgrades unattended-upgrades/enable_auto_updates boolean true | sudo debconf-set-selections
      sudo dpkg-reconfigure -f noninteractive unattended-upgrades
      ```

Now you have a minimal Debian server that requires very little maintenance.

### Install Docker

1. Install Docker Engine (not Docker Desktop) using the [official docs](https://docs.docker.com/engine/install/debian/)
   1. Specifically, follow the steps in the [Install using the apt repository](https://docs.docker.com/engine/install/debian/#install-using-the-repository) section
2. Add your user to the docker group as described in the [Linux postinstall steps](https://docs.docker.com/engine/install/linux-postinstall/)

## Installing Frigate

This section shows how to create a minimal directory structure for a Docker installation on Debian. If you have installed Frigate as a Home Assistant Add-on or another way, you can continue to [Configuring Frigate](#configuring-frigate).

### Setup directories

Frigate will create a config file if one does not exist on the initial startup. The following directory structure is the bare minimum to get started. Once Frigate is running, you can use the built-in config editor which supports config validation.

```
.
├── docker-compose.yml
├── config/
└── storage/
```

This will create the above structure:

```bash
mkdir storage config && touch docker-compose.yml
```

If you are setting up Frigate on a Linux device via SSH, you can use [nano](https://itsfoss.com/nano-editor-guide/) to edit the following files. If you prefer to edit remote files with a full editor instead of a terminal, I recommend using [Visual Studio Code](https://code.visualstudio.com/) with the [Remote SSH extension](https://code.visualstudio.com/docs/remote/ssh-tutorial).

:::note

This `docker-compose.yml` file is just a starter for amd64 devices. You will need to customize it for your setup as detailed in the [Installation docs](/frigate/installation#docker).

:::
`docker-compose.yml`

```yaml
services:
  frigate:
    container_name: frigate
    restart: unless-stopped
    stop_grace_period: 30s
    image: ghcr.io/blakeblackshear/frigate:stable
    volumes:
      - ./config:/config
      - ./storage:/media/frigate
      - type: tmpfs # 1GB In-memory filesystem for recording segment storage
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ports:
      - "8971:8971"
      - "8554:8554" # RTSP feeds
```

Now you should be able to start Frigate by running `docker compose up -d` from within the folder containing `docker-compose.yml`. On startup, an admin user and password will be created and outputted in the logs. You can see this by running `docker logs frigate`. Frigate should now be accessible at `https://server_ip:8971` where you can login with the `admin` user and finish the configuration using the built-in configuration editor.

## Configuring Frigate

This section assumes that you already have an environment setup as described in [Installation](../frigate/installation.md). You should also configure your cameras according to the [camera setup guide](/frigate/camera_setup). Pay particular attention to the section on choosing a detect resolution.

### Step 1: Start Frigate

At this point you should be able to start Frigate and a basic config will be created automatically.

### Step 2: Add a camera

You can click the `Add Camera` button to use the camera setup wizard to get your first camera added into Frigate.

### Step 3: Configure hardware acceleration (recommended)

Now that you have a working camera configuration, you want to setup hardware acceleration to minimize the CPU required to decode your video streams. See the [hardware acceleration](../configuration/hardware_acceleration_video.md) config reference for examples applicable to your hardware.

Here is an example configuration with hardware acceleration configured to work with most Intel processors with an integrated GPU using the [preset](../configuration/ffmpeg_presets.md):

`docker-compose.yml` (after modifying, you will need to run `docker compose up -d` to apply changes)

```yaml
services:
  frigate:
    ...
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128 # for intel & amd hwaccel, needs to be updated for your hardware
    ...
```

`config.yml`

```yaml
mqtt: ...

cameras:
  name_of_your_camera:
    ffmpeg:
      inputs: ...
      hwaccel_args: preset-vaapi
    detect: ...
```

### Step 4: Configure detectors

By default, Frigate will use a single CPU detector. If you have a USB Coral, you will need to add a detectors section to your config.

`docker-compose.yml` (after modifying, you will need to run `docker compose up -d` to apply changes)

```yaml
services:
  frigate:
    ...
    devices:
      - /dev/bus/usb:/dev/bus/usb # passes the USB Coral, needs to be modified for other versions
      - /dev/apex_0:/dev/apex_0 # passes a PCIe Coral, follow driver instructions here https://github.com/jnicolson/gasket-builder
    ...
```

```yaml
mqtt: ...

detectors: # <---- add detectors
  coral:
    type: edgetpu
    device: usb

cameras:
  name_of_your_camera:
    ffmpeg: ...
    detect:
      enabled: True # <---- turn on detection
      ...
```

More details on available detectors can be found [here](../configuration/object_detectors.md).

Restart Frigate and you should start seeing detections for `person`. If you want to track other objects, they will need to be added according to the [configuration file reference](../configuration/reference.md).

### Step 5: Setup motion masks

Now that you have optimized your configuration for decoding the video stream, you will want to check to see where to implement motion masks. To do this, navigate to the camera in the UI, select "Debug" at the top, and enable "Motion boxes" in the options below the video feed. Watch for areas that continuously trigger unwanted motion to be detected. Common areas to mask include camera timestamps and trees that frequently blow in the wind. The goal is to avoid wasting object detection cycles looking at these areas.

Now that you know where you need to mask, use the "Mask & Zone creator" in the options pane to generate the coordinates needed for your config file. More information about masks can be found [here](../configuration/masks.md).

:::warning

Note that motion masks should not be used to mark out areas where you do not want objects to be detected or to reduce false positives. They do not alter the image sent to object detection, so you can still get tracked objects, alerts, and detections in areas with motion masks. These only prevent motion in these areas from initiating object detection.

:::

Your configuration should look similar to this now.

```yaml
mqtt:
  enabled: False

detectors:
  coral:
    type: edgetpu
    device: usb

cameras:
  name_of_your_camera:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
    motion:
      mask:
        motion_area:
          friendly_name: "Motion mask"
          enabled: true
          coordinates: "0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432"
```

### Step 6: Enable recordings

In order to review activity in the Frigate UI, recordings need to be enabled.

To enable recording video, add the `record` role to a stream and enable it in the config. If record is disabled in the config, it won't be possible to enable it in the UI.

```yaml
mqtt: ...

detectors: ...

cameras:
  name_of_your_camera:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp
          roles:
            - detect
        - path: rtsp://10.0.10.10:554/high_res_stream # <----- Add stream you want to record from
          roles:
            - record
    detect: ...
    record: # <----- Enable recording
      enabled: True
    motion: ...
```

If you don't have separate streams for detect and record, you would just add the record role to the list on the first input.

:::note

If you only define one stream in your `inputs` and do not assign a `detect` role to it, Frigate will automatically assign it the `detect` role. Frigate will always decode a stream to support motion detection, Birdseye, the API image endpoints, and other features, even if you have disabled object detection with `enabled: False` in your config's `detect` section.

If you only plan to use Frigate for recording, it is still recommended to define a `detect` role for a low resolution stream to minimize resource usage from the required stream decoding.

:::

By default, Frigate will retain video of all tracked objects for 10 days. The full set of options for recording can be found [here](../configuration/reference.md).

### Step 7: Complete config

At this point you have a complete config with basic functionality.

- View [common configuration examples](../configuration/index.md#common-configuration-examples) for a list of common configuration examples.
- View [full config reference](../configuration/reference.md) for a complete list of configuration options.

### Follow up

Now that you have a working install, you can use the following documentation for additional features:

1. [Configuring go2rtc](configuring_go2rtc.md) - Additional live view options and RTSP relay
2. [Zones](../configuration/zones.md)
3. [Review](../configuration/review.md)
4. [Masks](../configuration/masks.md)
5. [Home Assistant Integration](../integrations/home-assistant.md) - Integrate with Home Assistant
