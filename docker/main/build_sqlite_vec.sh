#!/bin/bash

set -euxo pipefail

SQLITE_VEC_VERSION="0.1.3"

apt-get update
apt-get -yqq build-dep sqlite3 gettext

mkdir /tmp/sqlite_vec
# Grab the sqlite_vec source code.
wget -nv https://github.com/asg017/sqlite-vec/archive/refs/tags/v${SQLITE_VEC_VERSION}.tar.gz
tar -zxf v${SQLITE_VEC_VERSION}.tar.gz -C /tmp/sqlite_vec

cd /tmp/sqlite_vec/sqlite-vec-${SQLITE_VEC_VERSION}
# build loadable module
make loadable

# install it
cp dist/vec0 /usr/local/lib

