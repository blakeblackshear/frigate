#!/bin/bash
set -e

CPU_ARCH=$(uname -m)
OS_VERSION=$(uname -v)

echo "CPU_ARCH ${CPU_ARCH}"
echo "OS_VERSION ${OS_VERSION}"

if [[ "${CPU_ARCH}" == "x86_64" ]]; then
  echo "Recognized as Linux on x86_64."
  LIBEDGETPU_SUFFIX=x86_64
  HOST_GNU_TYPE=x86_64-linux-gnu
elif [[ "${CPU_ARCH}" == "armv7l" ]]; then
  echo "Recognized as Linux on ARM32 platform."
  LIBEDGETPU_SUFFIX=arm32
  HOST_GNU_TYPE=arm-linux-gnueabihf
elif [[ "${CPU_ARCH}" == "aarch64" ]]; then
  echo "Recognized as generic ARM64 platform."
  LIBEDGETPU_SUFFIX=arm64
  HOST_GNU_TYPE=aarch64-linux-gnu
fi

if [[ -z "${HOST_GNU_TYPE}" ]]; then
  echo "Your platform is not supported."
  exit 1
fi

echo "Using maximum operating frequency."
LIBEDGETPU_SRC="libedgetpu/libedgetpu_${LIBEDGETPU_SUFFIX}.so"
LIBEDGETPU_DST="/usr/lib/${HOST_GNU_TYPE}/libedgetpu.so.1.0"

# Runtime library.
echo "Installing Edge TPU runtime library [${LIBEDGETPU_DST}]..."
if [[ -f "${LIBEDGETPU_DST}" ]]; then
  echo "File already exists. Replacing it..."
  rm -f "${LIBEDGETPU_DST}"
fi

cp -p "${LIBEDGETPU_SRC}" "${LIBEDGETPU_DST}"
ldconfig
echo "Done."

# Python API.
WHEEL=$(ls edgetpu-*-py3-none-any.whl 2>/dev/null)
if [[ $? == 0 ]]; then
  echo "Installing Edge TPU Python API..."
  python3 -m pip install --no-deps "${WHEEL}"
  echo "Done."
fi
