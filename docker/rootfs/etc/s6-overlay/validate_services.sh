#!/command/with-contenv bash
# shellcheck shell=bash
# Checks if all oneshot services executed succesfully
# https://github.com/just-containers/s6-overlay/issues/513#issuecomment-1401399995

set -o errexit -o nounset -o pipefail

readonly wanted_services=(
    log-prepare
    frigate-prepare
    # go2rtc-prepare
)

services=$(s6-rc -a list)  # lists active/executed services, one per line
readonly services

for wanted_service in "${wanted_services[@]}"; do
  if ! echo "${services}" | grep -qFx "${wanted_service}" ; then
    echo "[ERROR] Service '${wanted_service}' failed to execute" >&2
    echo 1 > /run/s6-linux-init-container-results/exitcode  # to say the container failed
    exec /run/s6/basedir/bin/halt
  fi
done

exec s6-pause  # or exec into your real CMD if you have one
