"""Tests for runtime installation of detector SDKs into the user site."""

import ctypes
import hashlib
import io
import json
import os
import stat
import subprocess
import sys
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from frigate.util import runtime_deps
from frigate.util.runtime_deps import (
    ArchiveDest,
    ArchiveMapping,
    Artifact,
    ArtifactKind,
    RuntimeDependencyError,
    RuntimeManifest,
    activate,
    ensure_installed,
    find_tool,
)

LIB_PREFIX = "rootfs/usr/local/lib/"
BIN_PREFIX = "rootfs/usr/local/bin/"
MAPPINGS = (
    ArchiveMapping(LIB_PREFIX, ArchiveDest.lib),
    ArchiveMapping(BIN_PREFIX, ArchiveDest.bin),
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def make_tarball(members: dict[str, bytes | str], exec_names=()) -> bytes:
    """Build a tar.gz; a str value is a symlink target, bytes a file."""
    buffer = io.BytesIO()

    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name, content in members.items():
            info = tarfile.TarInfo(name)

            if isinstance(content, str):
                info.type = tarfile.SYMTYPE
                info.linkname = content
                archive.addfile(info)
            else:
                info.size = len(content)
                info.mode = 0o755 if name in exec_names else 0o644
                archive.addfile(info, io.BytesIO(content))

    return buffer.getvalue()


def make_zip(members: dict[str, bytes | str]) -> bytes:
    """Build a zip the way GitHub archives do, symlinks included."""
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in members.items():
            info = zipfile.ZipInfo(name)

            if isinstance(content, str):
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
                archive.writestr(info, content)
            else:
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                archive.writestr(info, content)

    return buffer.getvalue()


class RuntimeDepsTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.base = root / "base"
        self.site = self.base / "lib" / "python" / "site-packages"
        self.cache = root / "cache"
        self.downloads: list[str] = []
        self.download_content: bytes | None = None
        self.sys_path = list(sys.path)
        runtime_deps._loaded_libs.clear()

        def download(url: str, save_path: str, silent: bool = False) -> Path:
            self.downloads.append(url)

            if self.download_content is None:
                raise OSError("network is off")

            Path(save_path).write_bytes(self.download_content)
            return Path(save_path)

        self.patches = [
            patch.object(runtime_deps, "user_base", lambda: self.base),
            patch.object(runtime_deps, "user_site", lambda: self.site),
            patch.object(runtime_deps, "cache_dir", lambda name: self.cache / name),
            patch.object(runtime_deps.site, "ENABLE_USER_SITE", True),
            patch(
                "frigate.util.downloader.ModelDownloader.download_from_url", download
            ),
            patch("os.geteuid", return_value=1000),
            patch.dict("os.environ", {}, clear=True),
        ]

        for p in self.patches:
            p.start()

    def tearDown(self) -> None:
        for p in reversed(self.patches):
            p.stop()

        sys.path[:] = self.sys_path
        self.tmp.cleanup()

    def archive_manifest(
        self, data: bytes, version: str = "1.0", name: str = "test"
    ) -> RuntimeManifest:
        return RuntimeManifest(
            name=name,
            version=version,
            artifacts=(
                Artifact(
                    url=f"https://github.com/org/repo/releases/download/v{version}/runtime.tar.gz",
                    sha256=sha256(data),
                    kind=ArtifactKind.archive,
                    mappings=MAPPINGS,
                ),
            ),
        )

    def preseed(self, manifest: RuntimeManifest, data: bytes) -> Path:
        path = self.cache / manifest.name / manifest.artifacts[0].name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path


class TestFetch(RuntimeDepsTestCase):
    def test_preseeded_file_with_matching_sha256_skips_download(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}libfoo.so": b"lib"})
        manifest = self.archive_manifest(data)
        self.preseed(manifest, data)

        ensure_installed(manifest)

        self.assertEqual(self.downloads, [])
        self.assertEqual((self.base / "lib" / "libfoo.so").read_bytes(), b"lib")

    def test_preseeded_file_with_wrong_sha256_is_downloaded_again(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}libfoo.so": b"lib"})
        manifest = self.archive_manifest(data)
        self.preseed(manifest, b"corrupt")
        self.download_content = data

        ensure_installed(manifest)

        self.assertEqual(len(self.downloads), 1)
        self.assertTrue((self.base / "lib" / "libfoo.so").is_file())

    def test_download_with_wrong_sha256_raises_and_removes_file(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}libfoo.so": b"lib"})
        manifest = self.archive_manifest(data)
        self.download_content = b"tampered"

        with self.assertRaises(RuntimeDependencyError):
            ensure_installed(manifest)

        self.assertFalse((self.cache / "test" / "runtime.tar.gz").exists())
        self.assertFalse((self.base / "lib" / "libfoo.so").exists())

    def test_download_failure_names_the_preseed_directory(self) -> None:
        manifest = self.archive_manifest(b"whatever")

        with self.assertRaises(RuntimeDependencyError) as ctx:
            ensure_installed(manifest)

        self.assertIn(str(self.cache / "test"), str(ctx.exception))

    def test_github_endpoint_mirror_is_honored(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}libfoo.so": b"lib"})
        manifest = self.archive_manifest(data)
        self.download_content = data

        with patch.dict("os.environ", {"GITHUB_ENDPOINT": "https://mirror.test/"}):
            ensure_installed(manifest)

        self.assertEqual(
            self.downloads,
            ["https://mirror.test/org/repo/releases/download/v1.0/runtime.tar.gz"],
        )

    def test_non_github_urls_are_left_alone(self) -> None:
        with patch.dict("os.environ", {"GITHUB_ENDPOINT": "https://mirror.test"}):
            self.assertEqual(
                runtime_deps.resolve_url("https://example.com/a.whl"),
                "https://example.com/a.whl",
            )


class TestInstall(RuntimeDepsTestCase):
    def test_archive_extracts_lib_and_bin_with_exec_bits_and_symlinks(self) -> None:
        data = make_tarball(
            {
                f"{LIB_PREFIX}libfoo.so.1": b"lib",
                f"{LIB_PREFIX}libfoo.so": "libfoo.so.1",
                f"{BIN_PREFIX}tool": b"#!/bin/sh\n",
                "rootfs/etc/ignored": b"no",
            },
            exec_names=(f"{BIN_PREFIX}tool",),
        )
        manifest = self.archive_manifest(data)
        self.preseed(manifest, data)

        ensure_installed(manifest)

        lib = self.base / "lib"
        self.assertEqual((lib / "libfoo.so.1").read_bytes(), b"lib")
        self.assertEqual(os.readlink(lib / "libfoo.so"), "libfoo.so.1")
        self.assertTrue(os.access(self.base / "bin" / "tool", os.X_OK))
        self.assertFalse((self.base / "etc").exists())

        stamp = json.loads(
            (self.base / "share" / "frigate" / "runtimes" / "test.json").read_text()
        )
        self.assertEqual(stamp["version"], "1.0")
        self.assertEqual(len(stamp["files"]), 3)

    def test_zip_archive_with_include_filter_and_site_packages_dest(self) -> None:
        data = make_zip(
            {
                "pkg-1.0/pkg/__init__.py": b"",
                "pkg-1.0/pkg/x86/libx.so.2": b"lib",
                "pkg-1.0/pkg/x86/libx.so": "libx.so.2",
                "pkg-1.0/pkg/x86/other.txt": b"skip",
            }
        )
        manifest = RuntimeManifest(
            name="test",
            version="1.0",
            artifacts=(
                Artifact(
                    url="https://github.com/org/pkg/archive/refs/tags/v1.0.zip",
                    sha256=sha256(data),
                    kind=ArtifactKind.archive,
                    filename="pkg-1.0.zip",
                    mappings=(
                        ArchiveMapping(
                            "pkg-1.0/pkg/", ArchiveDest.site_packages, subdir="pkg"
                        ),
                        ArchiveMapping(
                            "pkg-1.0/pkg/x86/", ArchiveDest.lib, include=("libx.so*",)
                        ),
                    ),
                ),
            ),
        )
        self.preseed(manifest, data)

        ensure_installed(manifest)

        self.assertTrue((self.site / "pkg" / "__init__.py").is_file())
        self.assertEqual(os.readlink(self.base / "lib" / "libx.so"), "libx.so.2")
        self.assertTrue((self.base / "lib" / "libx.so.2").is_file())
        self.assertFalse((self.base / "lib" / "other.txt").exists())

    def test_archive_member_escaping_destination_is_rejected(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}../../../../escaped": b"evil"})
        manifest = self.archive_manifest(data)
        self.preseed(manifest, data)

        with self.assertRaises(RuntimeDependencyError):
            ensure_installed(manifest)

        self.assertFalse((Path(self.tmp.name) / "escaped").exists())

    def test_symlink_pointing_outside_its_directory_is_rejected(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}libfoo.so": "../../etc/passwd"})
        manifest = self.archive_manifest(data)
        self.preseed(manifest, data)

        with self.assertRaises(RuntimeDependencyError):
            ensure_installed(manifest)

    def test_wheel_is_installed_with_pip_into_the_user_site(self) -> None:
        data = b"not really a wheel"
        manifest = RuntimeManifest(
            name="test",
            version="1.0",
            artifacts=(
                Artifact(
                    url="https://example.com/thing-1.0-py3-none-any.whl",
                    sha256=sha256(data),
                    kind=ArtifactKind.wheel,
                ),
            ),
        )
        self.preseed(manifest, data)
        completed = subprocess.CompletedProcess([], 0, stdout="", stderr="")

        with patch.object(
            runtime_deps.subprocess, "run", return_value=completed
        ) as run:
            ensure_installed(manifest)

        args = run.call_args.args[0]
        self.assertEqual(args[:4], [sys.executable, "-m", "pip", "install"])
        self.assertIn("--user", args)
        self.assertIn("--no-index", args)
        self.assertIn("--no-deps", args)
        self.assertTrue(args[-1].endswith("thing-1.0-py3-none-any.whl"))
        # the staged copy is installed, not the one in the cache
        self.assertFalse(args[-1].startswith(str(self.cache)))

    def test_failed_pip_install_raises(self) -> None:
        data = b"wheel"
        manifest = RuntimeManifest(
            name="test",
            version="1.0",
            artifacts=(
                Artifact(
                    url="https://example.com/thing-1.0-py3-none-any.whl",
                    sha256=sha256(data),
                    kind=ArtifactKind.wheel,
                ),
            ),
        )
        self.preseed(manifest, data)
        completed = subprocess.CompletedProcess([], 1, stdout="", stderr="boom")

        with (
            patch.object(runtime_deps.subprocess, "run", return_value=completed),
            self.assertRaises(RuntimeDependencyError),
        ):
            ensure_installed(manifest)

    def test_matching_stamp_skips_a_second_install(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}libfoo.so": b"lib"})
        manifest = self.archive_manifest(data)
        self.preseed(manifest, data)
        ensure_installed(manifest)

        with patch.object(runtime_deps, "_extract_archive") as extract:
            ensure_installed(manifest)

        extract.assert_not_called()

    def test_missing_installed_file_triggers_a_reinstall(self) -> None:
        data = make_tarball({f"{LIB_PREFIX}libfoo.so": b"lib"})
        manifest = self.archive_manifest(data)
        self.preseed(manifest, data)
        ensure_installed(manifest)
        (self.base / "lib" / "libfoo.so").unlink()

        ensure_installed(manifest)

        self.assertTrue((self.base / "lib" / "libfoo.so").is_file())

    def test_version_bump_reinstalls_and_removes_old_files(self) -> None:
        old = make_tarball({f"{LIB_PREFIX}libfoo.so.1": b"old"})
        old_manifest = self.archive_manifest(old, version="1.0")
        self.preseed(old_manifest, old)
        ensure_installed(old_manifest)

        new = make_tarball({f"{LIB_PREFIX}libfoo.so.2": b"new"})
        new_manifest = self.archive_manifest(new, version="2.0")
        self.preseed(new_manifest, new)
        ensure_installed(new_manifest)

        self.assertFalse((self.base / "lib" / "libfoo.so.1").exists())
        self.assertEqual((self.base / "lib" / "libfoo.so.2").read_bytes(), b"new")

    def test_only_artifacts_for_the_current_machine_are_used(self) -> None:
        x86 = make_tarball({f"{LIB_PREFIX}libx86.so": b"x"})
        arm = make_tarball({f"{LIB_PREFIX}libarm.so": b"a"})
        manifest = RuntimeManifest(
            name="test",
            version="1.0",
            artifacts=(
                Artifact(
                    url="https://example.com/x86.tar.gz",
                    sha256=sha256(x86),
                    kind=ArtifactKind.archive,
                    mappings=MAPPINGS,
                    machines=("x86_64",),
                ),
                Artifact(
                    url="https://example.com/arm.tar.gz",
                    sha256=sha256(arm),
                    kind=ArtifactKind.archive,
                    mappings=MAPPINGS,
                    machines=("aarch64",),
                ),
            ),
        )
        (self.cache / "test").mkdir(parents=True)
        (self.cache / "test" / "x86.tar.gz").write_bytes(x86)
        (self.cache / "test" / "arm.tar.gz").write_bytes(arm)

        with patch.object(runtime_deps.platform, "machine", return_value="aarch64"):
            ensure_installed(manifest)

        self.assertTrue((self.base / "lib" / "libarm.so").is_file())
        self.assertFalse((self.base / "lib" / "libx86.so").exists())


class TestRootGuard(RuntimeDepsTestCase):
    """A root frigate service must never load code from a uid-1000 tree."""

    def test_refuses_a_runtime_user_writable_base_under_granular_root(self) -> None:
        manifest = self.archive_manifest(b"data")

        with (
            patch.object(runtime_deps, "user_base", lambda: Path("/config/.local")),
            patch("os.geteuid", return_value=0),
            patch.dict("os.environ", {"FRIGATE_ROOT_SERVICES": "frigate"}),
        ):
            with self.assertRaises(RuntimeDependencyError) as ctx:
                ensure_installed(manifest)

            self.assertIn("FRIGATE_ROOT_SERVICES", str(ctx.exception))
            self.assertIsNotNone(runtime_deps._usable_reason())

    def test_root_owned_base_is_allowed_under_granular_root(self) -> None:
        with (
            patch.object(runtime_deps, "user_base", lambda: Path("/root/.local")),
            patch("os.geteuid", return_value=0),
            patch.dict("os.environ", {"FRIGATE_ROOT_SERVICES": "frigate"}),
        ):
            self.assertIsNone(runtime_deps._usable_reason())

    def test_escape_hatch_is_not_guarded(self) -> None:
        with (
            patch.object(runtime_deps, "user_base", lambda: Path("/config/.local")),
            patch("os.geteuid", return_value=0),
            patch.dict("os.environ", {"FRIGATE_RUN_AS_ROOT": "true"}),
        ):
            self.assertIsNone(runtime_deps._usable_reason())

    def test_disabled_user_site_is_refused(self) -> None:
        with patch.object(runtime_deps.site, "ENABLE_USER_SITE", False):
            self.assertIsNotNone(runtime_deps._usable_reason())

    def test_activate_skips_a_refused_runtime(self) -> None:
        self.site.mkdir(parents=True)

        with (
            patch.object(runtime_deps, "user_base", lambda: Path("/config/.local")),
            patch("os.geteuid", return_value=0),
            patch.dict("os.environ", {"FRIGATE_ROOT_SERVICES": "frigate"}),
        ):
            activate(RuntimeManifest(name="test", version="1", artifacts=()))

        self.assertNotIn(str(self.site), sys.path)


class TestActivate(RuntimeDepsTestCase):
    def test_adds_the_user_site_ahead_of_system_site_packages(self) -> None:
        self.site.mkdir(parents=True)

        activate(RuntimeManifest(name="test", version="1", artifacts=()))

        self.assertIn(str(self.site), sys.path)
        system = [
            i
            for i, p in enumerate(sys.path)
            if p.endswith(("site-packages", "dist-packages")) and p != str(self.site)
        ]

        if system:
            self.assertLess(sys.path.index(str(self.site)), system[0])

    def test_preloads_libraries_in_order_with_rtld_global(self) -> None:
        lib = self.base / "lib"
        lib.mkdir(parents=True)
        (lib / "liba.so").write_bytes(b"")
        (lib / "libb.so").write_bytes(b"")
        manifest = RuntimeManifest(
            name="test", version="1", artifacts=(), preload=("liba.so", "libb.so")
        )

        with patch.object(runtime_deps.ctypes, "CDLL") as cdll:
            activate(manifest)
            activate(manifest)

        self.assertEqual(
            [c.args[0] for c in cdll.call_args_list],
            [str(lib / "liba.so"), str(lib / "libb.so")],
        )
        self.assertTrue(
            all(c.kwargs["mode"] == ctypes.RTLD_GLOBAL for c in cdll.call_args_list)
        )

    def test_missing_ld_library_path_is_reported(self) -> None:
        manifest = RuntimeManifest(
            name="test", version="1", artifacts=(), needs_ld_library_path=True
        )

        with self.assertLogs(runtime_deps.logger, level="WARNING") as logs:
            activate(manifest)

        self.assertTrue(any("LD_LIBRARY_PATH" in line for line in logs.output))

        with (
            patch.dict(
                "os.environ", {"LD_LIBRARY_PATH": f"/usr/lib:{self.base / 'lib'}"}
            ),
            self.assertNoLogs(runtime_deps.logger, level="WARNING"),
        ):
            activate(manifest)

    def test_find_tool_prefers_the_user_bin(self) -> None:
        tool = self.base / "bin" / "sh"
        tool.parent.mkdir(parents=True)
        tool.write_text("#!/bin/sh\n")
        tool.chmod(0o755)

        self.assertEqual(find_tool("sh"), str(tool))
        self.assertEqual(find_tool("definitely-not-a-tool"), "definitely-not-a-tool")


class TestDeclaredManifests(unittest.TestCase):
    """Every manifest a detector declares must be complete and pinned."""

    def test_manifests_are_pinned_for_both_architectures(self) -> None:
        from frigate.detectors import api_types

        manifests = [
            api.runtime_manifest
            for api in api_types.values()
            if api.runtime_manifest is not None
        ]
        self.assertGreaterEqual(len(manifests), 3)

        for manifest in manifests:
            with self.subTest(manifest=manifest.name):
                self.assertTrue(manifest.version)
                self.assertTrue(manifest.import_check)

                for artifact in manifest.artifacts:
                    self.assertRegex(artifact.sha256, r"^[0-9a-f]{64}$")
                    self.assertTrue(artifact.url.startswith("https://"))

                for machine in ("x86_64", "aarch64"):
                    self.assertTrue(
                        any(
                            not a.machines or machine in a.machines
                            for a in manifest.artifacts
                        ),
                        f"no artifact for {machine}",
                    )


if __name__ == "__main__":
    unittest.main()
