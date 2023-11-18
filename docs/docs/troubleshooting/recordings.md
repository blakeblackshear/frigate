---
id: recordings
title: Troubleshooting Recordings
---

### WARNING : Unable to keep up with recording segments in cache for camera. Keeping the 5 most recent segments out of 6 and discarding the rest...

This error can be caused by a number of different issues. The first step in troubleshooting is to enable debug logging for recording, this will enable logging showing how long it takes for recordings to be moved from RAM cache to the disk.

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

##### Check Storage Type

Mounting a network share is a popular option for storing Recordings, but this can lead to reduced copy times and cause problems. Some users have found that using `NFS` instead of `SMB` considerably decreased the copy times and fixed the issue. It is also important to ensure that the network connection between the device running Frigate and the network share is stable and fast.

##### Check mount options

Some users found that mounting a drive via `fstab` with the `sync` option caused dramatically reduce performance and led to this issue. Using `async` instead greatly reduced copy times.

#### Copy Times < 1 second

If the storage is working quickly then this error may be caused by CPU load on the machine being too high for Frigate to have the resources to keep up. Try temporarily shutting down other services to see if the issue improves.
