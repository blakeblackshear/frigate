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

## I see the message: WARNING : Too many unprocessed recording segments in cache for camera. This likely indicates an issue with the detect stream...

This warning means that the detect stream for the affected camera has fallen behind or stopped processing frames. Frigate's recording cache holds segments waiting to be analyzed by the detector — when more than 6 segments pile up without being processed, Frigate discards the oldest ones to prevent the cache from filling up.

:::warning

This error is a **symptom**, not the root cause. The actual cause is always logged **before** these messages start appearing. You must review the full logs from Frigate startup through the first occurrence of this warning to identify the real issue.

:::

### Step 1: Get the full logs

Collect complete Frigate logs from startup through the first occurrence of the error. Look for errors or warnings that appear **before** the "Too many unprocessed" messages begin — that is where the root cause will be found.

### Step 2: Check the cache directory

Exec into the Frigate container and inspect the recording cache:

```
docker exec -it frigate ls -la /tmp/cache
```

Each camera should have a small number of `.mp4` segment files. If one camera has significantly more files than others, that camera is the source of the problem. A problem with a single camera can cascade and cause all cameras to show this error.

### Step 3: Verify segment duration

Recording segments should be approximately 10 seconds long. Run `ffprobe` on segments in the cache to check:

```
docker exec -it frigate ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 /tmp/cache/<camera>@<segment>.mp4
```

If segments are only ~1 second instead of ~10 seconds, the camera is sending corrupt timestamp data, causing segments to be split too frequently and filling the cache 10x faster than expected.

**Common causes of short segments:**

- **"Smart Codec" or "Smart+" enabled on the camera** — These features dynamically change encoding parameters mid-stream, which corrupts timestamps. Disable them in your camera's settings.
- **Changing codec, bitrate, or resolution mid-stream** — Any encoding changes during an active stream can cause unpredictable segment splitting.
- **Camera firmware bugs** — Check for firmware updates from your camera manufacturer.

### Step 4: Check for a stuck detector

If the detect stream is not processing frames, segments will accumulate. Common causes:

- **Detection resolution too high** — Use a substream for detection, not the full resolution main stream.
- **Detection FPS too high** — 5 fps is the recommended maximum for detection.
- **Model too large** — Use smaller model variants (e.g., YOLO `s` or `t` size, not `e` or `x`). Use 320x320 input size rather than 640x640 unless you have a powerful dedicated detector.
- **Virtualization** — Running Frigate in a VM (especially Proxmox) can cause the detector to hang or stall. This is a known issue with GPU/TPU passthrough in virtualized environments and is not something Frigate can fix. Running Frigate in Docker on bare metal is recommended.

### Step 5: Check for GPU hangs

On the host machine, check `dmesg` for GPU-related errors:

```
dmesg | grep -i -E "gpu|drm|reset|hang"
```

Messages like `trying reset from guc_exec_queue_timedout_job` or similar GPU reset/hang messages indicate a driver or hardware issue. Ensure your kernel and GPU drivers (especially Intel) are up to date.

### Step 6: Verify hardware acceleration configuration

An incorrect `hwaccel_args` preset can cause ffmpeg to fail silently or consume excessive CPU, starving the detector of resources.

- After upgrading Frigate, verify your preset matches your hardware (e.g., `preset-intel-qsv-h264` instead of the deprecated `preset-vaapi`).
- For h265 cameras, use the corresponding h265 preset (e.g., `preset-intel-qsv-h265`).
- Note that `hwaccel_args` are only relevant for the detect stream — Frigate does not decode the record stream.

### Step 7: Verify go2rtc stream configuration

Ensure that the ffmpeg source names in your go2rtc configuration match the correct camera stream. A misconfigured stream name (e.g., copying a config from one camera to another without updating the stream reference) will cause the wrong stream to be used or the stream to fail entirely.

### Step 8: Check system resources

If none of the above apply, the issue may be a general resource constraint. Monitor the following on your host:

- **CPU usage** — An overloaded CPU can prevent the detector from keeping up.
- **RAM and swap** — Excessive swapping dramatically slows all I/O operations.
- **Disk I/O** — Use `iotop` or `iostat` to check for saturation.
- **Storage space** — Verify you have free space on the Frigate storage volume (check the Storage page in the Frigate UI).

Try temporarily disabling resource-intensive features like `genai` and `face_recognition` to see if the issue resolves. This can help isolate whether the detector is being starved of resources.
