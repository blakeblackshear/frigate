---
id: ha_network_storage
title: Home Assistant storage
---

Frigate's media (`/media/frigate`) can be stored on a network share or a separate local disk (internal or USB) instead of the Home Assistant system disk.

## Prerequisites

### Network storage

- Home Assistant 2023.6 or newer is installed
- Running Home Assistant Operating System 10.2 or newer OR Running Supervised with latest os-agent installed (this is required for supervised install)

### Local disk

- Home Assistant 2026.11 or newer is installed
- The disk is already formatted, ideally as ext4 (Home Assistant does not format disks). Avoid FAT32, exFAT, and NTFS, which do not support Linux file permissions.

## Setting Up Storage For Frigate

### Initial Setup

1. Stop the Frigate App

### Move current data

Keeping the current data is optional, but `/media/frigate` must be moved or deleted so Home Assistant can mount the storage there. The database and config are stored elsewhere and are not affected.

#### If you want to keep the current data

1. Rename the /media/frigate folder to /media/frigate_tmp

#### If you don't want to keep the current data

1. Delete the /media/frigate folder and all of its contents

### Add the storage

1. Go to **Settings -> System -> Storage -> Add storage**
2. Name the storage `frigate` (this is required)
3. Choose usage `media`
4. Choose the type:
   - For network storage, choose `Samba/Windows (CIFS)` or `Network File System (NFS)` and fill out the additional required info for your particular NAS
   - For a local disk, choose `Local disk` and select the disk to use
5. Connect
6. Move files from `/media/frigate_tmp` to `/media/frigate` if they were kept in previous step
7. Start the Frigate App
