---
id: non_root
title: Running as a non-root user
---

# Running as a non-root user

Frigate's services run as an unprivileged user inside the container. The main Frigate process and nginx run as `frigate`, and go2rtc runs as its own more restricted `go2rtc` user. Only the s6 init system and the certsync helper stay root.

The runtime user is uid/gid `1000:1000` by default. You can change it with `PUID`/`PGID`, or bypass Frigate's user handling entirely with Docker's own `user:`.

Most upgrades need nothing. Frigate aligns your volume ownership on the first boot and grants access to your hardware at startup. The sections below cover the cases that need attention: large storage volumes, network storage, and hardware the automatic grant can't reach.

## Run modes

| Mode                | How to enable                   | Ownership of `/config` and `/media/frigate`            | `read_only: true` |
| ------------------- | ------------------------------- | ------------------------------------------------------ | ----------------- |
| Default             | nothing, this is the default    | Aligned to `1000:1000` on first boot                   | Supported         |
| `PUID`/`PGID`       | `PUID=1001`, `PGID=1001`        | Aligned to the values you set, on first boot           | Not supported     |
| Docker-native user  | `user: "1001:1001"`             | You own it, Frigate never changes ownership            | Supported         |
| Root (escape hatch) | `FRIGATE_RUN_AS_ROOT=true`      | Never touched                                          | Not supported     |
| Granular root       | `FRIGATE_ROOT_SERVICES=frigate` | Aligned at boot; recordings and exports also at create | Not supported     |

`PUID`/`PGID` remapping runs `usermod` at startup, which writes to `/etc/passwd`, so it can't work with a read-only root filesystem. That combination stops at startup with a message pointing here. `EXTRA_GROUPS` writes to `/etc/group` and stops the same way; use Docker's `group_add:` instead, which needs no writes inside the container. The default mode and Docker's `user:` mode both work with `read_only: true`; see [Hardened deployment](#hardened-deployment).

`FRIGATE_RUN_AS_ROOT` is matched against the exact lowercase string `true`. `True`, `TRUE`, and `1` are all ignored. `FRIGATE_DEVICE_ACLS` works the same way: only the lowercase string `false` turns off the automatic device grants.

### Keeping individual services root

`FRIGATE_ROOT_SERVICES` takes a comma separated list of `frigate`, `go2rtc`, and `nginx`. A listed service keeps running as root, and everything else about non-root operation still applies: `PUID`/`PGID` remapping, the ownership sweep, and ownership of the files those services create.

There are two reasons to use it:

- Your detector hardware won't work as an unprivileged user, even after reading [Hardware device access](#hardware-device-access). `FRIGATE_ROOT_SERVICES=frigate` keeps the main process and its detectors as root while nginx and go2rtc stay unprivileged.
- You want everything to run as root but still want your files owned by `PUID`/`PGID` instead of root. `FRIGATE_ROOT_SERVICES=frigate,go2rtc,nginx` does that.

Try the device grants and `EXTRA_GROUPS` first. The `frigate` service runs the API and every ffmpeg process that decodes your camera streams, so listing it puts those back on root as well, not just your detectors.

