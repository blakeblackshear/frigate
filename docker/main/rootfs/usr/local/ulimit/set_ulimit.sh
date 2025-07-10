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
    # Set hard limit first (if it needs to be increased)
    hard_limit_success=true
    if [ "$current_hard_limit" -lt "$TARGET_HARD_LIMIT" ]; then
        if ! ulimit -Hn "$TARGET_HARD_LIMIT"; then
            echo "Warning: Failed to set hard limit to $TARGET_HARD_LIMIT"
            echo "Current hard limit is $current_hard_limit, will try to set soft limit anyway"
            hard_limit_success=false
        fi
    fi

    # Determine what soft limit to use
    if [ "$hard_limit_success" = true ] || [ "$current_hard_limit" -ge "$TARGET_SOFT_LIMIT" ]; then
        # We can try to set the target soft limit
        target_soft=$TARGET_SOFT_LIMIT
    else
        # Hard limit is too low, set soft limit to current hard limit
        target_soft=$current_hard_limit
        echo "Setting soft limit to current hard limit ($current_hard_limit) since hard limit couldn't be increased"
    fi

    # Set soft limit
    if ! ulimit -Sn "$target_soft"; then
        echo "Warning: Failed to set soft limit to $target_soft"
        exit 1
    fi

    # Verify the new limits
    new_soft_limit=$(ulimit -Sn)
    new_hard_limit=$(ulimit -Hn)
    echo "New limits - Soft: $new_soft_limit, Hard: $new_hard_limit"

    if [ "$new_soft_limit" -eq "$TARGET_SOFT_LIMIT" ] && [ "$new_hard_limit" -eq "$TARGET_HARD_LIMIT" ]; then
        echo "Successfully set file limits to target values"
    elif [ "$new_soft_limit" -gt "$current_soft_limit" ]; then
        echo "Successfully increased soft limit from $current_soft_limit to $new_soft_limit"
    else
        echo "Warning: Soft limit may not have been increased as expected"
    fi
else
    echo "Soft limit is already sufficient ($current_soft_limit >= $TARGET_SOFT_LIMIT)"
fi