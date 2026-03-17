# Frigate VOD Transcode Proxy

Optional proxy that runs **inside the Frigate container** and rewrites VOD HLS playback to an H.264 transport-stream rendition on the fly. Use it when recordings are HEVC (or high bitrate) and you want compatible or lower-bitrate playback.

## How it works

- **Manifest requests** (e.g. `.../master.m3u8` and `.../index-v1.m3u8`): Fetched from upstream and rewritten so the browser sees a proxy-owned H.264 HLS rendition.
- **Segment requests**: The rewritten media playlist points to proxy-owned `.transcoded.ts` segment URLs. Those requests fetch the upstream source segment, transcode it to H.264 MPEG-TS with FFmpeg, cache it in memory (LRU, configurable size), then serve it.
- **Init fragments**: The rewritten media playlist removes upstream `#EXT-X-MAP` usage, so the browser no longer depends on upstream fragmented MP4 init files for transcoded playback.

The proxy is an s6-managed service in the same Docker image as Frigate. It binds to port **5010** inside the container and starts after nginx is ready.

## Configuration

Environment variables (optional; defaults work when running in the same container):

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSCODE_PROXY_UPSTREAM` | `http://127.0.0.1:5000` | Upstream Frigate VOD base URL (nginx internal port when in-container). |
| `TRANSCODE_PROXY_PATH_PREFIX` | (empty) | If the proxy is mounted at a path (e.g. `/vod-transcoded`), set this so the proxy strips it when forwarding. |
| `TRANSCODE_PROXY_HOST` | `0.0.0.0` | Bind host. |
| `TRANSCODE_PROXY_PORT` | `5010` | Bind port. |
| `TRANSCODE_PROXY_CACHE_MB` | `500` | Max in-memory cache size (MB). |
| `TRANSCODE_PROXY_FFMPEG` | (system) | FFmpeg binary path; uses Frigate’s FFmpeg when not set. |
| `TRANSCODE_PROXY_H264_BITRATE` | `128k` | H.264 bitrate for transcoded segments. |
| `TRANSCODE_PROXY_MAX_WIDTH` | `640` | Max output width for transcoded playback; aspect ratio is preserved and smaller sources are not upscaled. |
| `TRANSCODE_PROXY_MAX_HEIGHT` | `480` | Max output height for transcoded playback; aspect ratio is preserved and smaller sources are not upscaled. |

## Enabling in Frigate

1. Build Frigate from this repo (e.g. `frigate-dev`) so the image includes the proxy and config/UI support.
2. Expose the proxy either internally through Frigate nginx (recommended, e.g. `/vod-transcoded`) or by publishing port **5010** for direct access.
3. In Frigate config (YAML), add:
   ```yaml
   transcode_proxy:
     enabled: true
     vod_proxy_url: "http://YOUR_FRIGATE_HOST:5010"   # same host as Frigate, port 5010
   ```
4. Restart Frigate. The UI will use the proxy for recording playback when enabled.

If Frigate is behind a reverse proxy and you expose the transcode service at a path (e.g. `https://frigate.example.com/vod-transcoded`), set `TRANSCODE_PROXY_PATH_PREFIX=/vod-transcoded` in the container environment and use that full URL as `vod_proxy_url`.

## Running (single container)

The proxy runs automatically inside the Frigate container. No separate container or image is needed. For same-origin playback, keep the service internal and route it through Frigate nginx on the normal UI origin.

See **transcode_proxy/DEV_WORKFLOW.md** for building the dev image (e.g. `frigate-dev`) and switching between stable and dev.

## Endpoints

- `GET /vod/.../master.m3u8` – Rewritten HLS master playlist for the transcoded rendition.
- `GET /vod/.../index*.m3u8` – Rewritten HLS media playlist that points at proxy-owned transcoded transport-stream segments.
- `GET /vod/.../*.transcoded.ts` – Transcoded H.264 MPEG-TS segments.
- `GET /cache` – Cache stats (size, entry count).
- `GET /health` – Health check.
