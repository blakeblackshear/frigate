"""Runtime installation of optional accelerator SDKs into the user site.

Detector runtimes that are only useful with specific hardware are not shipped
in the image. A detector declares a RuntimeManifest of pinned, checksummed
artifacts, and ensure_installed() fetches and installs them into the runtime
user's home (pip's --user location) the first time that detector is
configured. Everything is derived from site.getuserbase() so the location
follows $HOME: /config/.local for the unprivileged service, /root/.local for
a root service, never a mix of the two.
"""

import ctypes
import fnmatch
import hashlib
import importlib
import importlib.util
import json
import logging
import os
import platform
import shutil
import site
import stat
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

from frigate.const import MODEL_CACHE_DIR
from frigate.util.config import (
    frigate_service_is_granular_root,
    is_runtime_user_writable,
)
from frigate.util.file import FileLock

logger = logging.getLogger(__name__)

GITHUB_URL = "https://github.com"
DOCS_URL = "https://docs.frigate.video/frigate/network_requirements#detector-runtimes"


class RuntimeDependencyError(RuntimeError):
    """A runtime could not be installed or is not allowed to be used."""


class ArtifactKind(StrEnum):
    wheel = "wheel"
    archive = "archive"


class ArchiveDest(StrEnum):
    lib = "lib"
    bin = "bin"
    site_packages = "site_packages"


@dataclass(frozen=True)
class ArchiveMapping:
    """Copy archive members under `prefix` into a directory of the user base.

    `include` holds optional basename globs; when set, only matching members
    are extracted. `machines` restricts the mapping to platform.machine()
    values, empty meaning all.
    """

    prefix: str
    dest: ArchiveDest
    subdir: str = ""
    include: tuple[str, ...] = ()
    machines: tuple[str, ...] = ()


@dataclass(frozen=True)
class Artifact:
    url: str
    sha256: str
    kind: ArtifactKind
    filename: str | None = None
    mappings: tuple[ArchiveMapping, ...] = ()
    machines: tuple[str, ...] = ()

    @property
    def name(self) -> str:
        return self.filename or os.path.basename(self.url.split("?")[0])


@dataclass(frozen=True)
class RuntimeManifest:
    """The pinned artifacts that make up one detector's runtime.

    `preload` lists shared libraries under <user base>/lib to load with
    RTLD_GLOBAL before the SDK import, in dependency order. Libraries without
    a SONAME cannot be satisfied that way and need <user base>/lib on
    LD_LIBRARY_PATH at exec time; `needs_ld_library_path` makes activate()
    warn when it is missing.
    """

    name: str
    version: str
    artifacts: tuple[Artifact, ...]
    preload: tuple[str, ...] = ()
    import_check: str = ""
    needs_ld_library_path: bool = False

    def digest(self) -> str:
        parts = [self.name, self.version, *sorted(a.sha256 for a in self.artifacts)]
        return hashlib.sha256("\n".join(parts).encode()).hexdigest()


_loaded_libs: dict[str, ctypes.CDLL] = {}


def user_base() -> Path:
    return Path(site.getuserbase())


def user_site() -> Path:
    return Path(site.getusersitepackages())


def cache_dir(name: str) -> Path:
    """The directory downloads land in, and where offline users pre-seed them."""
    return Path(MODEL_CACHE_DIR) / "runtimes" / name


def resolve_url(url: str) -> str:
    """Apply the GITHUB_ENDPOINT mirror to GitHub release URLs."""
    if url.startswith(f"{GITHUB_URL}/"):
        endpoint = os.environ.get("GITHUB_ENDPOINT", GITHUB_URL).rstrip("/")
        return f"{endpoint}{url[len(GITHUB_URL) :]}"

    return url


def find_tool(name: str) -> str:
    """Resolve a CLI tool, preferring the runtime-installed copy."""
    candidate = user_base() / "bin" / name

    if candidate.is_file() and os.access(candidate, os.X_OK):
        return str(candidate)

    return shutil.which(name) or name


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()

    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def _usable_reason() -> str | None:
    """Why the user site must not be used, or None when it may be."""
    if not site.ENABLE_USER_SITE:
        return "the user site-packages directory is disabled for this interpreter"

    base = user_base()

    if frigate_service_is_granular_root() and is_runtime_user_writable(str(base)):
        return (
            f"{base} is writable by the unprivileged user while "
            "FRIGATE_ROOT_SERVICES runs frigate as root"
        )

    return None


def _artifacts_for_machine(manifest: RuntimeManifest) -> list[Artifact]:
    machine = platform.machine()
    return [a for a in manifest.artifacts if not a.machines or machine in a.machines]


