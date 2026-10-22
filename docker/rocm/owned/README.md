# Owned ROCm runtime

This branch builds **ROCm 7.2.4** for the Ryzen 7 5700G using the qualified,
pinned AMD source recipe. Frigate is pinned to upstream `91e91c6`.

- `../runtime/`: the selected runtime's build scripts and source lock.
- `../common/`: input verification, OS dependencies, and offline checks.
- This directory: build runner, image assembly, and model qualification tools.
- `../../../frigate/detectors/`: the shared MIGraphX detector adapter.

The matching `rocm-10.1-gfx90c` branch uses the same layout. Compare those branches
to see the actual runtime implementation differences. Full qualification results
and historical write-ups remain on
[jaysqvl/rocm-owned-pipelines](https://github.com/jaysqvl/frigate/tree/jaysqvl/rocm-owned-pipelines/docker/rocm/owned).

GitHub collapses the resolved download/checksum manifests by default; expand them
to inspect every pinned input. For a strictly code-only comparison locally:

```bash
git diff origin/rocm-7.2.4 origin/rocm-10.1-gfx90c -- \
  frigate docker/rocm ':!*.md' ':!*.json' ':!*.sha256'
```

Run from the repository root with a Linux amd64 Docker host:

```bash
python3 docker/rocm/owned/pipeline.py all \
  --ssh-host build-host \
  --workspace /mnt/ssd/frigate-owned \
  --receipts ~/frigate-build-receipts \
  --cpuset 2-7,10-15 --jobs 12 --memory 12g
```

The branch selects its own runtime by default. `--profile 724` is also accepted;
the other runtime is rejected. Acquisition verifies pinned downloads. Build,
compiler, and optional config/database qualification run without GPU devices or
network access. Add `--config-copy /path/to/copied-config` for offline migration
checks. The command does not deploy or restart Frigate.

`application-lock.json` selects the Frigate image and detector patch. The runtime
source lock retains historical application metadata from the original recipe;
that metadata does not select the image. Runtime recipes and image assembly are
unchanged from qualified commit `c01fca2ac`; only their local layout and runner
path selection have changed. Qualified runtime/cache fingerprints are preserved.

CPU tests for the branch layout and build runner:

```bash
python3 -m unittest discover -s docker/rocm/owned -p 'test_*.py'
python3 docker/rocm/common/test_source_inputs.py
python3 docker/rocm/common/test_source_protocol.py
python3 docker/rocm/common/test_source_compatibility.py
```
