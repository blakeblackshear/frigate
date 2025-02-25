"""JinaV2 Embeddings."""

import logging
import os

import numpy as np
from transformers import AutoImageProcessor, AutoTokenizer
from transformers.utils.logging import disable_progress_bar, set_verbosity_error

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader

from .base_embedding import BaseEmbedding
from .runner import ONNXModelRunner

# disables the progress bar and download logging for downloading tokenizers and image processors
disable_progress_bar()
set_verbosity_error()
logger = logging.getLogger(__name__)


class JinaV2Embedding(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
        embedding_type: str = None,
    ):
        model_file = (
            "model_fp16.onnx" if model_size == "large" else "model_quantized.onnx"
        )
        super().__init__(
            model_name="jinaai/jina-clip-v2",
            model_file=model_file,
            download_urls={
                model_file: f"https://huggingface.co/jinaai/jina-clip-v2/resolve/main/onnx/{model_file}",
                "preprocessor_config.json": "https://huggingface.co/jinaai/jina-clip-v2/resolve/main/preprocessor_config.json",
            },
        )
        self.tokenizer_file = "tokenizer"
        self.embedding_type = embedding_type
        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.tokenizer = None
        self.image_processor = None
        self.runner = None
        files_names = list(self.download_urls.keys()) + [self.tokenizer_file]
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
            elif file_name == self.tokenizer_file:
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

            self.image_processor = AutoImageProcessor.from_pretrained(
                f"{MODEL_CACHE_DIR}/{self.model_name}",
                cache_dir=f"{MODEL_CACHE_DIR}/{self.model_name}/",
                trust_remote_code=True,
            )

            tokenizer_path = os.path.join(
                f"{MODEL_CACHE_DIR}/{self.model_name}/tokenizer"
            )
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=tokenizer_path,
                trust_remote_code=True,
                clean_up_tokenization_spaces=True,
            )

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                "GPU",
                self.model_size,
            )

    def _preprocess_inputs(self, raw_inputs):
        """
        Preprocess inputs into a list of dicts, each with input_ids and pixel_values.
        - For text: Real input_ids per input, dummy pixel_values.
        - For image: Dummy input_ids, real pixel_values per input.
        """
        if not isinstance(raw_inputs, list):
            raw_inputs = [raw_inputs]

        processed = []

        if self.embedding_type == "text":
            for text in raw_inputs:
                input_ids = self.tokenizer([text], return_tensors="np")["input_ids"]
                # Create dummy pixel_values with matching batch size (1 per text)
                pixel_values = np.zeros((1, 3, 512, 512), dtype=np.float32)
                processed.append({"input_ids": input_ids, "pixel_values": pixel_values})

        elif self.embedding_type == "vision":
            for img in raw_inputs:
                processed_image = self._process_image(img)
                pixel_values = self.image_processor([processed_image])["pixel_values"]
                pixel_values = np.array(pixel_values, dtype=np.float32)
                # Create dummy input_ids for this single image
                input_ids = np.random.randint(0, 10, (1, 16))

                processed.append({"input_ids": input_ids, "pixel_values": pixel_values})

        else:
            raise ValueError(
                f"Invalid embedding_type: {self.embedding_type}. Must be 'text' or 'vision'."
            )

        return processed

    def __call__(self, inputs, embedding_type=None):
        """Override to handle dynamic embedding_type."""
        effective_type = embedding_type or self.embedding_type
        if not effective_type:
            raise ValueError(
                "embedding_type must be specified either in __init__ or __call__"
            )
        self.embedding_type = effective_type
        return super().__call__(inputs)

    def _postprocess_outputs(self, outputs):
        """
        Process ONNX model outputs, truncating embeddings to truncate_dim.
        - outputs: Raw output from self.runner.run()
        - Returns: List of truncated embeddings.
        """
        truncate_dim = 768

        # Case 1: outputs is a single ndarray (most likely embeddings)
        if isinstance(outputs, np.ndarray):
            if outputs.shape[-1] > truncate_dim:
                outputs = outputs[..., :truncate_dim]
            return [embedding for embedding in outputs]

        # Case 2: outputs is a tuple/list with structure [_, _, text_embeddings, image_embeddings]
        elif isinstance(outputs, (list, tuple)) and len(outputs) >= 4:
            _, _, text_embeddings, image_embeddings = outputs[:4]

            if text_embeddings.shape[-1] > truncate_dim:
                text_embeddings = text_embeddings[..., :truncate_dim]
            if image_embeddings.shape[-1] > truncate_dim:
                image_embeddings = image_embeddings[..., :truncate_dim]

            if self.embedding_type == "text":
                embeddings = text_embeddings
            elif self.embedding_type == "vision":
                embeddings = image_embeddings
            else:
                raise ValueError(f"Invalid embedding_type: {self.embedding_type}")

            return [embedding for embedding in embeddings]

        else:
            raise ValueError(f"Unexpected output format from model: {outputs}")
