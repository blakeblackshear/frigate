---
id: non_root
title: Running as a non-root user
---

Frigate's services run as an unprivileged user inside the container. The main Frigate process and nginx run as `frigate`, and go2rtc runs as its own more restricted `go2rtc` user. Only the s6 init system and the certsync helper stay root.

By default the runtime user is uid/gid `1000:1000`. You can change it with `PUID`/`PGID`, or bypass Frigate's user handling entirely with Docker's own `user:`.

## Run modes

| Mode                             | How to enable                          | Ownership of `/config` and `/media/frigate`                | `read_only: true` |
| -------------------------------- | -------------------------------------- | ---------------------------------------------------------- | ----------------- |
| Default                          | nothing, this is the default           | Aligned to `1000:1000` on first boot                       | Not supported     |
| `PUID`/`PGID`                    | `PUID=1001`, `PGID=1001`               | Aligned to the values you set, on first boot               | Not supported     |
| Docker-native user               | `user: "1001:1001"`                    | You own it, Frigate never changes ownership                | Not supported     |
| Root (escape hatch)              | `FRIGATE_RUN_AS_ROOT=true`             | Never touched                                              | Not supported     |

`PUID`/`PGID` remapping runs `usermod` at startup, which writes to `/etc/passwd`, so it can't work with a read-only root filesystem. That combination fails fast at startup with a message pointing here rather than failing obscurely later.

`FRIGATE_RUN_AS_ROOT` is matched against the exact lowercase string `true`. `True`, `TRUE`, and `1` are all ignored.

## Migrating an existing install

Volumes created by earlier versions of Frigate are owned by root. Ownership has to be aligned with the runtime user once.

