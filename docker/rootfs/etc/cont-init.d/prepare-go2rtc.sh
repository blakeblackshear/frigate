#!/command/with-contenv bash
# shellcheck shell=bash
# Prepare the go2rtc config

set -o errexit -o nounset -o pipefail

if [[ -z "${SUPERVISOR_TOKEN:-}" ]]; then
    # Not running as a Home Assistant add-on, don't do anything
    exit 0
fi

# Example: 192.168.1.10/24
ip_regex='^([0-9]{1,3}\.{3}[0-9]{1,3})/[0-9]{1,2}$'
if ip_address=$(
    curl -fsSL \
        -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        -H "Content-Type: application/json" \
        http://supervisor/network/interface/default/info |
        jq --exit-status --raw-output '.data.ipv4.address[0]'
) && [[ "${ip_address}" =~ ${ip_regex} ]]; then
    ip_address="${BASH_REMATCH[1]}"
    echo "Got IP address from supervisor: ${ip_address}" >&2
else
    echo "Failed to get IP address from supervisor" >&2
    # Exit with success so that the container can still start
    exit 0
fi

port_regex='^([0-9]{1,5})$'
if webrtc_port=$(
    curl -fsSL \
        -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        -H "Content-Type: application/json" \
        http://supervisor/addons/self/info |
        jq --exit-status --raw-output '.data.network["22/tcp"]'
) && [[ "${webrtc_port}" =~ ${port_regex} ]]; then
    webrtc_port="${BASH_REMATCH[1]}"
    echo "Got WebRTC port from supervisor: ${ip_address}" >&2
else
    echo "Failed to get WebRTC port from supervisor" >&2
    # Exit with success so that the container can still start
    exit 0
fi

# Replace the IP address in the config
candidate="${ip_address}:${webrtc_port}"
sed --in-place "s/# - %%CANDIDATE%%/- ${candidate}/" /usr/local/go2rtc/go2rtc.yaml
