import openvino as ov
from openvino.tools import mo

ov_model = mo.convert_model(
    "/models/ssdlite_mobilenet_v2_coco_2018_05_09/frozen_inference_graph.pb",
    compress_to_fp16=True,
    transformations_config="/usr/local/lib/python3.11/dist-packages/openvino/tools/mo/front/tf/ssd_v2_support.json",
    tensorflow_object_detection_api_pipeline_config="/models/ssdlite_mobilenet_v2_coco_2018_05_09/pipeline.config",
    reverse_input_channels=True,
)
ov.save_model(ov_model, "/models/ssdlite_mobilenet_v2.xml")