There are two independent prerequisites to upgrading, and doing one without the other is the most common way this goes wrong. This section covers volume ownership. If you use a Coral, a GPU, or any other accelerator, read [Hardware device access](#hardware-device-access) as well: those devices are reachable today because Frigate runs as root, and they need host side work that has nothing to do with your volumes.

This happens automatically on the first boot after upgrading, but on large recordings volumes it's much better to do it from the host beforehand. The boot sweep runs before any service starts, so a multi-terabyte `/media/frigate` can hold the container in startup long enough for Docker's healthcheck to mark it unhealthy, and orchestrators that react to health will restart it mid-sweep. If you'd rather not run the script, raise the healthcheck start period instead (`--start-period=1800s`, or `start_period: 1800s` under `healthcheck:` in compose).

Grab `fix-permissions.sh` from `docker/migration/` in the Frigate repo and dry run it first:

```bash
./fix-permissions.sh --dry-run /path/to/your/config /path/to/your/storage
```

That reports how many entries would change and touches nothing. When it looks right, run it without `--dry-run`:

```bash
./fix-permissions.sh /path/to/your/config /path/to/your/storage
```

Both the script and the boot sweep report progress as they go, so you can tell a slow sweep apart from a stuck one:

```
[INFO] fix-ownership: scanning /media/frigate for ownership mismatches; this may take a while on large filesystems
[WARN] fix-ownership: adjusting ownership of 4823941 entries under /media/frigate
[INFO] fix-ownership: /media/frigate 5% (241197/4823941 entries)
[INFO] fix-ownership: /media/frigate 10% (482394/4823941 entries)
[INFO] fix-ownership: finished /media/frigate in 12m 4s
```

The scan has no percentage behind it because the total isn't known until it finishes. Watch the boot sweep with `docker logs -f frigate`.

Pass `PUID` and `PGID` as the third and fourth arguments if you're not using the default `1000:1000`. The script wraps the same `fix-ownership` helper the container uses, so it's the same logic either way. Override the image it pulls with `FRIGATE_IMAGE=...` if you're not on `stable`.

Once the volumes are aligned, start Frigate normally. A sentinel at `/config/.permissions_version` records what was done, so later boots skip the sweep entirely unless you change `PUID`/`PGID`.

`lost+found` is left alone. It belongs to the filesystem rather than to Frigate, and `fsck` recovers fragments of arbitrary files into it under root-only permissions, so handing it to the runtime user would expose whatever ends up there. Expect to see it still owned by root afterward, on any volume that's a dedicated mount.

If something under your volumes genuinely can't be chowned, a read-only btrfs snapshot directory for example, the sweep warns and names the path, and it deliberately doesn't write the sentinel. That means it retries on the next boot rather than recording a migration that didn't finish. Either move those paths outside `/media/frigate` or expect the scan to repeat.

### Network storage

Storing recordings on a NAS is common, and ownership behaves differently there. Check what you have before migrating anything:

```bash
findmnt -T /path/to/your/storage -o TARGET,FSTYPE,OPTIONS
```

**SMB and CIFS** don't store ownership per file at all. It's synthesized from the mount options, so a per-file `chown` fails, and you don't need one. Mount the share as the uid and gid Frigate will run as, and every file already looks correct to the sweep:

```
//nas/frigate /media/frigate cifs credentials=/root/.smb,uid=1000,gid=1000,file_mode=0664,dir_mode=0775 0 0
```

**NFS** exports default to `root_squash` on most servers, which maps the container's root to `nobody`. The recursive chown then fails outright, you get `[WARN] fix-ownership: some entries under /media/frigate could not be updated`, and because the sweep didn't finish it deliberately doesn't write the sentinel, so it retries on the next boot and every boot after.

The best fix is to not chown over NFS at all. Do it on the server, locally, where there's no squash and no network round trip per file:

```bash
# on the NAS itself, against the exported directory
chown -R 1000:1000 /export/frigate
```

Frigate's own sweep then finds nothing to change and records the sentinel normally. If you can't get a shell on the server, the alternatives are to export temporarily with `no_root_squash`, migrate, and put it back, or to leave ownership alone and set `PUID`/`PGID` to whichever uid already owns the files.

Either way the uid has to mean the same thing on both machines. NFS sends numeric uids, so container uid 1000 is simply uid 1000 on the server no matter what the usernames are.

Expect the first boot to be slow even when nothing needs changing, because verifying ownership costs a round trip per file. The sentinel makes that a one-time price. **If the sweep runs on every boot rather than once, ownership isn't actually being applied**, and the warning above will tell you so.

Keep `/config` on local storage regardless. Frigate's database is SQLite and network shares handle its locking poorly. That's a pre-existing recommendation, not something running non-root introduces.

## Rolling back

Set `FRIGATE_RUN_AS_ROOT=true` and restart. Everything runs as root again, exactly as it did before. This is the fastest way to get a broken install running while you work out a device permission problem, and it's the recommended fallback for hardware you can't grant access to.

The escape hatch never changes ownership, and it deletes the sweep sentinel on startup, so switching back to non-root later re-sweeps whatever root created in the meantime. Toggling in either direction is safe.

## Hardware device access

This is the part most likely to need work on your host, and it catches people out for a specific reason: your accelerator almost certainly works today *because* Frigate runs as root. Device nodes are commonly owned by `root:root`, and root either matches the file's group or bypasses the check entirely. The runtime user does neither, so a node that was fine yesterday can become unreadable with no change to your Frigate config at all.

Nothing inside the container can fix that. Device node permissions are set by the host, so the fix belongs there too.

### Read what your device actually requires

Find the node and look at its owner, group, and mode:

```bash
ls -ln /dev/dri/renderD128
crw-rw---- 1 0 105 226, 128 Jul  5 10:12 /dev/dri/renderD128
#          ^ ^  ^
#          | |  group GID 105
#          | owner UID 0 (root)
#          mode: owner rw, group rw, other none
```

Then ask which of the three permission sets the runtime user lands in. It isn't the owner (that's root), so it gets the group bits only if it belongs to that GID, and otherwise falls through to "other". In the example above "other" is empty, so without membership in group 105 the runtime user cannot open the node at all.

The trap is a node that looks permissive but isn't. A USB Coral defaults to this:

```bash
ls -ln /dev/bus/usb/004/003
crw-rw-r-- 1 0 0 189, 386 Jul  5 10:12 /dev/bus/usb/004/003
```

