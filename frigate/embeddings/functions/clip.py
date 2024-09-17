"""CLIP Embeddings for Frigate."""

import errno
import logging
import os
from pathlib import Path
from typing import Tuple, Union

import onnxruntime as ort
import requests
from chromadb import EmbeddingFunction, Embeddings
from chromadb.api.types import (
    Documents,
    Images,
    is_document,
    is_image,
)
from onnx_clip import OnnxClip

from frigate.const import MODEL_CACHE_DIR


class Clip(OnnxClip):
    """Override load models to download to cache directory."""

    @staticmethod
    def _load_models(
        model: str,
        silent: bool,
    ) -> Tuple[ort.InferenceSession, ort.InferenceSession]:
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
        providers = []
        options = []

        for provider in ort.get_available_providers():
            if provider == "TensorrtExecutionProvider":
                continue
            elif provider == "OpenVINOExecutionProvider":
                # TODO need to verify openvino works correctly
                os.makedirs("/config/model_cache/openvino/ort", exist_ok=True)
                providers.append(provider)
                options.append(
                    {
                        "cache_dir": "/config/model_cache/openvino/ort",
                        "device_type": "GPU",
                    }
                )
            else:
                providers.append(provider)
                options.append({})

        try:
            if os.path.exists(path):
                return ort.InferenceSession(
                    path, providers=providers, provider_options=options
                )
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
            return ort.InferenceSession(
                path, providers=provider, provider_options=options
            )


class ClipEmbedding(EmbeddingFunction):
    """Embedding function for CLIP model used in Chroma."""

    def __init__(self, model: str = "ViT-B/32"):
        """Initialize CLIP Embedding function."""
        self.model = Clip(model)

    def __call__(self, input: Union[Documents, Images]) -> Embeddings:
        embeddings: Embeddings = []
        for item in input:
            if is_image(item):
                result = self.model.get_image_embeddings([item])
                embeddings.append(result[0, :].tolist())
            elif is_document(item):
                result = self.model.get_text_embeddings([item])
                embeddings.append(result[0, :].tolist())
        return embeddings
