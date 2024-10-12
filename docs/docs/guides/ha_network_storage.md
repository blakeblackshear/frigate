---
id: ha_network_storage
title: Home Assistant network storage
---

As of Home Assistant Core 2023.6, Network Mounted Storage is supported for addons.

## Setting Up Remote Storage For Frigate

### Prerequisites

- HA Core 2023.6 or newer is installed
- Running HA OS 10.2 or newer OR Running Supervised with latest os-agent installed (this is required for supervised install)

### Initial Setup

1. Stop the Frigate addon
2. Update your [config](configuration/index.md) so the DB is stored in the /config directory by adding:

```yaml
database:
  path: /config/frigate.db
```

### Move current data

Keeping the current data is optional, but the data will need to be moved regardless so the share can be created successfully.

#### If you want to keep the current data

1. Move the frigate.db, frigate.db-shm, frigate.db-wal files to the /config directory
2. Rename the /media/frigate folder to /media/frigate_tmp

#### If you don't want to keep the current data

1. Delete the /media/frigate folder and all of its contents

### Create the media share

1. Go to **Settings -> System -> Storage -> Add Network Storage**
2. Name the share `frigate` (this is required)
3. Choose type `media`
4. Fill out the additional required info for your particular NAS
5. Connect
6. Move files from `/media/frigate_tmp` to `/media/frigate` if they were kept in previous step
7. Start the Frigate addon
