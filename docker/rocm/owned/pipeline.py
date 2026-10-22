#!/usr/bin/env python3
"""Build owned AMD runtimes in bounded, device-free Docker containers.

Only acquisition uses networking. This command never changes a Frigate service.
The Docker host needs Docker, SSH, bash, and tar; Python runs on the client.
"""

import argparse
import fcntl
import hashlib
import io
import json
import os
import re
import shlex
import subprocess
import tarfile
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
PROFILE = "724"
SDK724 = "rocm/dev-ubuntu-22.04@sha256:a50a8547101ac9e7c35848ff609a56335214b789b468c9eb05dcd006a4a38c25"
DEBIAN = (
    "debian@sha256:a4672c0cb26fbdde88e38fa2dfb6c681942306680e41e4378b28770b6e79ee91"
)
APPLICATION = json.loads((HERE / "application-lock.json").read_text())


def now() -> str:
    """Return an unambiguous receipt timestamp."""
    return datetime.now(timezone.utc).isoformat()  # noqa: UP017 (Python 3.9 SSH client)


def digest(path: Path) -> str:
    """Hash a build input without loading large archives into memory."""
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def memory_bytes(value: str) -> int:
    """Accept explicit integer byte or binary K/M/G limits."""
    match = re.fullmatch(r"([1-9][0-9]*)([kmg]?)", value.lower())
    if not match:
        raise ValueError("Use an integer memory limit such as 12g")
    return int(match[1]) * 1024 ** {"": 0, "k": 1, "m": 2, "g": 3}[match[2]]


def input_name(path: Path, profile: str) -> str:
    """Preserve qualified runtime and cache identities after moving recipes."""
    relative = path.relative_to(REPO)
    if path.parent == HERE.parent / "runtime":
        directory = "legacy724" if profile == "724" else "native101"
        return f"docker/rocm/{directory}/{path.name}"
    if path.parent == HERE.parent / "common":
        return f"docker/rocm/legacy724/{path.name}"
    return str(relative)


