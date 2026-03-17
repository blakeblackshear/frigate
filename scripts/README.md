# Scripts

## Transcode benchmarks

Proof-of-concept benchmarks for **real-time VOD transcoding**: transcode a video file with FFmpeg (optionally with hardware acceleration) and measure time and throughput. Used to de-risk the real-time VOD transcoding feature (segment-level transcode + cache): we need ~10s segments to transcode in well under 10s (ideally &lt;2s) so timeline scrubbing stays responsive.

### Python (recommended)

From the repo root:

```bash
# Full file, CPU
python scripts/transcode_benchmark.py path/to/recording.mp4

# First 10 seconds only (simulates one HLS segment)
python scripts/transcode_benchmark.py path/to/recording.mp4 --duration 10

# 10s segment with NVIDIA HW accel
python scripts/transcode_benchmark.py path/to/recording.mp4 --duration 10 --hwaccel nvidia

# Simulate scrubbing: start 60s in, transcode 10s (VAAPI)
python scripts/transcode_benchmark.py path/to/recording.mp4 --duration 10 --seek 60 --hwaccel vaapi

# Intel QSV H.265 (preset-intel-qsv-h265)
python scripts/transcode_benchmark.py path/to/recording.mp4 --duration 10 --hwaccel qsv-h265

# Custom FFmpeg binary (e.g. Frigate container)
python scripts/transcode_benchmark.py path/to/recording.mp4 --duration 10 --ffmpeg /usr/lib/ffmpeg/7/bin/ffmpeg
```

Options:

- `--duration SEC` – Transcode only this many seconds (default: full file). Use 10 to simulate one HLS segment.
- `--seek SEC` – Start at this position (fast seek before `-i`). Simulates scrubbing into the file.
- `--hwaccel cpu|nvidia|vaapi|qsv-h265` – Matches Frigate presets: libx264, h264_nvenc, h264_vaapi, preset-intel-qsv-h265 (hevc_qsv).
- `--vaapi-device` – VAAPI device (default: `/dev/dri/renderD128`).
- `--qsv-device` – Intel QSV device: on Linux defaults to `/dev/dri/renderD129` if present (else `renderD128`, else `0`). With two GPUs, the second node is often the Intel iGPU. Override if you get “No VA display found” (e.g. try the other node).
- `--output PATH` – Write output here (default: temp file, deleted).
- `--keep-output` – Keep the temp output file.

Output: real time, speed (× realtime), output size. The script suggests whether the speed is good for ~10s segment transcode.

### Shell

Quick one-liners without Python:

```bash
chmod +x scripts/transcode_benchmark.sh

./scripts/transcode_benchmark.sh path/to/recording.mp4
./scripts/transcode_benchmark.sh path/to/recording.mp4 10
./scripts/transcode_benchmark.sh path/to/recording.mp4 10 nvidia
```

Arguments: `INPUT [DURATION_SEC] [cpu|nvidia|vaapi|qsv-h265]`. Optional env: `FFMPEG`, `FFPROBE`, `VAAPI_DEVICE`, `QSV_DEVICE`.

### Interpreting results

- **Speed ≥ 5× realtime** – A 10s segment transcodes in ~2s or less; good for on-demand segment transcode with cache.
- **Speed 1–5×** – Marginal; segment may take several seconds; transcode-ahead or caching helps.
- **Speed &lt; 1×** – Too slow for real-time; consider stronger HW or lower resolution/bitrate.

Run with a real Frigate recording (or any H.264/HEVC MP4) and try both `--duration 10` and full file to see segment vs full transcode cost.

### Troubleshooting `qsv-h265` (“No VA display found”)

Intel QSV (`qsv-h265`) only works on **Intel GPUs** with a working **Intel VA-API** stack. If both `/dev/dri/renderD128` and `renderD129` fail with “No VA display found” or “Device creation failed: -22”, then:

1. **Check which GPUs you have** – With two cards, both may be non-Intel (e.g. NVIDIA + AMD). QSV is Intel-only. Use `lspci -k | grep -A3 VGA` to see adapters and drivers.
2. **Check VA-API** – Run `vainfo` or `vainfo --display drm --device /dev/dri/renderD128` (then `renderD129`). If it errors or shows no Intel driver, QSV won’t work. On Intel you typically need `intel-media-driver` (newer) or `intel-vaapi-driver` (i965, older).
3. **Permissions** – Ensure your user is in the `render` (and often `video`) group: `groups`; add with `sudo usermod -aG render $USER` and log in again.
4. **Use another HW accel** – If you have an **AMD** GPU, use `vaapi` (H.264). If you have **NVIDIA**, use `nvidia`. Otherwise use `cpu`.

5. **Frigate Docker uses QSV but host benchmark fails** – The container has the Intel VA/QSV stack and device access; the host may not. Run the benchmark **inside the same environment** (e.g. inside the Frigate container):

   ```bash
   # Copy script and a sample recording into the container (adjust container name)
   docker cp scripts/transcode_benchmark.sh frigate:/tmp/
   docker cp /path/to/59.24.mp4 frigate:/tmp/
   docker exec -it frigate bash -c 'chmod +x /tmp/transcode_benchmark.sh && /tmp/transcode_benchmark.sh /tmp/59.24.mp4 10 qsv-h265'
   ```

   The script auto-detects FFmpeg under `/usr/lib/ffmpeg/*/bin` when `ffmpeg` isn’t on PATH (Frigate container). If it doesn’t, set `FFMPEG` and `FFPROBE` explicitly, e.g. `docker exec ... env FFMPEG=/usr/lib/ffmpeg/7.0/bin/ffmpeg FFPROBE=/usr/lib/ffmpeg/7.0/bin/ffprobe /tmp/transcode_benchmark.sh ...`.
