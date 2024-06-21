"""Embedding function for ONNX MiniLM-L6 model used in Chroma."""

from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

from frigate.const import MODEL_CACHE_DIR


class MiniLMEmbedding(ONNXMiniLM_L6_V2):
    """Override DOWNLOAD_PATH to download to cache directory."""

    DOWNLOAD_PATH = f"{MODEL_CACHE_DIR}/all-MiniLM-L6-v2"
