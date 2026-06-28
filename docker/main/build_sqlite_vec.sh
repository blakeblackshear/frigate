#!/bin/bash

set -euxo pipefail

SQLITE_VEC_VERSION="0.1.3"

source /etc/os-release

# Enable deb-src so `apt-get build-dep sqlite3` can find the source package. Detect the apt
# source FORMAT rather than guessing by distro: Debian 12 + Ubuntu 24.04 (noble — the JP7
# TensorRT igpu base) use the deb822 *.sources format with a `Types:` line; older Ubuntu
# (e.g. the JP6 22.04 jammy base) uses the legacy one-line /etc/apt/sources.list. On noble the
# legacy /etc/apt/sources.list is effectively empty, so the old copy+sed path enabled nothing.
if [[ -f /etc/apt/sources.list.d/debian.sources ]]; then
    sed -i '/^Types:/s/deb/& deb-src/' /etc/apt/sources.list.d/debian.sources
elif [[ -f /etc/apt/sources.list.d/ubuntu.sources ]]; then
    sed -i '/^Types:/s/deb/& deb-src/' /etc/apt/sources.list.d/ubuntu.sources
elif [[ -f /etc/apt/sources.list ]]; then
    cp /etc/apt/sources.list /etc/apt/sources.list.d/sources-src.list
    sed -i 's|deb http|deb-src http|g' /etc/apt/sources.list.d/sources-src.list
fi

apt-get update
apt-get -yqq build-dep sqlite3 gettext git

mkdir /tmp/sqlite_vec
# Grab the sqlite_vec source code.
wget -nv https://github.com/asg017/sqlite-vec/archive/refs/tags/v${SQLITE_VEC_VERSION}.tar.gz
tar -zxf v${SQLITE_VEC_VERSION}.tar.gz -C /tmp/sqlite_vec

cd /tmp/sqlite_vec/sqlite-vec-${SQLITE_VEC_VERSION}

mkdir -p vendor
wget -O sqlite-amalgamation.zip https://www.sqlite.org/2024/sqlite-amalgamation-3450300.zip
unzip sqlite-amalgamation.zip
mv sqlite-amalgamation-3450300/* vendor/
rmdir sqlite-amalgamation-3450300
rm sqlite-amalgamation.zip

# build loadable module
make loadable

# install it
cp dist/vec0.* /usr/local/lib

