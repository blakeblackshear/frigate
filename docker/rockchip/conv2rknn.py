import os

import rknn
import yaml
from rknn.api import RKNN

try:
    with open(rknn.__path__[0] + "/VERSION") as file:
        tk_version = file.read().strip()
except FileNotFoundError:
    pass

try:
    with open("/config/conv2rknn.yaml", "r") as config_file:
        configuration = yaml.safe_load(config_file)
except FileNotFoundError:
    raise Exception("Please place a config file at /config/conv2rknn.yaml")

if configuration["config"] != None:
    rknn_config = configuration["config"]
else:
    rknn_config = {}

if not os.path.isdir("/config/model_cache/rknn_cache/onnx"):
    raise Exception(
        "Place the onnx models you want to convert to rknn format in /config/model_cache/rknn_cache/onnx"
    )

if "soc" not in configuration:
    try:
        with open("/proc/device-tree/compatible") as file:
            soc = file.read().split(",")[-1].strip("\x00")
    except FileNotFoundError:
        raise Exception("Make sure to run docker in privileged mode.")

    configuration["soc"] = [
        soc,
    ]

if "quantization" not in configuration:
    configuration["quantization"] = False

if "output_name" not in configuration:
    configuration["output_name"] = "{{input_basename}}"

for input_filename in os.listdir("/config/model_cache/rknn_cache/onnx"):
    for soc in configuration["soc"]:
        quant = "i8" if configuration["quantization"] else "fp16"

        input_path = "/config/model_cache/rknn_cache/onnx/" + input_filename
        input_basename = input_filename[: input_filename.rfind(".")]

        output_filename = (
            configuration["output_name"].format(
                quant=quant,
                input_basename=input_basename,
                soc=soc,
                tk_version=tk_version,
            )
            + ".rknn"
        )
        output_path = "/config/model_cache/rknn_cache/" + output_filename

        rknn_config["target_platform"] = soc

        rknn = RKNN(verbose=True)
        rknn.config(**rknn_config)

        if rknn.load_onnx(model=input_path) != 0:
            raise Exception("Error loading model.")

        if (
            rknn.build(
                do_quantization=configuration["quantization"],
                dataset="/COCO/coco_subset_20.txt",
            )
            != 0
        ):
            raise Exception("Error building model.")

        if rknn.export_rknn(output_path) != 0:
            raise Exception("Error exporting rknn model.")
