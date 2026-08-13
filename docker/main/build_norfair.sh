#!/bin/bash

# norfair 2.3.0 declares numpy < 2 and rich < 15 in its wheel metadata, but
# the code is compatible with both. Build it without deps and lift the pins
# until upstream publishes updated requirements.

set -euxo pipefail

norfair_version="2.3.0"

pip3 wheel --wheel-dir=/norfair-wheel --no-deps "norfair==${norfair_version}"

python3 - <<'EOF'
import glob
import os
import re
import zipfile

path = glob.glob("/norfair-wheel/norfair-*.whl")[0]
patched = path + ".patched"

with zipfile.ZipFile(path) as zin, zipfile.ZipFile(patched, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename.endswith(".dist-info/METADATA"):
            data = re.sub(
                rb"Requires-Dist: numpy.*",
                b"Requires-Dist: numpy (>=1.23.0)",
                data,
            )
            data = re.sub(
                rb"Requires-Dist: rich.*",
                b"Requires-Dist: rich (>=9.10.0)",
                data,
            )
        zout.writestr(item, data)

os.replace(patched, path)
EOF

mv /norfair-wheel/*.whl /wheels/