def _fetch(artifact: Artifact, cache: Path) -> Path:
    """Return a verified copy of the artifact in the cache, downloading if needed."""
    path = cache / artifact.name

    if path.is_file():
        if sha256_of(path) == artifact.sha256:
            logger.info("Using pre-seeded runtime file %s", path)
            return path

        logger.warning("Checksum mismatch for %s, downloading again", path)
        path.unlink()

    # imported here so the detector API does not pull in the IPC stack
    from frigate.util.downloader import ModelDownloader

    url = resolve_url(artifact.url)
    logger.info("Downloading runtime file %s", url)

    try:
        ModelDownloader.download_from_url(url, str(path), silent=True)
    except Exception as err:
        raise RuntimeDependencyError(
            f"Unable to download {url}: {err}. Without internet access, "
            f"download it elsewhere and place it in {cache} (see {DOCS_URL})"
        ) from err

    if sha256_of(path) != artifact.sha256:
        path.unlink()
        raise RuntimeDependencyError(
            f"Checksum mismatch for {url}; the file was removed from {cache}"
        )

    return path


def _stage(path: Path, artifact: Artifact, staging: Path) -> Path:
    """Copy into the private staging dir and verify there.

    The cache directory is writable by the runtime user, so the copy that is
    installed is the one that was verified, not whatever is in the cache at
    install time.
    """
    staged = staging / path.name
    shutil.copyfile(path, staged)

    if sha256_of(staged) != artifact.sha256:
        raise RuntimeDependencyError(f"{path} changed while being installed")

    return staged


def _install_wheel(path: Path) -> None:
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--user",
            "--no-index",
            "--no-deps",
            "--force-reinstall",
            "--no-warn-script-location",
            str(path),
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "PIP_BREAK_SYSTEM_PACKAGES": "1"},
    )

    if result.returncode != 0:
        logger.error("pip install of %s failed:\n%s", path.name, result.stderr[-4000:])
        raise RuntimeDependencyError(f"pip install of {path.name} failed")

    logger.debug("pip install of %s:\n%s", path.name, result.stdout)


def _dest_root(mapping: ArchiveMapping) -> Path:
    if mapping.dest is ArchiveDest.site_packages:
        root = user_site()
    else:
        root = user_base() / mapping.dest.value

    return root / mapping.subdir if mapping.subdir else root


def _mappings_for(
    member_name: str, mappings: list[ArchiveMapping]
) -> list[tuple[ArchiveMapping, str]]:
    """Every mapping a member falls under; prefixes may overlap."""
    matches = []

    for mapping in mappings:
        if not member_name.startswith(mapping.prefix):
            continue

        relative = member_name[len(mapping.prefix) :]

        if not relative or relative.endswith("/"):
            continue

        if mapping.include and not any(
            fnmatch.fnmatch(os.path.basename(relative), p) for p in mapping.include
        ):
            continue

        matches.append((mapping, relative))

    return matches


def _safe_dest(root: Path, relative: str) -> Path:
    dest = root / relative
    resolved_root = os.path.realpath(root)

    if not os.path.realpath(dest).startswith(f"{resolved_root}{os.sep}"):
        raise RuntimeDependencyError(f"Archive member {relative} escapes {root}")

    return dest


