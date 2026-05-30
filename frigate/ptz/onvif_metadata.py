"""ONVIF analytics metadata stream consumer.

Per-camera asyncio task that opens an RTSP connection to the camera's
primary profile, extracts the `application/vnd.onvif.metadata` data track
via an ffmpeg subprocess, and converts the per-frame `<tt:MotionInCells>`
bitmap into a list of motion rectangles in Frigate detect-frame pixels.

Why ffmpeg rather than an in-process RTSP client: Frigate already ships
ffmpeg and uses it heavily for video/recording; there is no async RTSP
client in the existing dependency set that handles the `vnd.onvif.metadata`
payload cleanly. The data track is low-bandwidth (~1 packet/sec at idle,
≤300 bytes XML each), so the subprocess cost is negligible.

Wire format (ONVIF Analytics Service Spec, Annex B "Cell Motion Detection"):
  - Each RTP packet payload is one complete <tt:MetadataStream> XML doc.
  - Cells attribute = base64(PackBits(bit-packed row-major bitmap)).
  - Bits: cols*rows total, MSB-first within bytes, zero-padded.

Cell → detect-frame mapping uses the CellLayout transformation discovered
at OnvifController init: Translate(tx, ty) + Scale(sx, sy) maps cell index
(c, r) to normalized ONVIF coords [-1, +1]. We convert that to detect-frame
pixels.
"""

import asyncio
import base64
import logging
from typing import Awaitable, Callable
from xml.etree import ElementTree as ET

import numpy as np

logger = logging.getLogger(__name__)

_TT_NS = "http://www.onvif.org/ver10/schema"
_MIC_TAG = f"{{{_TT_NS}}}MotionInCells"

# ffmpeg's -map 0:d:0 selects the first data track from the input. -c copy
# bypasses any transcode. -f data writes raw packet payloads to stdout.
# -flush_packets 1 disables muxer-side buffering so each metadata frame
# reaches us within ~1 packet of being received from the camera.
_FFMPEG_ARGS_TEMPLATE = (
    "-nostdin",
    "-loglevel",
    "error",
    "-rtsp_transport",
    "tcp",
    "-i",
    "{url}",
    "-map",
    "0:d:0?",
    "-c",
    "copy",
    "-flush_packets",
    "1",
    "-f",
    "data",
    "pipe:1",
)

# Each metadata document ends with this closing tag — we split incoming
# stdout on it to recover packet boundaries (no other framing on a `-f data`
# stream).
_DOC_TERMINATOR = b"</tt:MetadataStream>"

_BACKOFF_INITIAL_S = 1.0
_BACKOFF_MAX_S = 60.0

# Stop reading at this many bytes per single document — guards against a
# misbehaving stream filling memory if the terminator never arrives.
_MAX_DOC_BYTES = 64 * 1024


def _packbits_decode(packed: bytes) -> bytes:
    """ISO 12639 / TIFF 6.0 PackBits decoder."""
    out = bytearray()
    i = 0
    n = len(packed)
    while i < n:
        h = packed[i]
        i += 1
        if h <= 0x7F:
            count = h + 1
            out += packed[i : i + count]
            i += count
        elif h == 0x80:
            continue  # no-op header
        else:
            count = 257 - h
            if i >= n:
                break
            out += bytes([packed[i]]) * count
            i += 1
    return bytes(out)


def _decode_cells(cells_b64: str, cols: int, rows: int) -> np.ndarray | None:
    """Decode the Cells attribute into a 2-D uint8 array shape (rows, cols).

    Returns None if the decoded length doesn't match what the layout
    expects — caller should treat that as "no spatial data this frame"
    and fall back to whatever default (e.g. full-frame box)."""
    if not cells_b64:
        return None
    try:
        packed = base64.b64decode(cells_b64, validate=False)
    except Exception:
        return None
    raw = _packbits_decode(packed)
    needed_bytes = (cols * rows + 7) // 8
    if len(raw) < needed_bytes:
        return None
    bits = np.unpackbits(np.frombuffer(raw[:needed_bytes], dtype=np.uint8))
    bits = bits[: cols * rows]
    return bits.reshape((rows, cols)).astype(np.uint8)


