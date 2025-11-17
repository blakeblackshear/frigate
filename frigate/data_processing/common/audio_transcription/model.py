"""Set up audio transcription models based on model size."""

import logging
import os

import sherpa_onnx

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import MODEL_CACHE_DIR
from frigate.data_processing.types import AudioTranscriptionModel
from frigate.util.downloader import ModelDownloader

logger = logging.getLogger(__name__)


class AudioTranscriptionModelRunner:
    def __init__(
        self,
        device: str = "CPU",
        model_size: str = "small",
    ):
        self.model: AudioTranscriptionModel = None
        self.requestor = InterProcessRequestor()

        if model_size == "large":
            # use the Whisper download function instead of our own
            # Import dynamically to avoid crashes on systems without AVX support
            from faster_whisper.utils import download_model

            logger.debug("Downloading Whisper audio transcription model")
            download_model(
                size_or_id="small" if device == "cuda" else "tiny",
                local_files_only=False,
                cache_dir=os.path.join(MODEL_CACHE_DIR, "whisper"),
            )
            logger.debug("Whisper audio transcription model downloaded")

        else:
            # small model as default
            download_path = os.path.join(MODEL_CACHE_DIR, "sherpa-onnx")
            HF_ENDPOINT = os.environ.get("HF_ENDPOINT", "https://huggingface.co")
            self.model_files = {
                "encoder.onnx": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/encoder-epoch-99-avg-1-chunk-16-left-128.onnx",
                "decoder.onnx": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/decoder-epoch-99-avg-1-chunk-16-left-128.onnx",
                "joiner.onnx": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/joiner-epoch-99-avg-1-chunk-16-left-128.onnx",
                "tokens.txt": f"{HF_ENDPOINT}/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/tokens.txt",
            }

            if not all(
                os.path.exists(os.path.join(download_path, n))
                for n in self.model_files.keys()
            ):
                self.downloader = ModelDownloader(
                    model_name="sherpa-onnx",
                    download_path=download_path,
                    file_names=self.model_files.keys(),
                    download_func=self.__download_models,
                )
                self.downloader.ensure_model_files()
                self.downloader.wait_for_download()

            self.model = sherpa_onnx.OnlineRecognizer.from_transducer(
                tokens=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/tokens.txt"),
                encoder=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/encoder.onnx"),
                decoder=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/decoder.onnx"),
                joiner=os.path.join(MODEL_CACHE_DIR, "sherpa-onnx/joiner.onnx"),
                num_threads=2,
                sample_rate=16000,
                feature_dim=80,
                enable_endpoint_detection=True,
                rule1_min_trailing_silence=2.4,
                rule2_min_trailing_silence=1.2,
                rule3_min_utterance_length=300,
                decoding_method="greedy_search",
                provider="cpu",
            )

    def __download_models(self, path: str) -> None:
        try:
            file_name = os.path.basename(path)
            ModelDownloader.download_from_url(self.model_files[file_name], path)
        except Exception as e:
            logger.error(f"Failed to download {path}: {e}")
