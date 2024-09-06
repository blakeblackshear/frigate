import openvino as ov
from openvino.tools import mo
from pathlib import Path
from site import getsitepackages


def transformations_config_location(path: Path):
    return path / 'openvino' / 'tools' / 'mo' / 'front' / 'tf' / 'ssd_v2_support.json'


configs = [transformations_config_location(Path(path)) for path in getsitepackages()]
assert len(configs) > 0, 'Expected at least one transformations config to exist but none existed.'

ov_model = mo.convert_model(
    "/models/ssdlite_mobilenet_v2_coco_2018_05_09/frozen_inference_graph.pb",
    compress_to_fp16=True,
    transformations_config=configs[0],
    tensorflow_object_detection_api_pipeline_config="/models/ssdlite_mobilenet_v2_coco_2018_05_09/pipeline.config",
    reverse_input_channels=True,
)
ov.save_model(ov_model, "/models/ssdlite_mobilenet_v2.xml")