def _write_member(dest: Path, data_source, mode: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(f"{dest.name}.tmp")

    with open(tmp, "wb") as f:
        shutil.copyfileobj(data_source, f)

    os.chmod(tmp, (mode & 0o777) or 0o644)
    os.replace(tmp, dest)


def _write_symlink(dest: Path, target: str) -> None:
    # only links to a sibling file are recreated; anything else is dropped
    if "/" in target or target in ("", ".", ".."):
        raise RuntimeDependencyError(f"Archive symlink {dest.name} -> {target}")

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.unlink(missing_ok=True)
    os.symlink(target, dest)


def _extract_archive(path: Path, artifact: Artifact) -> list[str]:
    """Extract mapped members into the user base and return their paths."""
    machine = platform.machine()
    mappings = [m for m in artifact.mappings if not m.machines or machine in m.machines]
    written: list[str] = []

    if path.name.endswith(".zip"):
        with zipfile.ZipFile(path) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue

                mode = info.external_attr >> 16

                for mapping, relative in _mappings_for(info.filename, mappings):
                    dest = _safe_dest(_dest_root(mapping), relative)

                    if stat.S_ISLNK(mode):
                        _write_symlink(dest, archive.read(info).decode())
                    else:
                        with archive.open(info) as source:
                            _write_member(dest, source, mode)

                    written.append(str(dest))
    else:
        with tarfile.open(path, "r:*") as archive:
            for member in archive:
                if not (member.isfile() or member.issym()):
                    continue

                for mapping, relative in _mappings_for(member.name, mappings):
                    dest = _safe_dest(_dest_root(mapping), relative)

                    if member.issym():
                        _write_symlink(dest, member.linkname)
                    else:
                        source = archive.extractfile(member)
                        assert source is not None
                        with source:
                            _write_member(dest, source, member.mode)

                    written.append(str(dest))

    if not written:
        raise RuntimeDependencyError(f"{path.name} contained no expected files")

    return written


def _stamp_path(name: str) -> Path:
    return user_base() / "share" / "frigate" / "runtimes" / f"{name}.json"


def _read_stamp(name: str) -> dict | None:
    try:
        with open(_stamp_path(name)) as f:
            stamp = json.load(f)
    except (OSError, ValueError):
        return None

    return stamp if isinstance(stamp, dict) else None


def _write_stamp(manifest: RuntimeManifest, files: list[str]) -> None:
    path = _stamp_path(manifest.name)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w") as f:
        json.dump(
            {
                "version": manifest.version,
                "digest": manifest.digest(),
                "files": files,
            },
            f,
            indent=2,
        )


def _remove_stamped_files(stamp: dict | None) -> None:
    for file in (stamp or {}).get("files", []):
        Path(file).unlink(missing_ok=True)


def _is_current(manifest: RuntimeManifest, stamp: dict | None) -> bool:
    if (
        stamp is None
        or stamp.get("version") != manifest.version
        or stamp.get("digest") != manifest.digest()
    ):
        return False

    if not all(os.path.lexists(f) for f in stamp.get("files", [])):
        return False

    if manifest.import_check:
        _add_user_site()
        return importlib.util.find_spec(manifest.import_check) is not None

    return True


def _add_user_site() -> None:
    """Put the user site on sys.path the way interpreter startup would.

    site.addsitedir() appends, but at startup the user site precedes the
    system site-packages, so the entry is moved ahead of them to keep that
    precedence.
    """
    path = str(user_site())

    if path in sys.path or not os.path.isdir(path):
        return

    site.addsitedir(path)
    importlib.invalidate_caches()

    system_sites = [
        i
        for i, p in enumerate(sys.path)
        if p.endswith(("site-packages", "dist-packages")) and p != path
    ]

    if system_sites:
        sys.path.remove(path)
        sys.path.insert(system_sites[0], path)


def activate(manifest: RuntimeManifest) -> None:
    """Make an installed runtime importable in the current process.

    Idempotent, and safe to call when nothing is installed; the SDK import
    then fails with its own error.
    """
    reason = _usable_reason()

    if reason is not None:
        logger.warning("Ignoring the %s runtime because %s", manifest.name, reason)
        return

    _add_user_site()
    lib_dir = user_base() / "lib"

    if manifest.needs_ld_library_path and str(lib_dir) not in os.environ.get(
        "LD_LIBRARY_PATH", ""
    ).split(":"):
        logger.warning(
            "%s is not on LD_LIBRARY_PATH; the %s runtime may fail to load",
            lib_dir,
            manifest.name,
        )

    for soname in manifest.preload:
        path = str(lib_dir / soname)

        if path in _loaded_libs:
            continue

        if not os.path.exists(path):
            logger.debug("Runtime library %s is not installed", path)
            continue

        try:
            _loaded_libs[path] = ctypes.CDLL(path, mode=ctypes.RTLD_GLOBAL)
        except OSError as err:
            logger.warning("Unable to preload %s: %s", path, err)


def ensure_installed(manifest: RuntimeManifest) -> None:
    """Install the manifest into the user site unless it already is.

    Meant to run once in the main process before detector processes start,
    so sys.path is inherited by them. Raises RuntimeDependencyError when the
    runtime cannot be installed or must not be used.
    """
    reason = _usable_reason()

    if reason is not None:
        raise RuntimeDependencyError(
            f"Refusing to install the {manifest.name} runtime because {reason}"
        )

    cache = cache_dir(manifest.name)
    cache.mkdir(parents=True, exist_ok=True)

    with FileLock(cache / ".install.lock", timeout=600):
        stamp = _read_stamp(manifest.name)

        if _is_current(manifest, stamp):
            logger.debug(
                "%s runtime %s is already installed", manifest.name, manifest.version
            )
            activate(manifest)
            return

        logger.info("Installing the %s runtime %s", manifest.name, manifest.version)
        _remove_stamped_files(stamp)
        staging = Path(tempfile.mkdtemp(prefix=f"frigate-{manifest.name}-"))
        files: list[str] = []

        try:
            for artifact in _artifacts_for_machine(manifest):
                staged = _stage(_fetch(artifact, cache), artifact, staging)

                if artifact.kind is ArtifactKind.wheel:
                    _install_wheel(staged)
                else:
                    files.extend(_extract_archive(staged, artifact))
        except (OSError, tarfile.TarError, zipfile.BadZipFile) as err:
            raise RuntimeDependencyError(
                f"Unable to install the {manifest.name} runtime: {err}"
            ) from err
        finally:
            shutil.rmtree(staging, ignore_errors=True)

        _write_stamp(manifest, files)

    activate(manifest)
    logger.info(
        "Installed the %s runtime %s into %s",
        manifest.name,
        manifest.version,
        user_base(),
    )