class Pipeline:
    """Keep immutable resource identities and logs beside each client run."""

    def __init__(self, args):
        if args.profile != PROFILE:
            raise ValueError(f"This branch contains only runtime profile {PROFILE}")
        self.args = args
        self.root = args.workspace.rstrip("/")
        if not self.root.startswith("/") or ".." in Path(self.root).parts:
            raise ValueError("Use a dedicated absolute workspace")
        if self.root in {"/", "/mnt", "/opt", "/tmp", "/var", "/home"}:
            raise ValueError("Use a dedicated workspace, not a system directory")
        if not re.fullmatch(r"[0-9,-]+", args.cpuset) or args.jobs < 1:
            raise ValueError("Invalid compiler resource limits")
        memory_bytes(args.memory)
        self.directory = args.receipts.resolve()
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path = self.directory / f"{args.profile}-pipeline.json"
        self.guard = self.path.with_suffix(".lock").open("a")
        fcntl.flock(self.guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.profile = args.profile
        self.remote = self.root + "/" + self.profile
        self.recipe = HERE.parent / "runtime"
        self.lock = json.loads((self.recipe / "source-lock.json").read_text())
        self.journal = (
            json.loads(self.path.read_text())
            if self.path.exists()
            else {
                "schema": 1,
                "owner": f"frigate-owned-{self.profile}-{os.urandom(8).hex()}",
                "workspace": self.root,
                "ssh_host": args.ssh_host,
                "created_at": now(),
                "containers": [],
                "images": [],
                "stages": {},
            }
        )
        if (self.journal["workspace"], self.journal["ssh_host"]) != (
            self.root,
            args.ssh_host,
        ):
            raise ValueError("Receipt belongs to a different host or workspace")
        info = self.json(["info", "--format", "{{json .}}"])
        if info["OSType"] != "linux" or info["Architecture"] not in {"x86_64", "amd64"}:
            raise ValueError("Requires a Linux amd64 Docker host")
        if self.journal.get("engine", info["ID"]) != info["ID"]:
            raise ValueError("Docker engine changed; refusing to reuse ownership")
        self.journal["engine"] = info["ID"]
        self.journal["runner_sha256"] = digest(Path(__file__))
        self.journal["resource_limits"] = {
            "cpuset": args.cpuset,
            "jobs": args.jobs,
            "memory": args.memory,
        }
        self.save()

    def save(self):
        """Atomically persist ownership before the next mutation."""
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.journal, indent=2) + "\n")
        temporary.chmod(0o600)
        temporary.replace(self.path)

    def host(self, arguments, **kwargs):
        """Preserve argument boundaries when crossing SSH."""
        command = list(arguments)
        if self.args.ssh_host:
            command = [
                "ssh",
                "-o",
                "BatchMode=yes",
                self.args.ssh_host,
                shlex.join(command),
            ]
        return subprocess.run(command, check=True, **kwargs)

    def docker(self, arguments, **kwargs):
        """Address the intended daemon explicitly."""
        return self.host(["docker", "-H", self.args.socket, *arguments], **kwargs)

    def text(self, arguments):
        """Read a small Docker result."""
        return self.docker(arguments, capture_output=True, text=True).stdout.strip()

    def json(self, arguments):
        """Read structured Docker state."""
        return json.loads(self.text(arguments))

    def upload(self, entries):
        """Stage versioned recipes without requiring host Python."""
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive, mode="w") as output:
            for source, name in entries:
                output.add(source, arcname=name)
        self.host(["tar", "-xf", "-", "-C", self.remote], input=archive.getvalue())

    def prepare(self):
        """Stage recipes; all mutable build paths belong to this workspace."""
        existing = set(self.text(["container", "ls", "-aq", "--no-trunc"]).split())
        owned = [
            row["id"] for row in self.journal["containers"] if row["id"] in existing
        ]
        if owned:
            for container in self.json(["inspect", *owned]):
                if container["State"]["Status"] not in {"exited", "dead"}:
                    raise RuntimeError(
                        "An owned container is still active; inspect it before restaging recipes"
                    )
        names = (
            "inputs",
            "recipes",
            "work",
            "prefix",
            "runtime",
            "binding-work",
            "metadata",
            "application/frigate/detectors/plugins",
        )
        remote = shlex.quote(self.remote)
        marker = shlex.quote(self.remote + "/.pipeline-owner")
        owner = shlex.quote(self.journal["owner"])
        self.host(
            [
                "bash",
                "-c",
                f"set -eu\ntest ! -L {remote}\n"
                f'if [ -d {remote} ] && [ ! -f {marker} ] && [ -n "$(ls -A {remote})" ]; then '
                "printf '%s\\n' 'Refusing an existing unowned build directory' >&2; exit 1; fi\n"
                f"mkdir -p {remote}\n"
                f'if [ -f {marker} ]; then test "$(cat {marker})" = {owner}; else printf "%s\\n" {owner} > {marker}; fi',
            ]
        )
        self.host(["mkdir", "-p", *(self.remote + "/" + name for name in names)])
        entries = [
            (path, "recipes/" + path.name)
            for path in self.recipe.iterdir()
            if path.is_file()
            and path.suffix in {".py", ".sh", ".json", ".txt", ".patch", ".sha256"}
        ]
        entries += [
            (HERE / "Dockerfile", "Dockerfile"),
            (HERE / "application-lock.json", "application-lock.json"),
            (
                HERE.parent / "common/runtime-os-lock.json",
                "recipes/runtime-os-lock.json",
            ),
            (HERE.parent / "common/source_inputs.py", "recipes/source_inputs.py"),
        ]
        for name in (
            "CMakeLists.compiler.txt",
            "compiler-probe.cpp",
            "build_compiler_probe.sh",
            "gfx90c_code.py",
        ):
            entries.append((HERE / name, "recipes/" + name))
        for path in (
            "frigate/detectors/plugins/migraphx.py",
            "frigate/detectors/legacy_amd.py",
        ):
            entries.append((REPO / path, "application/" + path))
        self.upload(entries)
        hashes = {
            input_name(source, self.profile): digest(source) for source, _ in entries
        }
        self.journal["recipe_sha256"] = hashlib.sha256(
            json.dumps(hashes, sort_keys=True).encode()
        ).hexdigest()
        self.journal["input_files"] = hashes
        runtime_files = {
            "source-lock.json",
            "runtime-os-lock.json",
            "build_source.sh",
            "build_binding.sh",
            "assemble_runtime.py",
            "assemble_os.sh",
            "CMakeLists.source.txt",
            "source_inputs.py",
            "retarget_logic.py",
            "migraphx-rocblas-only.patch",
            "gfx90c_code.py",
        }
        if self.profile == "724":
            runtime_files.remove("gfx90c_code.py")
        runtime_inputs = {
            name: value
            for name, value in hashes.items()
            if Path(name).name in runtime_files
        }
        self.journal["runtime_recipe_sha256"] = hashlib.sha256(
            json.dumps(runtime_inputs, sort_keys=True).encode()
        ).hexdigest()
        self.journal["cache_recipe_sha256"] = hashlib.sha256(
            (
                self.journal["runtime_recipe_sha256"]
                + hashes["docker/rocm/owned/Dockerfile"]
            ).encode()
        ).hexdigest()
        self.save()

    def image(self, reference):
        """Resolve an immutable Linux amd64 image."""
        owned = reference == self.journal.get("candidate", {}).get("id")
        if "@sha256:" not in reference and not owned:
            raise ValueError("Base images must use immutable manifest digests")
        image = self.json(["image", "inspect", reference])[0]
        if image["Architecture"] != "amd64" or image["Os"] != "linux":
            raise ValueError("Wrong base image architecture")
        return image["Id"]

    def pull(self, reference):
        """Acquire a missing pinned base; existing shared bases are not owned."""
        try:
            return self.image(reference)
        except subprocess.CalledProcessError:
            with (self.directory / f"pull-{reference.rsplit(':', 1)[1][:12]}.log").open(
                "w"
            ) as log:
                self.docker(
                    ["pull", "--platform", "linux/amd64", reference],
                    stdout=log,
                    stderr=subprocess.STDOUT,
                )
            identity = self.image(reference)
            self.journal["images"].append(
                {
                    "id": identity,
                    "reference": reference,
                    "purpose": "acquired pinned base",
                }
            )
            self.save()
            return identity

    def run(
        self,
        stage,
        image,
        script,
        mounts=(),
        network="none",
        user=None,
        env=(),
        copies=(),
    ):
        """Require actual termination and a zero exit, even after SSH detaches."""
        image_id = self.pull(image)
        name = self.journal["owner"] + "-" + stage + "-" + os.urandom(3).hex()
        arguments = [
            "create",
            "--name",
            name,
            "--label",
            "io.jaysqvl.qualification=" + self.journal["owner"],
            "--network",
            network,
            "--cpuset-cpus",
            self.args.cpuset,
            "--cpus",
            str(self.args.jobs),
            "--cpu-shares",
            "256",
            "--memory",
            self.args.memory,
            "--memory-swap",
            self.args.memory,
            "--pids-limit",
            "2048",
            "--ulimit",
            "core=0",
            "--no-healthcheck",
            "--env",
            "BUILD_JOBS=" + str(self.args.jobs),
            "--entrypoint",
            "/bin/bash",
        ]
        if user:
            arguments += ["--user", user]
        for variable in env:
            arguments += ["--env", variable]
        for source, target, readonly in mounts:
            if not source.startswith(self.remote + "/") or ".." in Path(source).parts:
                raise ValueError("Stage mounts must stay inside the owned workspace")
            arguments += [
                "--mount",
                f"type=bind,source={source},target={target}"
                + (",readonly" if readonly else ""),
            ]
        safety = "set -euo pipefail\ntest ! -e /dev/kfd\ntest ! -e /dev/dri\n"
        cid = self.text([*arguments, image_id, "-c", safety + script])
        if not re.fullmatch("[a-f0-9]{64}", cid):
            raise ValueError("Docker did not return a full container ID")
        obj = self.json(["inspect", cid])[0]
        self.journal["containers"].append(
            {"id": cid, "image": obj["Image"], "purpose": stage}
        )
        self.save()
        host = obj["HostConfig"]
        if host["Privileged"] or host.get("Devices") or host.get("DeviceRequests"):
            raise ValueError("Device isolation failed")
        if host["CpusetCpus"] != self.args.cpuset or host["NetworkMode"] != network:
            raise ValueError("Stage resource configuration changed")
        if (
            host["Memory"] != memory_bytes(self.args.memory)
            or host["NanoCpus"] != self.args.jobs * 1_000_000_000
            or host["CpuShares"] != 256
            or host["PidsLimit"] != 2048
        ):
            raise ValueError("Stage CPU, memory or process limit changed")
        self.journal["stages"][stage] = {
            "id": cid,
            "started_at": now(),
            "network": network,
            "gpu_devices_exposed": False,
            "state": "running",
            "runtime_recipe_sha256": self.journal["runtime_recipe_sha256"],
        }
        self.save()
        if copies:
            archive = io.BytesIO()

            def owner(member):
                member.uid = member.gid = 1000
                member.uname = member.gname = ""
                return member

            with tarfile.open(fileobj=archive, mode="w") as output:
                for source, name in copies:
                    output.add(source, arcname=name, filter=owner)
            self.docker(["cp", "-", cid + ":/"], input=archive.getvalue())
        print(
            json.dumps({"stage": stage, "container": cid, "state": "running"}),
            flush=True,
        )
        log_path = self.directory / f"{self.profile}-{stage}-{cid[:12]}.log"
        self.journal["stages"][stage]["log"] = log_path.name
        self.save()
        with log_path.open("w") as log:
            try:
                self.docker(
                    ["start", "--attach", cid], stdout=log, stderr=subprocess.STDOUT
                )
            except subprocess.CalledProcessError:
                pass
        # Interrupted SSH can leave a running container with ExitCode=0.
        state = self.json(["inspect", cid])[0]["State"]
        self.journal["stages"][stage].update({"finished_at": now(), "state": state})
        self.journal["containers"][-1].update({"state": state, "log": log_path.name})
        self.save()
        if state["Status"] != "exited" or state["ExitCode"] != 0 or state["OOMKilled"]:
            raise RuntimeError(
                f"{stage} did not finish successfully; see {self.directory}"
            )
        print(
            json.dumps({"stage": stage, "state": "passed", "container": cid}),
            flush=True,
        )

    def qualify(self):
        """Run linking, CPU compilation and real migrations on a disposable copy."""
        if not self.args.config_copy or not self.args.config_copy.is_dir():
            raise ValueError("Qualification requires --config-copy from a saved backup")
        candidate = self.journal.get("candidate")
        if not candidate:
            raise ValueError("Assemble the owned candidate first")
        fixture = self.args.config_copy.resolve()
        before = {
            str(path.relative_to(fixture)): digest(path)
            for path in fixture.rglob("*")
            if path.is_file()
        }
        common = HERE.parent / "common"
        copies = [(fixture, "config")]
        copies.append(
            (HERE / "gfx90c_code.py", "opt/frigate/docker/rocm/owned/gfx90c_code.py")
        )
        for name in (
            "source_checks.py",
            "offline_checks.py",
            "test_source_compatibility.py",
            "test_source_protocol.py",
        ):
            copies.append((common / name, "opt/frigate/docker/rocm/common/" + name))
        if self.args.corpus:
            if not self.args.corpus.is_dir():
                raise ValueError("Corpus must be a private directory of JPEG images")
            copies += [
                (self.args.corpus, "corpus/images"),
                (
                    HERE / "qualify_model.py",
                    "opt/frigate/docker/rocm/owned/qualify_model.py",
                ),
            ]
        self.journal["qualification_scripts_sha256"] = {
            str(source.relative_to(REPO)): digest(source)
            for source, _ in copies
            if source.is_file()
        }
        self.save()
        script = """cd /opt/frigate
export PYTHONPATH=/opt/frigate
for mode in linking hiprtc helper reference migrations; do
    python3 docker/rocm/common/source_checks.py "$mode" > "/tmp/qualified-$mode.json"
done
python3 -u -m unittest frigate.test.test_config_migration > /tmp/config-tests.txt 2>&1
python3 -u docker/rocm/common/test_source_compatibility.py > /tmp/adapter-tests.txt 2>&1
python3 -u docker/rocm/common/test_source_protocol.py > /tmp/protocol-tests.txt 2>&1
"""
        if self.args.corpus:
            script += """python3 docker/rocm/owned/qualify_model.py reference \\
    --model /config/model_cache/yolo26s-distill_320.onnx \\
    --labelmap /config/model_cache/coco-labels-frigate.txt \\
    --images /corpus/images --output /tmp/corpus-reference --migraphx-cpu
"""
        version = "7.2.4" if self.profile == "724" else "10.1.0"
        try:
            self.run(
                "qualify",
                candidate["id"],
                script,
                user="1000:1000",
                copies=copies,
                env=(
                    "FRIGATE_OFFLINE_CHECK=1",
                    "OMP_NUM_THREADS=2",
                    "CONFIG_FILE=/config/config.yaml",
                    "FRIGATE_OFFLINE_EXPECTED_VERSION=" + APPLICATION["version"],
                    "FRIGATE_OFFLINE_EXPECTED_ROCM=" + version,
                    "FRIGATE_OFFLINE_ARCH="
                    + ("gfx900" if self.profile == "724" else "gfx90c"),
                ),
            )
        finally:
            stage = self.journal["stages"].get("qualify", {})
            if stage.get("id"):
                with (
                    self.directory / f"{self.profile}-qualify-output.private.tar"
                ).open("wb") as output:
                    self.docker(["cp", stage["id"] + ":/tmp", "-"], stdout=output)
            after = {
                str(path.relative_to(fixture)): digest(path)
                for path in fixture.rglob("*")
                if path.is_file()
            }
            if before != after:
                raise RuntimeError("The source backup changed during qualification")
            self.journal["source_backup_unchanged"] = True
            self.save()

    def compiler(self):
        """Compile through the owned MLIR API without using a GPU or a driver."""
        if self.profile == "724":
            image = SDK724
            setup = """python3 /recipes/source_inputs.py verify --lock /recipes/source-lock.json --root /inputs --group sdk --group source --group tool
dpkg --unpack /inputs/sdk/*.deb
dpkg --configure --pending
"""
        else:
            image = DEBIAN
            setup = """(cd /inputs && sha256sum -c /recipes/builder-inputs.sha256)
apt-get -y --no-install-recommends -o Dir::Etc::sourcelist=/dev/null -o Dir::Etc::sourceparts=- install /inputs/builder/*.deb
python3 /recipes/source_inputs.py verify --lock /recipes/source-lock.json --root /inputs
"""
        self.run(
            "compiler",
            image,
            setup + "bash /recipes/build_compiler_probe.sh\n",
            self.mounts(),
            env=("OWNED_PROFILE=" + self.profile,),
        )

    def mounts(self):
        """Map only owned inputs, output, and compiler caches."""
        return [
            (self.remote + "/" + name, target, readonly)
            for name, target, readonly in (
                ("inputs", "/inputs", True),
                ("recipes", "/recipes", True),
                ("work", "/work", False),
                ("prefix", "/opt/owned-deps", False),
                ("runtime", "/runtime", False),
            )
        ]

    def fetch(self):
        """Verify cached inputs and fetch absent files before entering offline mode."""
        script = (
            "python3 /recipes/source_inputs.py fetch --lock /recipes/source-lock.json --root /inputs\n"
            "python3 /recipes/source_inputs.py fetch --lock /recipes/runtime-os-lock.json --root /inputs\n"
        )
        self.run(
            "fetch",
            SDK724,
            script,
            [
                (self.remote + "/inputs", "/inputs", False),
                (self.remote + "/recipes", "/recipes", True),
            ],
            network="bridge",
        )

    def build(self):
        """Build both variants through the same stage runner."""
        if self.profile == "724":
            script = """python3 /recipes/source_inputs.py verify --lock /recipes/source-lock.json --root /inputs --group sdk --group source --group tool --group legacy-kernels
dpkg --unpack /inputs/sdk/*.deb
dpkg --configure --pending
BUILD_JOBS=$BUILD_JOBS nice -n 10 bash /recipes/build_source.sh
rm -rf /runtime/opt/rocm-7.2.4
python3 /recipes/assemble_runtime.py
cp -a /runtime/opt/rocm-7.2.4/share/frigate/. /metadata/
"""
            self.run(
                "source",
                SDK724,
                script,
                self.mounts() + [(self.remote + "/metadata", "/metadata", False)],
            )
            script = """(cd /inputs && sha256sum -c /metadata/binding-inputs.sha256)
apt-get -y --no-install-recommends -o Dir::Etc::sourcelist=/dev/null -o Dir::Etc::sourceparts=- install /inputs/binding/*.deb
ln -s rocm-7.2.4 /opt/rocm
BUILD_JOBS=$BUILD_JOBS nice -n 10 bash /recipes/build_binding.sh
python3 /recipes/source_inputs.py verify --lock /recipes/runtime-os-lock.json --root /inputs
bash /recipes/assemble_os.sh
"""
            mounts = [
                mount
                for mount in self.mounts()
                if mount[1] not in {"/work", "/opt/owned-deps"}
            ]
            mounts += [
                (self.remote + "/binding-work", "/work", False),
                (self.remote + "/metadata", "/metadata", True),
                (self.remote + "/runtime/opt/rocm-7.2.4", "/opt/rocm-7.2.4", False),
            ]
            self.run("binding", DEBIAN, script, mounts)
        else:
            # Minimal Debian has no Python until the verified bootstrap is installed.
            script = """(cd /inputs && sha256sum -c /recipes/builder-inputs.sha256)
apt-get -y --no-install-recommends -o Dir::Etc::sourcelist=/dev/null -o Dir::Etc::sourceparts=- install /inputs/builder/*.deb
python3 /recipes/source_inputs.py verify --lock /recipes/source-lock.json --root /inputs
BUILD_JOBS=$BUILD_JOBS nice -n 10 bash /recipes/build_source.sh
python3 /recipes/assemble_runtime.py
"""
            self.run("source", DEBIAN, script, self.mounts())

    def assemble(self):
        """Layer the runtime onto the common pinned Frigate application."""
        for stage in ("source", "binding") if self.profile == "724" else ("source",):
            result = self.journal["stages"].get(stage, {})
            state = result.get("state", {})
            if (
                not isinstance(state, dict)
                or state.get("Status") != "exited"
                or state.get("ExitCode") != 0
            ):
                raise RuntimeError(f"{stage} must complete before assembly")
            if (
                result.get("runtime_recipe_sha256")
                != self.journal["runtime_recipe_sha256"]
            ):
                raise RuntimeError(
                    "Runtime recipe changed; rerun the build before assembly"
                )
        self.pull(APPLICATION["image"])
        version = "7.2.4" if self.profile == "724" else "10.1.0"
        tag = (
            self.args.tag
            or f"frigate-local:owned-{self.profile}-{APPLICATION['commit'][:7]}"
        )
        arguments = [
            "build",
            "--platform",
            "linux/amd64",
            "--network",
            "none",
            "--progress",
            "plain",
            "--file",
            self.remote + "/Dockerfile",
            "--tag",
            tag,
            "--target",
            "owned" + self.profile,
            "--build-arg",
            "FRIGATE_IMAGE=" + APPLICATION["image"],
            "--build-arg",
            "UPSTREAM_COMMIT=" + APPLICATION["commit"],
            "--build-arg",
            "RUNTIME_DIRECTORY=rocm-" + version,
            "--build-arg",
            "CACHE_NAMESPACE="
            + self.profile
            + "-"
            + self.journal["cache_recipe_sha256"][:16],
            self.remote,
        ]
        allowlist = "printf '%s\\n' '**' '!Dockerfile' '!runtime/' '!runtime/**' '!application/' '!application/**' > "
        self.host(
            ["bash", "-c", allowlist + shlex.quote(self.remote + "/.dockerignore")]
        )
        with (self.directory / f"{self.profile}-assemble.log").open("w") as log:
            self.docker(arguments, stdout=log, stderr=subprocess.STDOUT)
        image = self.json(["image", "inspect", tag])[0]
        self.journal["candidate"] = {
            "id": image["Id"],
            "tag": tag,
            "upstream": APPLICATION["commit"],
            "gpu_qualified": False,
        }
        self.journal["images"].append(
            {"id": image["Id"], "tag": tag, "purpose": "owned candidate"}
        )
        self.save()
        print(json.dumps(self.journal["candidate"]), flush=True)


