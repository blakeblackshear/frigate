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
3. Go to **Settings -> System -> Storage -> Add Network Storage**
4. Name the share `frigate` (this is required)
5. Choose type `media`
6. Fill out the additional required info for your particular NAS
7. Connect
8. Start the Frigate addon
