"""FastAPI app: proxy VOD requests, transcode segments on the fly."""
import logging
import re
from collections.abc import AsyncIterator
from typing import Optional

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from transcode_proxy.cache import ByteLRUCache
from transcode_proxy.config import config
from transcode_proxy.transcode import (
    TranscodeError,
    stream_transcode_segment_to_h264_ts,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Frigate VOD Transcode Proxy", version="0.1.0")
cache = ByteLRUCache(config.cache_max_bytes)

# Segment extensions that the upstream VOD may expose.
SEGMENT_EXTENSIONS = (".m4s", ".mp4", ".ts")
FORWARD_HEADERS = ("cookie", "authorization", "referer")
TRANSCODED_SEGMENT_SUFFIX = ".transcoded.ts"
H264_CODEC = "avc1.64001f"
LOCAL_QUERY_KEYS = {"bitrate", "max_width", "max_height"}


def _upstream_path(path: str) -> Optional[str]:
    """Strip path_prefix and only allow VOD paths through to upstream."""
    p = path.lstrip("/")
    if config.path_prefix:
        prefix = config.path_prefix.strip("/")
        if p.startswith(prefix + "/"):
            p = p[len(prefix) + 1 :]
    if p == "vod" or p.startswith("vod/"):
        return "/" + p
    if p.startswith("vod-transcoded/"):
        return "/" + p[len("vod-transcoded/") :]
    if p == "vod-transcoded":
        return "/vod"
    return None


def _is_segment(path: str) -> bool:
    return path.rstrip("/").endswith(TRANSCODED_SEGMENT_SUFFIX) or any(
        path.rstrip("/").endswith(ext) for ext in SEGMENT_EXTENSIONS
    )


def _is_init_path(path: str) -> bool:
    return bool(re.search(r"/init.*\.mp4$", path))


def _is_master_playlist(path: str) -> bool:
    return path.endswith("/master.m3u8") or path.endswith("master.m3u8")


def _init_upstream_path(segment_path: str) -> Optional[str]:
    """Infer the matching init fragment for an fMP4 media fragment path."""
    match = re.search(r"/seg-\d+(?P<suffix>.*)\.m4s$", segment_path)
    if not match:
        return None
    suffix = match.group("suffix")
    return re.sub(r"/seg-\d+.*\.m4s$", f"/init{suffix}.mp4", segment_path)


async def _fetch_upstream_bytes(
    client: httpx.AsyncClient, url: str, headers: dict[str, str]
) -> Optional[bytes]:
    try:
        upstream_resp = await client.get(url, headers=headers)
        upstream_resp.raise_for_status()
        return upstream_resp.content
    except Exception as e:
        logger.warning("Upstream fetch failed %s: %s", url, e)
        return None


async def _fetch_source_init_bytes(
    client: httpx.AsyncClient,
    init_path: str,
    query: str,
    headers: dict[str, str],
) -> Optional[bytes]:
    init_url = f"{config.upstream_base.rstrip('/')}{init_path}"
    if query:
        init_url += f"?{query}"

    cache_key = f"source-init:{init_url}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    init_bytes = await _fetch_upstream_bytes(client, init_url, headers)
    if init_bytes is not None:
        cache.set(cache_key, init_bytes)
    return init_bytes


async def _stream_source_segment_bytes(
    source_url: str,
    headers: dict[str, str],
    init_bytes: Optional[bytes] = None,
) -> AsyncIterator[bytes]:
    if init_bytes is not None:
        yield init_bytes

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("GET", source_url, headers=headers) as upstream_resp:
            upstream_resp.raise_for_status()
            async for chunk in upstream_resp.aiter_bytes():
                if chunk:
                    yield chunk


def _proxy_segment_uri(entry: str) -> str:
    return f"{entry}{TRANSCODED_SEGMENT_SUFFIX}"


def _source_segment_path(path: str) -> str:
    if path.endswith(TRANSCODED_SEGMENT_SUFFIX):
        return path[: -len(TRANSCODED_SEGMENT_SUFFIX)]
    return path


def _resolution_for_transcode(
    width: int, height: int, max_width: int, max_height: int
) -> tuple[int, int]:
    if width <= 0 or height <= 0:
        return (max_width, max_height)

    max_width = max(max_width, 2)
    max_height = max(max_height, 2)
    scale = min(max_width / width, max_height / height, 1.0)
    out_width = max(2, int(width * scale))
    out_height = max(2, int(height * scale))

    if out_width % 2:
        out_width -= 1
    if out_height % 2:
        out_height -= 1

    return (max(out_width, 2), max(out_height, 2))


def _bandwidth_bits(bitrate: str) -> int:
    match = re.fullmatch(r"(?P<value>\d+(?:\.\d+)?)(?P<suffix>[kKmMgG]?)", bitrate.strip())
    if not match:
        return 2_000_000

    value = float(match.group("value"))
    suffix = match.group("suffix").upper()
    multiplier = {
        "": 1,
        "K": 1_000,
        "M": 1_000_000,
        "G": 1_000_000_000,
    }[suffix]
    return int(value * multiplier)


def _transcode_request_profile(request: Request) -> tuple[str, int, int, str]:
    bitrate = request.query_params.get("bitrate", config.h264_bitrate)
    max_width = int(request.query_params.get("max_width", config.max_width))
    max_height = int(request.query_params.get("max_height", config.max_height))
    upstream_query = "&".join(
        f"{key}={value}"
        for key, value in request.query_params.multi_items()
        if key not in LOCAL_QUERY_KEYS
    )
    return bitrate, max_width, max_height, upstream_query


def _rewrite_master_playlist(
    upstream_bytes: bytes, bitrate: str, max_width: int, max_height: int
) -> bytes:
    playlist = upstream_bytes.decode("utf-8", errors="replace")
    lines = [line.strip() for line in playlist.splitlines() if line.strip()]
    child_uri: Optional[str] = None
    stream_inf_line: Optional[str] = None

    for idx, line in enumerate(lines):
        if line.startswith("#EXT-X-STREAM-INF:"):
            stream_inf_line = line
            for child_line in lines[idx + 1 :]:
                if child_line and not child_line.startswith("#"):
                    child_uri = child_line
                    break
            break

    if child_uri is None or stream_inf_line is None:
        logger.warning("Unable to parse master playlist, returning upstream manifest")
        return upstream_bytes

    attrs = [
        f'BANDWIDTH={max(_bandwidth_bits(bitrate), 1)}',
        f'CODECS="{H264_CODEC}"',
    ]

    resolution_match = re.search(r"RESOLUTION=(\d+)x(\d+)", stream_inf_line)
    if resolution_match:
        width = int(resolution_match.group(1))
        height = int(resolution_match.group(2))
        out_width, out_height = _resolution_for_transcode(
            width, height, max_width, max_height
        )
        attrs.insert(1, f"RESOLUTION={out_width}x{out_height}")

    rewritten = [
        "#EXTM3U",
        "#EXT-X-STREAM-INF:" + ",".join(attrs),
        child_uri,
        "",
    ]
    return "\n".join(rewritten).encode()


def _rewrite_media_playlist(upstream_bytes: bytes) -> bytes:
    playlist = upstream_bytes.decode("utf-8", errors="replace")
    output_lines: list[str] = []
    segment_index = 0

    for line in playlist.splitlines():
        stripped = line.strip()
        if stripped.startswith("#EXT-X-MAP:"):
            continue

        if stripped.startswith("#EXTINF:") and segment_index > 0:
            output_lines.append("#EXT-X-DISCONTINUITY")

        if stripped and not stripped.startswith("#"):
            output_lines.append(_proxy_segment_uri(stripped))
            segment_index += 1
            continue

        output_lines.append(line)

    if output_lines and output_lines[-1] != "":
        output_lines.append("")

    return "\n".join(output_lines).encode()


async def _proxy_upstream_response(
    client: httpx.AsyncClient, url: str, headers: dict[str, str]
) -> Optional[httpx.Response]:
    try:
        upstream_resp = await client.get(url, headers=headers)
        upstream_resp.raise_for_status()
        return upstream_resp
    except Exception as e:
        logger.warning("Upstream fetch failed %s: %s", url, e)
        return None


async def _transcoded_segment_response(
    source_url: str,
    cache_key: str,
    headers: dict[str, str],
    init_bytes: Optional[bytes] = None,
    bitrate: Optional[str] = None,
    max_width: Optional[int] = None,
    max_height: Optional[int] = None,
) -> Response:
    stream = await stream_transcode_segment_to_h264_ts(
        _stream_source_segment_bytes(source_url, headers, init_bytes),
        config.ffmpeg_path,
        bitrate or config.h264_bitrate,
        max_width or config.max_width,
        max_height or config.max_height,
    )

    try:
        first_chunk = await stream.first_chunk()
    except TranscodeError as e:
        await stream.aclose()
        logger.warning("Transcode stream failed %s: %s", source_url, e)
        return Response(status_code=502, content=b"Transcode failed")

    async def body() -> AsyncIterator[bytes]:
        try:
            async for chunk in stream.iter_chunks(first_chunk):
                yield chunk
        except TranscodeError as e:
            logger.warning("Transcode stream failed %s: %s", source_url, e)
            raise
        else:
            cache.set(cache_key, stream.output_bytes)

    return StreamingResponse(
        body(),
        media_type="video/mp2t",
        headers={"Cache-Control": "private, max-age=300"},
    )


@app.get("/cache")
async def cache_info() -> dict:
    """Return cache size and entry count (for debugging)."""
    return {
        "size_bytes": cache.size_bytes(),
        "size_mb": round(cache.size_bytes() / (1024 * 1024), 2),
        "entries": cache.count(),
    }


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/{full_path:path}")
async def vod_proxy(request: Request, full_path: str) -> Response:
    """Handle /vod/... or /vod-transcoded/... (when path_prefix is set)."""
    path = "/" + full_path.lstrip("/")
    upstream_path = _upstream_path(path)
    if upstream_path is None or not (
        upstream_path == "/vod" or upstream_path.startswith("/vod/")
    ):
        return Response(status_code=404, content=b"Not found")
    bitrate, max_width, max_height, upstream_query = _transcode_request_profile(request)
    upstream_url = f"{config.upstream_base.rstrip('/')}{upstream_path}"
    if upstream_query:
        upstream_url += f"?{upstream_query}"

    headers = {
        k: v for k, v in request.headers.items() if k.lower() in FORWARD_HEADERS
    }

    if upstream_path.endswith(TRANSCODED_SEGMENT_SUFFIX):
        cache_key = f"{upstream_url}|{bitrate}|{max_width}x{max_height}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(
                content=cached,
                media_type="video/mp2t",
                headers={"Cache-Control": "private, max-age=300"},
            )

        source_path = _source_segment_path(upstream_path)
        source_url = f"{config.upstream_base.rstrip('/')}{source_path}"
        if upstream_query:
            source_url += f"?{upstream_query}"

        init_bytes: Optional[bytes] = None
        if source_path.endswith(".m4s"):
            init_path = _init_upstream_path(source_path)
            if init_path is None:
                return Response(status_code=502, content=b"Init segment inference failed")

            async with httpx.AsyncClient(timeout=30.0) as client:
                init_bytes = await _fetch_source_init_bytes(
                    client, init_path, upstream_query, headers
                )

            if init_bytes is None:
                return Response(status_code=502, content=b"Init segment fetch failed")

        return await _transcoded_segment_response(
            source_url=source_url,
            cache_key=cache_key,
            headers=headers,
            init_bytes=init_bytes,
            bitrate=bitrate,
            max_width=max_width,
            max_height=max_height,
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        if _is_master_playlist(upstream_path):
            upstream_resp = await _proxy_upstream_response(client, upstream_url, headers)
            if upstream_resp is None:
                return Response(status_code=502, content=b"Upstream fetch failed")

            return Response(
                content=_rewrite_master_playlist(
                    upstream_resp.content, bitrate, max_width, max_height
                ),
                media_type="application/vnd.apple.mpegurl",
                headers={"Cache-Control": "no-store"},
            )

        if upstream_path.endswith(".m3u8"):
            upstream_resp = await _proxy_upstream_response(client, upstream_url, headers)
            if upstream_resp is None:
                return Response(status_code=502, content=b"Upstream fetch failed")

            return Response(
                content=_rewrite_media_playlist(upstream_resp.content),
                media_type="application/vnd.apple.mpegurl",
                headers={"Cache-Control": "no-store"},
            )

        upstream_resp = await _proxy_upstream_response(client, upstream_url, headers)
        if upstream_resp is None:
            return Response(status_code=502, content=b"Upstream fetch failed")

        return Response(
            content=upstream_resp.content,
            media_type=upstream_resp.headers.get("content-type", "application/octet-stream"),
            headers={"Cache-Control": "no-store"},
        )


def run() -> None:
    import uvicorn
    uvicorn.run(
        "transcode_proxy.main:app",
        host=config.host,
        port=config.port,
        log_level="info",
    )


if __name__ == "__main__":
    run()
