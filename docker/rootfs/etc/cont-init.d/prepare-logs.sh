#!/command/with-contenv bash
# shellcheck shell=bash

set -euo pipefail

mkdir -p /dev/shm/logs
chown nobody:nogroup /dev/shm/logs
chmod 02755 /dev/shm/logs
