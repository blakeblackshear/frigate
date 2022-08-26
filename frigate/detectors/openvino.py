import logging
import numpy as np
import openvino.runtime as ov

from frigate.detectors.detection_api import DetectionApi


logger = logging.getLogger(__name__)


class OvDetector(DetectionApi):
    def __init__(self, det_device=None, model_path=None, num_threads=1):
        self.ov_core = ov.Core()
        self.ov_model = self.ov_core.read_model(model_path)
        self.interpreter = self.ov_core.compile_model(
            model=self.ov_model, device_name=det_device
        )
        logger.info(f"Model Input Shape: {self.interpreter.input().shape}")
        logger.info(f"Model Output Shape: {self.interpreter.output().shape}")

    def detect_raw(self, tensor_input):
        tensor_transpose = np.reshape(tensor_input, self.interpreter.input().shape)

        infer_request = self.interpreter.create_infer_request()
        results = infer_request.infer([tensor_transpose])

        # class_ids = self.interpreter.tensor(self.tensor_output_details[1]["index"])()[0]
        # scores = self.interpreter.tensor(self.tensor_output_details[2]["index"])()[0]
        # count = int(
        #     self.interpreter.tensor(self.tensor_output_details[3]["index"])()[0]
        # # )

        # class_ids = results[0, 0, :, 1]
        # # class_ids = [0, 0, 1, 1]
        # print(class_ids)

        # scores = results
        # print(scores)

        detections = np.zeros((20, 6), np.float32)
        # i = 0
        # for object_detected in results["detection_out"][0, 0, :]:
        #     if object_detected[2] < 0.1 or i == 20:
        #         break
        #     detections.append(
        #         [
        #             object_detected[1],
        #             float(object_detected[2]),
        #             object_detected[3],
        #             object_detected[4],
        #             object_detected[5],
        #             object_detected[6],
        #         ]
        #     )
        #     i += 1

        return detections
