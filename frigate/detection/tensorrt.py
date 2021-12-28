import logging
from frigate.config import DetectorConfig, DetectorTypeEnum
from frigate.util import EventsPerSecond
import ctypes
import numpy as np
import tensorrt as trt
import pycuda.driver as cuda
from .object_detector import ObjectDetector
import pycuda.autoinit  # This is needed for initializing CUDA driver

logger = logging.getLogger(__name__)


def object_detector_factory(detector_config: DetectorConfig, model_path: str):
    if detector_config.type != DetectorTypeEnum.tensorrt:
        return None
    try:
        ctypes.cdll.LoadLibrary("/yolo4/libyolo_layer.so")
    except OSError as e:
        logger.error("ERROR: failed to load /yolo4/libyolo_layer.so. %s", e)
    return LocalObjectDetector(detector_config, model_path)


class HostDeviceMem(object):
    """Simple helper data class that's a little nicer to use than a 2-tuple."""

    def __init__(self, host_mem, device_mem):
        self.host = host_mem
        self.device = device_mem

    def __str__(self):
        return "Host:\n" + str(self.host) + "\nDevice:\n" + str(self.device)

    def __repr__(self):
        return self.__str__()


class LocalObjectDetector(ObjectDetector):
    def _load_engine(self, model_path):
        with open(model_path, "rb") as f, trt.Runtime(self.trt_logger) as runtime:
            return runtime.deserialize_cuda_engine(f.read())

    def _get_input_shape(self):
        """Get input shape of the TensorRT YOLO engine."""
        binding = self.engine[0]
        assert self.engine.binding_is_input(binding)
        binding_dims = self.engine.get_binding_shape(binding)
        if len(binding_dims) == 4:
            return tuple(binding_dims[2:])
        elif len(binding_dims) == 3:
            return tuple(binding_dims[1:])
        else:
            raise ValueError(
                "bad dims of binding %s: %s" % (binding, str(binding_dims))
            )

    def _allocate_buffers(self):
        """Allocates all host/device in/out buffers required for an engine."""
        inputs = []
        outputs = []
        bindings = []
        output_idx = 0
        stream = cuda.Stream()
        for binding in self.engine:
            binding_dims = self.engine.get_binding_shape(binding)
            if len(binding_dims) == 4:
                # explicit batch case (TensorRT 7+)
                size = trt.volume(binding_dims)
            elif len(binding_dims) == 3:
                # implicit batch case (TensorRT 6 or older)
                size = trt.volume(binding_dims) * self.engine.max_batch_size
            else:
                raise ValueError(
                    "bad dims of binding %s: %s" % (binding, str(binding_dims))
                )
            dtype = trt.nptype(self.engine.get_binding_dtype(binding))
            # Allocate host and device buffers
            host_mem = cuda.pagelocked_empty(size, dtype)
            device_mem = cuda.mem_alloc(host_mem.nbytes)
            # Append the device buffer to device bindings.
            bindings.append(int(device_mem))
            # Append to the appropriate list.
            if self.engine.binding_is_input(binding):
                inputs.append(HostDeviceMem(host_mem, device_mem))
            else:
                # each grid has 3 anchors, each anchor generates a detection
                # output of 7 float32 values
                assert size % 7 == 0
                outputs.append(HostDeviceMem(host_mem, device_mem))
                output_idx += 1
        assert len(inputs) == 1
        assert len(outputs) == 1
        return inputs, outputs, bindings, stream

    def _do_inference(self):
        """do_inference (for TensorRT 7.0+)

        This function is generalized for multiple inputs/outputs for full
        dimension networks.
        Inputs and outputs are expected to be lists of HostDeviceMem objects.
        """
        # Transfer input data to the GPU.
        [
            cuda.memcpy_htod_async(inp.device, inp.host, self.stream)
            for inp in self.inputs
        ]
        # Run inference.
        self.context.execute_async_v2(
            bindings=self.bindings, stream_handle=self.stream.handle
        )
        # Transfer predictions back from the GPU.
        [
            cuda.memcpy_dtoh_async(out.host, out.device, self.stream)
            for out in self.outputs
        ]
        # Synchronize the stream
        self.stream.synchronize()
        # Return only the host outputs.
        return [out.host for out in self.outputs]

    def __init__(self, detector_config: DetectorConfig, model_path: str):
        self.fps = EventsPerSecond()
        self.conf_th = 0.4  ##TODO: model config parameter
        self.nms_threshold = 0.4
        self.trt_logger = trt.Logger(trt.Logger.INFO)
        self.engine = self._load_engine(model_path)
        self.input_shape = self._get_input_shape()

        try:
            self.context = self.engine.create_execution_context()
            (
                self.inputs,
                self.outputs,
                self.bindings,
                self.stream,
            ) = self._allocate_buffers()
        except Exception as e:
            logger.error(e)
            raise RuntimeError("fail to allocate CUDA resources") from e

        logger.debug("TensorRT loaded. Input shape is %s", self.input_shape)
        logger.debug("TensorRT version is %s", trt.__version__[0])

    def __del__(self):
        """Free CUDA memories."""
        del self.outputs
        del self.inputs
        del self.stream

    def _postprocess_yolo(self, trt_outputs, img_w, img_h, conf_th, nms_threshold):
        """Postprocess TensorRT outputs.

        # Args
            trt_outputs: a list of 2 or 3 tensors, where each tensor
                        contains a multiple of 7 float32 numbers in
                        the order of [x, y, w, h, box_confidence, class_id, class_prob]
            conf_th: confidence threshold

        # Returns
            boxes, scores, classes
        """
        # filter low-conf detections and concatenate results of all yolo layers
        detections = []
        for o in trt_outputs:
            dets = o.reshape((-1, 7))
            dets = dets[dets[:, 4] * dets[:, 6] >= conf_th]
            detections.append(dets)
        detections = np.concatenate(detections, axis=0)

        return detections

    def detect(self, tensor_input, threshold=0.4):
        pass

    def detect_raw(self, tensor_input):
        # Input tensor has the shape of the [height, width, 3]
        # Output tensor of float32 of shape [20, 6] where:
        # O - class id
        # 1 - score
        # 2..5 - a value between 0 and 1 of the box: [top, left, bottom, right]

        # transform [height, width, 3] into (3, H, W)
        tensor_input = tensor_input.transpose((2, 0, 1)).astype(np.float32)

        # normalize
        tensor_input /= 255.0

        self.inputs[0].host = np.ascontiguousarray(tensor_input)
        trt_outputs = self._do_inference()

        raw_detections = self._postprocess_yolo(
            trt_outputs,
            tensor_input.shape[1],
            tensor_input.shape[0],
            self.conf_th,
            nms_threshold=self.nms_threshold,
        )

        if len(raw_detections) == 0:
            return np.zeros((20, 6), np.float32)

        # raw_detections: Nx7 numpy arrays of
        #             [[x, y, w, h, box_confidence, class_id, class_prob],

        # Calculate score as box_confidence x class_prob
        raw_detections[:, 4] = raw_detections[:, 4] * raw_detections[:, 6]
        # Reorder elements by the score, best on top, remove class_prob
        ordered = raw_detections[raw_detections[:, 4].argsort()[::-1]][:, 0:6]
        # transform width to right with clamp to 0..1
        ordered[:, 2] = np.clip(ordered[:, 2] + ordered[:, 0], 0, 1)
        # transform height to bottom with clamp to 0..1
        ordered[:, 3] = np.clip(ordered[:, 3] + ordered[:, 1], 0, 1)
        # put result into the correct order and limit to top 20
        detections = ordered[:, [5, 4, 1, 0, 3, 2]][:20]
        # pad to 20x6 shape
        append_cnt = 20 - len(detections)
        if append_cnt > 0:
            detections = np.append(
                detections, np.zeros((append_cnt, 6), np.float32), axis=0
            )

        self.fps.update()
        return detections
