"""RKNN model conversion utility for Frigate."""

import logging
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

from frigate.const import SUPPORTED_RK_SOCS
from frigate.util.file import FileLock

logger = logging.getLogger(__name__)

MODEL_TYPE_CONFIGS = {
    "yolo-generic": {
        "mean_values": [[0, 0, 0]],
        "std_values": [[1, 1, 1]],
        "target_platform": None,  # Will be set dynamically
    },
    "yolonas": {
        "mean_values": [[0, 0, 0]],
        "std_values": [[255, 255, 255]],
        "target_platform": None,  # Will be set dynamically
    },
    "yolox": {
        "mean_values": [[0, 0, 0]],
        "std_values": [[255, 255, 255]],
        "target_platform": None,  # Will be set dynamically
    },
    "jina-clip-v1-vision": {
        "mean_values": [[0.48145466 * 255, 0.4578275 * 255, 0.40821073 * 255]],
        "std_values": [[0.26862954 * 255, 0.26130258 * 255, 0.27577711 * 255]],
        "target_platform": None,  # Will be set dynamically
    },
    "arcface-r100": {
        "mean_values": [[127.5, 127.5, 127.5]],
        "std_values": [[127.5, 127.5, 127.5]],
        "target_platform": None,  # Will be set dynamically
    },
}


def get_rknn_model_type(model_path: str) -> str | None:
    if all(keyword in str(model_path) for keyword in ["jina-clip-v1", "vision"]):
        return "jina-clip-v1-vision"

    model_name = os.path.basename(str(model_path)).lower()

    if "arcface" in model_name:
        return "arcface-r100"

    if any(keyword in model_name for keyword in ["yolo", "yolox", "yolonas"]):
        return model_name

    return None


def is_rknn_compatible(model_path: str, model_type: str | None = None) -> bool:
    """
    Check if a model is compatible with RKNN conversion.

    Args:
        model_path: Path to the model file
        model_type: Type of the model (if known)

    Returns:
        True if the model is RKNN-compatible, False otherwise
    """
    soc = get_soc_type()

    if soc is None:
        return False

    # Check if the SoC is actually a supported RK device
    # This prevents false positives on non-RK devices (e.g., macOS Docker)
    # where /proc/device-tree/compatible might exist but contain non-RK content
    if soc not in SUPPORTED_RK_SOCS:
        logger.debug(
            f"SoC '{soc}' is not a supported RK device for RKNN conversion. "
            f"Supported SoCs: {SUPPORTED_RK_SOCS}"
        )
        return False

    if not model_type:
        model_type = get_rknn_model_type(model_path)

    if model_type and model_type in MODEL_TYPE_CONFIGS:
        return True

    return False


