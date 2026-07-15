#!/usr/bin/env python3
"""Analyze keyframe and timestamp structure of Frigate recording segments.

This is a diagnostic tool for investigating seek precision / GOP behavior on
recorded segments. It does not modify anything.

ffprobe is only available inside the Frigate container, at
    /usr/lib/ffmpeg/$DEFAULT_FFMPEG_VERSION/bin/ffprobe
This script auto-resolves that path from the DEFAULT_FFMPEG_VERSION env var
(or falls back to scanning /usr/lib/ffmpeg/*/bin/ffprobe). Pass --ffprobe to
override if needed.

All recording segments on the filesystem are in UTC. The --timestamp flag
expects a UTC Unix timestamp.

Typical use:
    # Inside the Frigate container (or wherever recordings are mounted)
    python3 analyze_recording_keyframes.py <camera_name>

    # Analyze 10 most recent segments
    python3 analyze_recording_keyframes.py <camera_name> --count 10

    # Locate the segment that contains a specific UTC Unix timestamp and
    # show it plus surrounding segments
    python3 analyze_recording_keyframes.py <camera> --timestamp 1713471234.567

    # Custom recordings directory
    python3 analyze_recording_keyframes.py <camera> --recordings-dir /media/frigate/recordings

    # Override the ffprobe path explicitly
    python3 analyze_recording_keyframes.py <camera> --ffprobe /usr/lib/ffmpeg/7.0/bin/ffprobe
"""

import argparse
import datetime
import json
import os
import subprocess
import sys
from pathlib import Path
from statistics import mean, median, stdev


def resolve_ffprobe_path(override: str | None) -> str:
    """Resolve the ffprobe binary path.

    Inside the Frigate container, ffprobe lives at
    /usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffprobe — the exact version
    depends on the image build and is exposed as an env var.
    """
    if override:
        return override
    version = os.environ.get("DEFAULT_FFMPEG_VERSION", "")
    if version:
        path = f"/usr/lib/ffmpeg/{version}/bin/ffprobe"
        if Path(path).is_file():
            return path
    # Fall back to scanning the Frigate ffmpeg install root.
    for candidate in sorted(Path("/usr/lib/ffmpeg").glob("*/bin/ffprobe")):
        if candidate.is_file():
            return str(candidate)
    print(
        "Could not locate ffprobe. Pass --ffprobe <path> or set "
        "DEFAULT_FFMPEG_VERSION.",
        file=sys.stderr,
    )
    sys.exit(1)


def find_recent_segments(recordings_dir: Path, camera: str, count: int) -> list[Path]:
    """Return the N most recent .mp4 segments for the given camera.

    Expected layout: <recordings_dir>/<YYYY-MM-DD>/<HH>/<camera>/<MM>.<SS>.mp4
    """
    pattern = f"*/*/{camera}/*.mp4"
    segments = sorted(recordings_dir.glob(pattern))
    return segments[-count:]


def find_segments_near_timestamp(
    recordings_dir: Path, camera: str, target_ts: float, count: int
) -> tuple[list[Path], Path | None]:
    """Return `count` segments centered on the one containing `target_ts`.

    Also returns the specific segment that should contain the timestamp, so
    callers can highlight it in output.
    """
    pattern = f"*/*/{camera}/*.mp4"
    with_ts: list[tuple[float, Path]] = []
    for seg in sorted(recordings_dir.glob(pattern)):
        ts = filename_to_timestamp(seg)
        if ts is not None:
            with_ts.append((ts, seg))

    if not with_ts:
        return [], None

    # Largest filename_ts that is <= target_ts — that's the segment that
    # should contain the timestamp (Frigate catalogs segments by filename).
    target_idx = -1
    for i, (ts, _) in enumerate(with_ts):
        if ts <= target_ts:
            target_idx = i
        else:
            break

    if target_idx < 0:
        # target_ts is before the earliest segment we have — just return the
        # first `count` segments so the user can see what's available.
        window = with_ts[:count]
        return [seg for _, seg in window], None

    half = count // 2
    start = max(0, target_idx - half)
    end = min(len(with_ts), start + count)
    start = max(0, end - count)

    window = with_ts[start:end]
    return [seg for _, seg in window], with_ts[target_idx][1]