def _connected_component_bboxes(
    cells: np.ndarray,
) -> list[tuple[int, int, int, int]]:
    """4-connectivity flood fill over a small 0/1 grid; returns list of
    (c_left, c_top, c_right, c_bottom) inclusive cell-index bounding boxes
    for each connected region.

    cv2.connectedComponentsWithStats would be faster, but the cell grid is
    tiny (typically 22x18 = 396 cells) and avoiding the cv2 import keeps
    this module testable without OpenCV installed.
    """
    rows, cols = cells.shape
    visited = np.zeros_like(cells, dtype=bool)
    out: list[tuple[int, int, int, int]] = []
    for r0 in range(rows):
        for c0 in range(cols):
            if not cells[r0, c0] or visited[r0, c0]:
                continue
            stack = [(r0, c0)]
            cmin = cmax = c0
            rmin = rmax = r0
            while stack:
                r, c = stack.pop()
                if r < 0 or r >= rows or c < 0 or c >= cols:
                    continue
                if visited[r, c] or not cells[r, c]:
                    continue
                visited[r, c] = True
                if r < rmin:
                    rmin = r
                if r > rmax:
                    rmax = r
                if c < cmin:
                    cmin = c
                if c > cmax:
                    cmax = c
                stack.append((r + 1, c))
                stack.append((r - 1, c))
                stack.append((r, c + 1))
                stack.append((r, c - 1))
            out.append((cmin, rmin, cmax, rmax))
    return out


def _cells_to_boxes(
    cells: np.ndarray,
    cell_layout: tuple[int, int, tuple[float, float], tuple[float, float]],
    detect_size: tuple[int, int],
) -> list[tuple[int, int, int, int]]:
    """Connected-components on the cell grid → list of detect-frame boxes.

    cell_layout = (cols, rows, (tx, ty), (sx, sy)) — the Translate + Scale
    from CellLayout.Transformation. detect_size = (width, height) in
    detect-frame pixels.
    """
    if cells is None or cells.size == 0 or not cells.any():
        return []

    cols, rows, (tx, ty), (sx, sy) = cell_layout
    det_w, det_h = detect_size
    if det_w <= 0 or det_h <= 0:
        return []

    boxes: list[tuple[int, int, int, int]] = []

    # Map cell index → detect-frame pixel via the CellLayout transformation:
    # cell (c, r) covers normalized [tx + c*sx, tx + (c+1)*sx] horizontally
    # and similarly vertically. Convert normalized [-1, +1] → pixel.
    def cell_to_px(
        c: int, r: int, *, right_edge: bool, bottom_edge: bool
    ) -> tuple[int, int]:
        cx_idx = c + 1 if right_edge else c
        cy_idx = r + 1 if bottom_edge else r
        nx = tx + cx_idx * sx
        ny = ty + cy_idx * sy
        px = int(round((nx + 1.0) * 0.5 * det_w))
        py = int(round((ny + 1.0) * 0.5 * det_h))
        return px, py

    for c_left, c_top, c_right, c_bottom in _connected_component_bboxes(cells):
        x1, y1 = cell_to_px(c_left, c_top, right_edge=False, bottom_edge=False)
        x2, y2 = cell_to_px(c_right, c_bottom, right_edge=True, bottom_edge=True)
        x1 = max(0, min(det_w - 1, x1))
        y1 = max(0, min(det_h - 1, y1))
        x2 = max(0, min(det_w - 1, x2))
        y2 = max(0, min(det_h - 1, y2))
        if x2 <= x1 or y2 <= y1:
            continue
        boxes.append((x1, y1, x2, y2))

    return boxes


def _extract_cells_from_doc(doc_bytes: bytes) -> tuple[str | None, int, int]:
    """Parse a <tt:MetadataStream> XML doc, return (cells_b64, cols, rows).

    Returns (None, 0, 0) if no MotionInCells element is found."""
    try:
        root = ET.fromstring(doc_bytes)
    except ET.ParseError:
        return None, 0, 0
    for el in root.iter(_MIC_TAG):
        cells_b64 = el.attrib.get("Cells")
        try:
            cols = int(el.attrib.get("Columns", "0"))
            rows = int(el.attrib.get("Rows", "0"))
        except ValueError:
            return None, 0, 0
        return cells_b64, cols, rows
    return None, 0, 0


