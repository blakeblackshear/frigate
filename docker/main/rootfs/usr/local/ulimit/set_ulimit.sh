#!/bin/bash

# Newer versions of containerd 2.X+ impose a very low soft file limit of 1024
# This applies to OSs like HA OS (see https://github.com/home-assistant/operating-system/issues/4110)
# Attempt to increase this limit

# Get current soft and hard nofile limits
current_soft_limit=$(ulimit -Sn)
current_hard_limit=$(ulimit -Hn)

TARGET_SOFT_LIMIT=65536
TARGET_HARD_LIMIT=65536

if [ "$current_soft_limit" -lt "$TARGET_SOFT_LIMIT" ]; then
    # Attempt to set both soft and hard limits to the new value
    # This requires sufficient privileges (e.g., running as root in the container)
    if ulimit -Hn "$TARGET_HARD" && ulimit -Sn "$TARGET_SOFT"; then
        new_soft_limit=$(ulimit -Sn)
        new_hard_limit=$(ulimit -Hn)

        if [ "$new_soft_limit" -ne "$TARGET_SOFT_LIMIT" ] || [ "$new_hard_limit" -ne "$TARGET_HARD_LIMIT" ]; then
            echo "Warning: Limits were set, but not to the exact target values. Check system constraints."
        fi
    else
        echo "Warning: Failed to set new nofile limits."
    fi
fi