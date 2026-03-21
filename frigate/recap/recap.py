"""Time-stacked recap video generator.

Composites detected people from throughout the day onto a single clean
background. Multiple non-overlapping events play simultaneously so you
can see all the day's activity in a short video.

Each person is extracted from their recording clip using per-event
background subtraction within a spotlight region, producing clean cutouts
without needing a segmentation model.
"""

import datetime
import logging
import os
import re
import subprocess as sp
import threading
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.config import FrigateConfig
from frigate.const import (
    CACHE_DIR,
    CLIPS_DIR,
    EXPORT_DIR,
    PROCESS_PRIORITY_LOW,
)
from frigate.models import Event, Export, Recordings

logger = logging.getLogger(__name__)

RECAP_CACHE = os.path.join(CACHE_DIR, "recap")
OUTPUT_CRF = "23"

# bg subtraction within per-event spotlight — threshold can be low
# because the reference frame matches the event's lighting exactly
BG_DIFF_THRESHOLD = 25
DILATE_ITERATIONS = 2

# spotlight params: generous area, bg sub handles the rest
SPOTLIGHT_PAD = 1.5
SPOTLIGHT_BLUR = 25


def _lower_priority():
    os.nice(PROCESS_PRIORITY_LOW)


def _get_recording_at(camera: str, ts: float) -> Optional[tuple[str, float]]:
    """Find the recording segment covering a timestamp.
    Returns (path, offset_into_file) or None.
    """
    try:
        rec = (
            Recordings.select(Recordings.path, Recordings.start_time)
            .where(Recordings.camera == camera)
            .where(Recordings.start_time <= ts)
            .where(Recordings.end_time >= ts)
            .get()
        )
        return rec.path, ts - float(rec.start_time)
    except DoesNotExist:
        return None


def _probe_resolution(ffmpeg_path: str, path: str) -> Optional[tuple[int, int]]:
    probe = sp.run(
        [ffmpeg_path, "-hide_banner", "-i", path, "-f", "null", "-"],
        capture_output=True,
        timeout=10,
        preexec_fn=_lower_priority,
    )
    match = re.search(r"(\d{2,5})x(\d{2,5})", probe.stderr.decode(errors="replace"))
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def _extract_frame(
    ffmpeg_path: str, path: str, offset: float, w: int, h: int
) -> Optional[np.ndarray]:
    p = sp.run(
        [
            ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{offset:.3f}",
            "-i",
            path,
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "pipe:1",
        ],
        capture_output=True,
        timeout=15,
        preexec_fn=_lower_priority,
    )
    if p.returncode != 0 or len(p.stdout) == 0:
        return None
    expected = w * h * 3
    if len(p.stdout) < expected:
        return None
    return np.frombuffer(p.stdout, dtype=np.uint8)[:expected].reshape((h, w, 3))


def _extract_frames_range(
    ffmpeg_path: str,
    path: str,
    offset: float,
    duration: float,
    fps: int,
    w: int,
    h: int,
) -> list[np.ndarray]:
    """Pull multiple frames from a recording at a given fps."""
    p = sp.run(
        [
            ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{offset:.3f}",
            "-t",
            f"{duration:.3f}",
            "-i",
            path,
            "-vf",
            f"fps={fps}",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "pipe:1",
        ],
        capture_output=True,
        timeout=max(30, int(duration) + 15),
        preexec_fn=_lower_priority,
    )
    if p.returncode != 0 or len(p.stdout) == 0:
        return []
    frame_size = w * h * 3
    return [
        np.frombuffer(p.stdout[i : i + frame_size], dtype=np.uint8).reshape((h, w, 3))
        for i in range(0, len(p.stdout) - frame_size + 1, frame_size)
    ]


def _build_background(
    ffmpeg_path: str,
    camera: str,
    start_time: float,
    end_time: float,
    sample_count: int,
) -> Optional[np.ndarray]:
    """Median of sampled frames — removes moving objects, keeps the static scene."""
    duration = end_time - start_time
    step = duration / (sample_count + 1)
    resolution = None
    frames = []

    for i in range(1, sample_count + 1):
        ts = start_time + step * i
        result = _get_recording_at(camera, ts)
        if result is None:
            continue
        rec_path, offset = result
        if not os.path.isfile(rec_path):
            continue
        if resolution is None:
            resolution = _probe_resolution(ffmpeg_path, rec_path)
            if resolution is None:
                continue
        w, h = resolution
        frame = _extract_frame(ffmpeg_path, rec_path, offset, w, h)
        if frame is not None and frame.shape == (h, w, 3):
            frames.append(frame)

    if len(frames) < 3:
        logger.warning("only got %d bg frames, need 3+", len(frames))
        return None
    return np.median(np.stack(frames, axis=0), axis=0).astype(np.uint8)