That's group `0`, so "other" applies to everyone else, and "other" here is read only. `libedgetpu` needs to *write* to the node, so detection fails with `No EdgeTPU was detected` as though no Coral were attached. Read access alone is not enough for most accelerators.

### Grant access

Give the runtime user the GID with `EXTRA_GROUPS`, a comma separated list of numeric host GIDs. They're added to both the `frigate` and `go2rtc` users at startup, which matters because go2rtc needs render and video access of its own to run hardware accelerated restreams.

```yaml
environment:
  EXTRA_GROUPS: "105,44" # host render and video GIDs
```

Use numeric GIDs from the host, not names. Group names don't have to agree between the host and the container, and the kernel only checks the number. If the GID doesn't exist in the image, Frigate creates a placeholder group for it.

Two things that look like they should work and don't:

- Docker's `group_add` has no effect in the default or `PUID` modes. `s6-setuidgid` rebuilds the supplementary group list from `/etc/group` when it drops privileges, which discards whatever Docker gave the init process. It *is* the right tool with Docker-native `user:`, where no privilege drop happens and `EXTRA_GROUPS` in turn does nothing.
- `privileged: true` doesn't help. It grants capabilities to root, and the runtime user isn't root, so ordinary file permissions on the node still apply.

If the node's group is `root` or the mode denies the group, no `EXTRA_GROUPS` value can help. You need a udev rule first.

### Verify before you rely on it

Check the group landed, then check the runtime user can actually open the node. Test for write, not just read:

```bash
docker exec frigate id frigate
docker exec frigate /command/s6-setuidgid frigate sh -c 'test -w /dev/dri/renderD128 && echo ok'
docker exec frigate /command/s6-setuidgid go2rtc  sh -c 'test -w /dev/dri/renderD128 && echo ok'
```

Permission probes are still only a proxy for the driver working. These exercise the real libraries as the runtime user:

```bash
docker exec frigate /command/s6-setuidgid frigate vainfo
docker exec frigate /command/s6-setuidgid frigate python3 -c "import openvino as ov; print(ov.Core().available_devices)"
```

`vainfo` should reach `va_openDriver() returns 0` and list profiles. Complaints about `XDG_RUNTIME_DIR` or an X server above that are normal and harmless. OpenVINO must list `GPU`; if it returns only `CPU`, detection has quietly fallen back and inference will be far slower without any error in the log.

If something isn't working, the fastest way to tell a permissions problem from anything else is to start the container once with `FRIGATE_RUN_AS_ROOT=true`. If the device appears as root and not otherwise, it's node permissions and a udev rule is the fix. If it's missing either way, the problem is your device mapping or the host, and it isn't related to running non-root.

### udev rules by device

Rules go in `/etc/udev/rules.d/` on the host and take effect after:

```bash
sudo udevadm control --reload-rules && sudo udevadm trigger
```

An already-connected device sometimes keeps its original ownership through a trigger. If `ls -ln` doesn't show the new group, replug it, or reboot for a built-in device.

