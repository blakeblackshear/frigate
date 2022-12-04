#!/command/with-contenv bash
# shellcheck shell=bash
# Prepare the logs folder for s6-log

set -o errexit -o nounset -o pipefail

mkdir -p /dev/shm/logs
chown nobody:nogroup /dev/shm/logs
chmod 02755 /dev/shm/logs
