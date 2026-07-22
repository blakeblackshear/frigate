---
id: common_errors
title: Common Error Messages
---

import FaqItem from "@site/src/components/FaqItem";

This page is an index of error messages you might see in Frigate's logs, what each one means, and where to go next. It is organized by the kind of problem, not by which component logged the message.

Two things to know before you start:

- **Many of these messages come from FFmpeg, go2rtc, GPU drivers, or the operating system, not from Frigate itself.** Frigate captures and re-logs their output, so the log level shown in the Frigate UI does not always reflect the original severity.
- **Wrapped errors put the real cause on the next line.** When Frigate logs a generic message like `Error occurred when attempting to maintain recording cache`, the actual exception is logged immediately after it. When a camera's FFmpeg process exits, Frigate logs `The following ffmpeg logs include the last 100 lines prior to exit` and dumps that camera's FFmpeg output. Always read those lines, they are where the answer usually is.

## Camera connection and streams

<FaqItem id="connection-refused-no-route-to-host-401-404" question="Connection refused / No route to host / 401 Unauthorized / 404 Not Found">

These are FFmpeg errors about reaching the camera (or the go2rtc restream). `Connection refused` and `No route to host` mean nothing is listening at that address or the host is unreachable; `401 Unauthorized` is wrong credentials; `404 Not Found` is a wrong stream path (or a `restream` input pointing at a go2rtc stream name that does not exist). A camera that has hit its concurrent-connection limit can also return `refused` or `401` on a URL that works in VLC.