def filename_to_timestamp(segment: Path) -> float | None:
    """Parse the wall-clock time from Frigate's segment path layout."""
    try:
        date = segment.parent.parent.parent.name  # YYYY-MM-DD
        hour = segment.parent.parent.name  # HH
        mm_ss = segment.stem  # MM.SS
        minute, second = mm_ss.split(".")
        dt = datetime.datetime.strptime(
            f"{date} {hour}:{minute}:{second}",
            "%Y-%m-%d %H:%M:%S",
        ).replace(tzinfo=datetime.timezone.utc)
        return dt.timestamp()
    except (ValueError, IndexError):
        return None


def run_ffprobe(ffprobe: str, args: list[str]) -> dict:
    """Run ffprobe and return parsed JSON, or empty dict on failure."""
    result = subprocess.run(
        [ffprobe, "-v", "error", *args, "-of", "json"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        print(f"  ffprobe error: {result.stderr.strip()}", file=sys.stderr)
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}


def get_format_info(ffprobe: str, segment: Path) -> tuple[dict, dict]:
    """Return (format_dict, stream_dict) for the first video stream."""
    data = run_ffprobe(
        ffprobe,
        [
            "-show_entries",
            "format=duration,start_time",
            "-show_entries",
            "stream=codec_name,profile,r_frame_rate,width,height",
            "-select_streams",
            "v:0",
            str(segment),
        ],
    )
    fmt = data.get("format", {})
    streams = data.get("streams") or [{}]
    return fmt, streams[0]


def get_video_packets(ffprobe: str, segment: Path) -> list[dict]:
    """Return video packets with pts_time and flags."""
    data = run_ffprobe(
        ffprobe,
        [
            "-select_streams",
            "v",
            "-show_entries",
            "packet=pts_time,dts_time,flags",
            str(segment),
        ],
    )
    return data.get("packets", [])


def analyze(ffprobe: str, segment: Path, highlight: bool = False) -> None:
    marker = "  <-- contains target timestamp" if highlight else ""
    print(f"\n=== {segment} ==={marker}")

    fmt, stream = get_format_info(ffprobe, segment)
    duration = float(fmt.get("duration", 0) or 0)
    start_time = float(fmt.get("start_time", 0) or 0)
    codec = stream.get("codec_name", "?")
    profile = stream.get("profile", "?")
    width = stream.get("width", "?")
    height = stream.get("height", "?")
    fps = stream.get("r_frame_rate", "?/1")

    filename_ts = filename_to_timestamp(segment)
    filename_iso = (
        datetime.datetime.fromtimestamp(
            filename_ts, tz=datetime.timezone.utc
        ).isoformat()
        if filename_ts is not None
        else "?"
    )

    print(f"  Codec:           {codec} ({profile})  {width}x{height}  {fps}")
    print(f"  Filename time:   {filename_ts}  ({filename_iso})")
    print(f"  Format duration: {duration:.3f}s")
    print(f"  Format start:    {start_time:.3f}s  (PTS offset of first packet)")

    packets = get_video_packets(ffprobe, segment)
    if not packets:
        print("  (no video packets)")
        return

    keyframe_times: list[float] = []
    first_pts: float | None = None
    last_pts: float | None = None

    for pkt in packets:
        pts_str = pkt.get("pts_time")
        if pts_str is None or pts_str == "N/A":
            continue
        pts = float(pts_str)
        if first_pts is None:
            first_pts = pts
        last_pts = pts
        if "K" in pkt.get("flags", ""):
            keyframe_times.append(pts)

    total_packets = len(packets)
    kf_count = len(keyframe_times)

    print(f"  Video packets:   {total_packets}")
    print(f"  Keyframes:       {kf_count}")
    if first_pts is not None and last_pts is not None:
        print(
            f"  Packet PTS:      first={first_pts:.3f}s  last={last_pts:.3f}s  "
            f"span={last_pts - first_pts:.3f}s"
        )

    if keyframe_times:
        print(
            f"  Keyframe PTS:    first={keyframe_times[0]:.3f}s  "
            f"last={keyframe_times[-1]:.3f}s"
        )
        formatted = ", ".join(f"{t:.3f}" for t in keyframe_times)
        print(f"  Keyframe times:  [{formatted}]")

    if len(keyframe_times) >= 2:
        gaps = [b - a for a, b in zip(keyframe_times, keyframe_times[1:])]
        avg_fps_estimate = (
            total_packets / (last_pts - first_pts)
            if last_pts and first_pts is not None and last_pts > first_pts
            else 0
        )
        print(
            f"  GOP gaps (s):    min={min(gaps):.3f}  max={max(gaps):.3f}  "
            f"mean={mean(gaps):.3f}  median={median(gaps):.3f}"
        )
        if len(gaps) > 1:
            print(f"                   stdev={stdev(gaps):.3f}")
        print(
            f"  Est. mean GOP:   ~{mean(gaps) * avg_fps_estimate:.1f} frames"
            if avg_fps_estimate
            else ""
        )
        if max(gaps) > 5:
            print(
                "  !! Max GOP > 5s — consistent with adaptive/smart codec "
                "(even if 'Smart Codec' is off in the UI, some cameras still "
                "produce irregular GOPs under specific encoder profiles)"
            )
    elif kf_count == 1:
        print("  !! Only one keyframe in segment — very long GOP")

    # Report how well filename time aligns with first-packet PTS.
    # (Filename time is what Frigate uses as recording.start_time in the DB.)
    if filename_ts is not None and first_pts is not None:
        print(
            f"  Notes: first packet PTS is {first_pts:.3f}s into the file; "
            f"Frigate treats filename time as PTS=0 for seek math."
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("camera", help="Camera name (matches the recordings subfolder)")
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Number of most recent segments to analyze (default: 5)",
    )
    parser.add_argument(
        "--recordings-dir",
        default="/media/frigate/recordings",
        help="Path to the recordings directory (default: /media/frigate/recordings)",
    )
    parser.add_argument(
        "--ffprobe",
        default=None,
        help=(
            "Full path to the ffprobe binary. Defaults to the Frigate-bundled "
            "binary at /usr/lib/ffmpeg/$DEFAULT_FFMPEG_VERSION/bin/ffprobe."
        ),
    )
    parser.add_argument(
        "--timestamp",
        type=float,
        default=None,
        help=(
            "Unix timestamp (UTC seconds, decimals allowed) to locate. The "
            "script finds the segment that should contain this time and "
            "analyzes it plus surrounding segments (count controls the "
            "window). All on-disk segments are stored in UTC, so pass a UTC "
            "Unix timestamp."
        ),
    )
    args = parser.parse_args()

    ffprobe = resolve_ffprobe_path(args.ffprobe)

    recordings_dir = Path(args.recordings_dir)
    if not recordings_dir.is_dir():
        print(
            f"Recordings directory not found: {recordings_dir}",
            file=sys.stderr,
        )
        sys.exit(1)

    target_segment: Path | None = None
    if args.timestamp is not None:
        segments, target_segment = find_segments_near_timestamp(
            recordings_dir, args.camera, args.timestamp, args.count
        )
        target_iso = datetime.datetime.fromtimestamp(
            args.timestamp, tz=datetime.timezone.utc
        ).isoformat()
        mode = f"around timestamp {args.timestamp} ({target_iso})"
    else:
        segments = find_recent_segments(recordings_dir, args.camera, args.count)
        mode = "most recent"

    if not segments:
        print(
            f"No segments found for camera '{args.camera}' under {recordings_dir}",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.timestamp is not None and target_segment is None:
        print(
            f"!! Target timestamp {args.timestamp} is before the earliest "
            f"segment on disk; showing the earliest available segments instead.",
            file=sys.stderr,
        )

    print(
        f"Analyzing {len(segments)} {mode} segment(s) for camera "
        f"'{args.camera}' under {recordings_dir} (ffprobe: {ffprobe})"
    )
    for segment in segments:
        analyze(ffprobe, segment, highlight=(segment == target_segment))


if __name__ == "__main__":
    main()
