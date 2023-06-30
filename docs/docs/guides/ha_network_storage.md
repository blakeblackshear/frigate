---
id: ha_network_storage
title: HA Network Storage
---

As of HomeAsisstant Core 2023.6, Network Mounted Storage is supported for addons.

## Setting Up Remote Storage For Frigate

### Prerequisites

- HA Core 2023.6 or newer is installed
- Running HA OS 10.2 or newer OR Running Supervised with latest os-agent installed (this is required for superivsed install)

### Setup

1. Stop the Frigate addon
2. Update your config so the DB is stored in the /config directory by adding:
```yaml
database:
  path: /config/frigate.db
```
3. Move the frigate.db, frigate.db-shm, frigate.db-wal files to the /config directory
4. Go to **Settings -> System -> Storage -> Add Network Storage**
5. Name the share `frigate` (this is required)
6. Choose type `media`
7. Fill out the additional required info for your particular NAS
8. Connect
9. Start the Frigate addon