See [go2rtc troubleshooting](/troubleshooting/go2rtc#1-read-the-go2rtc-logs) for how to isolate the stream.

</FaqItem>

<FaqItem id="no-frames-received-in-20-seconds" question="No frames received from <camera> in 20 seconds. Exiting ffmpeg...">

FFmpeg is running but has stopped delivering video for 20 seconds, so Frigate's camera watchdog restarts it. The stream connected at least once, then went quiet: a camera reboot, a network drop, the camera evicting the connection, or a stalled decoder. If it repeats on a loop, the stream is unstable.

</FaqItem>

<FaqItem id="ffmpeg-process-crashed-unexpectedly" question="Ffmpeg process crashed unexpectedly for <camera>">

The detect FFmpeg process exited on its own. This message is only the notification; the cause is in the 100 FFmpeg log lines Frigate dumps right after it (look for a `Failed to sync surface`, `Connection refused`, codec, or audio error in that block). Related watchdog messages include `<camera> exceeded fps limit`, which means the camera is delivering frames faster than `detect.fps` (usually a camera whose real frame rate differs from what is configured).

</FaqItem>

<FaqItem id="non-monotonically-increasing-dts" question="Application provided invalid, non monotonically increasing dts to muxer">

An FFmpeg message meaning the camera sent packets with out-of-order timestamps. Because recordings are copied without re-encoding, FFmpeg cannot fix them, and the segment muxer often splits early, producing one-second segments and a cache backlog. The usual cause is a camera "Smart Codec" / H.264+ / H.265+ mode or a camera clock that jumps.

See [Recordings: segments are only 1 second long](/troubleshooting/recordings#segments-are-only-1-second-long).

</FaqItem>

<FaqItem id="bad-cseq" question="RTP: PT=xx: bad cseq (packet loss / reordering)">

An FFmpeg message meaning RTP packets arrived out of sequence, which almost always means the stream is using UDP transport. Frigate's RTSP presets force TCP, so seeing this points at a custom `input_args`, `preset-rtsp-udp`, or a go2rtc source that is not using TCP. Switch to TCP unless your camera is [UDP-only](/configuration/camera_specific#udp-only-cameras).

</FaqItem>

<FaqItem id="error-while-decoding-mb-non-existing-pps" question="error while decoding MB / non-existing PPS referenced (corrupt frames)">

FFmpeg decoder messages meaning the received video bitstream was incomplete or damaged. A few of these at every stream start are normal (the decoder connected before the first keyframe) and Frigate discards them. A continuous stream of them means real packet loss, from Wi-Fi or a saturated link, an overloaded camera, or an FFmpeg restart loop caused by another problem. Fix the underlying instability rather than the message.

</FaqItem>

<FaqItem id="could-not-find-codec-parameters" question="Could not find codec parameters for stream ... unspecified size">

An FFmpeg message meaning it probed the stream but never saw enough decodable video to determine the frame size, often because the probe window ended before the first keyframe on a long-GOP stream, or because the stream is not delivering usable video. If it is a Reolink HTTP stream, use `preset-http-reolink`, which raises the probe size for exactly this case.

</FaqItem>

## Recording

<FaqItem id="no-new-recording-segments" question="No new recording segments were created for <camera> in the last 120s">

Frigate's record watchdog is restarting the record FFmpeg process because no valid segment has reached the cache. This means the record stream is not connecting or the segments are being rejected (see the audio-codec entry below).

See [Recordings: the record stream isn't connecting](/troubleshooting/recordings#the-record-stream-isnt-connecting).

</FaqItem>

<FaqItem id="invalid-or-missing-video-stream-in-segment" question="Invalid or missing video stream in segment. Discarding.">

A cached recording segment failed validation (no readable video stream) and was deleted. The most common cause is a segment that was truncated because the record FFmpeg process was killed mid-write, so this often appears alongside, and as a consequence of, the record-stream restarts above. A segment containing only audio triggers it too.

</FaqItem>

<FaqItem id="incompatible-audio-codec" question="Recordings silently fail to save (incompatible audio codec)">

Some camera audio codecs (G.711 variants such as `pcm_alaw` and `pcm_mulaw`) cannot be stored in an MP4 container, so segments never finalize even though live view works.

See [Recordings: incompatible audio codec](/troubleshooting/recordings#incompatible-audio-codec-recordings-silently-fail-to-save) for the FFmpeg preset that transcodes the audio to AAC.

</FaqItem>

<FaqItem id="error-maintaining-recording-cache" question="Error occurred when attempting to maintain recording cache">

A generic wrapper; the real exception is on the next log line. Frequently it is `[Errno 28] No space left on device` or `[Errno 17] File exists` on a network share.

See [Recordings cache warnings and errors](/troubleshooting/recordings#i-see-the-message-error--error-occurred-when-attempting-to-maintain-recording-cache), which covers this message and the common `Errno` cases.

</FaqItem>

## Hardware acceleration

<FaqItem id="failed-to-sync-surface" question="Failed to sync surface / Failed to download frame: -5 / Error while filtering">

A VAAPI/QSV hardware frame-sync failure between FFmpeg and the GPU driver, not a Frigate bug. It usually appears when the detect stream is being scaled or decoded on the GPU.

See [GPU: Failed to download frame: -5](/troubleshooting/gpu#failed-to-download-frame--5), which lists the fixes in order (switch VAAPI/QSV preset, change `LIBVA_DRIVER_NAME`, use an H.264 substream, match detect resolution and fps to the stream).

</FaqItem>

<FaqItem id="no-decoder-surfaces-left" question="No decoder surfaces left / Can't allocate a surface">

Both mean the GPU ran out of decode surfaces: `No decoder surfaces left` is NVIDIA NVDEC, `Can't allocate a surface` is Intel QSV. This is surface-pool exhaustion, typically from too many concurrent hardware-decoded cameras on one GPU (consumer NVIDIA cards have a driver-enforced limit on simultaneous decode sessions). Reduce the number of cameras decoding on that GPU, decode some on the CPU, or move to hardware without the session cap.

</FaqItem>

<FaqItem id="nvidia-container-cli-nvml-error" question="nvidia-container-cli: nvml error: driver not loaded">

This comes from the NVIDIA container runtime while starting the container, not from Frigate, and the container never starts. The NVIDIA driver is not loaded on the host. Confirm `nvidia-smi` works on the host itself (not inside the container) before troubleshooting Frigate. In a VM or LXC, the driver must be available inside the guest. See [Hardware: Nvidia GPU](/configuration/hardware_acceleration_video).

</FaqItem>

## Detectors and models

<FaqItem id="illegal-instruction" question="Illegal instruction (core dumped)">

The process was killed by the CPU for executing an unsupported instruction. There are two distinct causes in Frigate:

- **A Coral EdgeTPU** on a newer kernel with an outdated gasket driver. See [EdgeTPU: Illegal instruction](/troubleshooting/edgetpu#attempting-to-load-tpu-as-pci--fatal-python-error-illegal-instruction).
- **A CPU without AVX/AVX2**, when enabling semantic search, face recognition, license plate recognition, classification, or audio transcription. These features use libraries compiled with AVX and crash immediately on CPUs that lack it (commonly Intel Celeron/Pentium before the 2020 Tiger Lake generation). See the [CPU requirements](/frigate/planning_setup#cpu).

</FaqItem>

<FaqItem id="onnx-invalidprotobuf" question="ONNX Runtime InvalidProtobuf / failed to load model">

ONNX Runtime could not parse the model file. The file exists but its contents are not a valid ONNX model, usually a corrupted or interrupted download in `model_cache`, or the wrong file pointed at by `model.path`. Delete the cached model file so Frigate re-downloads it, and confirm `model.path` points at an actual `.onnx` model. See [ONNX detector configuration](/configuration/object_detectors#onnx).

</FaqItem>

<FaqItem id="cuda-failure-999-901" question="CUDA failure 999 / CUDA failure 901">

ONNX Runtime CUDA errors. `999` (`cudaErrorUnknown`) is a general, unrecoverable CUDA context failure, usually a driver/runtime version mismatch between the host and the container or a GPU in a bad state. `901` is a CUDA-graph capture error, which points at a custom model whose operations are not capture-safe. For `999`, align the host driver with the container's CUDA version and confirm the GPU is healthy.

</FaqItem>

<FaqItem id="openvino-no-supported-devices" question="Can't get OPTIMIZATION_CAPABILITIES property as no supported devices found">

OpenVINO could not find the configured device (usually `GPU` or `NPU`). Most often the `/dev/dri` render node is not passed into the container, or the wrong render node is mapped when an iGPU and a discrete GPU coexist.

See [GPU: no supported devices found](/troubleshooting/gpu#cant-get-optimization_capabilities-property-as-no-supported-devices-found).

</FaqItem>

## Memory and storage

<FaqItem id="fatal-python-error-bus-error" question="Fatal Python error: Bus error">

Frigate ran out of shared memory (`/dev/shm`). The container's `shm_size` is too small for the number and resolution of your detect streams, or you added cameras after startup without increasing it.

See [Calculating required shm-size](/frigate/installation#calculating-required-shm-size). If you cannot increase `shm_size`, lowering the `SHM_MAX_FRAMES` environment variable reduces how many frames Frigate buffers per camera.

</FaqItem>

<FaqItem id="errno-28-no-space-left" question="[Errno 28] No space left on device">

A filesystem is full: the recordings volume (`/media/frigate`), the cache tmpfs (`/tmp/cache`), or `/dev/shm`. Check which one, and note that inode exhaustion can produce this while `df -h` still shows free space.

See [Recordings: No space left on device](/troubleshooting/recordings#i-see-the-message-error--error-occurred-when-attempting-to-maintain-recording-cache).

</FaqItem>

<FaqItem id="container-exits-with-no-logs" question="The container exits or restarts with no error in the logs">

A silent exit is usually the host or container out-of-memory killer. Because `/dev/shm` and `/tmp/cache` are memory-backed, they count against the container's memory limit, so aggressive shm or cache sizing can trigger it. Give the container more memory, or reduce shm/cache sizing, and check the host's OOM messages (`dmesg`).

</FaqItem>

## Database

<FaqItem id="database-is-locked" question="database is locked">

SQLite could not acquire the write lock. Frigate's timeout already scales with camera count, so under normal local-disk operation this essentially only happens when the database is on a network share (SMB/NFS), where file locking is unreliable, or when two instances point at the same file.

See [Database is locked](/troubleshooting/faqs#error-database-is-locked).

</FaqItem>

<FaqItem id="database-disk-image-is-malformed" question="database disk image is malformed">

The SQLite database file is corrupted, typically after hard power loss, a network-share database, or a filesystem with unsafe write semantics. There is no automatic repair. If a `backup.db` exists next to your database (Frigate writes one before schema migrations), restoring it is the least destructive option. Otherwise, stop Frigate, delete `frigate.db`, and restart: Frigate recreates it, but existing recordings lose their metadata (events, review items). Moving the database off a network share prevents recurrence.

</FaqItem>

## Startup and web access

<FaqItem id="unable-to-start-frigate-in-safe-mode" question="Unable to start Frigate in safe mode / Starting Frigate in safe mode">

When your config fails validation at startup, Frigate prints the validation errors (with line numbers), then starts in **safe mode**: a minimal configuration with no cameras and MQTT disabled, so the UI stays reachable. In safe mode the only available page is the Config Editor, which shows the validation errors so you can fix them, then save and restart. Note that recording retention and storage cleanup do **not** run while in safe mode, so do not leave a low-disk system sitting in it.

`Unable to start Frigate in safe mode` means even the minimal config failed, which points at an error in your `auth`, `proxy`, or `database` section, or a config file that is not valid YAML at all. Safe mode is not sticky; fix the config and restart and Frigate returns to normal.

</FaqItem>

<FaqItem id="502-bad-gateway" question="502 Bad Gateway / connection refused to 127.0.0.1:5001">

The web server is up but the Frigate backend (port 5001) is not answering yet. By far the most common reason is that the page was loaded during startup: the API binds last, after database migrations (which can take minutes on a large database), model downloads, and process startup, while the web server is already serving. Wait for startup to finish. If it persists, the backend has failed to start, and the reason is earlier in the logs. This also explains a `connection refused to 127.0.0.1:5001` seen while loading `/ws`, because every authenticated request first makes an auth subrequest to that port.

</FaqItem>