def ensure_torch_dependencies() -> bool:
    """Dynamically install torch dependencies if not available."""
    try:
        import torch  # type: ignore

        logger.debug("PyTorch is already available")
        return True
    except ImportError:
        logger.info("PyTorch not found, attempting to install...")

        try:
            subprocess.check_call(
                [
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    "--break-system-packages",
                    "torch",
                    "torchvision",
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            import torch  # type: ignore # noqa: F401

            logger.info("PyTorch installed successfully")
            return True
        except (subprocess.CalledProcessError, ImportError) as e:
            logger.error(f"Failed to install PyTorch: {e}")
            return False


def ensure_rknn_toolkit() -> bool:
    """Ensure RKNN toolkit is available."""
    try:
        from rknn.api import RKNN  # type: ignore # noqa: F401

        logger.debug("RKNN toolkit is already available")
        return True
    except ImportError as e:
        logger.error(f"RKNN toolkit not found. Please ensure it's installed. {e}")
        return False


def get_soc_type() -> Optional[str]:
    """Get the SoC type from device tree."""
    try:
        with open("/proc/device-tree/compatible") as file:
            content = file.read()

            # Check for Jetson devices
            if "nvidia" in content:
                return None

            return content.split(",")[-1].strip("\x00")
    except FileNotFoundError:
        logger.debug("Could not determine SoC type from device tree")
        return None


def convert_onnx_to_rknn(
    onnx_path: str,
    output_path: str,
    model_type: str,
    quantization: bool = False,
    soc: Optional[str] = None,
) -> bool:
    """
    Convert ONNX model to RKNN format.

    Args:
        onnx_path: Path to input ONNX model
        output_path: Path for output RKNN model
        model_type: Type of model (yolo-generic, yolonas, yolox, ssd)
        quantization: Whether to use 8-bit quantization (i8) or 16-bit float (fp16)
        soc: Target SoC platform (auto-detected if None)

    Returns:
        True if conversion successful, False otherwise
    """
    if not ensure_torch_dependencies():
        logger.debug("PyTorch dependencies not available")
        return False

    if not ensure_rknn_toolkit():
        logger.debug("RKNN toolkit not available")
        return False

    # Get SoC type if not provided
    if soc is None:
        soc = get_soc_type()
        if soc is None:
            logger.debug("Could not determine SoC type")
            return False

    # Get model config for the specified type
    if model_type not in MODEL_TYPE_CONFIGS:
        logger.debug(f"Unsupported model type: {model_type}")
        return False

    config = MODEL_TYPE_CONFIGS[model_type].copy()
    config["target_platform"] = soc

    # RKNN toolkit requires .onnx extension, create temporary copy if needed
    temp_onnx_path = None
    onnx_model_path = onnx_path

    if not onnx_path.endswith(".onnx"):
        import shutil

        temp_onnx_path = f"{onnx_path}.onnx"
        logger.debug(f"Creating temporary ONNX copy: {temp_onnx_path}")
        try:
            shutil.copy2(onnx_path, temp_onnx_path)
            onnx_model_path = temp_onnx_path
        except Exception as e:
            logger.error(f"Failed to create temporary ONNX copy: {e}")
            return False

    try:
        from rknn.api import RKNN  # type: ignore

        logger.info(f"Converting {onnx_path} to RKNN format for {soc}")
        rknn = RKNN(verbose=True)
        rknn.config(**config)

        if model_type == "jina-clip-v1-vision":
            load_output = rknn.load_onnx(
                model=onnx_model_path,
                inputs=["pixel_values"],
                input_size_list=[[1, 3, 224, 224]],
            )
        elif model_type == "arcface-r100":
            load_output = rknn.load_onnx(
                model=onnx_model_path,
                inputs=["data"],
                input_size_list=[[1, 3, 112, 112]],
            )
        else:
            load_output = rknn.load_onnx(model=onnx_model_path)

        if load_output != 0:
            logger.error("Failed to load ONNX model")
            return False

        if rknn.build(do_quantization=quantization) != 0:
            logger.error("Failed to build RKNN model")
            return False

        if rknn.export_rknn(output_path) != 0:
            logger.error("Failed to export RKNN model")
            return False

        logger.info(f"Successfully converted model to {output_path}")
        return True

    except Exception as e:
        logger.error(f"Error during RKNN conversion: {e}")
        return False
    finally:
        # Clean up temporary file if created
        if temp_onnx_path and os.path.exists(temp_onnx_path):
            try:
                os.remove(temp_onnx_path)
                logger.debug(f"Removed temporary ONNX file: {temp_onnx_path}")
            except Exception as e:
                logger.warning(f"Failed to remove temporary ONNX file: {e}")


def wait_for_conversion_completion(
    model_type: str, rknn_path: Path, lock_file_path: Path, timeout: int = 300
) -> bool:
    """
    Wait for another process to complete the conversion.

    Args:
        model_type: Type of model being converted
        rknn_path: Path to the expected RKNN model
        lock_file_path: Path to the lock file to monitor
        timeout: Maximum time to wait in seconds

    Returns:
        True if RKNN model appears, False if timeout
    """
    start_time = time.time()
    lock = FileLock(lock_file_path, stale_timeout=600)

    while time.time() - start_time < timeout:
        # Check if RKNN model appeared
        if rknn_path.exists():
            logger.info(f"RKNN model appeared: {rknn_path}")
            return True

        # Check if lock file is gone (conversion completed or failed)
        if not lock_file_path.exists():
            logger.info("Lock file removed, checking for RKNN model...")
            if rknn_path.exists():
                logger.info(f"RKNN model found after lock removal: {rknn_path}")
                return True
            else:
                logger.warning(
                    "Lock file removed but RKNN model not found, conversion may have failed"
                )
                return False

        # Check if lock is stale
        if lock.is_stale():
            logger.warning("Lock file is stale, attempting to clean up and retry...")
            lock._cleanup_stale_lock()
            # Try to acquire lock again
            retry_lock = FileLock(
                lock_file_path, timeout=60, cleanup_stale_on_init=True
            )
            if retry_lock.acquire():
                try:
                    # Check if RKNN file appeared while waiting
                    if rknn_path.exists():
                        logger.info(f"RKNN model appeared while waiting: {rknn_path}")
                        return True

                    # Convert ONNX to RKNN
                    logger.info(
                        f"Retrying conversion of {rknn_path} after stale lock cleanup..."
                    )

                    # Get the original model path from rknn_path
                    base_path = rknn_path.parent / rknn_path.stem
                    onnx_path = base_path.with_suffix(".onnx")

                    if onnx_path.exists():
                        if convert_onnx_to_rknn(
                            str(onnx_path), str(rknn_path), model_type, False
                        ):
                            return True

                    logger.error("Failed to convert model after stale lock cleanup")
                    return False

                finally:
                    retry_lock.release()

        logger.debug("Waiting for RKNN model to appear...")
        time.sleep(1)

    logger.warning(f"Timeout waiting for RKNN model: {rknn_path}")
    return False


def auto_convert_model(
    model_path: str, model_type: str | None = None, quantization: bool = False
) -> Optional[str]:
    """
    Automatically convert a model to RKNN format if needed.

    Args:
        model_path: Path to the model file
        model_type: Type of the model
        quantization: Whether to use quantization

    Returns:
        Path to the RKNN model if successful, None otherwise
    """
    if model_path.endswith(".rknn"):
        return model_path

    # Check if equivalent .rknn file exists
    base_path = Path(model_path)
    if base_path.suffix.lower() in [".onnx", ""]:
        base_name = base_path.stem if base_path.suffix else base_path.name
        rknn_path = base_path.parent / f"{base_name}.rknn"

        if rknn_path.exists():
            logger.info(f"Found existing RKNN model: {rknn_path}")
            return str(rknn_path)

        lock_file_path = base_path.parent / f"{base_name}.conversion.lock"
        lock = FileLock(lock_file_path, timeout=300, cleanup_stale_on_init=True)

        if lock.acquire():
            try:
                if rknn_path.exists():
                    logger.info(
                        f"RKNN model appeared while waiting for lock: {rknn_path}"
                    )
                    return str(rknn_path)

                logger.info(f"Converting {model_path} to RKNN format...")
                rknn_path.parent.mkdir(parents=True, exist_ok=True)

                if not model_type:
                    model_type = get_rknn_model_type(base_path)

                if convert_onnx_to_rknn(
                    str(base_path), str(rknn_path), model_type, quantization
                ):
                    return str(rknn_path)
                else:
                    logger.error(f"Failed to convert {model_path} to RKNN format")
                    return None

            finally:
                lock.release()
        else:
            logger.info(
                f"Another process is converting {model_path}, waiting for completion..."
            )

            if not model_type:
                model_type = get_rknn_model_type(base_path)

            if wait_for_conversion_completion(model_type, rknn_path, lock_file_path):
                return str(rknn_path)
            else:
                logger.error(f"Timeout waiting for conversion of {model_path}")
                return None

    return None
