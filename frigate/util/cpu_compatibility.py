"""CPU compatibility detection utilities."""

import logging
import os
import subprocess
import sys
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def check_cpu_has_avx() -> bool:
    """Check if CPU supports AVX instructions required by TensorFlow 2.19+.
    
    Returns:
        bool: True if CPU has AVX support, False otherwise
    """
    try:
        # Try Linux method first (most common for Frigate)
        if sys.platform.startswith("linux"):
            with open("/proc/cpuinfo", "r") as f:
                cpuinfo = f.read().lower()
                return "avx" in cpuinfo
        
        # Fallback to lscpu command
        result = subprocess.run(
            ["lscpu"], 
            capture_output=True, 
            text=True, 
            timeout=2
        )
        if result.returncode == 0:
            return "avx" in result.stdout.lower()
    
    except FileNotFoundError:
        logger.debug("Could not find /proc/cpuinfo or lscpu command")
    except subprocess.TimeoutExpired:
        logger.debug("CPU detection timed out")
    except Exception as e:
        logger.debug(f"Error detecting CPU capabilities: {e}")
    
    # If we can't detect, assume no AVX for safety
    logger.warning(
        "Could not detect CPU AVX support, assuming incompatible with TensorFlow 2.19+"
    )
    return False


def prevent_tensorflow_import() -> None:
    """Prevent TensorFlow from being imported by mocking the module.
    
    This is used when CPU doesn't support required instruction sets.
    """
    if "tensorflow" in sys.modules:
        # Already imported, too late to prevent
        return
    
    class MockTensorflow:
        """Mock TensorFlow module that raises ImportError."""
        
        def __getattr__(self, name):
            raise ImportError(
                "TensorFlow is disabled due to CPU incompatibility. "
                "Using ONNX backends instead."
            )
    
    # Insert mock before any real import can happen
    sys.modules["tensorflow"] = MockTensorflow()
    sys.modules["tensorflow.python"] = MockTensorflow()
    
    # Also set environment variables to prevent import attempts
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
    os.environ["USE_TENSORFLOW"] = "0"
    
    logger.info("TensorFlow import disabled for CPU compatibility")


def ensure_cpu_compatibility() -> Optional[str]:
    """Ensure CPU compatibility and return status message.
    
    Returns:
        Optional[str]: Warning message if compatibility issues detected, None if all good
    """
    if not check_cpu_has_avx():
        prevent_tensorflow_import()
        return (
            "CPU does not support AVX instructions required by TensorFlow 2.19+. "
            "Live classification model training will be disabled. "
            "Face recognition, LPR, and semantic search will use ONNX backends."
        )
    
    return None