"""Convert the default SSDLite MobileNet v2 model to OpenVINO IR.

Replaces the legacy openvino-dev Model Optimizer conversion. The TensorFlow
frontend translates the Object Detection API pre and post processors literally,
producing per-class NonMaxSuppression, NonZero ops and map loops with data
dependent shapes that the GPU plugin handles very badly. Both are cut out the
way ssd_v2_support.json used to do it: the preprocessor is an identity at the
native 300x300 input, and the postprocessor becomes a single fused
DetectionOutput. The result is the [1, 1, 100, 7] tensor that Frigate's
OpenVINO detector expects, with the input flipped to BGR to match the legacy
reverse_input_channels behavior.
"""

import numpy as np
import openvino as ov
from openvino import opset8 as ops
from openvino.preprocess import PrePostProcessor

MODEL_DIR = "/models/ssdlite_mobilenet_v2_coco_2018_05_09"
OUTPUT_PATH = "/models/ssdlite_mobilenet_v2.xml"
INPUT_SHAPE = [1, 300, 300, 3]

# faster_rcnn_box_coder divides the deltas by pipeline.config's y/x/height/width
# scales of 10/10/5/5, which DetectionOutput expresses as per-prior variances.
BOX_VARIANCES = np.float32([0.1, 0.1, 0.2, 0.2])

model = ov.convert_model(
    f"{MODEL_DIR}/frozen_inference_graph.pb",
    input=[("image_tensor:0", INPUT_SHAPE)],
)

nodes = {op.get_friendly_name(): op for op in model.get_ordered_ops()}
parameter = model.get_parameters()[0]

preprocessor = nodes["Preprocessor/map/TensorArrayStack/TensorArrayGatherV3"]
box_deltas = nodes["Postprocessor/Reshape_1"].output(0)
class_scores = nodes["Postprocessor/convert_scores"].output(0)
anchors_output = nodes["Postprocessor/Reshape"].output(0)

# The anchors only depend on the static input shape, so fold them into a
# constant and drop the generator subgraph with the rest of the postprocessor.
probe = ov.Core().compile_model(
    ov.Model([anchors_output, preprocessor.output(0)], [parameter], "probe"), "CPU"
)
probe_input = np.random.default_rng(0).integers(0, 255, INPUT_SHAPE, dtype=np.uint8)
anchors, resized = (out.copy() for out in probe([probe_input]).values())

assert np.allclose(resized, probe_input, atol=1e-3), (
    "preprocessor is not an identity at 300x300, it cannot be bypassed"
)

image = ops.convert(parameter, "f32")

for consumer in list(preprocessor.output(0).get_target_inputs()):
    consumer.replace_source_output(image.output(0))

# (ymin, xmin, ymax, xmax) -> (xmin, ymin, xmax, ymax)
priors = anchors[:, [1, 0, 3, 2]].astype(np.float32).reshape(-1)
variances = np.tile(BOX_VARIANCES, len(anchors))
proposals = ops.constant(np.stack([priors, variances])[np.newaxis])

# (ty, tx, th, tw) -> (dx, dy, dw, dh) for the CENTER_SIZE decode
box_logits = ops.reshape(ops.gather(box_deltas, [1, 0, 3, 2], 1), [1, -1], False)
class_preds = ops.reshape(class_scores, [1, -1], False)

detections = ops.detection_output(
    box_logits,
    class_preds,
    proposals,
    {
        "background_label_id": 0,
        "top_k": 100,
        "keep_top_k": [100],
        "nms_threshold": 0.6,
        "confidence_threshold": 0.3,
        "code_type": "caffe.PriorBoxParameter.CENTER_SIZE",
        "share_location": True,
        "variance_encoded_in_target": False,
        "normalized": True,
        "clip_before_nms": False,
        "clip_after_nms": True,
        "decrease_label_id": False,
    },
)
detections.output(0).get_tensor().set_names({"detection_out"})

model = ov.Model([detections], [parameter], "ssdlite_mobilenet_v2")

ppp = PrePostProcessor(model)
ppp.input().tensor().set_layout(ov.Layout("NHWC"))
ppp.input().preprocess().reverse_channels()
model = ppp.build()

# Fail the build rather than silently ship the dynamically shaped graph again.
op_types = [op.get_type_name() for op in model.get_ordered_ops()]
assert op_types.count("DetectionOutput") == 1, "postprocessor was not fused"

for dynamic_op in ("NonMaxSuppression", "NonZero", "Loop", "TensorIterator"):
    assert dynamic_op not in op_types, f"{dynamic_op} left in the graph"

output_shape = model.outputs[0].get_partial_shape()
assert output_shape.is_static and list(output_shape) == [1, 1, 100, 7], (
    f"unexpected detector output shape {output_shape}"
)

ov.save_model(model, OUTPUT_PATH, compress_to_fp16=True)
