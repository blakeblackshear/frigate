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

## Rolling back

Set `FRIGATE_RUN_AS_ROOT=true` and restart. Everything runs as root again, exactly as it did before.

The escape hatch never changes ownership, and it deletes the sweep sentinel on startup, so switching back to non-root later re-sweeps whatever root created in the meantime. Toggling in either direction is safe.

## Hardware device access

Supplementary groups can't open a device node that's `root:root` with mode `0600`. If your accelerator's node isn't group readable on the host, no amount of container configuration will fix it, so the fix belongs on the host.

Give the runtime user access with `EXTRA_GROUPS`, a comma separated list of numeric host GIDs. They're added to both the `frigate` and `go2rtc` users at startup, which matters because go2rtc needs render and video access of its own to run hardware accelerated restreams.

```yaml
environment:
  EXTRA_GROUPS: "104,44" # host render and video GIDs, from getent group render
```

Docker's `group_add` does not work in the default or `PUID` modes. `s6-setuidgid` rebuilds the supplementary group list from `/etc/group` when it drops privileges, which discards anything Docker added to the init process. Use `group_add` only with Docker-native `user:`, where no privilege drop happens and `EXTRA_GROUPS` in turn does nothing.

`privileged: true` doesn't help either. It grants capabilities to root, and the runtime user isn't root, so normal file permissions on the device node still apply.

| Hardware                  | Device(s)                                                   | Non-root requirement                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intel/AMD GPU (VAAPI/QSV) | `/dev/dri/renderD128`                                       | `EXTRA_GROUPS` with the host render GID from `getent group render`                                                                                               |
| Intel/AMD NPU             | `/dev/accel`                                                | Host udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                                                                              |
| Coral USB                 | `/dev/bus/usb`                                              | Host udev rule granting plugdev, for example `SUBSYSTEMS=="usb", ATTRS{idVendor}=="1a6e", GROUP="plugdev"` and the same for `18d1` post-init, then the plugdev GID in `EXTRA_GROUPS` |
| Coral PCIe                | `/dev/apex_0`                                               | Host udev rule `SUBSYSTEM=="apex", GROUP="apex", MODE="0660"`, then that GID in `EXTRA_GROUPS`                                                                                       |
| Hailo                     | `/dev/hailo0`                                               | Host udev rule granting a group, then that GID in `EXTRA_GROUPS`                                                                                                              |
| NVIDIA                    | nvidia runtime                                              | Works non-root with the nvidia-container-toolkit defaults                                                                                                                     |
| AMD ROCm                  | `/dev/kfd`, `/dev/dri`                                      | The host `video` and `render` GIDs in `EXTRA_GROUPS`                                                                                                                                |
| Raspberry Pi              | `/dev/video11`                                              | The host `video` GID in `EXTRA_GROUPS`                                                                                                                                              |
| Rockchip                  | `/dev/dri`, `/dev/dma_heap`, `/dev/rga`, `/dev/mpp_service` | These are commonly `root:root` `0600`, so host udev rules are required. If you can't grant access to all four, use `FRIGATE_RUN_AS_ROOT=true`                                  |
| Axera (AXCL)              | `/dev/ax_*` per the AXCL driver docs                        | Unverified. Node ownership is driver dependent, check it on your hardware before assuming this works                                                                           |
| Synaptics SL1680          | per the Synaptics docs                                      | Unverified                                                                                                                                                                    |
| MemryX                    | per the MemryX docs                                         | Still requires `privileged: true`, which means root. Out of scope for non-root operation                                                                                       |

## Known limitations

`telemetry.stats.network_bandwidth` uses nethogs, which needs `CAP_NET_ADMIN` and `CAP_NET_RAW` and therefore root. The stat is disabled automatically when Frigate isn't running as root, with one warning in the log. Use `FRIGATE_RUN_AS_ROOT=true` if you need it.

go2rtc's ffmpeg processes no longer appear in Intel GPU stats. Frigate reads per-process GPU usage from `/proc/<pid>/fdinfo`, which the kernel won't let one user read for another user's processes, so anything go2rtc spawns is invisible to it. Overall GPU utilization is unaffected.

If you mount your own TLS certificate at `/etc/letsencrypt/live/frigate`, the private key has to be readable by the runtime user. Frigate won't change ownership of a certificate you supplied, since the mount may be read-only.

If you're debugging nginx, run the config check as the runtime user with stdout discarded: `docker exec frigate /command/s6-setuidgid frigate bash -c 'nginx -t -c /tmp/nginx/conf/nginx.conf >/dev/null'`. Running `nginx -t` as root hands nginx's runtime directories to root as a side effect, which breaks the running workers until the service restarts, and the config's `/dev/stdout` logs can't be reopened through a root-owned `docker exec` pipe (the results print on stderr either way).
