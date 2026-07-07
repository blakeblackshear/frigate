---
id: recordings
title: Recordings Errors
---

## Why are my recordings not working? (empty Recordings, "No recordings found for this time")

If Frigate shows live video but the History view is empty, or you see "No recordings found for this time", the cause is almost always in one of the three categories below. Segments are first written to the RAM cache and are only moved to disk if they match a retention policy _and_ the camera's `record` stream is producing valid, storable video. Work through the categories in order — retention configuration is by far the most common cause.

Before diving in, enable debug logging for the recording maintainer so you can see whether segments are being written to disk at all:

```yaml
logger:
  logs:
    frigate.record.maintainer: debug
```

A healthy camera logs lines like `Copied /media/frigate/recordings/{segment_path} in 0.2 seconds`. If you never see these, no segments are reaching disk, which points at the camera/stream or storage sections below.

### Retention configuration issues

#### Recording is enabled, but nothing is saved

This is the single most common cause. Setting `record.enabled: True` on its own does **not** keep any footage — **continuous recording is disabled by default**, and segments in the cache are only moved to disk if they match a configured retention policy. You must configure at least one of `continuous`, `motion`, `alerts`, or `detections` retention.

To store all video (the most conservative option), configure continuous retention:

```yaml
record:
  enabled: True
  continuous:
    days: 3 # keep all footage for 3 days
```

See [Recording](/configuration/record) for the full set of common configurations, including reduced-storage and alerts-only setups.

#### Motion or event-only recording keeps less than you expect

If you only configured `motion`, `alerts`, or `detections` retention (with no `continuous`), Frigate keeps footage selectively based on the retention `mode`:

- **`mode: motion`** (the default) only retains segments that contain motion. If your [motion masks](/configuration/motion_detection) cover the areas where activity happens, or your motion sensitivity is too low, nothing will be retained even though recording is "on".
- **`mode: active_objects`** only retains segments where a tracked object was actively moving.
- **`mode: all`** retains every segment in the window.

If you expected continuous footage but only configured motion/event retention, add a `continuous` retention period as shown above. To verify motion is actually being detected, watch the motion boxes in the debug view or the Motion Tuner in the UI.

#### Alert and detection recordings require working object detection

`alerts` and `detections` retention only keep footage that overlaps a tracked object, so they depend on object detection running:

- **Detection must be enabled.** If `detect: enabled: False`, no alerts or detections are ever created, so alert/detection retention keeps nothing. (Continuous and motion retention still work with detection disabled.)
- **The object must be supported by your model.** If you track an object your model doesn't support (for example `deer` or `license_plate` on the default model), Frigate never detects it and never records for it. Check your logs for warnings such as `... is configured to track ['deer'] objects, which are not supported by the current model` and remove unsupported objects or switch to a model (e.g. [Frigate+](/plus/)) that includes them.

#### You're following an outdated guide

Configuration keys change between major versions. The old `clips` config, for example, has not existed for a long time. If you copied a config from an old blog post or video, verify every key against the current [reference config](/configuration/advanced/reference).

### Camera and stream issues

#### Incompatible audio codec (recordings silently fail to save)

Frigate stores recordings in an MP4 container, and some camera audio codecs — most commonly `pcm_alaw`, `pcm_mulaw`, or other G.711 variants — **cannot be placed in an MP4 container**. When this happens, ffmpeg fails to write the segment and no recording is saved, even though the live view works fine. This is a frequent cause on Tapo, TP-Link VIGI, and some Reolink cameras.

Transcode the audio to AAC (or drop it entirely) using the appropriate [ffmpeg preset](/configuration/ffmpeg_presets):

```yaml
cameras:
  your_camera:
    ffmpeg:
      output_args:
        record: preset-record-generic-audio-aac # transcode audio to AAC
        # or preset-record-generic to record with no audio
```

#### The record stream isn't connecting

A message like `No new recording segments were created for <camera> in the last 120s` means ffmpeg cannot read the `record` stream. To diagnose:

- Confirm a stream is actually assigned the `record` role in your camera's `ffmpeg.inputs`.
- Open the go2rtc web interface on port `1984` and click each stream to confirm it plays. go2rtc errors such as `wrong response on DESCRIBE` or `start from CONN state` indicate the camera connection is failing.
- Test the exact RTSP URL (with the correct path, port, and credentials) in VLC or `ffplay`.
- If you restream through go2rtc, make sure the `record` input path points at the correct go2rtc stream name — copying a config between cameras without updating the stream name is a common mistake.

#### Recordings play back with no video (or won't play at all)

