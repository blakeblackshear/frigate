import logging

import ctypes
import numpy as np

try:
    import tensorrt as trt
    from cuda import cuda

    TRT_SUPPORT = True
except ModuleNotFoundError as e:
    TRT_SUPPORT = False

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from typing import Literal
from pydantic import Field

logger = logging.getLogger(__name__)

DETECTOR_KEY = "tensorrt"

if TRT_SUPPORT:

    class TrtLogger(trt.ILogger):
        def __init__(self):
            trt.ILogger.__init__(self)

        def log(self, severity, msg):
            logger.log(self.getSeverity(severity), msg)

        def getSeverity(self, sev: trt.ILogger.Severity) -> int:
            if sev == trt.ILogger.VERBOSE:
                return logging.DEBUG
            elif sev == trt.ILogger.INFO:
                return logging.INFO
            elif sev == trt.ILogger.WARNING:
                return logging.WARNING
            elif sev == trt.ILogger.ERROR:
                return logging.ERROR
            elif sev == trt.ILogger.INTERNAL_ERROR:
                return logging.CRITICAL
            else:
                return logging.DEBUG


class TensorRTDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: int = Field(default=0, title="GPU Device Index")


class HostDeviceMem(object):
    """Simple helper data class that's a little nicer to use than a 2-tuple."""

    def __init__(self, host_mem, device_mem, nbytes, size):
        self.host = host_mem
        err, self.host_dev = cuda.cuMemHostGetDevicePointer(self.host, 0)
        self.device = device_mem
        self.nbytes = nbytes
        self.size = size

    def __str__(self):
        return "Host:\n" + str(self.host) + "\nDevice:\n" + str(self.device)

    def __repr__(self):
        return self.__str__()

    def __del__(self):
        cuda.cuMemFreeHost(self.host)
        cuda.cuMemFree(self.device)


class TensorRtDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def _load_engine(self, model_path):
        try:
            trt.init_libnvinfer_plugins(self.trt_logger, "")

            ctypes.cdll.LoadLibrary("/trt-models/libyolo_layer.so")
        except OSError as e:
            logger.error(
                "ERROR: failed to load libraries. %s",
                e,
            )

        with open(model_path, "rb") as f, trt.Runtime(self.trt_logger) as runtime:
            return runtime.deserialize_cuda_engine(f.read())

    def _get_input_shape(self):
        """Get input shape of the TensorRT YOLO engine."""
        binding = self.engine[0]
        assert self.engine.binding_is_input(binding)
        binding_dims = self.engine.get_binding_shape(binding)
        if len(binding_dims) == 4:
            return (
                tuple(binding_dims[2:]),
                trt.nptype(self.engine.get_binding_dtype(binding)),
            )
        elif len(binding_dims) == 3:
            return (
                tuple(binding_dims[1:]),
                trt.nptype(self.engine.get_binding_dtype(binding)),
            )
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
            nbytes = size * self.engine.get_binding_dtype(binding).itemsize
            # Allocate host and device buffers
            err, host_mem = cuda.cuMemHostAlloc(
                nbytes, Flags=cuda.CU_MEMHOSTALLOC_DEVICEMAP
            )
            assert err is cuda.CUresult.CUDA_SUCCESS, f"cuMemAllocHost returned {err}"
            logger.debug(
                f"Allocated Tensor Binding {binding} Memory {nbytes} Bytes ({size} * {self.engine.get_binding_dtype(binding)})"
            )
            err, device_mem = cuda.cuMemAlloc(nbytes)
            assert err is cuda.CUresult.CUDA_SUCCESS, f"cuMemAlloc returned {err}"
            # Append the device buffer to device bindings.
            bindings.append(int(device_mem))
            # Append to the appropriate list.
            if self.engine.binding_is_input(binding):
                logger.debug(f"Input has Shape {binding_dims}")
                inputs.append(HostDeviceMem(host_mem, device_mem, nbytes, size))
            else:
                # each grid has 3 anchors, each anchor generates a detection
                # output of 7 float32 values
                assert size % 7 == 0, f"output size was {size}"
                logger.debug(f"Output has Shape {binding_dims}")
                outputs.append(HostDeviceMem(host_mem, device_mem, nbytes, size))
                output_idx += 1
        assert len(inputs) == 1, f"inputs len was {len(inputs)}"
        assert len(outputs) == 1, f"output len was {len(outputs)}"
        return inputs, outputs, bindings

    def _do_inference(self):
        """do_inference (for TensorRT 7.0+)
        This function is generalized for multiple inputs/outputs for full
        dimension networks.
        Inputs and outputs are expected to be lists of HostDeviceMem objects.
        """
        # Push CUDA Context
        cuda.cuCtxPushCurrent(self.cu_ctx)

        # Transfer input data to the GPU.
        [
            cuda.cuMemcpyHtoDAsync(inp.device, inp.host, inp.nbytes, self.stream)
            for inp in self.inputs
        ]

        # Run inference.
        if not self.context.execute_async_v2(
            bindings=self.bindings, stream_handle=self.stream
        ):
            logger.warn(f"Execute returned false")

        # Transfer predictions back from the GPU.
        [
            cuda.cuMemcpyDtoHAsync(out.host, out.device, out.nbytes, self.stream)
            for out in self.outputs
        ]

        # Synchronize the stream
        cuda.cuStreamSynchronize(self.stream)

        # Pop CUDA Context
        cuda.cuCtxPopCurrent()

        # Return only the host outputs.
        return [
            np.array(
                (ctypes.c_float * out.size).from_address(out.host), dtype=np.float32
            )
            for out in self.outputs
        ]

    def __init__(self, detector_config: TensorRTDetectorConfig):
        assert (
            TRT_SUPPORT
        ), f"TensorRT libraries not found, {DETECTOR_KEY} detector not present"

        (cuda_err,) = cuda.cuInit(0)
        assert (
            cuda_err == cuda.CUresult.CUDA_SUCCESS
        ), f"Failed to initialize cuda {cuda_err}"
        err, dev_count = cuda.cuDeviceGetCount()
        logger.debug(f"Num Available Devices: {dev_count}")
        assert (
            detector_config.device < dev_count
        ), f"Invalid TensorRT Device Config. Device {detector_config.device} Invalid."
        err, self.cu_ctx = cuda.cuCtxCreate(
            cuda.CUctx_flags.CU_CTX_MAP_HOST, detector_config.device
        )

        self.conf_th = 0.4  ##TODO: model config parameter
        self.nms_threshold = 0.4
        err, self.stream = cuda.cuStreamCreate(0)
        self.trt_logger = TrtLogger()
        self.engine = self._load_engine(detector_config.model.path)
        self.input_shape = self._get_input_shape()

        try:
            self.context = self.engine.create_execution_context()
            (
                self.inputs,
                self.outputs,
                self.bindings,
            ) = self._allocate_buffers()
        except Exception as e:
            logger.error(e)
            raise RuntimeError("fail to allocate CUDA resources") from e

        logger.debug("TensorRT loaded. Input shape is %s", self.input_shape)
        logger.debug("TensorRT version is %s", trt.__version__[0])

    def __del__(self):
        """Free CUDA memories."""
        if self.outputs is not None:
            del self.outputs
        if self.inputs is not None:
            del self.inputs
        if self.stream is not None:
            cuda.cuStreamDestroy(self.stream)
            del self.stream
        del self.engine
        del self.context
        del self.trt_logger
        cuda.cuCtxDestroy(self.cu_ctx)

    def _postprocess_yolo(self, trt_outputs, conf_th):
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

    def detect_raw(self, tensor_input):
        # Input tensor has the shape of the [height, width, 3]
        # Output tensor of float32 of shape [20, 6] where:
        # O - class id
        # 1 - score
        # 2..5 - a value between 0 and 1 of the box: [top, left, bottom, right]

        # normalize
        if self.input_shape[-1] != trt.int8:
            tensor_input = tensor_input.astype(self.input_shape[-1])
            tensor_input /= 255.0

        self.inputs[0].host = np.ascontiguousarray(
            tensor_input.astype(self.input_shape[-1])
        )
        trt_outputs = self._do_inference()

        raw_detections = self._postprocess_yolo(trt_outputs, self.conf_th)

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

        return detections