def main():
    """Keep the public entry point independent of private NAS wrappers."""
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "mode",
        choices=(
            "prepare",
            "fetch",
            "build",
            "compiler",
            "assemble",
            "qualify",
            "all",
            "status",
        ),
    )
    parser.add_argument("--profile", choices=(PROFILE,), default=PROFILE)
    parser.add_argument("--ssh-host")
    parser.add_argument("--socket", default="unix:///var/run/docker.sock")
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--receipts", type=Path, required=True)
    parser.add_argument("--cpuset", default="2-7,10-15")
    parser.add_argument("--jobs", type=int, default=12)
    parser.add_argument("--memory", default="12g")
    parser.add_argument("--tag")
    parser.add_argument("--config-copy", type=Path)
    parser.add_argument(
        "--corpus",
        type=Path,
        help="Optional private JPEG directory for CPU model reference",
    )
    args = parser.parse_args()
    if args.mode == "status":
        path = args.receipts / (args.profile + "-pipeline.json")
        journal = json.loads(path.read_text())
        if (journal["workspace"], journal["ssh_host"]) != (
            args.workspace.rstrip("/"),
            args.ssh_host,
        ):
            raise ValueError("Receipt belongs to a different host or workspace")
        journal["status_note"] = (
            "Last saved receipt; inspect Docker for live container state"
        )
        print(json.dumps(journal, indent=2))
        return
    pipeline = Pipeline(args)
    pipeline.prepare()
    if args.mode in {"fetch", "all"}:
        pipeline.fetch()
    if args.mode in {"build", "all"}:
        pipeline.build()
    if args.mode in {"compiler", "all"}:
        pipeline.compiler()
    if args.mode in {"assemble", "all"}:
        pipeline.assemble()
    if args.mode == "qualify" or (args.mode == "all" and args.config_copy):
        pipeline.qualify()


if __name__ == "__main__":
    main()
