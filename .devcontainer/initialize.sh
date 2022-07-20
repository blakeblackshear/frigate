#!/bin/bash

set -euo pipefail

if [[ -f "config/config.yml" ]]; then
  echo "config/config.yml already exists, skipping initialization" >&2
else
  echo "initializing config/config.yml" >&2
  cp -fv config/config.yml.example config/config.yml
fi
