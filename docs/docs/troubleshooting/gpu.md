---
id: gpu
title: GPU Errors
---

## OpenVINO

### Can't get OPTIMIZATION_CAPABILITIES property as no supported devices found.

Some users have reported issues using some Intel iGPUs with OpenVINO, where the GPU would not be detected. This error can be caused by various problems, so it is important to ensure the configuration is setup correctly. Some solutions users have noted:

- In some cases users have noted that an HDMI dummy plug was necessary to be plugged into the motherboard's HDMI port.
- When mixing an Intel iGPU with Nvidia GPU, the devices can be mixed up between `/dev/dri/renderD128` and `/dev/dri/renderD129` so it is important to confirm the correct device, or map the entire `/dev/dri` directory into the Frigate container.

## Intel/AMD GPU

### Hardware acceleration is not being used

For VAAPI or QSV to work, the GPU's render device must be passed through to the Frigate container. Intel and AMD GPUs expose this as a render node under `/dev/dri`, usually `/dev/dri/renderD128`. If it is not passed through, hardware acceleration is unavailable: ffmpeg fails to initialize it (for example `Failed to open the drm device` or `No VA display found for device`) and GPU usage stays at zero while CPU usage remains high.

Pass the render device through when starting the container. With `docker compose`:

```yaml
services:
  frigate:
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128 # Intel / AMD GPU, update for your hardware
```

Or with `docker run`, add `--device /dev/dri/renderD128`. See the [installation docs](/frigate/installation) for a complete example.

If it still isn't working after passing the device through:

- **Confirm the render node exists and is the correct one.** Run `ls /dev/dri` on the host. You should see one or more `renderD12X` entries. Systems with more than one GPU (an Intel iGPU plus a discrete GPU) can expose both `/dev/dri/renderD128` and `/dev/dri/renderD129`, and the numbering is not guaranteed. Pass through the correct node, or map the entire directory (`/dev/dri:/dev/dri`, or `--device /dev/dri`) so all render nodes are available.
- **Check device permissions.** The Frigate process must be able to access the render node. This is usually automatic when the container runs as root (the default), but nested setups such as an unprivileged Proxmox/LXC container often require making the device accessible on the host (for example, a world-readable render node) or running the container privileged. Note that running Frigate inside an LXC is not officially supported. See the [installation docs](/frigate/installation#proxmox) for details.

### Failed to download frame: -5

When using VAAPI or QSV hardware acceleration, ffmpeg may crash and restart periodically with a signature like this in the `ffmpeg.<camera>.detect` log:

```
[AVHWFramesContext @ 0x...] Failed to sync surface ... (operation failed).
[hwdownload @ 0x...] Failed to download frame: -5.
[vf#0:0 @ 0x...] Error while filtering: Input/output error
[vf#0:0 @ 0x...] Task finished with error code: -5 (Input/output error)
[frigate.video] <camera>: Unable to read frames from ffmpeg process.
```

This is a hardware frame synchronization failure between ffmpeg and the GPU driver, not a Frigate bug. It comes from how a specific camera stream interacts with the GPU's decode and scaling path, so it is highly dependent on your hardware, driver, and stream. Frigate's automatic hardware acceleration detection is a best-guess effort, so the fix is usually to tune the configuration for your specific hardware and camera. The solutions below are ordered from most to least likely to help:

- **Switch between the VAAPI and QSV presets.** On Intel Gen 12 and newer iGPUs, `preset-intel-qsv-h264` / `preset-intel-qsv-h265` is often more stable than the auto-detected `preset-vaapi`. See the [hardware acceleration docs](/configuration/hardware_acceleration_video.md#intel-based-cpus) for the recommended preset for your Intel generation.
- **Try a different VAAPI driver.** The default driver is `iHD`. On older Intel CPUs, `LIBVA_DRIVER_NAME=i965` can be more stable; on AMD GPUs use `LIBVA_DRIVER_NAME=radeonsi`. See [the hardware acceleration docs](/configuration/hardware_acceleration_video.md#intel-based-cpus) for how to set the driver.
- **Use a codec that decodes more reliably.** H.265/HEVC streams may trigger this error far more often than H.264 depending on your CPU generation. If your camera exposes a separate sub-stream, assign an H.264 stream to the `detect` role. Cameras that output full-range YUV (for example some Hikvision models) are especially prone to it.
- **Match the detect resolution to the stream resolution.** When the `detect` resolution differs from the stream, Frigate inserts a GPU scaling filter (`scale_vaapi`), which is where these surface-sync failures can often originate. Set the `detect` `width` and `height` to match the exact resolution of the stream assigned the `detect` role.
- **Match the detect `fps` to the camera stream.** Aggressively dropping frames (for example `detect` `fps: 1` on a stream that runs at 15 fps) can cause timing mismatches in the GPU's frame buffer. Lower the sub-stream's frame rate on the camera itself instead of dropping most frames in Frigate.
- **Fall back to software decoding.** If none of the above resolve it, remove the preset for that camera (`hwaccel_args: []`). Hardware decoding is only an optimization. On a capable CPU, software-decoding a low-resolution sub-stream is inexpensive and gives a stable detect pipeline.
