#!/bin/bash

set -euxo pipefail

# Fetch the source code for the latest release of Sqlite.
if [[ ! -d "sqlite" ]]; then
  wget https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release -O sqlite.tar.gz
  tar xzf sqlite.tar.gz
  cd sqlite/
  LIBS="-lm" ./configure --disable-tcl --enable-tempstore=always
  make sqlite3.c
  cd ../
  rm sqlite.tar.gz
fi

# Grab the pysqlite3 source code.
if [[ ! -d "./pysqlite3" ]]; then
  git clone https://github.com/coleifer/pysqlite3.git
fi

# Copy the sqlite3 source amalgamation into the pysqlite3 directory so we can
# create a self-contained extension module.
cp "sqlite/sqlite3.c" pysqlite3/
cp "sqlite/sqlite3.h" pysqlite3/

# Create the wheel and put it in the /wheels dir.
cd pysqlite3/
sed -i "s|name='pysqlite3-binary'|name=PACKAGE_NAME|g" setup.py
python3 setup.py build_static
pip3 wheel . -w /wheels
