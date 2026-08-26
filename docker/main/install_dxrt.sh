#!/bin/bash

set -euxo pipefail

# DEEPX DX-RT runtime (dxrtd daemon + the dx_engine python bindings) used by
# the `deepx` detector plugin.
#
# A DEEPX install has three separately versioned pieces that have to agree:
#
#   DX-RT runtime  v3.4.2  this file, installed into the Frigate image
#   Kernel driver  v2.6.0  the host, docker/deepx/user_installation.sh
#   NPU firmware   v2.7.4  the module itself, flashed from the host
#
# DX-RT v3.4.2 requires driver 2.5.0 and firmware 2.7.0 as a minimum, so the
# versions above sit just over that floor. The runtime is pinned rather than
# resolved to "latest" so image builds stay reproducible, and so there is a
# known version for the host side to match. A mismatch usually presents as
# inference requests that are accepted but never complete, not as a startup
# error, so bump all three together and keep the table in
# docs/docs/frigate/installation.md in sync.
dxrt_version="v3.4.2"

# SHA-256 of the .deb pinned above, one per architecture Frigate builds for.
# DEEPX doesn't publish checksums or sign this release, so these are computed
# once from a vetted download and hardcoded here as the actual integrity
# check: a download that doesn't match one of these hashes is rejected before
# it reaches apt-get, regardless of whether the mismatch came from the v3.4.2
# tag being retargeted or the file being replaced upstream. Recompute both
# (`sha256sum libdxrt-bin_*.deb`) when bumping dxrt_version.
declare -A dxrt_sha256=(
    [amd64]="da782deac10acb1c997b52ea6d0160c06f112a68ad5e25035cfc8e16de0a8bdc"
    [arm64]="161223058938c54efadc581b33499210194da58e55cd5ade332e692ca0d649c2"
)

# The release directory and the package filename both use the bare version,
# while the git tag carries a "v".
dxrt_release="${dxrt_version#v}"
deb_arch=$(dpkg --print-architecture)
deb_file="/tmp/libdxrt-bin_${dxrt_release}_${deb_arch}.deb"

# Fetch just the one package rather than the source archive: the repository
# keeps every past release under release/, so the tag archive is several
# hundred MB of .deb files we would immediately throw away. Note that
# release/latest is a symlink and would not survive the archive anyway.
wget -qO "${deb_file}" \
    "https://raw.githubusercontent.com/DEEPX-AI/dx_rt/${dxrt_version}/release/${dxrt_release}/libdxrt-bin_${dxrt_release}_${deb_arch}.deb"

expected_sha256="${dxrt_sha256[${deb_arch}]:-}"
if [[ -z "${expected_sha256}" ]]; then
    echo "No pinned SHA-256 for architecture ${deb_arch}; refusing to install an unverified package."
    exit 1
fi
actual_sha256=$(sha256sum "${deb_file}" | cut -d' ' -f1)
if [[ "${actual_sha256}" != "${expected_sha256}" ]]; then
    echo "SHA-256 mismatch for ${deb_file}:"
    echo "  expected ${expected_sha256}"
    echo "  actual   ${actual_sha256}"
    echo "Refusing to install a package that doesn't match the pinned checksum."
    exit 1
fi

apt-get -qq update
apt-get -qq install -y "${deb_file}"
rm -rf /var/lib/apt/lists/*

# The package bundles a dx_engine wheel per cpython ABI tag. Ask dpkg what it
# installed rather than hardcoding a path, so this keeps working if DEEPX moves
# the wheels between releases.
package=$(dpkg-deb -f "${deb_file}" Package)
py_tag="cp$(python3 -c 'import sys; print(f"{sys.version_info[0]}{sys.version_info[1]}")')"
wheel=$(dpkg -L "${package}" | grep -E "/dx_engine-.*\.whl$" | grep -- "${py_tag}" | sort | head -1 || true)

if [[ -z "${wheel}" ]]; then
    echo "No dx_engine wheel for ${py_tag} in ${package}. Wheels available:"
    dpkg -L "${package}" | grep -E "/dx_engine-.*\.whl$" || echo "  (none)"
    exit 1
fi

pip3 install "${wheel}"

rm -f "${deb_file}"
