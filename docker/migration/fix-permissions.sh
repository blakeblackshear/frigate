#!/bin/bash
# Ahead-of-time volume ownership migration for switching Frigate to non-root.
# Run from the host BEFORE enabling PUID/PGID or --user:
#
#   ./fix-permissions.sh [--dry-run] <config_dir> <media_dir> [PUID] [PGID]
#
# Wraps the image's fix-ownership helper so there is exactly one
# implementation of the chown logic. Requires an image that contains the
# helper (any release that includes non-root support).

set -o errexit -o nounset -o pipefail

IMAGE="${FRIGATE_IMAGE:-ghcr.io/blakeblackshear/frigate:stable}"

dry_run_flag=""
if [[ "${1:-}" == "--dry-run" ]]; then
    dry_run_flag="--dry-run"
    shift
fi

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 [--dry-run] <config_dir> <media_dir> [PUID] [PGID]" >&2
    exit 2
fi

config_dir="$1"
media_dir="$2"
puid="${3:-1000}"
pgid="${4:-1000}"

# The ids are interpolated into the container's bash -c source below, so
# anything but digits would be reparsed as shell rather than passed through
if ! [[ "$puid" =~ ^[0-9]+$ && "$pgid" =~ ^[0-9]+$ ]]; then
    echo "[ERROR] PUID and PGID must be numeric, got '${puid}' and '${pgid}'" >&2
    exit 2
fi

echo "[INFO] Using image ${IMAGE} (override with FRIGATE_IMAGE=...)"
if ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
    echo "[INFO] ${IMAGE} is not present locally and has to be pulled first; this may take a while"
fi

if [[ -n "$dry_run_flag" ]]; then
    echo "[INFO] Dry run: reporting what would change under ${config_dir} and ${media_dir}, changing nothing"
else
    echo "[INFO] Aligning ${config_dir} and ${media_dir} to ${puid}:${pgid}; this may take a while on large filesystems"
fi

# shellcheck disable=SC2086
docker run --rm \
    -v "${config_dir}:/config" \
    -v "${media_dir}:/media/frigate" \
    --entrypoint bash \
    "${IMAGE}" \
    -c "command -v fix-ownership >/dev/null || { echo '[ERROR] this Frigate image predates non-root support; set FRIGATE_IMAGE to a release that includes it' >&2; exit 1; }; exec fix-ownership ${dry_run_flag} ${puid} ${pgid} /config /media/frigate"
