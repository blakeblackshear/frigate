# The MIT License
#
# Copyright (c) 2020 Alexander Smirnov
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.


import numpy as np
import pycuda.driver as cuda
import tensorrt as trt
import engine
from collections import namedtuple
from pycuda.tools import make_default_context
from pycuda.tools import clear_context_caches

HostDeviceMem = namedtuple('HostDeviceMem', 'host device')


class ObjectDetector():
    def __init__(self):
        self.context = make_default_context()
        self.device = self.context.get_device()

        engine.load_plugins()

        self.trt_runtime = trt.Runtime(engine.TRT_LOGGER)
        self.trt_engine = engine.load_engine(self.trt_runtime, '/gpu_model.buf')

        self._allocate_buffers()
        self.execution_context = self.trt_engine.create_execution_context()

        input_volume = trt.volume(engine.model_input_shape())
        self.numpy_array = np.zeros((self.trt_engine.max_batch_size, input_volume))

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.context.pop()
        self.context = None

        clear_context_caches()

    def detect_raw(self, tensor_input):
        # HWC -> CHW
        img_np = tensor_input.transpose((0, 3, 1, 2))
        # Normalize to [-1.0, 1.0] interval (expected by model)
        img_np = (2.0 / 255.0) * img_np - 1.0
        img_np = img_np.ravel()

        np.copyto(self.inputs[0].host, img_np)
        detection_out, keep_count_out = self._do_inference()

        detections = np.zeros((20, 6), np.float32)
        for i in range(int(keep_count_out[0])):
            if i == detections.shape[0]:
                break
            pred_start_idx = i * 7
            label = detection_out[pred_start_idx + 1] - 1
            score = detection_out[pred_start_idx + 2]
            xmin = detection_out[pred_start_idx + 3]
            ymin = detection_out[pred_start_idx + 4]
            xmax = detection_out[pred_start_idx + 5]
            ymax = detection_out[pred_start_idx + 6]
            detections[i] = [label, score, ymin, xmin, ymax, xmax]

        return detections

    def _do_inference(self):
        [cuda.memcpy_htod_async(inp.device, inp.host, self.stream) for inp in self.inputs]
        self.execution_context.execute_async(batch_size=self.trt_engine.max_batch_size,
                                             bindings=self.bindings,
                                             stream_handle=self.stream.handle)
        [cuda.memcpy_dtoh_async(out.host, out.device, self.stream) for out in self.outputs]
        self.stream.synchronize()
        return [out.host for out in self.outputs]

    def _allocate_buffers(self):
        self.inputs = []
        self.outputs = []
        self.bindings = []
        self.stream = cuda.Stream()

        # NMS implementation in TRT 6 only supports DataType.FLOAT
        binding_to_type = {"Input": np.float32,
                           "NMS": np.float32,
                           "NMS_1": np.int32}
        for binding in self.trt_engine:
            size = trt.volume(self.trt_engine.get_binding_shape(binding)) * self.trt_engine.max_batch_size
            dtype = binding_to_type[str(binding)]

            # Allocate host and device buffers
            host_mem = cuda.pagelocked_empty(size, dtype)
            device_mem = cuda.mem_alloc(host_mem.nbytes)

            # Append the device buffer to device bindings.
            self.bindings.append(int(device_mem))

            # Append to the appropriate list.
            if self.trt_engine.binding_is_input(binding):
                self.inputs.append(HostDeviceMem(host_mem, device_mem))
            else:
                self.outputs.append(HostDeviceMem(host_mem, device_mem))