**Coral USB** needs two rules, because the device re-enumerates after firmware load. It appears as Global Unichip `1a6e` cold and Google `18d1` once running, with a different node each time. A rule covering only `1a6e` gives you a Coral that initializes once and then disappears mid-run.

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="1a6e", GROUP="plugdev", MODE="0664"
SUBSYSTEM=="usb", ATTRS{idVendor}=="18d1", GROUP="plugdev", MODE="0664"
```

Map the whole `/dev/bus/usb` rather than a single node, for the same re-enumeration reason. Most hosts already put `plugdev` at GID 46 and the image agrees, so you often need no `EXTRA_GROUPS` entry for a USB Coral. Confirm with `getent group plugdev` and add the number if your host differs.

**Coral PCIe** is frequently `crw------- root root`, which nothing but root can open:

```
SUBSYSTEM=="apex", MODE="0660", GROUP="apex"
```

Create the group with `sudo groupadd -f apex`, then add its GID to `EXTRA_GROUPS`.

**Hailo** follows the same shape. Grant `/dev/hailo0` a group and add that GID:

```
SUBSYSTEM=="hailo_chardev", MODE="0660", GROUP="hailo"
```

**Intel and AMD GPUs** usually need nothing beyond `EXTRA_GROUPS`, since distributions ship a `render` group owning `/dev/dri/renderD128` already. Note the GID often differs between host and image, so pass the host's number rather than assuming the name resolves. Debian based images have no `render` group at all.

### Quick reference

| Hardware                  | Device(s)                                                   | What non-root needs                                                                                             |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Intel/AMD GPU (VAAPI/QSV) | `/dev/dri/renderD128`                                       | Host render GID in `EXTRA_GROUPS`, from `getent group render`                                                   |
| Intel/AMD NPU             | `/dev/accel`                                                | udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                      |
| Coral USB                 | `/dev/bus/usb`                                              | udev rules for both `1a6e` and `18d1`; usually already covered by `plugdev` 46                                   |
| Coral PCIe                | `/dev/apex_0`                                               | udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                      |
| Hailo                     | `/dev/hailo0`                                               | udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                      |
| NVIDIA                    | nvidia runtime                                              | Nothing, works with the nvidia-container-toolkit defaults                                                        |
| AMD ROCm                  | `/dev/kfd`, `/dev/dri`                                      | Host `video` and `render` GIDs in `EXTRA_GROUPS`                                                                 |
| Raspberry Pi              | `/dev/video11`                                              | Host `video` GID in `EXTRA_GROUPS`                                                                               |
| Rockchip                  | `/dev/dri`, `/dev/dma_heap`, `/dev/rga`, `/dev/mpp_service` | Commonly `root:root` `0600`, so all four need udev rules. If you can't grant all four, use `FRIGATE_RUN_AS_ROOT` |
| Axera (AXCL)              | `/dev/ax_*` per the AXCL driver docs                        | Unverified. Check node ownership on your hardware before assuming this works                                    |
| Synaptics SL1680          | per the Synaptics docs                                      | Unverified                                                                                                      |
| MemryX                    | per the MemryX docs                                         | Still requires `privileged: true`, which means root. Out of scope for non-root operation                        |
| Nvidia Jetson             | nvidia runtime plus Jetson nodes                            | Unverified. The nvidia runtime handles mapping, but check `/dev/nvhost-*` ownership on your board                |
| VeriSilicon NPU (Teflon)  | per the driver, commonly `/dev/galcore`                     | Unverified. Check node ownership on your hardware before assuming this works                                    |
| CPU detector              | none                                                        | Nothing, no device is opened                                                                                    |
| DeepStack, CodeProject.AI | none                                                        | Nothing, inference happens over the network                                                                     |
| ZMQ detector              | none                                                        | Nothing, inference happens over a socket                                                                        |
| Apple Silicon             | none                                                        | Nothing, the NPU client runs on the host and Frigate reaches it over the network                                |

## Known limitations

`telemetry.stats.network_bandwidth` uses nethogs, which needs `CAP_NET_ADMIN` and `CAP_NET_RAW` and therefore root. The stat is disabled automatically when Frigate isn't running as root, with one warning in the log. Use `FRIGATE_RUN_AS_ROOT=true` if you need it.

go2rtc's ffmpeg processes no longer appear in Intel GPU stats. Frigate reads per-process GPU usage from `/proc/<pid>/fdinfo`, which the kernel won't let one user read for another user's processes, so anything go2rtc spawns is invisible to it. Overall GPU utilization is unaffected.

If you mount your own TLS certificate at `/etc/letsencrypt/live/frigate`, the private key has to be readable by the runtime user. Frigate won't change ownership of a certificate you supplied, since the mount may be read-only.

If you're debugging nginx, run the config check as the runtime user with stdout discarded: `docker exec frigate /command/s6-setuidgid frigate bash -c 'nginx -t -c /tmp/nginx/conf/nginx.conf >/dev/null'`. Running `nginx -t` as root hands nginx's runtime directories to root as a side effect, which breaks the running workers until the service restarts, and the config's `/dev/stdout` logs can't be reopened through a root-owned `docker exec` pipe (the results print on stderr either way).
