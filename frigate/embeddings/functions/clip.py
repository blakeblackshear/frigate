"""CLIP Embeddings for Frigate."""

import os
from typing import Tuple, Union

import onnxruntime as ort
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
            models.append(OnnxClip._load_model(path, silent))

        return models[0], models[1]


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
