#!/bin/bash

function package_exists() {
    return dpkg -l "$1" &> /dev/null
}

# TODO check if python3.9 is installable instead
if ! package_exists python3.9 ; then
  apt-get update && \
    apt-get install wget build-essential ccache clang cmake pkg-config -y

  wget https://www.python.org/ftp/python/3.9.6/Python-3.9.6.tgz
  tar -xf Python-3.9.6.tgz
  cd Python-3.9.6
  ./configure --enable-optimizations
  make altinstall

  update-alternatives --install /usr/bin/python3 python3 /usr/local/bin/python3.9 1
else
  apt-get -qq update \
     && apt-get -qq install -y --no-install-recommends \
        python3.9 python3.9-dev \
        wget build-essential cmake git \
     && rm -rf /var/lib/apt/lists/*

  update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
fi
