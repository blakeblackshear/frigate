"""CLIP Embeddings for Frigate."""

import errno
import logging
import os
from pathlib import Path
from typing import List, Union

import numpy as np
import onnxruntime as ort
import requests
from onnx_clip import OnnxClip
from PIL import Image

from frigate.const import MODEL_CACHE_DIR


class Clip(OnnxClip):
    """Override load models to download to cache directory."""

    @staticmethod
    def _load_models(
        model: str,
        silent: bool,
    ) -> tuple[ort.InferenceSession, ort.InferenceSession]:
        """
        These models are a part of the container. Treat as as such.
        """
        if model == "ViT-B/32":
            IMAGE_MODEL_FILE = "clip_image_model_vitb32.onnx"
            TEXT_MODEL_FILE = "clip_text_model_vitb32.onnx"
        elif model == "RN50":
            IMAGE_MODEL_FILE = "clip_image_model_rn50.onnx"
            TEXT_MODEL_FILE = "clip_text_model_rn50.onnx"
        else:
            raise ValueError(f"Unexpected model {model}. No `.onnx` file found.")

        models = []
        for model_file in [IMAGE_MODEL_FILE, TEXT_MODEL_FILE]:
            path = os.path.join(MODEL_CACHE_DIR, "clip", model_file)
            models.append(Clip._load_model(path, silent))

        return models[0], models[1]

    @staticmethod
    def _load_model(path: str, silent: bool):
        providers = ["CPUExecutionProvider"]

        try:
            if os.path.exists(path):
                return ort.InferenceSession(path, providers=providers)
            else:
                raise FileNotFoundError(
                    errno.ENOENT,
                    os.strerror(errno.ENOENT),
                    path,
                )
        except Exception:
            s3_url = f"https://lakera-clip.s3.eu-west-1.amazonaws.com/{os.path.basename(path)}"
            if not silent:
                logging.info(
                    f"The model file ({path}) doesn't exist "
                    f"or it is invalid. Downloading it from the public S3 "
                    f"bucket: {s3_url}."  # noqa: E501
                )

            # Download from S3
            # Saving to a temporary file first to avoid corrupting the file
            temporary_filename = Path(path).with_name(os.path.basename(path) + ".part")

            # Create any missing directories in the path
            temporary_filename.parent.mkdir(parents=True, exist_ok=True)

            with requests.get(s3_url, stream=True) as r:
                r.raise_for_status()
                with open(temporary_filename, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
                    f.flush()
            # Finally move the temporary file to the correct location
            temporary_filename.rename(path)
            return ort.InferenceSession(path, providers=providers)


class ClipEmbedding:
    """Embedding function for CLIP model."""

    def __init__(self, model: str = "ViT-B/32"):
        """Initialize CLIP Embedding function."""
        self.model = Clip(model)

    def __call__(self, input: Union[List[str], List[Image.Image]]) -> List[np.ndarray]:
        embeddings = []
        for item in input:
            if isinstance(item, Image.Image):
                result = self.model.get_image_embeddings([item])
                embeddings.append(result[0])
            elif isinstance(item, str):
                result = self.model.get_text_embeddings([item])
                embeddings.append(result[0])
            else:
                raise ValueError(f"Unsupported input type: {type(item)}")
        return embeddings
