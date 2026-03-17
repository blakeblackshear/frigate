#!/usr/bin/env python3
"""
Proof-of-concept benchmark: transcode a video file with FFmpeg (optionally with
hardware acceleration) and report timing and throughput.

Used to de-risk real-time VOD transcoding: we need ~10s segments to transcode
in well under 10s (ideally <2s) so scrubbing stays responsive.

Usage:
  python scripts/transcode_benchmark.py path/to/video.mp4
  python scripts/transcode_benchmark.py path/to/video.mp4 --duration 10 --hwaccel nvidia
  python scripts/transcode_benchmark.py path/to/video.mp4 --duration 10 --seek 60 --hwaccel vaapi

Output: real time, speed (x realtime), output size. Aligns with Frigate export/timelapse
HW presets (preset-nvidia, preset-vaapi, libx264 default).
"""

import argparse
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional


def get_ffmpeg_command(
    ffmpeg_path: str,
    input_path: str,
    output_path: str,
    *,
    duration_sec: Optional[float] = None,
    seek_sec: float = 0,
    hwaccel: str = "cpu",
    gpu_device: str = "/dev/dri/renderD128",
    qsv_device: str = "0",
) -> list[str]:
    """Build argv for FFmpeg transcode (H.264 or HEVC, no audio). Matches Frigate timelapse-style encode."""
    cmd = [ffmpeg_path, "-hide_banner", "-y", "-loglevel", "warning", "-stats"]

    # Optional seek: -ss before -i for fast seek (keyframe then decode)
    if seek_sec > 0:
        cmd.extend(["-ss", str(seek_sec)])

    if hwaccel == "nvidia":
        cmd.extend(
            [
                "-hwaccel",
                "cuda",
                "-hwaccel_output_format",
                "cuda",
                "-extra_hw_frames",
                "8",
            ]
        )
    elif hwaccel == "vaapi":
        cmd.extend(
            [
                "-hwaccel",
                "vaapi",
                "-hwaccel_device",
                gpu_device,
                "-hwaccel_output_format",
                "vaapi",
            ]
        )
    elif hwaccel == "qsv-h265":
        # preset-intel-qsv-h265: load_plugin for HEVC decode, QSV device for decode+encode
        cmd.extend(
            [
                "-load_plugin",
                "hevc_hw",
                "-hwaccel",
                "qsv",
                "-qsv_device",
                qsv_device,
                "-hwaccel_output_format",
                "qsv",
            ]
        )

    cmd.extend(["-i", input_path])

    if duration_sec is not None and duration_sec > 0:
        cmd.extend(["-t", str(duration_sec)])

    cmd.extend(["-an"])

    if hwaccel == "nvidia":
        cmd.extend(["-c:v", "h264_nvenc"])
    elif hwaccel == "vaapi":
        # VAAPI encode needs frames in vaapi format; decoder outputs vaapi when hwaccel_output_format vaapi
        cmd.extend(["-c:v", "h264_vaapi"])
    elif hwaccel == "qsv-h265":
        # Use CQP explicitly; profile/level can be unsupported on some QSV runtimes
        cmd.extend(["-c:v", "hevc_qsv", "-global_quality", "23"])
    else:
        cmd.extend(
            ["-c:v", "libx264", "-preset:v", "ultrafast", "-tune:v", "zerolatency"]
        )

    cmd.extend(["-f", "mp4", "-movflags", "+faststart", output_path])
    return cmd


