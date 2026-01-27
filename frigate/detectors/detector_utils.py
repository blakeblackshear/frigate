import logging
import os
import subprocess

import numpy as np

try:
    from tflite_runtime.interpreter import Interpreter, load_delegate
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter, load_delegate


logger = logging.getLogger(__name__)


def tflite_init(self, interpreter):
    self.interpreter = interpreter

    self.interpreter.allocate_tensors()

    self.tensor_input_details = self.interpreter.get_input_details()
    self.tensor_output_details = self.interpreter.get_output_details()


def tflite_detect_raw(self, tensor_input):
    self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
    self.interpreter.invoke()

    boxes = self.interpreter.tensor(self.tensor_output_details[0]["index"])()[0]
    class_ids = self.interpreter.tensor(self.tensor_output_details[1]["index"])()[0]
    scores = self.interpreter.tensor(self.tensor_output_details[2]["index"])()[0]
    count = int(self.interpreter.tensor(self.tensor_output_details[3]["index"])()[0])

    detections = np.zeros((20, 6), np.float32)

    for i in range(count):
        if scores[i] < 0.4 or i == 20:
            break
        detections[i] = [
            class_ids[i],
            float(scores[i]),
            boxes[i][0],
            boxes[i][1],
            boxes[i][2],
            boxes[i][3],
        ]

    return detections


def tflite_load_delegate_interpreter(
    delegate_library: str, detector_config, device_config
):
    try:
        logger.info("Attempting to load NPU")
        tf_delegate = load_delegate(delegate_library, device_config)
        logger.info("NPU found")
        interpreter = Interpreter(
            model_path=detector_config.model.path,
            experimental_delegates=[tf_delegate],
        )
        return interpreter
    except ValueError:
        _, ext = os.path.splitext(detector_config.model.path)

        if ext and ext != ".tflite":
            logger.error(
                "Incorrect model used with NPU. Only .tflite models can be used with a TFLite delegate."
            )
        else:
            logger.error(
                "No NPU was detected. If you do not have a TFLite device yet, you must configure CPU detectors."
            )

        raise

def detect_amd_gfx_id():
    return subprocess.getoutput("unset HSA_OVERRIDE_GFX_VERSION && /opt/rocm/bin/rocminfo 2>/dev/null | grep gfx | head -1 | awk '{print $2}'")

def apply_amd_compatibility_env_vars():
    gfx_id = detect_amd_gfx_id()
    if not gfx_id:
        return

    logger.info(f"Setting AMD environment variables for {gfx_id} compatibility...")

    configs = {
        ("gfx902", "gfx909", "gfx90c", "gfx1035", "gfx1103"): {
            "HSA_ENABLE_SDMA": "0", # Disable System Direct Memory Access for APU compatibility
            "MIGRAPHX_DISABLE_MIOPEN_FUSION": "1", # Disable unsupported fusion optimization
        },
        ("gfx902", "gfx909", "gfx90c"): { # Vega
            "HSA_OVERRIDE_GFX_VERSION": "9.0.0", # Force compatible GFX version
        },
        ("gfx1035"): { # 680M
            "HSA_OVERRIDE_GFX_VERSION": "10.3.0", # Force compatible GFX version
        },
        ("gfx1103"): { # 780M
            "HSA_OVERRIDE_GFX_VERSION": "11.0.0", # Force compatible GFX version
        }
    }
    for gfx_ids, vars in configs.items():
        if gfx_id in gfx_ids:
            for var, value in vars.items():
                if var not in os.environ:
                    os.environ[var] = value
                    logger.info(f"  - \"{var}={value}\"")
