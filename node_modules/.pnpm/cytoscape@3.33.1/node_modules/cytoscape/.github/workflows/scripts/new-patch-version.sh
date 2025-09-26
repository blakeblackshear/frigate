#!/bin/bash

# Get the current version from package.json
PREV_VERSION=$(jq -r '.version' package.json)
echo "Prev Patch Version $PREV_VERSION"

# Split the version number into major, minor, and patch components
IFS='.' read -a VERSION_ARRAY <<< "$PREV_VERSION"
echo "SPLITTING COMPLETED"

major="${VERSION_ARRAY[0]}"
minor="${VERSION_ARRAY[1]}"
patch="${VERSION_ARRAY[2]}"
echo "CURRENT PATCH VERSION $patch"

# Increment the patch version
patch=$((patch + 1))
echo "UPDATED PATCH VERSION $patch"

# Form the new version string
VERSION="$major.$minor.$patch"

# Split the new version number into major, minor, and patch components to validate
IFS='.' read -a VERSION_ARRAY_2 <<< "$VERSION"
if [[ ${#VERSION_ARRAY_2[@]} -lt 3 ]]; then
    echo "Error: Invalid new version format"
    exit 1
fi

# Set the branch name if it's not the master branch
if [ "$BRANCH" != "refs/heads/master" ]; then
    BRANCH="${VERSION_ARRAY[0]}.${VERSION_ARRAY[1]}.x"
fi

echo "Version $VERSION"

# Export the new version to the GitHub Actions environment
echo "VERSION=$VERSION" >> "$GITHUB_ENV"