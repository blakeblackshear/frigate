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
2. Go to **Settings -> System -> Storage -> Add Network Storage**
3. Name the share `frigate` (this is required)
4. Fill out the additional required info for your particular NAS
5. Connect
6. Start the Frigate addon
