"""Model Utils"""

import logging
import os
from typing import Any, Optional

import numpy as np
import onnxruntime as ort
from playhouse.sqliteq import SqliteQueueDatabase
from sklearn.preprocessing import LabelEncoder, Normalizer
from sklearn.svm import SVC

from frigate.config.semantic_search import FaceRecognitionConfig
from frigate.util.builtin import deserialize, serialize

try:
    import openvino as ov
except ImportError:
    # openvino is not included
    pass

logger = logging.getLogger(__name__)


MIN_MATCHING_FACES = 2


def get_ort_providers(
    force_cpu: bool = False, device: str = "AUTO", requires_fp16: bool = False
) -> tuple[list[str], list[dict[str, any]]]:
    if force_cpu:
        return (
            ["CPUExecutionProvider"],
            [
                {
                    "enable_cpu_mem_arena": False,
                }
            ],
        )

    providers = []
    options = []

    for provider in ort.get_available_providers():
        if provider == "CUDAExecutionProvider":
            device_id = 0 if not device.isdigit() else int(device)
            providers.append(provider)
            options.append(
                {
                    "arena_extend_strategy": "kSameAsRequested",
                    "device_id": device_id,
                }
            )
        elif provider == "TensorrtExecutionProvider":
            # TensorrtExecutionProvider uses too much memory without options to control it
            # so it is not enabled by default
            if device == "Tensorrt":
                os.makedirs(
                    "/config/model_cache/tensorrt/ort/trt-engines", exist_ok=True
                )
                device_id = 0 if not device.isdigit() else int(device)
                providers.append(provider)
                options.append(
                    {
                        "device_id": device_id,
                        "trt_fp16_enable": requires_fp16
                        and os.environ.get("USE_FP_16", "True") != "False",
                        "trt_timing_cache_enable": True,
                        "trt_engine_cache_enable": True,
                        "trt_timing_cache_path": "/config/model_cache/tensorrt/ort",
                        "trt_engine_cache_path": "/config/model_cache/tensorrt/ort/trt-engines",
                    }
                )
            else:
                continue
        elif provider == "OpenVINOExecutionProvider":
            os.makedirs("/config/model_cache/openvino/ort", exist_ok=True)
            providers.append(provider)
            options.append(
                {
                    "arena_extend_strategy": "kSameAsRequested",
                    "cache_dir": "/config/model_cache/openvino/ort",
                    "device_type": device,
                }
            )
        elif provider == "CPUExecutionProvider":
            providers.append(provider)
            options.append(
                {
                    "enable_cpu_mem_arena": False,
                }
            )
        else:
            providers.append(provider)
            options.append({})

    return (providers, options)


class ONNXModelRunner:
    """Run onnx models optimally based on available hardware."""

    def __init__(self, model_path: str, device: str, requires_fp16: bool = False):
        self.model_path = model_path
        self.ort: ort.InferenceSession = None
        self.ov: ov.Core = None
        providers, options = get_ort_providers(device == "CPU", device, requires_fp16)
        self.interpreter = None

        if "OpenVINOExecutionProvider" in providers:
            try:
                # use OpenVINO directly
                self.type = "ov"
                self.ov = ov.Core()
                self.ov.set_property(
                    {ov.properties.cache_dir: "/config/model_cache/openvino"}
                )
                self.interpreter = self.ov.compile_model(
                    model=model_path, device_name=device
                )
            except Exception as e:
                logger.warning(
                    f"OpenVINO failed to build model, using CPU instead: {e}"
                )
                self.interpreter = None

        # Use ONNXRuntime
        if self.interpreter is None:
            self.type = "ort"
            self.ort = ort.InferenceSession(
                model_path,
                providers=providers,
                provider_options=options,
            )

    def get_input_names(self) -> list[str]:
        if self.type == "ov":
            input_names = []

            for input in self.interpreter.inputs:
                input_names.extend(input.names)

            return input_names
        elif self.type == "ort":
            return [input.name for input in self.ort.get_inputs()]

    def run(self, input: dict[str, Any]) -> Any:
        if self.type == "ov":
            infer_request = self.interpreter.create_infer_request()
            input_tensor = list(input.values())

            if len(input_tensor) == 1:
                input_tensor = ov.Tensor(array=input_tensor[0])
            else:
                input_tensor = ov.Tensor(array=input_tensor)

            infer_request.infer(input_tensor)
            return [infer_request.get_output_tensor().data]
        elif self.type == "ort":
            return self.ort.run(None, input)


class FaceClassificationModel:
    def __init__(self, config: FaceRecognitionConfig, db: SqliteQueueDatabase):
        self.config = config
        self.db = db
        self.labeler: Optional[LabelEncoder] = None
        self.classifier: Optional[SVC] = None
        self.embedding_query = f"""
            SELECT
                id,
                distance
            FROM vec_faces
            WHERE face_embedding MATCH ?
                AND k = {MIN_MATCHING_FACES} ORDER BY distance
        """

    def __build_classifier(self) -> None:
        faces: list[tuple[str, bytes]] = self.db.execute_sql(
            "SELECT id, face_embedding FROM vec_faces"
        ).fetchall()
        embeddings = np.array([deserialize(f[1]) for f in faces])
        self.labeler = LabelEncoder()
        norms = Normalizer(norm="l2").transform(embeddings)
        labels = self.labeler.fit_transform([f[0].split("-")[0] for f in faces])
        self.classifier = SVC(
            kernel="linear", probability=True, decision_function_shape="ovo"
        )
        self.classifier.fit(norms, labels)

    def clear_classifier(self) -> None:
        self.classifier = None
        self.labeler = None

    def classify_face(self, embedding: np.ndarray) -> Optional[tuple[str, float]]:
        best_faces = self.db.execute_sql(
            self.embedding_query, [serialize(embedding)]
        ).fetchall()
        logger.debug(f"Face embedding match: {best_faces}")

        if not best_faces or len(best_faces) < MIN_MATCHING_FACES:
            logger.debug(
                f"{len(best_faces)} < {MIN_MATCHING_FACES} min required faces."
            )
            return None

        sub_label = str(best_faces[0][0]).split("-")[0]
        avg_score = 0

        # check that the cosine similarity is close enough to match the face
        for face in best_faces:
            score = 1.0 - face[1]

            if face[0].split("-")[0] != sub_label:
                logger.debug("Detected multiple faces, result is not valid.")
                return None

            avg_score += score

        avg_score = round(avg_score / MIN_MATCHING_FACES, 2)

        if avg_score < self.config.threshold:
            logger.debug(
                f"Recognized face score {avg_score} is less than threshold ({self.config.threshold}))."
            )
            return None

        if not self.classifier:
            self.__build_classifier()

        cosine_index = self.labeler.transform([sub_label])[0]
        probabilities: list[float] = self.classifier.predict_proba([embedding])[0]
        svc_probability = max(probabilities)
        logger.debug(f"SVC face classification probability: {svc_probability} and index match: {cosine_index} / {probabilities.index(svc_probability)}")

        if cosine_index == probabilities.index(svc_probability):
            return (
                sub_label,
                min(avg_score, svc_probability),
            )

        return None
