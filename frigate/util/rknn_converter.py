"""RKNN model conversion utility for Frigate."""

import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Model type to RKNN conversion config mapping
MODEL_TYPE_CONFIGS = {
    "yolo-generic": {
        "mean_values": [[0, 0, 0]],
        "std_values": [[255, 255, 255]],
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
}

def ensure_torch_dependencies() -> bool:
    """Dynamically install torch dependencies if not available."""
    try:
        import torch
        logger.debug("PyTorch is already available")
        return True
    except ImportError:
        logger.info("PyTorch not found, attempting to install...")
        
        try:
            # Try to install torch using pip
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", 
                "--break-system-packages", "torch", "torchvision"
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Verify installation
            import torch
            logger.info("PyTorch installed successfully")
            return True
        except (subprocess.CalledProcessError, ImportError) as e:
            logger.error(f"Failed to install PyTorch: {e}")
            return False

def ensure_rknn_toolkit() -> bool:
    """Ensure RKNN toolkit is available."""
    try:
        import rknn
        from rknn.api import RKNN
        logger.debug("RKNN toolkit is already available")
        return True
    except ImportError:
        logger.error("RKNN toolkit not found. Please ensure it's installed.")
        return False

def get_soc_type() -> Optional[str]:
    """Get the SoC type from device tree."""
    try:
        with open("/proc/device-tree/compatible") as file:
            soc = file.read().split(",")[-1].strip("\x00")
            return soc
    except FileNotFoundError:
        logger.warning("Could not determine SoC type from device tree")
        return None

def convert_onnx_to_rknn(
    onnx_path: str, 
    output_path: str, 
    model_type: str,
    quantization: bool = False,
    soc: Optional[str] = None
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
    # Ensure dependencies are available
    if not ensure_torch_dependencies():
        logger.error("PyTorch dependencies not available")
        return False
    
    if not ensure_rknn_toolkit():
        logger.error("RKNN toolkit not available")
        return False
    
    # Get SoC type if not provided
    if soc is None:
        soc = get_soc_type()
        if soc is None:
            logger.error("Could not determine SoC type")
            return False
    
    # Get model config for the specified type
    if model_type not in MODEL_TYPE_CONFIGS:
        logger.error(f"Unsupported model type: {model_type}")
        return False
    
    config = MODEL_TYPE_CONFIGS[model_type].copy()
    config["target_platform"] = soc
    
    try:
        from rknn.api import RKNN
        
        logger.info(f"Converting {onnx_path} to RKNN format for {soc}")
        
        # Initialize RKNN
        rknn = RKNN(verbose=True)
        
        # Configure RKNN
        rknn.config(**config)
        
        # Load ONNX model
        if rknn.load_onnx(model=onnx_path) != 0:
            logger.error("Failed to load ONNX model")
            return False
        
        # Build RKNN model
        if rknn.build(do_quantization=quantization) != 0:
            logger.error("Failed to build RKNN model")
            return False
        
        # Export RKNN model
        if rknn.export_rknn(output_path) != 0:
            logger.error("Failed to export RKNN model")
            return False
        
        logger.info(f"Successfully converted model to {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error during RKNN conversion: {e}")
        return False

def auto_convert_model(
    model_path: str, 
    model_type: str,
    quantization: bool = False
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
    from frigate.const import MODEL_CACHE_DIR
    
    # Check if model already has .rknn extension
    if model_path.endswith('.rknn'):
        return model_path
    
    # Check if equivalent .rknn file exists
    base_path = Path(model_path)
    if base_path.suffix.lower() in ['.onnx', '']:
        # Remove extension if present
        base_name = base_path.stem if base_path.suffix else base_path.name
        rknn_path = base_path.parent / f"{base_name}.rknn"
        
        if rknn_path.exists():
            logger.info(f"Found existing RKNN model: {rknn_path}")
            return str(rknn_path)
        
        # Convert ONNX to RKNN
        if base_path.suffix.lower() == '.onnx' or not base_path.suffix:
            logger.info(f"Converting {model_path} to RKNN format...")
            
            # Create output directory if it doesn't exist
            rknn_path.parent.mkdir(parents=True, exist_ok=True)
            
            if convert_onnx_to_rknn(str(base_path), str(rknn_path), model_type, quantization):
                return str(rknn_path)
            else:
                logger.error(f"Failed to convert {model_path} to RKNN format")
                return None
    
    return None
