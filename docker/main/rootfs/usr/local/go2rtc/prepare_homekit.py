"""Normalize the go2rtc HomeKit file and hand it to go2rtc, as root.

Runs before the drop. The file is in the runtime-user-owned /config, so a
planted symlink could redirect the root write or chown onto another file;
every operation goes through an O_NOFOLLOW fd to prevent that.

Usage: prepare_homekit.py PATH [--chown]
"""

import errno
import grp
import io
import os
import pwd
import stat
import sys

from ruamel.yaml import YAML

RUNTIME_OWNER = "go2rtc"
SHARED_GROUP = "frigate-data"
MODE = 0o664
MAX_BYTES = 10 * 1024 * 1024


def open_nofollow(path: str) -> int:
    """Return an fd to a regular file at path, never following a symlink."""
    flags = os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW
    try:
        fd = os.open(path, flags, MODE)
    except OSError as err:
        if err.errno != errno.ELOOP:
            raise
        os.unlink(path)
        return os.open(path, flags | os.O_EXCL, MODE)

    # A fifo or other non-regular file would hang or misbehave on read; replace it.
    if not stat.S_ISREG(os.fstat(fd).st_mode):
        os.close(fd)
        os.unlink(path)
        return os.open(path, flags | os.O_EXCL, MODE)
    return fd


def normalize(content: str) -> str:
    """Keep only the homekit section, matching the previous yq/jq behavior."""
    yaml = YAML(typ="safe")
    try:
        data = yaml.load(content)
    except Exception:
        return ""

    if not isinstance(data, dict) or "homekit" not in data:
        return ""

    buf = io.StringIO()
    yaml.dump({"homekit": data["homekit"]}, buf)
    return buf.getvalue()


def main() -> int:
    if len(sys.argv) < 2:
        print("[ERROR] prepare_homekit: PATH is required", file=sys.stderr)
        return 2

    path = sys.argv[1]
    do_chown = "--chown" in sys.argv[2:]

    fd = open_nofollow(path)
    try:
        content = os.read(fd, MAX_BYTES).decode("utf-8", "replace")
        normalized = normalize(content)
        os.ftruncate(fd, 0)
        os.lseek(fd, 0, os.SEEK_SET)
        os.write(fd, normalized.encode("utf-8"))

        if do_chown:
            # tolerate a chown-refusing mount (NFS root_squash): pairing
            # persistence degrades, the service does not
            try:
                uid = pwd.getpwnam(RUNTIME_OWNER).pw_uid
                gid = grp.getgrnam(SHARED_GROUP).gr_gid
                os.fchown(fd, uid, gid)
                os.fchmod(fd, MODE)
            except (KeyError, OSError):
                print(
                    f"[WARN] Could not hand {path} to the go2rtc user; "
                    "HomeKit pairing changes may not persist"
                )
    finally:
        os.close(fd)

    return 0


if __name__ == "__main__":
    sys.exit(main())
