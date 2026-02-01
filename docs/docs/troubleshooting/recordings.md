---
id: recordings
title: Recordings Errors
---

## I have Frigate configured for motion recording only, but it still seems to be recording even with no motion. Why?

You'll want to:

- Make sure your camera's timestamp is masked out with a motion mask. Even if there is no motion occurring in your scene, your motion settings may be sensitive enough to count your timestamp as motion.
- If you have audio detection enabled, keep in mind that audio that is heard above `min_volume` is considered motion.
- [Tune your motion detection settings](/configuration/motion_detection) either by editing your config file or by using the UI's Motion Tuner.

## I see the message: WARNING : Unable to keep up with recording segments in cache for camera. Keeping the 5 most recent segments out of 6 and discarding the rest...

This error can be caused by a number of different issues. The first step in troubleshooting is to enable debug logging for recording. This will enable logging showing how long it takes for recordings to be moved from RAM cache to the disk.

```yaml
logger:
  logs:
    frigate.record.maintainer: debug
```

This will include logs like:

```
DEBUG   : Copied /media/frigate/recordings/{segment_path} in 0.2 seconds.
```

It is important to let this run until the errors begin to happen, to confirm that there is not a slow down in the disk at the time of the error.

#### Copy Times > 1 second

If the storage is too slow to keep up with the recordings then the maintainer will fall behind and purge the oldest recordings to ensure the cache does not fill up causing a crash. In this case it is important to diagnose why the copy times are slow.

##### Check RAM, swap, cache utilization, and disk utilization

If CPU, RAM, disk throughput, or bus I/O is insufficient, nothing inside frigate will help. It is important to review each aspect of available system resources.

On linux, some helpful tools/commands in diagnosing would be:

- docker stats
- htop
- iotop -o
- iostat -sxy --human 1 1
- vmstat 1

On modern linux kernels, the system will utilize some swap if enabled. Setting vm.swappiness=1 no longer means that the kernel will only swap in order to avoid OOM. To prevent any swapping inside a container, set allocations memory and memory+swap to be the same and disable swapping by setting the following docker/podman run parameters:

**Docker Compose example**

```yaml
services:
  frigate:
    ...
    mem_swappiness: 0
    memswap_limit: <MAXSWAP>
    deploy:
      resources:
        limits:
          memory: <MAXRAM>
```

**Run command example**

```
--memory=<MAXRAM> --memory-swap=<MAXSWAP> --memory-swappiness=0
```

NOTE: These are hard-limits for the container, be sure there is enough headroom above what is shown by `docker stats` for your container. It will immediately halt if it hits `<MAXRAM>`. In general, running all cache and tmp filespace in RAM is preferable to disk I/O where possible.

##### Check Storage Type

Mounting a network share is a popular option for storing Recordings, but this can lead to reduced copy times and cause problems. Some users have found that using `NFS` instead of `SMB` considerably decreased the copy times and fixed the issue. It is also important to ensure that the network connection between the device running Frigate and the network share is stable and fast.

##### Check mount options

Some users found that mounting a drive via `fstab` with the `sync` option caused dramatically reduce performance and led to this issue. Using `async` instead greatly reduced copy times.

#### Copy Times < 1 second

If the storage is working quickly then this error may be caused by CPU load on the machine being too high for Frigate to have the resources to keep up. Try temporarily shutting down other services to see if the issue improves.
