#!/usr/bin/env bash
# Proof-of-concept: run FFmpeg transcode and report real time.
# Usage:
#   ./scripts/transcode_benchmark.sh path/to/video.mp4
#   ./scripts/transcode_benchmark.sh path/to/video.mp4 10    # first 10 seconds only
#   ./scripts/transcode_benchmark.sh path/to/video.mp4 10 nvidia
#
# Optional: DURATION (seconds), HWACCEL (cpu|nvidia|vaapi|qsv-h265). Default: full file, cpu.
# Requires: ffmpeg, ffprobe. Output: temp file, then deleted. Reports real time and speed.

set -e
INPUT="${1:?Usage: $0 <input.mp4> [duration_sec] [cpu|nvidia|vaapi|qsv-h265]}"
DURATION="${2:-}"
HWACCEL="${3:-cpu}"
# On Linux, QSV needs a DRM render node. With two GPUs, renderD128 is often non-Intel and renderD129 the Intel iGPU; prefer 129 when both exist so QSV finds VA.
if [[ -z "${QSV_DEVICE:-}" ]]; then
  if [[ -e /dev/dri/renderD129 ]]; then
    QSV_DEVICE="/dev/dri/renderD129"
  elif [[ -e /dev/dri/renderD128 ]]; then
    QSV_DEVICE="/dev/dri/renderD128"
  else
    QSV_DEVICE="0"
  fi
fi
# Frigate container has ffmpeg under /usr/lib/ffmpeg/<ver>/bin, not on PATH
if [[ -z "${FFMPEG:-}" ]]; then
  if command -v ffmpeg &>/dev/null; then
    FFMPEG="ffmpeg"
  elif [[ -d /usr/lib/ffmpeg ]] && FFMPEG_CANDIDATE=$(find /usr/lib/ffmpeg -path '*/bin/ffmpeg' -type f 2>/dev/null | head -1); [[ -n "${FFMPEG_CANDIDATE:-}" ]]; then
    FFMPEG="$FFMPEG_CANDIDATE"
  else
    FFMPEG="ffmpeg"
  fi
fi
FFPROBE="${FFPROBE:-$(dirname "$FFMPEG")/ffprobe}"
if [[ ! -x "$FFPROBE" ]]; then
  FFPROBE="ffprobe"
fi
OUTPUT=$(mktemp -u).mp4

cleanup() { rm -f "$OUTPUT"; }
trap cleanup EXIT

# Build base decode/input args
INPUT_ARGS=(-hide_banner -y -loglevel warning -stats -i "$INPUT")
if [[ -n "$DURATION" && "$DURATION" =~ ^[0-9]+\.?[0-9]*$ ]]; then
  INPUT_ARGS+=(-t "$DURATION")
fi

case "$HWACCEL" in
  nvidia)
    PRE=( -hwaccel cuda -hwaccel_output_format cuda -extra_hw_frames 8 )
    ENC=(-c:v h264_nvenc)
    ;;
  vaapi)
    PRE=( -hwaccel vaapi -hwaccel_device "${VAAPI_DEVICE:-/dev/dri/renderD128}" -hwaccel_output_format vaapi )
    ENC=(-c:v h264_vaapi)
    ;;
  qsv-h265)
    PRE=( -load_plugin hevc_hw -hwaccel qsv -qsv_device "$QSV_DEVICE" -hwaccel_output_format qsv )
    # Use CQP explicitly; -profile:v/-level can be unsupported on some QSV runtimes
    ENC=(-c:v hevc_qsv -global_quality 23)
    ;;
  *)
    PRE=()
    ENC=(-c:v libx264 -preset:v ultrafast -tune:v zerolatency)
    ;;
esac

echo "Input:  $INPUT"
echo "Output: $OUTPUT (temp)"
echo "HW:     $HWACCEL"
[[ -n "$DURATION" ]] && echo "Limit:  ${DURATION}s"
# QSV is Intel-only and needs a working Intel VA-API stack; if you see 'No VA display found', see scripts/README.md troubleshooting.
[[ "$HWACCEL" = "qsv-h265" ]] && echo "QSV device: $QSV_DEVICE"
echo ""

# Get duration for speed calculation (if not limiting, use full file length)
if [[ -n "$DURATION" ]]; then
  DUR_SEC="$DURATION"
else
  DUR_SEC=$("${FFPROBE:-ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT" 2>/dev/null || true)
fi

# Use $SECONDS (bash) so we don't rely on date %N or bc in minimal containers
START=$SECONDS
"$FFMPEG" "${PRE[@]}" "${INPUT_ARGS[@]}" -an "${ENC[@]}" -f mp4 -movflags +faststart "$OUTPUT"
ELAPSED=$((SECONDS - START))
[[ "$ELAPSED" -eq 0 ]] && ELAPSED=1

SIZE=$(stat -c%s "$OUTPUT" 2>/dev/null || stat -f%z "$OUTPUT" 2>/dev/null || echo 0)
SIZE_MB=$(awk "BEGIN {printf \"%.2f\", $SIZE/1048576}" 2>/dev/null || echo "$((SIZE / 1048576))")

echo "--- Results ---"
echo "Real time:   ${ELAPSED}s"
if [[ -n "$DUR_SEC" && "$DUR_SEC" =~ ^[0-9]+\.?[0-9]*$ ]]; then
  SPEED=$(awk "BEGIN {printf \"%.2f\", $DUR_SEC/$ELAPSED}" 2>/dev/null || echo "?")
  echo "Duration:    ${DUR_SEC}s"
  echo "Speed:       ${SPEED}x realtime"
fi
echo "Output size: ${SIZE_MB} MiB"
