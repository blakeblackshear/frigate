"""
Face recognition investigation script.

Standalone replica of Frigate's ArcFace pipeline (see
frigate/data_processing/common/face/model.py and
frigate/embeddings/onnx/face_embedding.py) for analyzing a face collection
outside the running service. Useful for:

  - Diagnosing why a person's collection produces false positives
  - Finding outlier/contaminating training images
  - Inspecting the effect of the shipped vector-wise outlier filter

Layout:
  - Core pipeline: LandmarkAligner, ArcFaceEmbedder, arcface_preprocess,
    similarity_to_confidence, blur_reduction — all mirroring the production
    code exactly
  - Default run: summarize positive and negative sets against a baseline
    trim_mean class representation
  - Optional diagnostics (flags): vector-outlier filter behavior, degenerate
    "tiny crop" embedding clustering, and multi-identity contamination

Usage:
    python3 face_investigate.py \\
        --positive <positive_folder> \\
        --negative <negative_folder> \\
        [--model-cache /path/to/model_cache] \\
        [--vector-outlier] [--degenerate] [--contamination]

The positive folder should contain training images for a single identity
(same layout as FACE_DIR/<name>/*.webp). The negative folder should contain
runtime crops to test against — a mix of true matches and misfires.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from typing import Iterable

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image
from scipy import stats

ARCFACE_INPUT_SIZE = 112


# ---------------------------------------------------------------------------
# Replicated Frigate pipeline
# ---------------------------------------------------------------------------


def _process_image_frigate(image: np.ndarray) -> Image.Image:
    """Mirror BaseEmbedding._process_image for an ndarray input.

    NOTE: Frigate passes the output of `cv2.imread` (BGR) directly in. PIL's
    `Image.fromarray` does NOT reorder channels, so the embedder effectively
    receives a BGR-ordered tensor. We replicate that faithfully here. (Tested
    — swapping to RGB produces near-identical embeddings; this model is
    robust to channel order.)
    """
    return Image.fromarray(image)


def arcface_preprocess(image_bgr: np.ndarray) -> np.ndarray:
    """Mirror ArcfaceEmbedding._preprocess_inputs."""
    pil = _process_image_frigate(image_bgr)

    width, height = pil.size
    if width != ARCFACE_INPUT_SIZE or height != ARCFACE_INPUT_SIZE:
        if width > height:
            new_height = int(((height / width) * ARCFACE_INPUT_SIZE) // 4 * 4)
            pil = pil.resize((ARCFACE_INPUT_SIZE, new_height))
        else:
            new_width = int(((width / height) * ARCFACE_INPUT_SIZE) // 4 * 4)
            pil = pil.resize((new_width, ARCFACE_INPUT_SIZE))

    og = np.array(pil).astype(np.float32)
    og_h, og_w, channels = og.shape

    frame = np.zeros(
        (ARCFACE_INPUT_SIZE, ARCFACE_INPUT_SIZE, channels), dtype=np.float32
    )
    x_center = (ARCFACE_INPUT_SIZE - og_w) // 2
    y_center = (ARCFACE_INPUT_SIZE - og_h) // 2
    frame[y_center : y_center + og_h, x_center : x_center + og_w] = og

    frame = (frame / 127.5) - 1.0
    frame = np.transpose(frame, (2, 0, 1))
    frame = np.expand_dims(frame, axis=0)
    return frame


class LandmarkAligner:
    """Mirror FaceRecognizer.align_face."""

    def __init__(self, landmark_model_path: str):
        if not os.path.exists(landmark_model_path):
            raise FileNotFoundError(landmark_model_path)
        self.detector = cv2.face.createFacemarkLBF()
        self.detector.loadModel(landmark_model_path)

    def align(
        self, image: np.ndarray, out_w: int, out_h: int
    ) -> tuple[np.ndarray, dict]:
        land_image = (
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
        )
        _, lands = self.detector.fit(
            land_image, np.array([(0, 0, land_image.shape[1], land_image.shape[0])])
        )
        landmarks = lands[0][0]

        leftEyePts = landmarks[42:48]
        rightEyePts = landmarks[36:42]
        leftEyeCenter = leftEyePts.mean(axis=0).astype("int")
        rightEyeCenter = rightEyePts.mean(axis=0).astype("int")

        dY = rightEyeCenter[1] - leftEyeCenter[1]
        dX = rightEyeCenter[0] - leftEyeCenter[0]
        angle = np.degrees(np.arctan2(dY, dX)) - 180
        dist = float(np.sqrt((dX**2) + (dY**2)))

        desiredRightEyeX = 1.0 - 0.35
        desiredDist = (desiredRightEyeX - 0.35) * out_w
        scale = desiredDist / dist if dist > 0 else 1.0

        eyesCenter = (
            int((leftEyeCenter[0] + rightEyeCenter[0]) // 2),
            int((leftEyeCenter[1] + rightEyeCenter[1]) // 2),
        )
        M = cv2.getRotationMatrix2D(eyesCenter, angle, scale)
        tX = out_w * 0.5
        tY = out_h * 0.35
        M[0, 2] += tX - eyesCenter[0]
        M[1, 2] += tY - eyesCenter[1]

        aligned = cv2.warpAffine(
            image, M, (out_w, out_h), flags=cv2.INTER_CUBIC
        )
        info = dict(
            angle=float(angle),
            eye_dist_px=dist,
            scale=float(scale),
            landmarks=landmarks,
        )
        return aligned, info


class ArcFaceEmbedder:
    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(
            model_path, providers=["CPUExecutionProvider"]
        )
        self.input_name = self.session.get_inputs()[0].name

    def embed(self, image_bgr: np.ndarray) -> np.ndarray:
        tensor = arcface_preprocess(image_bgr)
        out = self.session.run(None, {self.input_name: tensor})[0]
        return out.squeeze()


def similarity_to_confidence(
    cos_sim: float,
    median: float = 0.3,
    range_width: float = 0.6,
    slope_factor: float = 12,
) -> float:
    slope = slope_factor / range_width
    return float(1.0 / (1.0 + np.exp(-slope * (cos_sim - median))))


def laplacian_variance(image: np.ndarray) -> float:
    return float(cv2.Laplacian(image, cv2.CV_64F).var())


def blur_reduction(variance: float) -> float:
    if variance < 120:
        return 0.06
    elif variance < 160:
        return 0.04
    elif variance < 200:
        return 0.02
    elif variance < 250:
        return 0.01
    return 0.0


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def l2(v: np.ndarray) -> np.ndarray:
    return v / (np.linalg.norm(v) + 1e-9)


# ---------------------------------------------------------------------------
# Sample loading
# ---------------------------------------------------------------------------


@dataclass
class FaceSample:
    path: str
    shape: tuple[int, int]
    embedding: np.ndarray
    blur_var: float
    align_info: dict


def load_folder(
    folder: str, aligner: LandmarkAligner, embedder: ArcFaceEmbedder
) -> list[FaceSample]:
    samples: list[FaceSample] = []
    names = sorted(os.listdir(folder))
    for name in names:
        if name.startswith("."):
            continue
        path = os.path.join(folder, name)
        if not os.path.isfile(path):
            continue
        img = cv2.imread(path)
        if img is None:
            print(f"  [skip unreadable] {name}")
            continue
        aligned, info = aligner.align(img, img.shape[1], img.shape[0])
        emb = embedder.embed(aligned)
        samples.append(
            FaceSample(
                path=path,
                shape=(img.shape[1], img.shape[0]),
                embedding=emb,
                blur_var=laplacian_variance(img),
                align_info=info,
            )
        )
    return samples


def trimmed_mean(embs: Iterable[np.ndarray], trim: float = 0.15) -> np.ndarray:
    arr = np.stack(list(embs), axis=0)
    return stats.trim_mean(arr, trim, axis=0)


# ---------------------------------------------------------------------------
# Baseline analyses (always run)
# ---------------------------------------------------------------------------


def summarize_positive(samples: list[FaceSample], mean_emb: np.ndarray) -> None:
    """Summary of training set: per-sample cos to class mean, intra-class stats.

    Outliers with cos far below the rest are likely degrading the mean —
    they'd be the first candidates the shipped vector-outlier filter drops.
    """
    print("\n" + "=" * 78)
    print(f"POSITIVE SET ANALYSIS  ({len(samples)} images)")
    print("=" * 78)

    rows = []
    for s in samples:
        cs = cosine(s.embedding, mean_emb)
        conf = similarity_to_confidence(cs)
        red = blur_reduction(s.blur_var)
        rows.append(
            dict(
                name=os.path.basename(s.path),
                shape=f"{s.shape[0]}x{s.shape[1]}",
                eye_px=s.align_info["eye_dist_px"],
                angle=s.align_info["angle"] + 180,
                blur=s.blur_var,
                cos=cs,
                conf=conf,
                red=red,
                adj_conf=max(0.0, conf - red),
            )
        )

    rows.sort(key=lambda r: r["cos"])
    sims = np.array([r["cos"] for r in rows])
    print(
        f"\nCosine-to-trimmed-mean: mean={sims.mean():.3f} std={sims.std():.3f} "
        f"min={sims.min():.3f} max={sims.max():.3f}"
    )

    print("\n-- Worst matches (bottom 10, most likely hurting the mean) --")
    print(
        f"{'cos':>6}  {'conf':>6}  {'blur':>7}  {'eyes':>6}  "
        f"{'angle':>6}  {'shape':>9}  name"
    )
    for r in rows[:10]:
        print(
            f"{r['cos']:6.3f}  {r['conf']:6.3f}  {r['blur']:7.1f}  "
            f"{r['eye_px']:6.1f}  {r['angle']:6.1f}  {r['shape']:>9}  {r['name']}"
        )

    print("\n-- Best matches (top 5) --")
    for r in rows[-5:][::-1]:
        print(
            f"{r['cos']:6.3f}  {r['conf']:6.3f}  {r['blur']:7.1f}  "
            f"{r['eye_px']:6.1f}  {r['angle']:6.1f}  {r['shape']:>9}  {r['name']}"
        )

    # Pairwise analysis — flags embeddings poorly correlated with the rest
    print("\n-- Pairwise intra-class similarity (mean cos vs. other positives) --")
    embs = np.stack([s.embedding for s in samples], axis=0)
    norms = embs / (np.linalg.norm(embs, axis=1, keepdims=True) + 1e-9)
    sim_matrix = norms @ norms.T
    np.fill_diagonal(sim_matrix, np.nan)
    mean_pairwise = np.nanmean(sim_matrix, axis=1)
    names = [os.path.basename(s.path) for s in samples]
    ordered = sorted(zip(names, mean_pairwise), key=lambda t: t[1])
    print(f"{'mean_cos':>9}  name")
    for nm, mp in ordered[:10]:
        print(f"{mp:9.3f}  {nm}")
    print(f"\n  overall mean pairwise cos: {np.nanmean(sim_matrix):.3f}")
    print(f"  median pairwise cos:       {np.nanmedian(sim_matrix):.3f}")


def summarize_negative(
    neg_samples: list[FaceSample],
    mean_emb: np.ndarray,
    pos_samples: list[FaceSample],
) -> None:
    """Score each negative against the class mean, then show its top-3
    nearest positives. High-scoring negatives that match specific outlier
    positives hint at training-set contamination.
    """
    print("\n" + "=" * 78)
    print(f"NEGATIVE SET ANALYSIS  ({len(neg_samples)} images)")
    print("=" * 78)
    print(
        f"\n{'cos':>6}  {'conf':>6}  {'red':>5}  {'adj':>5}  "
        f"{'blur':>7}  {'eyes':>6}  {'shape':>9}  name"
    )
    for s in neg_samples:
        cs = cosine(s.embedding, mean_emb)
        conf = similarity_to_confidence(cs)
        red = blur_reduction(s.blur_var)
        print(
            f"{cs:6.3f}  {conf:6.3f}  {red:5.2f}  {max(0, conf - red):5.2f}  "
            f"{s.blur_var:7.1f}  {s.align_info['eye_dist_px']:6.1f}  "
            f"{s.shape[0]}x{s.shape[1]:<5}  {os.path.basename(s.path)}"
        )

    print("\n-- For each negative, top-3 most similar positives --")
    pos_embs = np.stack([p.embedding for p in pos_samples])
    pos_norm = pos_embs / (np.linalg.norm(pos_embs, axis=1, keepdims=True) + 1e-9)
    for s in neg_samples:
        v = s.embedding / (np.linalg.norm(s.embedding) + 1e-9)
        sims = pos_norm @ v
        idx = np.argsort(-sims)[:3]
        print(f"\n  {os.path.basename(s.path)}:")
        for i in idx:
            print(
                f"    {sims[i]:6.3f}  {os.path.basename(pos_samples[i].path)}  "
                f"blur={pos_samples[i].blur_var:.1f} "
                f"eyes={pos_samples[i].align_info['eye_dist_px']:.1f}"
            )


# ---------------------------------------------------------------------------
# Optional diagnostics
# ---------------------------------------------------------------------------


def vector_outlier_test(
    pos: list[FaceSample], neg: list[FaceSample], base_trim: float = 0.15
) -> None:
    """Measure the shipped vector-wise outlier filter at various thresholds.

    The production filter at `build_class_mean` in
    frigate/data_processing/common/face/model.py uses T=0.30. This test
    sweeps T so you can see which images would be dropped on a new collection
    and how that affects the negative scores.

    Algorithm: iteratively recompute trim_mean on the kept set, drop any
    embedding with cos < T to that mean, repeat until converged. Floor at
    50% of the collection to avoid collapse.
    """
    print("\n" + "=" * 78)
    print("VECTOR-WISE OUTLIER PRE-FILTER — layered on trim_mean(0.15)")
    print("=" * 78)

    all_embs = np.stack([s.embedding for s in pos])

    def iterative_mean(
        embs: np.ndarray,
        threshold: float,
        iters: int = 3,
        min_keep_frac: float = 0.5,
    ) -> tuple[np.ndarray, np.ndarray]:
        keep = np.ones(len(embs), dtype=bool)
        floor = max(5, int(np.ceil(min_keep_frac * len(embs))))
        for _ in range(iters):
            m = stats.trim_mean(embs[keep], base_trim, axis=0)
            m_norm = m / (np.linalg.norm(m) + 1e-9)
            e_norms = embs / (np.linalg.norm(embs, axis=1, keepdims=True) + 1e-9)
            cos_to_mean = e_norms @ m_norm
            new_keep = cos_to_mean >= threshold
            if new_keep.sum() < floor:
                top_idx = np.argsort(-cos_to_mean)[:floor]
                new_keep = np.zeros_like(new_keep)
                new_keep[top_idx] = True
            if np.array_equal(new_keep, keep):
                break
            keep = new_keep
        final = stats.trim_mean(embs[keep], base_trim, axis=0)
        return final, keep

    provisional = stats.trim_mean(all_embs, base_trim, axis=0)
    p_norm = provisional / (np.linalg.norm(provisional) + 1e-9)
    e_norms_all = all_embs / (np.linalg.norm(all_embs, axis=1, keepdims=True) + 1e-9)
    cos_to_prov = e_norms_all @ p_norm
    print("\nDistribution of cos(positive, provisional trim_mean):")
    print(
        f"  min={cos_to_prov.min():.3f}  p10={np.percentile(cos_to_prov, 10):.3f}  "
        f"p25={np.percentile(cos_to_prov, 25):.3f}  "
        f"median={np.median(cos_to_prov):.3f}  "
        f"p75={np.percentile(cos_to_prov, 75):.3f}  max={cos_to_prov.max():.3f}"
    )

    baseline_mean = stats.trim_mean(all_embs, base_trim, axis=0)
    baseline_pos = np.array([cosine(p.embedding, baseline_mean) for p in pos])
    baseline_neg = (
        np.array([cosine(n.embedding, baseline_mean) for n in neg])
        if neg
        else np.array([])
    )
    baseline_conf_neg = np.array(
        [similarity_to_confidence(c) for c in baseline_neg]
    )

    print(
        f"\nBaseline (trim_mean only, {len(pos)} images):"
        f"\n  pos cos  min={baseline_pos.min():.3f} "
        f"mean={baseline_pos.mean():.3f} max={baseline_pos.max():.3f}"
    )
    if len(neg):
        print(
            f"  neg cos  min={baseline_neg.min():.3f} "
            f"mean={baseline_neg.mean():.3f} max={baseline_neg.max():.3f}"
        )
        print(
            f"  neg conf min={baseline_conf_neg.min():.3f} "
            f"mean={baseline_conf_neg.mean():.3f} max={baseline_conf_neg.max():.3f}"
        )
        print(
            f"  margin (pos.min - neg.max): "
            f"{baseline_pos.min() - baseline_neg.max():+.3f}"
        )

    print("\nIterative (refine mean → drop vectors with cos<T → repeat):")
    print(
        f"\n{'T':>5}  {'kept':>6}  {'pos min':>7}  {'pos mean':>8}  "
        f"{'neg max':>7}  {'neg mean':>8}  {'neg conf.max':>12}  {'margin':>7}"
    )
    for T in [0.15, 0.20, 0.25, 0.28, 0.30, 0.33, 0.36, 0.40]:
        mean, keep = iterative_mean(all_embs, T)
        pos_sims = np.array([cosine(p.embedding, mean) for p in pos])
        neg_sims = (
            np.array([cosine(n.embedding, mean) for n in neg])
            if neg
            else np.array([])
        )
        neg_conf = np.array([similarity_to_confidence(c) for c in neg_sims])
        margin = pos_sims.min() - (neg_sims.max() if len(neg_sims) else 0)
        print(
            f"{T:5.2f}  {int(keep.sum()):>3}/{len(pos):<2}  "
            f"{pos_sims.min():7.3f}  {pos_sims.mean():8.3f}  "
            f"{neg_sims.max() if len(neg_sims) else float('nan'):7.3f}  "
            f"{neg_sims.mean() if len(neg_sims) else float('nan'):8.3f}  "
            f"{neg_conf.max() if len(neg_conf) else float('nan'):12.3f}  "
            f"{margin:+7.3f}"
        )

    # Show which images get dropped at the shipped threshold + neighbors
    for T_show in (0.25, 0.30, 0.33):
        _, keep = iterative_mean(all_embs, T_show)
        print(
            f"\nAt T={T_show}, the {int((~keep).sum())} dropped positives are:"
        )
        final_mean = stats.trim_mean(all_embs[keep], base_trim, axis=0)
        m_n = final_mean / (np.linalg.norm(final_mean) + 1e-9)
        for i, (p, k) in enumerate(zip(pos, keep)):
            if not k:
                e_n = p.embedding / (np.linalg.norm(p.embedding) + 1e-9)
                cos_final = float(e_n @ m_n)
                print(
                    f"  cos_to_clean_mean={cos_final:6.3f}  "
                    f"shape={p.shape[0]}x{p.shape[1]}  "
                    f"eyes={p.align_info['eye_dist_px']:6.1f}  "
                    f"blur={p.blur_var:7.1f}  "
                    f"{os.path.basename(p.path)}"
                )


def degenerate_embedding_test(
    pos: list[FaceSample], neg: list[FaceSample]
) -> None:
    """Detect whether negatives and low-quality positives share a degenerate
    'tiny/noisy face' region of the embedding space.

    Signal: if neg-to-neg cos is higher than pos-to-pos cos, the negatives
    aren't really per-identity embeddings — they're dominated by upsample /
    low-resolution artifacts that all map to a similar corner of embedding
    space regardless of who the face belongs to.

    Also rebuilds the mean using only high-intra-similarity positives to
    show whether a cleaner training set separates the negatives.
    """
    print("\n" + "=" * 78)
    print("DEGENERATE-EMBEDDING TEST")
    print("=" * 78)

    pos_embs = np.stack([l2(s.embedding) for s in pos])
    neg_embs = np.stack([l2(s.embedding) for s in neg])

    nn = neg_embs @ neg_embs.T
    np.fill_diagonal(nn, np.nan)
    pp = pos_embs @ pos_embs.T
    np.fill_diagonal(pp, np.nan)
    pn = pos_embs @ neg_embs.T

    print(
        f"\n  neg<->neg mean cos : {np.nanmean(nn):.3f}   "
        f"(how tightly negatives cluster together)"
    )
    print(
        f"  pos<->pos mean cos : {np.nanmean(pp):.3f}   "
        f"(how tightly positives cluster)"
    )
    print(
        f"  pos<->neg mean cos : {pn.mean():.3f}   "
        f"(cross-class — should be low for a clean class)"
    )
    if np.nanmean(nn) > np.nanmean(pp):
        print(
            "\n  >> neg<->neg > pos<->pos: negatives cluster more tightly than\n"
            "     positives. This is the degenerate-embedding signature —\n"
            "     upsampled tiny crops share a common 'face-like blob' region\n"
            "     regardless of identity."
        )

    mean_intra = np.nanmean(pp, axis=1)
    for thresh in (0.30, 0.33, 0.36):
        keep = mean_intra >= thresh
        if keep.sum() < 5:
            continue
        clean_embs = [pos[i].embedding for i in range(len(pos)) if keep[i]]
        clean_mean = stats.trim_mean(np.stack(clean_embs), 0.15, axis=0)
        neg_scores = np.array([cosine(n.embedding, clean_mean) for n in neg])
        neg_confs = np.array([similarity_to_confidence(c) for c in neg_scores])
        pos_scores = np.array(
            [
                cosine(pos[i].embedding, clean_mean)
                for i in range(len(pos))
                if keep[i]
            ]
        )
        print(
            f"\n  mean_intra >= {thresh}: keeping {int(keep.sum())}/{len(pos)} positives"
        )
        print(
            f"    pos cos vs mean   : min={pos_scores.min():.3f} "
            f"mean={pos_scores.mean():.3f} max={pos_scores.max():.3f}"
        )
        print(
            f"    neg cos vs mean   : min={neg_scores.min():.3f} "
            f"mean={neg_scores.mean():.3f} max={neg_scores.max():.3f}"
        )
        print(
            f"    neg conf          : min={neg_confs.min():.3f} "
            f"mean={neg_confs.mean():.3f} max={neg_confs.max():.3f}"
        )
        print(
            f"    margin (pos.min - neg.max): "
            f"{pos_scores.min() - neg_scores.max():+.3f}"
        )


def contamination_analysis(
    pos: list[FaceSample], neg: list[FaceSample]
) -> None:
    """Check whether the positive collection contains a second identity.

    Two signals:
      (a) Per-positive: if an image is closer to at least one negative than
          to the rest of the positive class, it's likely a mislabeled face.
      (b) 2-means split of the positive embeddings: if one cluster center
          lands close to the negative mean, that cluster is a contaminating
          sub-identity that's pulling the class mean toward the negatives.
    """
    print("\n" + "=" * 78)
    print("CONTAMINATION ANALYSIS")
    print("=" * 78)

    pos_embs = np.stack([l2(s.embedding) for s in pos])
    neg_embs = np.stack([l2(s.embedding) for s in neg])
    pos_names = [os.path.basename(s.path) for s in pos]

    pos_pos = pos_embs @ pos_embs.T
    np.fill_diagonal(pos_pos, np.nan)
    pos_neg = pos_embs @ neg_embs.T

    mean_intra = np.nanmean(pos_pos, axis=1)
    max_to_neg = pos_neg.max(axis=1)
    mean_to_neg = pos_neg.mean(axis=1)

    print(
        "\nPositives closer to a negative than to their own class avg"
        "\n(these are candidates for mislabeled images):"
    )
    print(
        f"\n{'max_neg':>7}  {'mean_neg':>8}  {'mean_intra':>10}  "
        f"{'delta':>6}  name"
    )
    rows = list(zip(pos_names, max_to_neg, mean_to_neg, mean_intra))
    rows.sort(key=lambda r: -(r[1] - r[3]))
    for nm, mxn, mnn, mi in rows[:15]:
        delta = mxn - mi
        marker = "  <<" if delta > 0 else ""
        print(f"{mxn:7.3f}  {mnn:8.3f}  {mi:10.3f}  {delta:6.3f}  {nm}{marker}")

    # 2-means in cosine space (no sklearn dependency).
    print("\n2-means split of positive embeddings (cosine space):")
    rng = np.random.default_rng(0)
    best = None
    for _ in range(5):
        idx = rng.choice(len(pos_embs), 2, replace=False)
        centers = pos_embs[idx].copy()
        for _ in range(50):
            sims = pos_embs @ centers.T
            labels = np.argmax(sims, axis=1)
            new_centers = np.stack(
                [
                    l2(pos_embs[labels == k].mean(axis=0))
                    if np.any(labels == k)
                    else centers[k]
                    for k in range(2)
                ]
            )
            if np.allclose(new_centers, centers):
                break
            centers = new_centers
        tight = float(np.mean([sims[i, labels[i]] for i in range(len(labels))]))
        if best is None or tight > best[0]:
            best = (tight, labels.copy(), centers.copy())

    _, labels, centers = best
    sizes = [int((labels == k).sum()) for k in range(2)]
    neg_mean = l2(neg_embs.mean(axis=0))
    print(
        f"  cluster 0: size={sizes[0]:>2}  "
        f"center<->other_center_cos={float(centers[0] @ centers[1]):.3f}  "
        f"center<->neg_mean_cos={float(centers[0] @ neg_mean):.3f}"
    )
    print(
        f"  cluster 1: size={sizes[1]:>2}  "
        f"center<->neg_mean_cos={float(centers[1] @ neg_mean):.3f}"
    )

    neg_aligned = 0 if centers[0] @ neg_mean > centers[1] @ neg_mean else 1
    print(
        f"\n  cluster {neg_aligned} is more similar to the negatives — "
        f"its members are the contamination candidates:"
    )
    for i, lbl in enumerate(labels):
        if lbl == neg_aligned:
            print(
                f"    max_to_neg={max_to_neg[i]:.3f}  "
                f"mean_intra={mean_intra[i]:.3f}  {pos_names[i]}"
            )

    keep_mask = labels != neg_aligned
    if keep_mask.sum() >= 3:
        clean_embs = [pos[i].embedding for i in range(len(pos)) if keep_mask[i]]
        clean_mean = stats.trim_mean(np.stack(clean_embs), 0.15, axis=0)
        print(
            f"\n  Rebuilding class mean from the OTHER cluster "
            f"({keep_mask.sum()} images):"
        )
        print(f"  {'cos':>6}  {'conf':>6}  name")
        for n in neg:
            cs = cosine(n.embedding, clean_mean)
            cf = similarity_to_confidence(cs)
            print(f"  {cs:6.3f}  {cf:6.3f}  {os.path.basename(n.path)}")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Analyze a face recognition collection outside Frigate.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("--positive", required=True, help="Training folder for one identity")
    ap.add_argument(
        "--negative",
        default=None,
        help="Runtime-crop folder to score against (optional)",
    )
    ap.add_argument(
        "--model-cache",
        default="/config/model_cache",
        help="Directory containing facedet/arcface.onnx and facedet/landmarkdet.yaml",
    )
    ap.add_argument(
        "--trim",
        type=float,
        default=0.15,
        help="trim_mean proportion (Frigate uses 0.15)",
    )
    ap.add_argument(
        "--vector-outlier",
        action="store_true",
        help="Sweep the vector-wise outlier filter threshold",
    )
    ap.add_argument(
        "--degenerate",
        action="store_true",
        help="Test whether negatives share a degenerate embedding region",
    )
    ap.add_argument(
        "--contamination",
        action="store_true",
        help="Check whether the positive folder contains a second identity",
    )
    args = ap.parse_args()

    arcface_path = os.path.join(args.model_cache, "facedet", "arcface.onnx")
    landmark_path = os.path.join(args.model_cache, "facedet", "landmarkdet.yaml")
    for p in (arcface_path, landmark_path):
        if not os.path.exists(p):
            print(f"ERROR: model file not found: {p}")
            return 1

    print(f"Loading ArcFace from {arcface_path}")
    embedder = ArcFaceEmbedder(arcface_path)
    print(f"Loading landmark model from {landmark_path}")
    aligner = LandmarkAligner(landmark_path)

    print(f"\nLoading positives from {args.positive} ...")
    pos = load_folder(args.positive, aligner, embedder)
    print(f"  {len(pos)} positives loaded")

    neg: list[FaceSample] = []
    if args.negative:
        print(f"\nLoading negatives from {args.negative} ...")
        neg = load_folder(args.negative, aligner, embedder)
        print(f"  {len(neg)} negatives loaded")

    if not pos:
        print("no positive samples — aborting")
        return 1

    mean_emb = trimmed_mean([s.embedding for s in pos], trim=args.trim)
    summarize_positive(pos, mean_emb)
    if neg:
        summarize_negative(neg, mean_emb, pos)

    if args.vector_outlier:
        vector_outlier_test(pos, neg, args.trim)
    if args.degenerate and neg:
        degenerate_embedding_test(pos, neg)
    if args.contamination and neg:
        contamination_analysis(pos, neg)

    return 0


if __name__ == "__main__":
    sys.exit(main())
