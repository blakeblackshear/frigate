#!/bin/bash

set -euxo pipefail

SQLITE_VEC_VERSION="0.1.3"

cp /etc/apt/sources.list /etc/apt/sources.list.d/sources-src.list
sed -i 's|deb http|deb-src http|g' /etc/apt/sources.list.d/sources-src.list
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

