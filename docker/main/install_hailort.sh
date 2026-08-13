#!/bin/bash

set -euxo pipefail

hailo_version="4.21.0"

if [[ "${TARGETARCH}" == "amd64" ]]; then
    arch="x86_64"
elif [[ "${TARGETARCH}" == "arm64" ]]; then
    arch="aarch64"
fi

wget -qO- "https://github.com/frigate-nvr/hailort/releases/download/v${hailo_version}/hailort-debian13-${TARGETARCH}.tar.gz" | tar -C / -xzf -
wget -P /wheels/ "https://github.com/frigate-nvr/hailort/releases/download/v${hailo_version}/hailort-${hailo_version}-cp313-cp313-linux_${arch}.whl"

# The hailort wheel metadata still declares numpy < 2 plus netifaces and
# future, neither of which is importable on Python 3.13. netifaces is only
# used by hailo_platform's ethernet_utils module, which nothing imports, and
# future is not imported at all. Patch the metadata until the wheel is
# rebuilt with updated requirements.
python3 - <<'EOF'
import glob
import os
import re
import zipfile

path = glob.glob("/wheels/hailort-*.whl")[0]
patched = path + ".patched"

with zipfile.ZipFile(path) as zin, zipfile.ZipFile(patched, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename.endswith(".dist-info/METADATA"):
            data = re.sub(rb"Requires-Dist: numpy.*", b"Requires-Dist: numpy", data)
            data = re.sub(rb"Requires-Dist: (netifaces|future)\r?\n", b"", data)
        zout.writestr(item, data)

os.replace(patched, path)
EOF
