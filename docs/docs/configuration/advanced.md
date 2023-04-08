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
- `frigate.zeroconf`
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

Event and recording information is managed in a sqlite database at `/media/frigate/frigate.db`. If that database is deleted, recordings will be orphaned and will need to be cleaned up manually. They also won't show up in the Media Browser within Home Assistant.

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

## Custom ffmpeg build

Included with Frigate is a build of ffmpeg that works for the vast majority of users. However, there exists some hardware setups which have incompatibilities with the included build. In this case, a docker volume mapping can be used to overwrite the included ffmpeg build with an ffmpeg build that works for your specific hardware setup.

To do this:

1. Download your ffmpeg build and uncompress to a folder on the host (let's use `/home/appdata/frigate/custom-ffmpeg` for this example).
2. Update your docker-compose or docker CLI to include `'/home/appdata/frigate/custom-ffmpeg':'/usr/lib/btbn-ffmpeg':'ro'` in the volume mappings.
3. Restart Frigate and the custom version will be used if the mapping was done correctly.

NOTE: The folder that is mapped from the host needs to be the folder that contains `/bin`. So if the full structure is `/home/appdata/frigate/custom-ffmpeg/bin/ffmpeg` then `/home/appdata/frigate/custom-ffmpeg` needs to be mapped to `/usr/lib/btbn-ffmpeg`.
