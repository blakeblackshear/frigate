#!/command/with-contenv bash
# shellcheck shell=bash
# Prepare the go2rtc config

set -o errexit -o nounset -o pipefail

if [[ -n "${SUPERVISOR_TOKEN:-}" ]]; then
    # Running as a Home Assistant add-on, infer the IP address and port

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
    fi

    export FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL="${ip_address}:${webrtc_port}"
fi

python3 /usr/local/go2rtc/create_config.py > /dev/shm/go2rtc.yaml