def get_video_duration_sec(ffprobe_path: str, input_path: str) -> Optional[float]:
    """Return duration in seconds or None on failure."""
    try:
        out = subprocess.run(
            [
                ffprobe_path,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                input_path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if out.returncode == 0 and out.stdout.strip():
            return float(out.stdout.strip())
    except (subprocess.TimeoutExpired, ValueError, FileNotFoundError):
        pass
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Benchmark FFmpeg transcode (H.264) with optional HW accel."
    )
    parser.add_argument(
        "input",
        type=Path,
        help="Input video file (e.g. recording segment)",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=None,
        metavar="SEC",
        help="Transcode only this many seconds (default: full file). Simulates segment length.",
    )
    parser.add_argument(
        "--seek",
        type=float,
        default=0,
        metavar="SEC",
        help="Start at this position (before -i for fast seek). Simulates scrubbing into file.",
    )
    parser.add_argument(
        "--hwaccel",
        choices=("cpu", "nvidia", "vaapi", "qsv-h265"),
        default="cpu",
        help="HW accel: cpu (libx264), nvidia (h264_nvenc), vaapi (h264_vaapi), qsv-h265 (preset-intel-qsv-h265, hevc_qsv).",
    )
    parser.add_argument(
        "--vaapi-device",
        default="/dev/dri/renderD128",
        help="VAAPI device (default: /dev/dri/renderD128).",
    )
    parser.add_argument(
        "--qsv-device",
        default=(
            "/dev/dri/renderD129"
            if os.path.exists("/dev/dri/renderD129")
            else "/dev/dri/renderD128"
            if os.path.exists("/dev/dri/renderD128")
            else "0"
        ),
        help="Intel QSV device: path (e.g. /dev/dri/renderD129 or renderD128 on Linux) or 0 (Windows). With two GPUs, try renderD129 if renderD128 fails. Used for --hwaccel qsv-h265.",
    )
    parser.add_argument(
        "--ffmpeg",
        default="ffmpeg",
        metavar="PATH",
        help="FFmpeg binary (default: ffmpeg in PATH).",
    )
    parser.add_argument(
        "--ffprobe",
        default="ffprobe",
        metavar="PATH",
        help="FFprobe binary (default: ffprobe in PATH).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output file (default: temp file, deleted after).",
    )
    parser.add_argument(
        "--keep-output",
        action="store_true",
        help="Keep output file when using default temp path.",
    )
    args = parser.parse_args()

    input_path = args.input.resolve()
    if not input_path.is_file():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        return 1

    effective_duration = args.duration
    if effective_duration is None:
        duration_from_probe = get_video_duration_sec(str(args.ffprobe), str(input_path))
        if duration_from_probe is not None:
            effective_duration = duration_from_probe - args.seek
            if effective_duration <= 0:
                print("Error: seek >= file duration", file=sys.stderr)
                return 1
        else:
            print("Warning: could not probe duration; reporting real time only.", file=sys.stderr)

    use_temp = args.output is None
    if use_temp:
        fd, out_path = tempfile.mkstemp(suffix=".mp4")
        os.close(fd)
        output_path = Path(out_path)
    else:
        output_path = args.output.resolve()

    cmd = get_ffmpeg_command(
        args.ffmpeg,
        str(input_path),
        str(output_path),
        duration_sec=args.duration,
        seek_sec=args.seek,
        hwaccel=args.hwaccel,
        gpu_device=args.vaapi_device,
        qsv_device=args.qsv_device,
    )

    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")
    print(f"HW:     {args.hwaccel}")
    if args.duration is not None:
        print(f"Limit:  {args.duration}s")
    if args.seek > 0:
        print(f"Seek:   {args.seek}s")
    print(f"Run:    {' '.join(cmd)}")
    print()

    start = time.perf_counter()
    try:
        subprocess.run(cmd, check=True, timeout=3600)
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed: {e}", file=sys.stderr)
        if use_temp and output_path.exists():
            output_path.unlink()
        return 1
    except subprocess.TimeoutExpired:
        print("FFmpeg timed out.", file=sys.stderr)
        if use_temp and output_path.exists():
            output_path.unlink()
        return 1
    elapsed = time.perf_counter() - start

    size_bytes = output_path.stat().st_size if output_path.exists() else 0

    print("--- Results ---")
    print(f"Real time:    {elapsed:.2f}s")
    if effective_duration is not None and effective_duration > 0:
        speed = effective_duration / elapsed
        print(f"Video duration: {effective_duration:.2f}s")
        print(f"Speed:        {speed:.2f}x realtime")
        if args.duration and args.duration <= 15:
            if speed >= 5:
                print("(Good for ~10s segment transcode: well under 2s.)")
            elif speed >= 1:
                print("(Marginal: segment may take several seconds.)")
            else:
                print("(Slow: segment transcode would exceed segment length.)")
    print(f"Output size:  {size_bytes / (1024*1024):.2f} MiB")

    if use_temp:
        if args.keep_output:
            print(f"(Output kept: {output_path})")
        else:
            output_path.unlink(missing_ok=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
