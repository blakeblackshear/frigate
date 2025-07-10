#!/bin/bash

# Newer versions of containerd 2.X+ impose a very low soft file limit of 1024
# This applies to OSs like HA OS (see https://github.com/home-assistant/operating-system/issues/4110)
# Attempt to increase this limit

# Get current soft and hard nofile limits
current_soft_limit=$(ulimit -Sn)
current_hard_limit=$(ulimit -Hn)

TARGET_SOFT_LIMIT=65536
TARGET_HARD_LIMIT=65536

echo "Current file limits - Soft: $current_soft_limit, Hard: $current_hard_limit"

if [ "$current_soft_limit" -lt "$TARGET_SOFT_LIMIT" ]; then
    if [ "$current_hard_limit" -lt "$TARGET_HARD_LIMIT" ]; then
        if ! ulimit -Hn "$TARGET_HARD_LIMIT"; then
            echo "Warning: Failed to set hard limit to $TARGET_HARD_LIMIT"
            echo "This may require running as root or adjusting system limits"
            exit 1
        fi
    fi

    if ! ulimit -Sn "$TARGET_SOFT_LIMIT"; then
        echo "Warning: Failed to set soft limit to $TARGET_SOFT_LIMIT"
        exit 1
    fi

    # Verify the new limits
    new_soft_limit=$(ulimit -Sn)
    new_hard_limit=$(ulimit -Hn)
    echo "New limits - Soft: $new_soft_limit, Hard: $new_hard_limit"

    if [ "$new_soft_limit" -ne "$TARGET_SOFT_LIMIT" ] || [ "$new_hard_limit" -ne "$TARGET_HARD_LIMIT" ]; then
        echo "Warning: Nofile limits were set, but not to the exact target values."
    else
        echo "Successfully set file limits to target values"
    fi
else
    echo "Soft limit is already sufficient ($current_soft_limit >= $TARGET_SOFT_LIMIT)"
fi