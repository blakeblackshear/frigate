import logging
import os
from typing import List, Optional, Union

import numpy as np
import onnxruntime as ort
from onnx_clip import OnnxClip, Preprocessor, Tokenizer
from PIL import Image

from frigate.const import MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader

logger = logging.getLogger(__name__)


class Clip(OnnxClip):
    """Override load models to use pre-downloaded models from cache directory."""

    def __init__(
        self,
        model: str = "ViT-B/32",
        batch_size: Optional[int] = None,
        providers: List[str] = ["CPUExecutionProvider"],
    ):
        """
        Instantiates the model and required encoding classes.

        Args:
            model: The model to utilize. Currently ViT-B/32 and RN50 are
                allowed.
            batch_size: If set, splits the lists in `get_image_embeddings`
                and `get_text_embeddings` into batches of this size before
                passing them to the model. The embeddings are then concatenated
                back together before being returned. This is necessary when
                passing large amounts of data (perhaps ~100 or more).
        """
        allowed_models = ["ViT-B/32", "RN50"]
        if model not in allowed_models:
            raise ValueError(f"`model` must be in {allowed_models}. Got {model}.")
        if model == "ViT-B/32":
            self.embedding_size = 512
        elif model == "RN50":
            self.embedding_size = 1024
        self.image_model, self.text_model = self._load_models(model, providers)
        self._tokenizer = Tokenizer()
        self._preprocessor = Preprocessor()
        self._batch_size = batch_size

    @staticmethod
    def _load_models(
        model: str,
        providers: List[str],
    ) -> tuple[ort.InferenceSession, ort.InferenceSession]:
        """
        Load models from cache directory.
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
            models.append(Clip._load_model(path, providers))

        return models[0], models[1]

    @staticmethod
    def _load_model(path: str, providers: List[str]):
        if os.path.exists(path):
            return ort.InferenceSession(path, providers=providers)
        else:
            logger.warning(f"CLIP model file {path} not found.")
            return None


class ClipEmbedding:
    """Embedding function for CLIP model."""

    def __init__(
        self,
        model: str = "ViT-B/32",
        silent: bool = False,
        preferred_providers: List[str] = ["CPUExecutionProvider"],
    ):
        self.model_name = model
        self.silent = silent
        self.preferred_providers = preferred_providers
        self.model_files = self._get_model_files()
        self.model = None

        self.downloader = ModelDownloader(
            model_name="clip",
            download_path=os.path.join(MODEL_CACHE_DIR, "clip"),
            file_names=self.model_files,
            download_func=self._download_model,
            silent=self.silent,
        )
        self.downloader.ensure_model_files()

    def _get_model_files(self):
        if self.model_name == "ViT-B/32":
            return ["clip_image_model_vitb32.onnx", "clip_text_model_vitb32.onnx"]
        elif self.model_name == "RN50":
            return ["clip_image_model_rn50.onnx", "clip_text_model_rn50.onnx"]
        else:
            raise ValueError(
                f"Unexpected model {self.model_name}. No `.onnx` file found."
            )

    def _download_model(self, path: str):
        s3_url = (
            f"https://lakera-clip.s3.eu-west-1.amazonaws.com/{os.path.basename(path)}"
        )
        try:
            ModelDownloader.download_from_url(s3_url, path, self.silent)
            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.model_name}-{os.path.basename(path)}",
                    "state": ModelStatusTypesEnum.downloaded,
                },
            )
        except Exception:
            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.model_name}-{os.path.basename(path)}",
                    "state": ModelStatusTypesEnum.error,
                },
            )

    def _load_model(self):
        if self.model is None:
            self.downloader.wait_for_download()
            self.model = Clip(self.model_name, providers=self.preferred_providers)

    def __call__(self, input: Union[List[str], List[Image.Image]]) -> List[np.ndarray]:
        self._load_model()
        if (
            self.model is None
            or self.model.image_model is None
            or self.model.text_model is None
        ):
            logger.info(
                "CLIP model is not fully loaded. Please wait for the download to complete."
            )
            return []

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
