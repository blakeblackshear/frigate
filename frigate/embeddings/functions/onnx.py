import logging
import os
import warnings
from enum import Enum
from io import BytesIO
from typing import Dict, List, Optional, Union

import numpy as np
import requests
from PIL import Image

# importing this without pytorch or others causes a warning
# https://github.com/huggingface/transformers/issues/27214
# suppressed by setting env TRANSFORMERS_NO_ADVISORY_WARNINGS=1
from transformers import AutoFeatureExtractor, AutoTokenizer
from transformers.utils.logging import disable_progress_bar

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader
from frigate.util.model import ONNXModelRunner

warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message="The class CLIPFeatureExtractor is deprecated",
)

# disables the progress bar for downloading tokenizers and feature extractors
disable_progress_bar()
logger = logging.getLogger(__name__)

FACE_EMBEDDING_SIZE = 160


class ModelTypeEnum(str, Enum):
    face = "face"
    vision = "vision"
    text = "text"
    alpr_detect = "alpr_detect"
    alpr_classify = "alpr_classify"
    alpr_recognize = "alpr_recognize"


class GenericONNXEmbedding:
    """Generic embedding function for ONNX models (text and vision)."""

    def __init__(
        self,
        model_name: str,
        model_file: str,
        download_urls: Dict[str, str],
        model_size: str,
        model_type: ModelTypeEnum,
        requestor: InterProcessRequestor,
        tokenizer_file: Optional[str] = None,
        device: str = "AUTO",
    ):
        self.model_name = model_name
        self.model_file = model_file
        self.tokenizer_file = tokenizer_file
        self.requestor = requestor
        self.download_urls = download_urls
        self.model_type = model_type
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.tokenizer = None
        self.feature_extractor = None
        self.runner = None
        files_names = list(self.download_urls.keys()) + (
            [self.tokenizer_file] if self.tokenizer_file else []
        )

        if not all(
            os.path.exists(os.path.join(self.download_path, n)) for n in files_names
        ):
            logger.debug(f"starting model download for {self.model_name}")
            self.downloader = ModelDownloader(
                model_name=self.model_name,
                download_path=self.download_path,
                file_names=files_names,
                download_func=self._download_model,
            )
            self.downloader.ensure_model_files()
        else:
            self.downloader = None
            ModelDownloader.mark_files_state(
                self.requestor,
                self.model_name,
                files_names,
                ModelStatusTypesEnum.downloaded,
            )
            self._load_model_and_utils()
            logger.debug(f"models are already downloaded for {self.model_name}")

    def _download_model(self, path: str):
        try:
            file_name = os.path.basename(path)

            if file_name in self.download_urls:
                ModelDownloader.download_from_url(self.download_urls[file_name], path)
            elif (
                file_name == self.tokenizer_file
                and self.model_type == ModelTypeEnum.text
            ):
                if not os.path.exists(path + "/" + self.model_name):
                    logger.info(f"Downloading {self.model_name} tokenizer")

                tokenizer = AutoTokenizer.from_pretrained(
                    self.model_name,
                    trust_remote_code=True,
                    cache_dir=f"{MODEL_CACHE_DIR}/{self.model_name}/tokenizer",
                    clean_up_tokenization_spaces=True,
                )
                tokenizer.save_pretrained(path)

            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.model_name}-{file_name}",
                    "state": ModelStatusTypesEnum.downloaded,
                },
            )
        except Exception:
            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.model_name}-{file_name}",
                    "state": ModelStatusTypesEnum.error,
                },
            )

    def _load_model_and_utils(self):
        if self.runner is None:
            if self.downloader:
                self.downloader.wait_for_download()
            if self.model_type == ModelTypeEnum.text:
                self.tokenizer = self._load_tokenizer()
            elif self.model_type == ModelTypeEnum.vision:
                self.feature_extractor = self._load_feature_extractor()
            elif self.model_type == ModelTypeEnum.face:
                self.feature_extractor = []
            elif self.model_type == ModelTypeEnum.alpr_detect:
                self.feature_extractor = []
            elif self.model_type == ModelTypeEnum.alpr_classify:
                self.feature_extractor = []
            elif self.model_type == ModelTypeEnum.alpr_recognize:
                self.feature_extractor = []

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                self.model_size,
            )

    def _load_tokenizer(self):
        tokenizer_path = os.path.join(f"{MODEL_CACHE_DIR}/{self.model_name}/tokenizer")
        return AutoTokenizer.from_pretrained(
            self.model_name,
            cache_dir=tokenizer_path,
            trust_remote_code=True,
            clean_up_tokenization_spaces=True,
        )

    def _load_feature_extractor(self):
        return AutoFeatureExtractor.from_pretrained(
            f"{MODEL_CACHE_DIR}/{self.model_name}",
        )

    def _preprocess_inputs(self, raw_inputs: any) -> any:
        if self.model_type == ModelTypeEnum.text:
            max_length = max(len(self.tokenizer.encode(text)) for text in raw_inputs)
            return [
                self.tokenizer(
                    text,
                    padding="max_length",
                    truncation=True,
                    max_length=max_length,
                    return_tensors="np",
                )
                for text in raw_inputs
            ]
        elif self.model_type == ModelTypeEnum.vision:
            processed_images = [self._process_image(img) for img in raw_inputs]
            return [
                self.feature_extractor(images=image, return_tensors="np")
                for image in processed_images
            ]
        elif self.model_type == ModelTypeEnum.face:
            if isinstance(raw_inputs, list):
                raise ValueError("Face embedding does not support batch inputs.")

            pil = self._process_image(raw_inputs)

            # handle images larger than input size
            width, height = pil.size
            if width != FACE_EMBEDDING_SIZE or height != FACE_EMBEDDING_SIZE:
                if width > height:
                    new_height = int(((height / width) * FACE_EMBEDDING_SIZE) // 4 * 4)
                    pil = pil.resize((FACE_EMBEDDING_SIZE, new_height))
                else:
                    new_width = int(((width / height) * FACE_EMBEDDING_SIZE) // 4 * 4)
                    pil = pil.resize((new_width, FACE_EMBEDDING_SIZE))

            og = np.array(pil).astype(np.float32)

            # Image must be FACE_EMBEDDING_SIZExFACE_EMBEDDING_SIZE
            og_h, og_w, channels = og.shape
            frame = np.full(
                (FACE_EMBEDDING_SIZE, FACE_EMBEDDING_SIZE, channels),
                (0, 0, 0),
                dtype=np.float32,
            )

            # compute center offset
            x_center = (FACE_EMBEDDING_SIZE - og_w) // 2
            y_center = (FACE_EMBEDDING_SIZE - og_h) // 2

            # copy img image into center of result image
            frame[y_center : y_center + og_h, x_center : x_center + og_w] = og

            frame = np.expand_dims(frame, axis=0)
            return [{"image_input": frame}]
        elif self.model_type == ModelTypeEnum.alpr_detect:
            preprocessed = []
            for x in raw_inputs:
                preprocessed.append(x)
            return [{"x": preprocessed[0]}]
        elif self.model_type == ModelTypeEnum.alpr_classify:
            processed = []
            for img in raw_inputs:
                processed.append({"x": img})
            return processed
        elif self.model_type == ModelTypeEnum.alpr_recognize:
            processed = []
            for img in raw_inputs:
                processed.append({"x": img})
            return processed
        else:
            raise ValueError(f"Unable to preprocess inputs for {self.model_type}")

    def _process_image(self, image, output: str = "RGB") -> Image.Image:
        if isinstance(image, str):
            if image.startswith("http"):
                response = requests.get(image)
                image = Image.open(BytesIO(response.content)).convert(output)
        elif isinstance(image, bytes):
            image = Image.open(BytesIO(image)).convert(output)

        return image

    def __call__(
        self, inputs: Union[List[str], List[Image.Image], List[str]]
    ) -> List[np.ndarray]:
        self._load_model_and_utils()
        if self.runner is None or (
            self.tokenizer is None and self.feature_extractor is None
        ):
            logger.error(
                f"{self.model_name} model or tokenizer/feature extractor is not loaded."
            )
            return []

        processed_inputs = self._preprocess_inputs(inputs)
        input_names = self.runner.get_input_names()
        onnx_inputs = {name: [] for name in input_names}
        input: dict[str, any]
        for input in processed_inputs:
            for key, value in input.items():
                if key in input_names:
                    onnx_inputs[key].append(value[0])

        for key in input_names:
            if onnx_inputs.get(key):
                onnx_inputs[key] = np.stack(onnx_inputs[key])
            else:
                logger.warning(f"Expected input '{key}' not found in onnx_inputs")

        embeddings = self.runner.run(onnx_inputs)[0]
        return [embedding for embedding in embeddings]
