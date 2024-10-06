---
id: advanced
title: Advanced Options
sidebar_label: Advanced Options
---

### `logger`

Change the default log level for troubleshooting purposes.

```yaml
logger:
  # Optional: default log level (default: shown below)
  default: info
  # Optional: module by module log level configuration
  logs:
    frigate.mqtt: error
```

Available log levels are: `debug`, `info`, `warning`, `error`, `critical`

Examples of available modules are:

- `frigate.app`
- `frigate.mqtt`
- `frigate.object_detection`
- `detector.<detector_name>`
- `watchdog.<camera_name>`
- `ffmpeg.<camera_name>.<sorted_roles>` NOTE: All FFmpeg logs are sent as `error` level.

### `environment_vars`

This section can be used to set environment variables for those unable to modify the environment of the container (ie. within HassOS)

Example:

```yaml
environment_vars:
  VARIABLE_NAME: variable_value
```

### `database`

Tracked object and recording information is managed in a sqlite database at `/config/frigate.db`. If that database is deleted, recordings will be orphaned and will need to be cleaned up manually. They also won't show up in the Media Browser within Home Assistant.

If you are storing your database on a network share (SMB, NFS, etc), you may get a `database is locked` error message on startup. You can customize the location of the database in the config if necessary.

This may need to be in a custom location if network storage is used for the media folder.

```yaml
database:
  path: /path/to/frigate.db
```

### `model`

If using a custom model, the width and height will need to be specified.

Custom models may also require different input tensor formats. The colorspace conversion supports RGB, BGR, or YUV frames to be sent to the object detector. The input tensor shape parameter is an enumeration to match what specified by the model.

| Tensor Dimension | Description    |
| :--------------: | -------------- |
|        N         | Batch Size     |
|        H         | Model Height   |
|        W         | Model Width    |
|        C         | Color Channels |

| Available Input Tensor Shapes |
| :---------------------------: |
|            "nhwc"             |
|            "nchw"             |

```yaml
# Optional: model config
model:
  path: /path/to/model
  width: 320
  height: 320
  input_tensor: "nhwc"
  input_pixel_format: "bgr"
```

#### `labelmap`

:::warning

If the labelmap is customized then the labels used for alerts will need to be adjusted as well. See [alert labels](../configuration/review.md#restricting-alerts-to-specific-labels) for more info.

:::

The labelmap can be customized to your needs. A common reason to do this is to combine multiple object types that are easily confused when you don't need to be as granular such as car/truck. By default, truck is renamed to car because they are often confused. You cannot add new object types, but you can change the names of existing objects in the model.

```yaml
model:
  labelmap:
    2: vehicle
    3: vehicle
    5: vehicle
    7: vehicle
    15: animal
    16: animal
    17: animal
```

Note that if you rename objects in the labelmap, you will also need to update your `objects -> track` list as well.

:::warning

Some labels have special handling and modifications can disable functionality.

`person` objects are associated with `face` and `amazon`

`car` objects are associated with `license_plate`, `ups`, `fedex`, `amazon`

:::

## Network Configuration

Changes to Frigate's internal network configuration can be made by bind mounting nginx.conf into the container. For example:

```yaml
services:
  frigate:
    container_name: frigate
    ...
    volumes:
      ...
      - /path/to/your/nginx.conf:/usr/local/nginx/conf/nginx.conf
```

### Enabling IPv6

IPv6 is disabled by default, to enable IPv6 listen.gotmpl needs to be bind mounted with IPv6 enabled. For example:

```
{{ if not .enabled }}
# intended for external traffic, protected by auth
listen 8971;
{{ else }}
# intended for external traffic, protected by auth
listen 8971 ssl;

# intended for internal traffic, not protected by auth
listen 5000;
```

becomes

```
{{ if not .enabled }}
# intended for external traffic, protected by auth
listen [::]:8971 ipv6only=off;
{{ else }}
# intended for external traffic, protected by auth
listen [::]:8971 ipv6only=off ssl;

# intended for internal traffic, not protected by auth
listen [::]:5000 ipv6only=off;
```

## Custom Dependencies

### Custom ffmpeg build

Included with Frigate is a build of ffmpeg that works for the vast majority of users. However, there exists some hardware setups which have incompatibilities with the included build. In this case, statically built ffmpeg binary can be downloaded to /config and used.

To do this:

1. Download your ffmpeg build and uncompress to the Frigate config folder.
2. Update your docker-compose or docker CLI to include `'/home/appdata/frigate/custom-ffmpeg':'/usr/lib/btbn-ffmpeg':'ro'` in the volume mappings.
3. Restart Frigate and the custom version will be used if the mapping was done correctly.

NOTE: The folder that is set for the config needs to be the folder that contains `/bin`. So if the full structure is `/home/appdata/frigate/custom-ffmpeg/bin/ffmpeg` then the `ffmpeg -> path` field should be `/config/custom-ffmpeg/bin`.

### Custom go2rtc version

Frigate currently includes go2rtc v1.9.4, there may be certain cases where you want to run a different version of go2rtc.

To do this:

1. Download the go2rtc build to the /config folder.
2. Rename the build to `go2rtc`.
3. Give `go2rtc` execute permission.
4. Restart Frigate and the custom version will be used, you can verify by checking go2rtc logs.

## Validating your config.yml file updates

When frigate starts up, it checks whether your config file is valid, and if it is not, the process exits. To minimize interruptions when updating your config, you have three options -- you can edit the config via the WebUI which has built in validation, use the config API, or you can validate on the command line using the frigate docker container.

### Via API

Frigate can accept a new configuration file as JSON at the `/config/save` endpoint. When updating the config this way, Frigate will validate the config before saving it, and return a `400` if the config is not valid.

```bash
curl -X POST http://frigate_host:5000/config/save -d @config.json
```

if you'd like you can use your yaml config directly by using [`yq`](https://github.com/mikefarah/yq) to convert it to json:

```bash
yq r -j config.yml | curl -X POST http://frigate_host:5000/config/save -d @-
```

### Via Command Line

You can also validate your config at the command line by using the docker container itself. In CI/CD, you leverage the return code to determine if your config is valid, Frigate will return `1` if the config is invalid, or `0` if it's valid.

```bash
docker run                                \
  -v $(pwd)/config.yml:/config/config.yml \
  --entrypoint python3                    \
  ghcr.io/blakeblackshear/frigate:stable  \
  -u -m frigate                           \
  --validate-config
```