Frigate copies the `record` stream directly without re-encoding, so playback depends on your browser supporting the camera's codec. H265/HEVC recordings may not be playable in some browsers. If recordings appear as audio-only or a black screen, your camera is likely sending a codec your browser can't decode — configure the camera to output **H264** for maximum compatibility.

#### Segments are only ~1 second long

If the record stream uses a "Smart Codec"/H.264+ mode or changes encoding parameters mid-stream, corrupt timestamps cause segments to be split far too frequently and fill the cache. This produces the "Too many unprocessed recording segments" warning — see [that section below](#i-see-the-message-warning--too-many-unprocessed-recording-segments-in-cache-for-camera-this-likely-indicates-an-issue-with-the-detect-stream) for the full diagnosis.

### Storage and mounting issues

#### The storage volume isn't mounted correctly

If the recordings volume (`/media/frigate`) points at the wrong location, isn't writable, or a network/encrypted mount failed to mount at boot, Frigate cannot save recordings — or it silently writes to the boot drive and then purges aggressively because the drive appears far smaller than expected.

- Compare the host's real capacity (`df -h`) against what the **Storage** page in the Frigate UI reports. A mismatch (for example Frigate reporting ~220 GB when your storage drive is 4 TB) means the bind mount is resolving to the wrong filesystem.
- Verify the host path in your Docker `volumes` mapping (`- /your/storage:/media/frigate`) exists and is writable by the container.
- For a mount that may fail intermittently, protecting the mount point with `chattr +i` on an empty directory forces Frigate to error out (rather than silently writing to the boot drive) when the mount is missing.
- Check `dmesg` and system logs for filesystem or I/O errors around the time recordings disappeared.

If recordings _are_ being written but the copy is too slow to keep up, see the ["Unable to keep up with recording segments"](#i-see-the-message-warning--unable-to-keep-up-with-recording-segments-in-cache-for-camera-keeping-the-5-most-recent-segments-out-of-6-and-discarding-the-rest) section below.

## I have Frigate configured for motion recording only, but it still seems to be recording even with no motion. Why?

You'll want to:

- Make sure your camera's timestamp is masked out with a motion mask. Even if there is no motion occurring in your scene, your motion settings may be sensitive enough to count your timestamp as motion.
- If you have audio detection enabled, keep in mind that audio that is heard above `min_volume` is considered motion.
- [Tune your motion detection settings](/configuration/motion_detection) either by editing your config file or by using the UI's Motion Tuner.

## I see the message: WARNING : Unable to keep up with recording segments in cache for camera. Keeping the 5 most recent segments out of 6 and discarding the rest...

This warning means the recording maintainer cannot move recording segments from the RAM cache to disk fast enough. When the cache fills up, Frigate discards the oldest segments to avoid running out of memory and crashing — so you lose recorded footage. This is almost always a storage throughput or system resource problem. Work through the steps below to identify which.

### Step 1: Enable recording debug logging

The first step is to measure how long each segment takes to move from the RAM cache to disk. Enable debug logging for the recording maintainer:

```yaml
logger:
  logs:
    frigate.record.maintainer: debug
```

This adds log lines showing the copy duration for each segment:

```
DEBUG   : Copied /media/frigate/recordings/{segment_path} in 0.2 seconds.
```

Let this run until the warnings begin to appear, so you can confirm whether the disk is actually slowing down at the moment the error occurs.

### Step 2: Interpret the copy times

The copy duration tells you which direction to investigate:

- **Consistently longer than ~1 second** — your storage cannot keep up with the incoming recordings. Continue with Steps 3–5 to diagnose the slow storage.
- **Consistently well under 1 second** — storage is fast enough, and the problem is more likely CPU or resource contention. Skip to Step 6.

### Step 3: Check RAM, swap, cache, and disk utilization

If CPU, RAM, disk throughput, or bus I/O is insufficient, nothing inside Frigate will help. Review each aspect of available system resources while the warnings are occurring.

On Linux, some helpful tools/commands for diagnosing this are:

- `docker stats`
- `htop`
- `iotop -o`
- `iostat -sxy --human 1 1`
- `vmstat 1`

On modern Linux kernels, the system will use some swap if it is enabled. Setting `vm.swappiness=1` no longer means the kernel will only swap in order to avoid OOM. To prevent any swapping inside the container, set the memory and memory+swap allocations to the same value and disable swapping by setting the following docker/podman run parameters:

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

NOTE: These are hard limits for the container, so be sure there is enough headroom above what `docker stats` shows for your container. It will immediately halt if it hits `<MAXRAM>`. In general, keeping all cache and tmp filespace in RAM is preferable to disk I/O where possible.

### Step 4: Check your storage type

Mounting a network share is a popular option for storing recordings, but it can lead to reduced copy times and cause problems. Some users have found that using `NFS` instead of `SMB` considerably decreased copy times and fixed the issue. It is also important to ensure that the network connection between the device running Frigate and the network share is stable and fast — a saturated or unreliable link will stall copies.

### Step 5: Check your mount options

Some users found that mounting a drive via `fstab` with the `sync` option dramatically reduced performance and led to this issue. Using `async` instead greatly reduced copy times.

### Step 6: Rule out CPU load

If the copy times are consistently under 1 second but you still see the warning, the machine's CPU load is likely too high for Frigate to have the resources to keep up. Try temporarily shutting down other services — and any resource-intensive Frigate features — to see if the issue improves.

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

:::tip

You don't have to run `ffprobe` by hand to catch this. Open a camera's **Camera Probe Info** dialog (the info icon on the System → Metrics → Cameras page) and check the **Keyframe analysis** section. It probes the record stream and flags sparse or variable keyframes, which is what smart/"+" codecs (H.264+/H.265+) and long keyframe intervals produce.

:::

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

## I see the message: ERROR : Error occurred when attempting to maintain recording cache

This message means the recording maintainer hit an error while moving segments from the cache to disk. It is a **generic wrapper** — the actual cause is always logged on the **very next line**. Frigate usually recovers and keeps running, but any affected segments are lost, so it is worth resolving.

:::warning

Always read the line immediately following this message. `Error occurred when attempting to maintain recording cache` on its own tells you nothing; the exception on the next line — for example `[Errno 28] No space left on device` or `[Errno 17] File exists` — is the real problem.

:::

Because these are operating-system-level errors, they must be resolved on the **host**, not within Frigate's configuration. The most common underlying errors are below.

### [Errno 28] No space left on device

The filesystem Frigate is writing to is full. Things to check:

- **The recordings volume is genuinely full.** Check free space on the host with `df -h` for the path mapped to `/media/frigate`, and review the **Storage** page in the Frigate UI.
- **The disk shows free space but is still "full".** This usually means the filesystem has run out of **inodes** (check with `df -i`), or recordings are landing on a different, smaller filesystem than you expect because of an incorrect bind mount — see [The storage volume isn't mounted correctly](#the-storage-volume-isnt-mounted-correctly) above.
- **`/tmp/cache` is full.** If you mounted `/tmp/cache` as a small `tmpfs`, a backlog of segments can fill it. Increase the tmpfs size, or address whatever is causing segments to pile up (see the [Too many unprocessed recording segments](#i-see-the-message-warning--too-many-unprocessed-recording-segments-in-cache-for-camera-this-likely-indicates-an-issue-with-the-detect-stream) section above).
- **The host blocks writes before Frigate can purge.** On some systems (for example Unraid with a fill-up threshold), the host stops writes before Frigate's emergency cleanup can run. Leave more headroom on the volume, or lower your retention so Frigate purges sooner.

### [Errno 17] File exists (with ffmpeg "Error writing trailer" or "unable to re-open output file")

Errors like `[Errno 17] File exists: '/media/frigate/recordings/.../<camera>'`, often alongside ffmpeg errors such as `Unable to re-open ... output file for shifting data` or `Error writing trailer: No such file or directory`, are a hallmark of an **unreliable network share** (NFS or SMB). The mount is dropping, serving stale directory entries, or mishandling file locking.

- Confirm the network connection to the NAS is stable and fast — an intermittent link produces these errors sporadically.
- Prefer **NFS over SMB** for the recordings mount; several users have found NFS more reliable and faster.
- Review your `fstab`/mount options for settings that hurt consistency or performance (see the `sync` vs `async` note in the [Unable to keep up with recording segments](#i-see-the-message-warning--unable-to-keep-up-with-recording-segments-in-cache-for-camera-keeping-the-5-most-recent-segments-out-of-6-and-discarding-the-rest) section above).
- Enable `frigate.record.maintainer` debug logging to confirm whether the errors line up with the share becoming unavailable.

### Errors referencing a camera you manually renamed or removed

If the next-line error references a camera name that no longer exists in your config, orphaned data is left over from a rename or removal in a persistent `/tmp/cache` volume.

- Using a `tmpfs` mount for `/tmp/cache` as recommended in the [installation docs](/frigate/installation#storage) prevents stale cache files under the old camera name from surviving a restart, which avoids this issue entirely.
- If errors persist, stop Frigate and remove any leftover segments for the old camera name from `/tmp/cache`.
