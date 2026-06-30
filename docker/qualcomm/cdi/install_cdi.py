import argparse
import json
import os

# The CDI descriptor is authored against the Qualcomm Linux BSP filesystem layout,
# where the QNN/HTP runtime libraries and the Hexagon "skel" files live under
# /usr/lib and /usr/lib/rfsa/adsp. On other officially-supported images for the
# same boards -- notably Ubuntu for RB3 Gen 2 / Rubik Pi 3 with the QAIRT apt
# packages (qairt-libs/qairt-tools) -- the same files are board-selected into a
# different directory, and /usr/lib/rfsa/adsp may even contain self-referential
# symlink loops. When a mount's authored hostPath is missing (or a broken/looping
# symlink), look the file up by name in these fallback directories and rewrite the
# mount to the real, resolved file so NPU offload works on both layouts.
FALLBACK_LIB_DIRS = [
    "/usr/lib/dsp/cdsp",  # QAIRT apt packages (board-selected from /usr/share/qcom/.../dsp/cdsp)
]

# Libraries without which HTP/NPU offload cannot work. If any of these cannot be
# resolved we warn prominently (and abort under --strict) instead of silently
# producing a CDI that starts fine but never offloads to the NPU.
CRITICAL_BASENAMES = {
    "libQnnTFLiteDelegate.so",
    "libQnnHtp.so",
    "libQnnHtpV68Skel.so",
    "libQnnHtpV73Skel.so",
    "libQnnHtpV75Skel.so",
    "libQnnSystem.so",
}


def resolve_host_path(host_path):
    """Resolve a mount's hostPath to a usable, real file/dir on this host.

    Returns the original path when it already resolves (the Qualcomm Linux BSP
    layout). If it is missing or a broken/looping symlink, search FALLBACK_LIB_DIRS
    by basename and return the real (symlink-resolved) path, so the rewritten mount
    is stable across reboots / apt reconfigures. Returns None if not found anywhere.
    """
    # os.path.exists() follows symlinks and returns False for a broken link or an
    # ELOOP ("too many levels of symbolic links") -- exactly the treat-as-missing
    # behavior we want before falling back.
    if os.path.exists(host_path):
        return host_path

    basename = os.path.basename(host_path)
    for fallback_dir in FALLBACK_LIB_DIRS:
        candidate = os.path.join(fallback_dir, basename)
        if candidate != host_path and os.path.exists(candidate):
            return os.path.realpath(candidate)

    return None


parser = argparse.ArgumentParser(description="Install CDI on Dragonwing IoT boards")
parser.add_argument("--file", type=str, required=True, help="CDI input file")
parser.add_argument(
    "--strict",
    action="store_true",
    help="Exit non-zero if any critical QNN/HTP library cannot be resolved",
)
args, unknown = parser.parse_known_args()

if os.path.exists("/etc/cdi/cdi-hw-acc.json"):
    print("/etc/cdi/cdi-hw-acc.json already exists. Remove it first before continuing.")
    exit(1)

if not os.path.exists(args.file):
    print(f"{args.file} (via --file) does not exist")
    exit(1)

# Check if directory exists
if not os.path.exists("/etc/cdi"):
    # Check if we can create it in /etc
    if not os.access(os.path.dirname("/etc/cdi"), os.W_OK):
        print(
            f"{os.path.dirname('/etc/cdi')} is not writable. Re-run this script with sudo."
        )
        exit(1)
    os.mkdir("/etc/cdi")
else:
    # Directory exists → check if writable
    if not os.access("/etc/cdi", os.W_OK):
        print("/etc/cdi is not writable. Re-run this script with sudo.")
        exit(1)

with open(args.file, "r") as f:
    cdi = json.loads(f.read())

print("Resolving mount paths...")
relocated = []
missing = []
for device in cdi["devices"]:
    new_mounts = []

    for mount in device["containerEdits"].get("mounts", []):
        resolved = resolve_host_path(mount["hostPath"])

        if resolved is None:
            missing.append(mount["hostPath"])
            print(f"    Missing  {mount['hostPath']}")
            continue

        if resolved != mount["hostPath"]:
            relocated.append((mount["hostPath"], resolved))
            print(f"    Resolved {mount['hostPath']} -> {resolved}")
            # Keep containerPath as authored; only the host source moves.
            mount["hostPath"] = resolved

        new_mounts.append(mount)

    device["containerEdits"]["mounts"] = new_mounts

    # The QNN HTP backend (libcdsprpc) locates the Hexagon skel purely via
    # ADSP_LIBRARY_PATH. Point it at the in-container directory where the skels are
    # mounted so offload works regardless of the host's on-disk layout.
    container_edits = device["containerEdits"]
    env = container_edits.setdefault("env", [])
    if not any(e.startswith("ADSP_LIBRARY_PATH=") for e in env):
        env.append("ADSP_LIBRARY_PATH=/usr/lib/rfsa/adsp")

print("")
if relocated:
    print(
        f"Resolved {len(relocated)} mount(s) from a fallback library directory "
        "(non-BSP image layout)."
    )

critical_missing = [m for m in missing if os.path.basename(m) in CRITICAL_BASENAMES]
if missing:
    print(f"WARNING: {len(missing)} expected host path(s) were missing and skipped.")
if critical_missing:
    print("")
    print(
        "WARNING: critical QNN/HTP libraries could not be found on this host -- NPU "
        "offload will NOT work and detection would fall back to CPU:"
    )
    for path in critical_missing:
        print(f"    {path}")
    print(
        "Confirm the QAIRT runtime is installed (e.g. the qairt-libs/qairt-tools "
        "packages) and that the Hexagon skels exist as real files."
    )
    if args.strict:
        print("Aborting due to --strict.")
        exit(1)

print("")
print("Writing to /etc/cdi/cdi-hw-acc.json...")
with open("/etc/cdi/cdi-hw-acc.json", "w") as f:
    f.write(json.dumps(cdi, indent=4))
print("Writing to /etc/cdi/cdi-hw-acc.json OK")
