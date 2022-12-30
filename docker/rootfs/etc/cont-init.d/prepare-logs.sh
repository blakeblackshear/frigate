#!/command/with-contenv bash
# shellcheck shell=bash
# Prepare the logs folder for s6-log

set -o errexit -o nounset -o pipefail

dirs=("/dev/shm/$HOSTNAME/logs/frigate" /dev/shm/$HOSTNAME/logs/go2rtc /dev/shm/$HOSTNAME/logs/nginx)

mkdir -p "${dirs[@]}"
chown nobody:nogroup "${dirs[@]}"
chmod 02755 "${dirs[@]}"
