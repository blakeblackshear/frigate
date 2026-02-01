#!/bin/bash

set -euxo pipefail

SQLITE3_VERSION="3.46.1"
PYSQLITE3_VERSION="0.5.3"

# Install libsqlite3-dev if not present (needed for some base images like NVIDIA TensorRT)
if ! dpkg -l | grep -q libsqlite3-dev; then
  echo "Installing libsqlite3-dev for compilation..."
  apt-get update && apt-get install -y libsqlite3-dev && rm -rf /var/lib/apt/lists/*
fi

# Fetch the pre-built sqlite amalgamation instead of building from source
if [[ ! -d "sqlite" ]]; then
  mkdir sqlite
  cd sqlite

  # Download the pre-built amalgamation from sqlite.org
  # For SQLite 3.46.1, the amalgamation version is 3460100
  SQLITE_AMALGAMATION_VERSION="3460100"

  wget https://www.sqlite.org/2024/sqlite-amalgamation-${SQLITE_AMALGAMATION_VERSION}.zip -O sqlite-amalgamation.zip
  unzip sqlite-amalgamation.zip
  mv sqlite-amalgamation-${SQLITE_AMALGAMATION_VERSION}/* .
  rmdir sqlite-amalgamation-${SQLITE_AMALGAMATION_VERSION}
  rm sqlite-amalgamation.zip

  cd ../
fi

# Grab the pysqlite3 source code.
if [[ ! -d "./pysqlite3" ]]; then
  git clone https://github.com/coleifer/pysqlite3.git
fi

cd pysqlite3/
git checkout ${PYSQLITE3_VERSION}

# Copy the sqlite3 source amalgamation into the pysqlite3 directory so we can
# create a self-contained extension module.
cp "../sqlite/sqlite3.c" ./
cp "../sqlite/sqlite3.h" ./

# Create the wheel and put it in the /wheels dir.
sed -i "s|name='pysqlite3-binary'|name=PACKAGE_NAME|g" setup.py
python3 setup.py build_static
pip3 wheel . -w /wheels