def _relative_box_to_pixels(
    box: list[float], w: int, h: int
) -> tuple[int, int, int, int]:
    """Normalized [x, y, w, h] -> pixel [x1, y1, x2, y2]."""
    x1 = max(0, int(box[0] * w))
    y1 = max(0, int(box[1] * h))
    x2 = min(w, int((box[0] + box[2]) * w))
    y2 = min(h, int((box[1] + box[3]) * h))
    return x1, y1, x2, y2


def _make_spotlight(w: int, h: int, cx: int, cy: int, rx: int, ry: int) -> np.ndarray:
    """Soft elliptical spotlight mask, float32 0-1."""
    m = np.zeros((h, w), np.uint8)
    cv2.ellipse(m, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)
    m = cv2.GaussianBlur(m, (SPOTLIGHT_BLUR, SPOTLIGHT_BLUR), 0)
    return m.astype(np.float32) / 255.0


def _person_mask(
    frame: np.ndarray, ref_bg: np.ndarray, spotlight: np.ndarray
) -> np.ndarray:
    """Extract person by diffing against the per-event reference frame,
    then AND with the spotlight to contain it to the detection area.
    """
    diff = cv2.absdiff(frame, ref_bg)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, fg = cv2.threshold(gray, BG_DIFF_THRESHOLD, 255, cv2.THRESH_BINARY)
    fg = cv2.dilate(fg, None, iterations=DILATE_ITERATIONS)
    fg = cv2.erode(fg, None, iterations=1)
    return (fg.astype(np.float32) / 255.0) * spotlight


def _mask_centroid(m: np.ndarray) -> Optional[tuple[int, int]]:
    coords = np.argwhere(m > 0.3)
    if len(coords) == 0:
        return None
    return int(coords[:, 1].mean()), int(coords[:, 0].mean())


def _interpolate_path(
    path_data: list, t: float, w: int, h: int
) -> Optional[tuple[int, int]]:
    """Interpolate person position from path_data at time t."""
    if not path_data or len(path_data) < 1:
        return None
    prev = None
    for coord, ts in path_data:
        if ts > t:
            if prev is None:
                return int(coord[0] * w), int(coord[1] * h)
            pc, pt = prev
            dt = ts - pt
            if dt <= 0:
                return int(coord[0] * w), int(coord[1] * h)
            f = (t - pt) / dt
            ix = pc[0] + (coord[0] - pc[0]) * f
            iy = pc[1] + (coord[1] - pc[1]) * f
            return int(ix * w), int(iy * h)
        prev = (coord, ts)
    if prev:
        return int(prev[0][0] * w), int(prev[0][1] * h)
    return None


