---
id: advanced
title: Advanced Options
sidebar_label: Advanced Options
---

## Advanced configuration

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
- `frigate.edgetpu`
- `frigate.zeroconf`
- `detector.<detector_name>`
- `watchdog.<camera_name>`
- `ffmpeg.<camera_name>.<sorted_roles>` NOTE: All FFmpeg logs are sent as `error` level.

### `environment_vars`

This section can be used to set environment variables for those unable to modify the environment of the container (ie. within HassOS)

### `database`

Event and recording information is managed in a sqlite database at `/media/frigate/frigate.db`. If that database is deleted, recordings will be orphaned and will need to be cleaned up manually. They also won't show up in the Media Browser within Home Assistant.

If you are storing your database on a network share (SMB, NFS, etc), you may get a `database is locked` error message on startup. You can customize the location of the database in the config if necessary.

This may need to be in a custom location if network storage is used for the media folder.

### `model`

If using a custom model, the width and height will need to be specified.

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
