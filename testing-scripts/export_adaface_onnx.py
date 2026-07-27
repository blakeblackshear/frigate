"""Export AdaFace pretrained backbones to ONNX for Frigate face recognition.

AdaFace (Kim et al., CVPR 2022, arXiv:2204.00964) is a quality-adaptive margin
face recognition model. At inference time it is a vanilla ResNet-IR backbone
that produces a 512-d L2-normalized embedding from a 112x112 BGR input
normalized to [-1, 1]. This makes it a drop-in replacement for the ArcFace
embedder Frigate already ships.

This script downloads the official PyTorch checkpoints from the AdaFace GitHub
release, loads each backbone, wraps it so the forward pass returns only the
L2-normalized embedding (dropping the unused norm output), and exports it to
ONNX with a dynamic batch axis. The resulting .onnx files are verified against
the PyTorch model outputs before being written to disk.

Pretrained weights are MIT-licensed (Copyright (c) 2022 Minchul Kim).

Usage:
    python3 export_adaface_onnx.py --output-dir /tmp/adaface-onnx

The exported files (adaface_r18.onnx, adaface_r50.onnx) should be uploaded to a
GitHub release and referenced from AdaFaceEmbedding.download_urls in
frigate/embeddings/onnx/face_embedding.py.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

REPO_ROOT = Path(__file__).resolve().parent
PRETRAINED_DIR = REPO_ROOT / "pretrained"

CHECKPOINTS = {
    "ir_18": {
        "file": "adaface_ir18_webface4m.ckpt",
        "gdrive_id": "1J17_QW1Oq00EhSWObISnhWEYr2NNrg2y",
        "onnx_name": "adaface_r18.onnx",
    },
    "ir_50": {
        "file": "adaface_ir50_webface4m.ckpt",
        "gdrive_id": "1BmDRrhPsHSbXcWZoYFPJg2KJn1sd3QpN",
        "onnx_name": "adaface_r50.onnx",
    },
}


def download_checkpoint(gdrive_id: str, dest: Path) -> None:
    """Download a checkpoint from Google Drive via gdown."""
    if dest.exists():
        print(f"Checkpoint already present: {dest}")
        return
    import gdown

    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {gdrive_id} -> {dest}")
    gdown.download(id=gdrive_id, str=str(dest), quiet=False)


def load_adaface_net(arch: str, ckpt_path: Path):
    """Load the AdaFace backbone from a checkpoint.

    Returns the model in eval mode. The model's forward returns
    (output, norm) where output is already L2-normalized.
    """
    sys.path.insert(0, str(REPO_ROOT / "AdaFace"))
    import net as adaface_net

    model = adaface_net.build_model(arch)
    state = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    model_state = {
        key[6:]: val
        for key, val in state["state_dict"].items()
        if key.startswith("model.")
    }
    model.load_state_dict(model_state)
    model.eval()
    return model


class AdaFaceEmbeddingOnly(torch.nn.Module):
    """Wrapper that returns only the L2-normalized embedding.

    The original Backbone.forward returns (output, norm). Frigate only needs
    the embedding, so we wrap it to drop the norm. This also gives ONNX export
    a single output tensor. The Dropout(0.4) in the backbone's output_layer is
    replaced with Identity so the legacy TorchScript tracer does not embed
    stochastic masking into the graph.
    """

    def __init__(self, backbone: torch.nn.Module) -> None:
        super().__init__()
        for module in backbone.modules():
            if isinstance(module, torch.nn.Dropout):
                module.p = 0.0
        self.backbone = backbone

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        output, _norm = self.backbone(x)
        return output


def export_to_onnx(
    model: torch.nn.Module,
    onnx_path: Path,
    input_name: str = "data",
) -> None:
    """Export the wrapped model to ONNX with a dynamic batch axis.

    Uses the legacy (TorchScript-based) exporter via dynamo=False so all
    weights are embedded in a single .onnx file. The newer Dynamo exporter
    (default in torch>=2.10) externalizes weights to a separate .onnx.data
    file, which Frigate's ModelDownloader is not set up to fetch.

    The input name is set to ``data`` to match the convention used by
    Frigate's existing ArcFace ONNX model, so the BaseEmbedding.__call__
    key-matching logic works without modification.
    """
    dummy = torch.randn(1, 3, 112, 112, dtype=torch.float32)
    onnx_path.parent.mkdir(parents=True, exist_ok=True)

    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=[input_name],
        output_names=["embedding"],
        dynamic_axes={input_name: {0: "batch"}, "embedding": {0: "batch"}},
        dynamo=False,
    )
    print(f"Exported: {onnx_path} ({onnx_path.stat().st_size / 1e6:.1f} MB)")


def verify_onnx(
    torch_model: torch.nn.Module,
    onnx_path: Path,
    input_name: str = "data",
) -> None:
    """Verify the ONNX model produces outputs matching PyTorch within tolerance."""
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_meta = session.get_inputs()[0]
    actual_input_name = input_meta.name

    rng = np.random.RandomState(42)
    test_input = rng.randn(3, 3, 112, 112).astype(np.float32)
    torch_tensor = torch.from_numpy(test_input)

    torch_model.eval()
    with torch.no_grad():
        torch_output = torch_model(torch_tensor).numpy()

    ort_output = session.run(None, {actual_input_name: test_input})[0]

    max_diff = np.max(np.abs(torch_output - ort_output))
    cos_sim = np.mean(
        np.sum(torch_output * ort_output, axis=1)
        / (np.linalg.norm(torch_output, axis=1) * np.linalg.norm(ort_output, axis=1))
    )
    print(
        f"Verify {onnx_path.name}: max_abs_diff={max_diff:.6f}, "
        f"mean_cos_sim={cos_sim:.8f}"
    )
    assert max_diff < 1e-4, f"ONNX output diverges from PyTorch (max_diff={max_diff})"

    norms = np.linalg.norm(ort_output, axis=1)
    assert np.allclose(norms, 1.0, atol=1e-5), (
        f"ONNX embeddings are not L2-normalized: norms={norms}"
    )
    print(f"  OK: outputs match, embeddings L2-normalized (dims={ort_output.shape[1]})")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("/tmp/adaface-onnx"),
        help="Directory to write the exported .onnx files",
    )
    parser.add_argument(
        "--arch",
        choices=["ir_18", "ir_50", "all"],
        default="all",
        help="Which backbone to export",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Skip checkpoint download (assume they are already in ./pretrained)",
    )
    args = parser.parse_args()

    archs = ["ir_18", "ir_50"] if args.arch == "all" else [args.arch]

    for arch in archs:
        meta = CHECKPOINTS[arch]
        ckpt_path = PRETRAINED_DIR / meta["file"]
        onnx_path = args.output_dir / meta["onnx_name"]

        if not args.skip_download:
            download_checkpoint(meta["gdrive_id"], ckpt_path)
        elif not ckpt_path.exists():
            print(
                f"ERROR: {ckpt_path} not found (use --skip-download only after manual placement)"
            )
            return 1

        print(f"\n=== Exporting {arch} -> {onnx_path.name} ===")
        backbone = load_adaface_net(arch, ckpt_path)
        wrapped = AdaFaceEmbeddingOnly(backbone)
        export_to_onnx(wrapped, onnx_path)
        verify_onnx(wrapped, onnx_path)

    print("\nDone. Upload the .onnx files to a GitHub release and wire the URLs")
    print("into AdaFaceEmbedding.download_urls in")
    print("frigate/embeddings/onnx/face_embedding.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