async def run_metadata_stream(
    rtsp_url: str,
    cam_name: str,
    cell_layout: tuple[int, int, tuple[float, float], tuple[float, float]],
    detect_size: tuple[int, int],
    on_boxes: Callable[[list[tuple[int, int, int, int]]], None]
    | Callable[[list[tuple[int, int, int, int]]], Awaitable[None]],
    stop_event: asyncio.Event,
) -> None:
    """Loop until stop_event: spawn ffmpeg → read XML docs → decode → on_boxes."""
    backoff = _BACKOFF_INITIAL_S

    while not stop_event.is_set():
        proc = None
        try:
            args = [a.format(url=rtsp_url) for a in _FFMPEG_ARGS_TEMPLATE]
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg",
                *args,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            logger.info(
                f"ONVIF metadata stream: ffmpeg started for {cam_name} pid={proc.pid}"
            )
            await _consume_ffmpeg(
                proc, cam_name, cell_layout, detect_size, on_boxes, stop_event
            )
            backoff = _BACKOFF_INITIAL_S
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning(
                f"ONVIF metadata stream error for {cam_name}: {e!r}; "
                f"reconnecting in {backoff:.1f}s"
            )
        finally:
            if proc is not None and proc.returncode is None:
                proc.terminate()
                try:
                    await asyncio.wait_for(proc.wait(), timeout=2.0)
                except asyncio.TimeoutError:
                    proc.kill()
                    await proc.wait()

        if stop_event.is_set():
            return
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=backoff)
            return
        except asyncio.TimeoutError:
            pass
        backoff = min(backoff * 2, _BACKOFF_MAX_S)


async def _consume_ffmpeg(
    proc: asyncio.subprocess.Process,
    cam_name: str,
    cell_layout: tuple[int, int, tuple[float, float], tuple[float, float]],
    detect_size: tuple[int, int],
    on_boxes,
    stop_event: asyncio.Event,
) -> None:
    """Read XML docs from ffmpeg stdout and dispatch boxes."""
    layout_cols, layout_rows, _, _ = cell_layout
    assert proc.stdout is not None
    buf = bytearray()

    while not stop_event.is_set():
        chunk = await proc.stdout.read(4096)
        if not chunk:
            # ffmpeg exited or stream ended.
            stderr_tail = b""
            if proc.stderr is not None:
                try:
                    stderr_tail = await asyncio.wait_for(
                        proc.stderr.read(4096), timeout=0.5
                    )
                except asyncio.TimeoutError:
                    pass
            raise RuntimeError(
                f"ffmpeg exited for {cam_name} rc={proc.returncode} "
                f"stderr={stderr_tail.decode('utf-8', 'replace').strip()[:200]}"
            )

        buf.extend(chunk)
        if len(buf) > _MAX_DOC_BYTES * 4:
            # Drop the head to avoid unbounded growth on a wedged stream.
            buf = buf[-_MAX_DOC_BYTES:]

        while True:
            end = buf.find(_DOC_TERMINATOR)
            if end < 0:
                break
            end += len(_DOC_TERMINATOR)
            doc = bytes(buf[:end])
            del buf[:end]

            cells_b64, cols, rows = _extract_cells_from_doc(doc)
            if cells_b64 is None:
                continue
            # Trust the layout we discovered at init; warn (don't fail) if the
            # camera reports a different grid mid-stream.
            if cols != layout_cols or rows != layout_rows:
                logger.debug(
                    f"{cam_name}: MotionInCells grid {cols}x{rows} differs "
                    f"from discovered layout {layout_cols}x{layout_rows}"
                )
                use_layout = (
                    cols,
                    rows,
                    cell_layout[2],
                    (2.0 / cols if cols else 0, 2.0 / rows if rows else 0),
                )
            else:
                use_layout = cell_layout

            cells = _decode_cells(cells_b64, cols, rows)
            if cells is None:
                continue
            boxes = _cells_to_boxes(cells, use_layout, detect_size)
            try:
                result = on_boxes(boxes)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                logger.exception(f"on_boxes callback error for {cam_name}")