A listed service also stops honoring a [custom ffmpeg or go2rtc build](/configuration/advanced/system#custom-dependencies) kept in `/config`, since that directory stays owned by the unprivileged user and a binary there would run as root. `FRIGATE_RUN_AS_ROOT=true` has no such restriction.

Recordings and exports are owned by `PUID`/`PGID` as soon as they're written, even by a root service. Snapshots, thumbnails, and other files under `clips/` are corrected on each restart, so they can show as root-owned from the host until then. A listed service also keeps root's home directory, so library caches go to the container layer instead of `/config`.

Listing all three services is not the same as `FRIGATE_RUN_AS_ROOT=true`. The escape hatch never touches ownership; the list keeps the ownership handling active. A few more details:

- An unknown name in the list stops the container at startup, rather than silently leaving a service unprivileged.
- Changing the list runs the full ownership sweep once on the next boot.
- If both are set, `FRIGATE_RUN_AS_ROOT=true` wins and the list is ignored.
- With Docker's `user:`, the list does nothing, since the container never has root to keep.

## Migrating an existing install

Volumes from earlier versions of Frigate are owned by root, so ownership has to be aligned with the runtime user once. This happens automatically on the first boot after upgrading.

On large recordings volumes, do it from the host beforehand instead. The boot sweep runs before any service starts, so a multi-terabyte `/media/frigate` can hold the container in startup long enough for Docker's healthcheck to mark it unhealthy, and orchestrators that watch health will restart it mid-sweep. If you'd rather not run the script, raise the healthcheck start period instead (`--start-period=1800s`, or `start_period: 1800s` under `healthcheck:` in compose).

Grab [`fix-permissions.sh`](https://github.com/blakeblackshear/frigate/blob/dev/docker/migration/fix-permissions.sh) from the Frigate repo and dry run it first:

```bash
./fix-permissions.sh --dry-run /path/to/your/config /path/to/your/storage
```

That reports how many entries would change and touches nothing. When it looks right, run it without `--dry-run`:

```bash
./fix-permissions.sh /path/to/your/config /path/to/your/storage
```

Pass `PUID` and `PGID` as the third and fourth arguments if you're not using the default `1000:1000`. The script wraps the same helper the container uses, so the result is identical either way. Override the image it pulls with `FRIGATE_IMAGE=...` if you're not on `stable`.

Both the script and the boot sweep report progress, so you can tell a slow sweep from a stuck one:

```
[INFO] fix-ownership: scanning /media/frigate for ownership mismatches; this may take a while on large filesystems
[WARN] fix-ownership: adjusting ownership of 4823941 entries under /media/frigate
[INFO] fix-ownership: /media/frigate 5% (241197/4823941 entries)
[INFO] fix-ownership: /media/frigate 10% (482394/4823941 entries)
[INFO] fix-ownership: finished /media/frigate in 12m 4s
```

The scan has no percentage because the total isn't known until it finishes. Watch the boot sweep with `docker logs -f frigate`.

Once the volumes are aligned, start Frigate normally. A file at `/config/.permissions_version` records what was done, so later boots skip the sweep unless you change `PUID`/`PGID`.

If something under your volumes can't be chowned, a read-only btrfs snapshot directory for example, the sweep warns and names the path and doesn't record the migration as finished. It retries on the next boot instead. Either move those paths outside `/media/frigate` or expect the scan to repeat.

### Network storage

Recordings on a NAS behave differently, so check what you have before migrating:

```bash
findmnt -T /path/to/your/storage -o TARGET,FSTYPE,OPTIONS
```

**SMB and CIFS** don't store per-file ownership at all. It's synthesized from the mount options, so a per-file `chown` fails and isn't needed. Mount the share as the uid and gid Frigate runs as, and every file already looks correct to the sweep:

```
//nas/frigate /media/frigate cifs credentials=/root/.smb,uid=1000,gid=1000,file_mode=0664,dir_mode=0775 0 0
```

**NFS** exports default to `root_squash` on most servers, which maps the container's root to `nobody`. The chown then fails, you get `[WARN] fix-ownership: some entries under /media/frigate could not be updated`, and since the sweep didn't finish it doesn't record the migration, so it retries on every boot.

The best fix is to not chown over NFS at all. Do it on the server, where there's no squash and no network round trip per file:

```bash
# on the NAS itself, against the exported directory
chown -R 1000:1000 /export/frigate
```

Frigate's sweep then finds nothing to change and records the migration normally. If you can't get a shell on the server, you can export temporarily with `no_root_squash`, migrate, and put it back, or leave ownership alone and set `PUID`/`PGID` to whichever uid already owns the files.

Either way the uid has to mean the same thing on both machines. NFS sends numeric uids, so container uid 1000 is uid 1000 on the server no matter what the usernames are.

Expect the first boot to be slow even when nothing needs changing, because checking ownership costs a round trip per file. That's a one-time cost. **If the sweep runs on every boot rather than once, ownership isn't actually being applied**, and the warning above will say so.

Keep `/config` on local storage either way. Frigate's database is SQLite and network shares handle its locking poorly. That's a long-standing recommendation, not something running non-root introduces.

## Rolling back

Set `FRIGATE_RUN_AS_ROOT=true` and restart. Everything runs as root again, exactly as it did before. This is the fastest way to get a broken install running while you sort out a device permission problem.

The escape hatch never changes ownership, and it clears the record of the last sweep on startup, so switching back to non-root later corrects whatever root created in the meantime. Toggling in either direction is safe.

## Hardware device access

Frigate grants the runtime user access to your devices at startup. Pass your hardware with `--device` (or `devices:` in compose) and detection and hardware acceleration work with no group or udev setup on the host.

The grant covers the common accelerator and camera nodes: GPU render nodes, Intel/AMD NPUs (`/dev/accel`), Coral, Hailo, Rockchip, Jetson, `/dev/video*`, and the USB bus. For hardware it misses, add your own paths with `DEVICE_ACL_PATHS`, a comma separated list of globs:

```yaml
environment:
  DEVICE_ACL_PATHS: "/dev/mydev*"
```

Set `FRIGATE_DEVICE_ACLS=false` if you manage device permissions yourself and want Frigate to leave them alone.

Frigate grants access by adding an ACL entry for the runtime users. The device's owner and mode are unchanged, and nothing is made world accessible. One thing to know: `--device` nodes belong to the container, but a bind mounted `/dev/bus/usb` (the usual Coral USB setup) shares the host's device nodes, so the entry is visible on the host until udev recreates the node.

### Manual setup

You only need this for hardware the automatic grant can't reach, or for Docker's `user:` mode, where there's no root startup to do the granting.

Your accelerator most likely worked in older versions because Frigate ran as root. Device nodes are usually owned by `root:root`, and root either matches the group or skips the check entirely. The runtime user does neither, so a device that worked before can become unreadable with no change to your Frigate config.

#### Read what your device requires

Find the node and look at its owner, group, and mode:

```bash
ls -ln /dev/dri/renderD128
crw-rw---- 1 0 105 226, 128 Jul  5 10:12 /dev/dri/renderD128
#          ^ ^  ^
#          | |  group GID 105
#          | owner UID 0 (root)
#          mode: owner rw, group rw, other none
```

Then work out which of the three permission sets applies to the runtime user. It isn't the owner, since that's root, so it gets the group bits if it belongs to that GID and otherwise falls through to "other". In the example above "other" is empty, so without membership in group 105 the runtime user can't open the node.

Watch for a node that looks permissive but isn't. A USB Coral defaults to this:

```bash
ls -ln /dev/bus/usb/004/003
crw-rw-r-- 1 0 0 189, 386 Jul  5 10:12 /dev/bus/usb/004/003
```

The group is `0`, so "other" applies to the runtime user, and "other" here is read only. `libedgetpu` needs to write to the node, so detection fails with `No EdgeTPU was detected` as though no Coral were attached. Read access alone isn't enough for most accelerators.

#### Grant access

Give the runtime user the GID with `EXTRA_GROUPS`, a comma separated list of numeric host GIDs. They're added to both the `frigate` and `go2rtc` users, which matters because go2rtc needs its own render and video access for hardware accelerated restreams.

```yaml
environment:
  EXTRA_GROUPS: "105,44" # host render and video GIDs
```

Use numeric GIDs from the host, not names. Group names don't have to match between the host and the container, and the kernel only checks the number. If the GID doesn't exist in the image, Frigate creates a placeholder group for it.

Two things that look like they should work but don't:

- Docker's `group_add` has no effect in the default or `PUID` modes. Frigate rebuilds the supplementary group list from `/etc/group` when it drops privileges, which discards what Docker passed in. It is the right tool with Docker's `user:`, where no privilege drop happens and `EXTRA_GROUPS` does nothing.
- `privileged: true` doesn't help. It grants capabilities to root, and the runtime user isn't root, so the file permissions on the node still apply.

If the node's group is `root` or the mode denies the group, no `EXTRA_GROUPS` value will help. You need a udev rule first.

#### Verify access

Check the group landed, then check the runtime user can open the node. Test for write, not just read:

```bash
docker exec frigate id frigate
docker exec frigate /command/s6-setuidgid frigate sh -c 'test -w /dev/dri/renderD128 && echo ok'
docker exec frigate /command/s6-setuidgid go2rtc  sh -c 'test -w /dev/dri/renderD128 && echo ok'
```

A permission check is only a proxy for the driver working. These exercise the real libraries as the runtime user:

```bash
docker exec frigate /command/s6-setuidgid frigate vainfo
docker exec frigate /command/s6-setuidgid frigate python3 -c "import openvino as ov; print(ov.Core().available_devices)"
```

`vainfo` should reach `va_openDriver() returns 0` and list profiles. Complaints about `XDG_RUNTIME_DIR` or an X server above that are normal. OpenVINO should list `GPU`; if it returns only `CPU`, detection has fallen back and inference will be much slower without an error in the log.

To tell a permissions problem from anything else, start the container once with `FRIGATE_RUN_AS_ROOT=true`. If the device works as root and not otherwise, it's node permissions and a udev rule is the fix. If it's missing either way, the problem is your device mapping or the host, and isn't related to running non-root.

#### udev rules by device

Rules go in `/etc/udev/rules.d/` on the host and take effect after:

```bash
sudo udevadm control --reload-rules && sudo udevadm trigger
```

A device that's already connected sometimes keeps its original ownership through a trigger. If `ls -ln` doesn't show the new group, replug it, or reboot for a built-in device.

**Coral USB** needs two rules, because the device re-enumerates after loading firmware. It appears as Global Unichip `1a6e` before and Google `18d1` after, with a different node each time. A rule covering only `1a6e` gives you a Coral that starts up once and then disappears mid-run.

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="1a6e", GROUP="plugdev", MODE="0664"
SUBSYSTEM=="usb", ATTRS{idVendor}=="18d1", GROUP="plugdev", MODE="0664"
```

Map the whole `/dev/bus/usb` rather than a single node, for the same reason. Most hosts put `plugdev` at GID 46 and the image agrees, so a USB Coral often needs no `EXTRA_GROUPS` entry. Confirm with `getent group plugdev` and add the number if your host differs.

**Coral PCIe** is often `crw------- root root`, which only root can open:

```
SUBSYSTEM=="apex", MODE="0660", GROUP="apex"
```

Create the group with `sudo groupadd -f apex`, then add its GID to `EXTRA_GROUPS`.

**Hailo** works the same way. Grant `/dev/hailo0` a group and add that GID:

```
SUBSYSTEM=="hailo_chardev", MODE="0660", GROUP="hailo"
```

**Intel and AMD GPUs** usually need nothing beyond `EXTRA_GROUPS`, since most distributions ship a `render` group that owns `/dev/dri/renderD128`. The GID often differs between the host and the image, so pass the host's number rather than assuming the name resolves. Debian based images have no `render` group at all.

#### Quick reference

What each device needs when you're setting it up by hand. The automatic grant covers most of these already, so start here only if it didn't.

| Hardware                  | Device(s)                                                   | What non-root needs                                                                                              |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Intel/AMD GPU (VAAPI/QSV) | `/dev/dri/renderD128`                                       | Host render GID in `EXTRA_GROUPS`, from `getent group render`                                                    |
| Intel/AMD NPU             | `/dev/accel`                                                | udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                      |
| Coral USB                 | `/dev/bus/usb`                                              | udev rules for both `1a6e` and `18d1`; usually already covered by `plugdev` 46                                   |
| Coral PCIe                | `/dev/apex_0`                                               | udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                      |
| Hailo                     | `/dev/hailo0`                                               | udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                      |
| NVIDIA                    | nvidia runtime                                              | Nothing, works with the nvidia-container-toolkit defaults                                                        |
| AMD ROCm                  | `/dev/kfd`, `/dev/dri`                                      | Host `video` and `render` GIDs in `EXTRA_GROUPS`                                                                 |
| Raspberry Pi              | `/dev/video11`                                              | Host `video` GID in `EXTRA_GROUPS`                                                                               |
| Rockchip                  | `/dev/dri`, `/dev/dma_heap`, `/dev/rga`, `/dev/mpp_service` | Commonly `root:root` `0600`, so all four need udev rules. If you can't grant all four, use `FRIGATE_RUN_AS_ROOT` |
| Axera (AXCL)              | `/dev/ax_*` per the AXCL driver docs                        | Unverified. Check node ownership on your hardware before assuming this works                                     |
| Synaptics SL1680          | per the Synaptics docs                                      | Unverified                                                                                                       |
| MemryX                    | per the MemryX docs                                         | Still requires `privileged: true`, which means root. Out of scope for non-root operation                         |
| Nvidia Jetson             | nvidia runtime plus Jetson nodes                            | Unverified. The nvidia runtime handles mapping, but check `/dev/nvhost-*` ownership on your board                |
| VeriSilicon NPU (Teflon)  | per the driver, commonly `/dev/galcore`                     | Unverified. Check node ownership on your hardware before assuming this works                                     |
| CPU detector              | none                                                        | Nothing, no device is opened                                                                                     |
| ZMQ detector              | none                                                        | Nothing, inference happens over a socket                                                                         |
| Apple Silicon             | none                                                        | Nothing, the NPU client runs on the host and Frigate reaches it over the network                                 |

## Hardened deployment

A read-only root filesystem means the container can't modify itself, only the volumes you give it. It works in the default mode and under Docker's `user:`, but not with `PUID`/`PGID` or `EXTRA_GROUPS`, which both need to write to `/etc`.

Start with the default mode. It keeps go2rtc on its own restricted user and still grants your hardware automatically, at the cost of a short root startup that finishes before any service runs.

```yaml
services:
  frigate:
    container_name: frigate
    image: ghcr.io/blakeblackshear/frigate:stable
    restart: unless-stopped
    stop_grace_period: 30s
    read_only: true
    security_opt:
      - no-new-privileges:true
    shm_size: "512mb" # size for your cameras, see the shm-size calculation
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128 # your hardware, granted at startup
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /path/to/your/config:/config
      - /path/to/your/storage:/media/frigate
    tmpfs:
      - /tmp:size=256m
      - /tmp/cache:size=1000000000 # recording segments, sized as before
      - /run:exec,nosuid,nodev,mode=0755,size=16m
    ports:
      - "8971:8971"
      - "8554:8554" # RTSP feeds
      - "8555:8555/tcp" # WebRTC over tcp
      - "8555:8555/udp" # WebRTC over udp
```

`/run` has to allow `exec`. With a read-only root filesystem s6 copies its service scripts into `/run` and runs them from there, and tmpfs mounts default to `noexec`. The equivalent for `docker run` is `--tmpfs /run:exec,nosuid,nodev,mode=0755`. Spelling out `nosuid` and `nodev` matters: passing any tmpfs options replaces Docker's defaults instead of adjusting them, so asking for `exec` alone would drop those two as well.

Size `/tmp` deliberately. It now carries nginx's config copy and its five proxy temp directories as well as the recording cache. Keeping `/tmp/cache` as its own nested tmpfs, as above, leaves your existing [cache sizing](/frigate/installation#storage) untouched and adds a small allowance for nginx. If you'd rather use one tmpfs over all of `/tmp`, size it as your cache budget plus roughly 50MB, or recordings begin failing once the cache fills.

The self signed certificate is written to `/config/tls`, which stays writable. Certificates you mount at `/etc/letsencrypt/live/frigate` work unchanged and still take precedence.

Soak a hardened deployment for 24 hours against real cameras before relying on it. A read-only root filesystem turns an occasional write into a failure that startup won't reveal.

### Never starting as root

To remove root from the container entirely, add Docker's `user:`:

```yaml
    user: "1000:1000" # NOT compatible with PUID/PGID, see the run modes table
```

Two things change. Every service then runs as that one uid, so go2rtc no longer gets its own restricted user. And the startup device grants can't run, because there is no root to run them, so pass your hardware with `group_add:` or a udev rule per [Manual setup](#manual-setup) instead. `/config` and `/media/frigate` have to be owned by that uid already, since Frigate never adjusts ownership in this mode. Switching an existing install over also leaves `/config/go2rtc_homekit.yml` owned by the go2rtc user, which this mode can't write; `chown` it to your uid or HomeKit pairing changes stop persisting. Frigate warns and starts either way.

This mode can also take `cap_drop: [ALL]`, which the default mode cannot: starting as root needs `CAP_CHOWN` for the ownership sweep, `CAP_SETUID` and `CAP_SETGID` to drop to the runtime user, and `CAP_FOWNER` for the device grants.

### Per-variant exceptions

- **Rockchip** needs `- /sys/:/sys/:ro` alongside its device nodes, in addition to everything above.
- **MemryX** and **QNAP Container Station** still require `privileged: true` per their own documentation, which can't be combined with this layout.

## Known limitations

`telemetry.stats.network_bandwidth` uses nethogs, which needs `CAP_NET_ADMIN` and `CAP_NET_RAW` and therefore root. The stat is turned off automatically when Frigate isn't running as root, with one warning in the log. Use `FRIGATE_ROOT_SERVICES=frigate` (or `FRIGATE_RUN_AS_ROOT=true`) if you need it.

go2rtc's ffmpeg processes no longer appear in Intel GPU stats. Frigate reads per-process GPU usage from `/proc/<pid>/fdinfo`, which the kernel won't let one user read for another user's processes, so anything go2rtc spawns is invisible to it. Overall GPU utilization is unaffected.

If you mount your own TLS certificate at `/etc/letsencrypt/live/frigate`, the private key has to be readable by the runtime user, which runs nginx. Frigate hands the key to that user at startup if the mount is writable; on a read-only mount, make the key readable by uid 1000 (or your `PUID`) yourself.

If you're debugging nginx, run the config check as the runtime user with stdout discarded:

```bash
docker exec frigate /command/s6-setuidgid frigate bash -c 'nginx -t -c /tmp/nginx/conf/nginx.conf >/dev/null'
```

Running `nginx -t` as root hands nginx's runtime directories to root as a side effect, which breaks the running workers until the service restarts, and the config's `/dev/stdout` logs can't be reopened through a root-owned `docker exec` pipe. The results print on stderr either way.