def _draw_label(frame: np.ndarray, text: str, x: int, y: int):
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.28
    thickness = 1
    (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
    lx = max(0, min(x - tw // 2, frame.shape[1] - tw - 3))
    ly = max(th + 3, min(y, frame.shape[0] - 2))
    cv2.rectangle(frame, (lx, ly - th - 2), (lx + tw + 2, ly + 2), (0, 0, 0), -1)
    cv2.putText(frame, text, (lx + 1, ly), font, scale, (255, 255, 255), thickness)


def _balance_groups(events: list[dict], max_per: int) -> list[list[dict]]:
    """Spread events across groups so durations are roughly even.
    Longest events get their own group first, shorter ones fill in.
    """
    by_len = sorted(events, key=lambda e: len(e["frames"]), reverse=True)
    groups: list[list[dict]] = []
    lengths: list[int] = []

    for ev in by_len:
        best = None
        best_len = float("inf")
        for i, g in enumerate(groups):
            if len(g) < max_per and lengths[i] < best_len:
                best = i
                best_len = lengths[i]
        if best is not None:
            groups[best].append(ev)
            lengths[best] = max(lengths[best], len(ev["frames"]))
        else:
            groups.append([ev])
            lengths.append(len(ev["frames"]))

    for g in groups:
        g.sort(key=lambda e: e["time"])
    return groups


class RecapGenerator(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        export_id: str,
        camera: str,
        start_time: float,
        end_time: float,
        label: str = "person",
    ):
        super().__init__(daemon=True)
        self.config = config
        self.export_id = export_id
        self.camera = camera
        self.start_time = start_time
        self.end_time = end_time
        self.label = label
        self.ffmpeg_path = config.ffmpeg.ffmpeg_path

        recap_cfg = config.recap
        self.output_fps = recap_cfg.output_fps
        self.speed = recap_cfg.speed
        self.max_per_group = recap_cfg.max_per_group
        self.video_duration = recap_cfg.video_duration
        self.background_samples = recap_cfg.background_samples

        Path(RECAP_CACHE).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(CLIPS_DIR, "export")).mkdir(exist_ok=True)

    def _get_events(self) -> list[dict]:
        return list(
            Event.select(
                Event.id,
                Event.start_time,
                Event.end_time,
                Event.label,
                Event.data,
                Event.box,
                Event.top_score,
            )
            .where(Event.camera == self.camera)
            .where(Event.label == self.label)
            .where(Event.start_time >= self.start_time)
            .where(Event.start_time <= self.end_time)
            .where(Event.false_positive == False)  # noqa: E712
            .order_by(Event.start_time.asc())
            .dicts()
        )

    def run(self):
        logger.info(
            "generating recap for %s (%s to %s)",
            self.camera,
            datetime.datetime.fromtimestamp(self.start_time).isoformat(),
            datetime.datetime.fromtimestamp(self.end_time).isoformat(),
        )
        wall_start = time.monotonic()
        start_dt = datetime.datetime.fromtimestamp(self.start_time)
        end_dt = datetime.datetime.fromtimestamp(self.end_time)
        export_name = f"{self.camera} recap {start_dt.strftime('%Y-%m-%d')}"
        filename = (
            f"{self.camera}_recap_{start_dt.strftime('%Y%m%d_%H%M%S')}-"
            f"{end_dt.strftime('%Y%m%d_%H%M%S')}_{self.export_id.split('_')[-1]}.mp4"
        )
        video_path = os.path.join(EXPORT_DIR, filename)

        Export.insert(
            {
                Export.id: self.export_id,
                Export.camera: self.camera,
                Export.name: export_name,
                Export.date: self.start_time,
                Export.video_path: video_path,
                Export.thumb_path: "",
                Export.in_progress: True,
            }
        ).execute()

        try:
            self._generate(video_path)
        except Exception:
            logger.exception("recap failed for %s", self.camera)
            Path(video_path).unlink(missing_ok=True)
            Export.delete().where(Export.id == self.export_id).execute()
            return

        logger.info(
            "recap for %s done in %.1fs -> %s",
            self.camera,
            time.monotonic() - wall_start,
            video_path,
        )

    def _generate(self, out_path: str):
        events = self._get_events()
        if not events:
            logger.info("no %s events for %s, nothing to do", self.label, self.camera)
            Export.delete().where(Export.id == self.export_id).execute()
            return

        logger.info("found %d %s events", len(events), self.label)

        background = _build_background(
            self.ffmpeg_path,
            self.camera,
            self.start_time,
            self.end_time,
            self.background_samples,
        )
        if background is None:
            logger.error("couldn't build background for %s", self.camera)
            Export.delete().where(Export.id == self.export_id).execute()
            return

        bg_h, bg_w = background.shape[:2]
        bg_f = background.astype(np.float32)

        # build clip data for each event
        prepped = []
        for ev in events:
            data = ev.get("data") or {}
            box = data.get("box") or ev.get("box")
            if not box or len(box) != 4:
                continue

            ev_time = float(ev["start_time"])
            ev_end = float(ev.get("end_time") or ev_time)
            ev_dur = max(ev_end - ev_time, 0.5)

            result = _get_recording_at(self.camera, ev_time)
            if result is None:
                continue
            rec_path, offset = result
            if not os.path.isfile(rec_path):
                continue

            frames = _extract_frames_range(
                self.ffmpeg_path,
                rec_path,
                offset,
                ev_dur,
                self.output_fps,
                bg_w,
                bg_h,
            )
            if len(frames) < 3:
                continue

            # first frame is from pre-capture — use as per-event bg reference
            ref_bg = frames[0]
            event_frames = frames[2:]
            if not event_frames:
                continue

            pbox = _relative_box_to_pixels(box, bg_w, bg_h)
            ts_str = datetime.datetime.fromtimestamp(ev_time).strftime("%H:%M:%S")

            prepped.append(
                {
                    "frames": event_frames,
                    "ref_bg": ref_bg,
                    "pbox": pbox,
                    "path": data.get("path_data"),
                    "ts_str": ts_str,
                    "time": ev_time,
                }
            )

        if not prepped:
            logger.warning("no usable clips for %s", self.camera)
            Export.delete().where(Export.id == self.export_id).execute()
            return

        groups = _balance_groups(prepped, self.max_per_group)
        logger.info(
            "%d events -> %d groups (max %d/group)",
            len(prepped),
            len(groups),
            self.max_per_group,
        )

        # render each group to a temp file, then concat
        tmp_dir = os.path.join(RECAP_CACHE, self.export_id)
        Path(tmp_dir).mkdir(parents=True, exist_ok=True)
        seg_paths = []

        for gi, group in enumerate(groups):
            max_frames = max(len(e["frames"]) for e in group)
            seg_path = os.path.join(tmp_dir, f"seg_{gi:04d}.mp4")

            proc = sp.Popen(
                [
                    self.ffmpeg_path,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-f",
                    "rawvideo",
                    "-pix_fmt",
                    "bgr24",
                    "-s",
                    f"{bg_w}x{bg_h}",
                    "-r",
                    str(self.output_fps * self.speed),
                    "-i",
                    "pipe:0",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-crf",
                    OUTPUT_CRF,
                    "-pix_fmt",
                    "yuv420p",
                    "-movflags",
                    "+faststart",
                    seg_path,
                ],
                stdin=sp.PIPE,
                stdout=sp.PIPE,
                stderr=sp.PIPE,
                preexec_fn=_lower_priority,
            )

            try:
                for fi in range(max_frames):
                    canvas = bg_f.copy()
                    label_info = []

                    for ev in group:
                        if fi >= len(ev["frames"]):
                            continue
                        src = ev["frames"][fi]
                        src_f = src.astype(np.float32)
                        bx1, by1, bx2, by2 = ev["pbox"]
                        bw = bx2 - bx1
                        bh = by2 - by1

                        ft = ev["time"] + fi / self.output_fps
                        pos = None
                        if ev["path"] and len(ev["path"]) >= 2:
                            pos = _interpolate_path(ev["path"], ft, bg_w, bg_h)
                        cx, cy = pos if pos else ((bx1 + bx2) // 2, (by1 + by2) // 2)

                        rx = max(20, int(bw * SPOTLIGHT_PAD))
                        ry = max(25, int(bh * SPOTLIGHT_PAD))
                        sl = _make_spotlight(bg_w, bg_h, cx, cy, rx, ry)

                        mask = _person_mask(src, ev["ref_bg"], sl)
                        m3 = mask[:, :, np.newaxis]
                        canvas = src_f * m3 + canvas * (1.0 - m3)

                        ctr = _mask_centroid(mask)
                        if ctr:
                            label_info.append(
                                (ev["ts_str"], ctr[0], ctr[1] - int(bh * 0.5))
                            )
                        else:
                            label_info.append((ev["ts_str"], cx, cy - int(bh * 0.5)))

                    cu8 = canvas.astype(np.uint8)
                    for ts, lx, ly in label_info:
                        _draw_label(cu8, ts, lx, ly)
                    cv2.rectangle(
                        cu8,
                        (0, bg_h - 2),
                        (int(bg_w * fi / max_frames), bg_h),
                        (0, 180, 255),
                        -1,
                    )
                    proc.stdin.write(cu8.tobytes())

                proc.stdin.close()
                proc.wait(timeout=120)
            except Exception:
                proc.kill()
                proc.wait()
                raise

            if proc.returncode == 0:
                seg_paths.append(seg_path)

            # free memory as we go
            for ev in group:
                ev["frames"] = None
                ev["ref_bg"] = None

        if not seg_paths:
            logger.error("no segments rendered for %s", self.camera)
            Export.delete().where(Export.id == self.export_id).execute()
            return

        # concat all segments
        concat_file = os.path.join(tmp_dir, "concat.txt")
        with open(concat_file, "w") as f:
            for p in seg_paths:
                f.write(f"file '{p}'\n")

        sp.run(
            [
                self.ffmpeg_path,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_file,
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                "-y",
                out_path,
            ],
            capture_output=True,
            timeout=300,
            preexec_fn=_lower_priority,
        )

        # cleanup temp files
        for p in seg_paths:
            Path(p).unlink(missing_ok=True)
        Path(concat_file).unlink(missing_ok=True)
        Path(tmp_dir).rmdir()

        # thumbnail from the middle
        thumb_path = os.path.join(CLIPS_DIR, f"export/{self.export_id}.webp")
        total_frames = sum(
            max(len(e["frames"]) for e in g) if any(e["frames"] for e in g) else 0
            for g in groups
        )
        sp.run(
            [
                self.ffmpeg_path,
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                out_path,
                "-vf",
                f"select=eq(n\\,{max(1, total_frames // 2)})",
                "-frames:v",
                "1",
                "-c:v",
                "libwebp",
                "-y",
                thumb_path,
            ],
            capture_output=True,
            timeout=30,
            preexec_fn=_lower_priority,
        )

        Export.update({Export.in_progress: False, Export.thumb_path: thumb_path}).where(
            Export.id == self.export_id
        ).execute()
