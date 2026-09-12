"""Real time processor that works with classification tflite models."""

import datetime
import logging
import os
from typing import Any

import cv2
import numpy as np

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.comms.event_metadata_updater import EventMetadataPublisher
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.config.classification import CustomClassificationConfig
from frigate.const import CLIPS_DIR, MODEL_CACHE_DIR
from frigate.log import suppress_stderr_during
from frigate.util.builtin import EventsPerSecond, InferenceSpeed, load_labels
from frigate.util.image import calculate_region
from frigate.util.object import box_overlaps

from ..types import DataProcessorMetrics
from .api import DeferredRealtimeProcessorApi

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from ai_edge_litert.interpreter import Interpreter

logger = logging.getLogger(__name__)

MAX_OBJECT_CLASSIFICATIONS = 16


class CustomStateClassificationProcessor(DeferredRealtimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        model_config: CustomClassificationConfig,
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics, max_queue=4)
        self.model_config = model_config

        if not self.model_config.name:
            raise ValueError("Custom classification model name must be set.")

        self.requestor = requestor
        self.model_dir = os.path.join(MODEL_CACHE_DIR, self.model_config.name)
        self.train_dir = os.path.join(CLIPS_DIR, self.model_config.name, "train")
        self.interpreter: Interpreter | None = None
        self.tensor_input_details: list[dict[str, Any]] | None = None
        self.tensor_output_details: list[dict[str, Any]] | None = None
        self.labelmap: dict[int, str] = {}
        self.classifications_per_second = EventsPerSecond()
        self.state_history: dict[str, dict[str, Any]] = {}

        if (
            self.metrics
            and self.model_config.name in self.metrics.classification_speeds
        ):
            self.inference_speed: InferenceSpeed | None = InferenceSpeed(
                self.metrics.classification_speeds[self.model_config.name]
            )
        else:
            self.inference_speed = None

        self.last_run = datetime.datetime.now().timestamp()
        self.__build_detector()

    def __build_detector(self) -> None:
        model_path = os.path.join(self.model_dir, "model.tflite")
        labelmap_path = os.path.join(self.model_dir, "labelmap.txt")

        if not os.path.exists(model_path) or not os.path.exists(labelmap_path):
            self.interpreter = None
            self.tensor_input_details = None
            self.tensor_output_details = None
            self.labelmap = {}
            return

        # Suppress TFLite delegate creation messages that bypass Python logging
        with suppress_stderr_during("tflite_interpreter_init"):
            self.interpreter = Interpreter(
                model_path=model_path,
                num_threads=2,
            )
            self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
        self.labelmap = load_labels(labelmap_path, prefill=0, indexed=False)
        self.classifications_per_second.start()

    def __update_metrics(self, duration: float) -> None:
        self.classifications_per_second.update()
        if self.inference_speed:
            self.inference_speed.update(duration)

    def _should_save_image(
        self, camera: str, detected_state: str, score: float = 1.0
    ) -> bool:
        """
        Determine if we should save the image for training.
        Save when:
        - State is changing or being verified (regardless of score)
        - Score is less than 100% (even if state matches, useful for training)
        Don't save when:
        - State is stable (matches current_state) AND score is 100%
        """
        if camera not in self.state_history:
            # First detection for this camera, save it
            return True

        verification = self.state_history[camera]
        current_state = verification.get("current_state")
        pending_state = verification.get("pending_state")

        # Save if there's a pending state change being verified
        if pending_state is not None:
            return True

        # Save if the detected state differs from the current verified state
        # (state is changing)
        if current_state is not None and detected_state != current_state:
            return True

        # If score is less than 100%, save even if state matches
        # (useful for training to improve confidence)
        if score < 1.0:
            return True

        # Don't save if state is stable (detected_state == current_state) AND score is 100%
        return False

    def verify_state_change(self, camera: str, detected_state: str) -> str | None:
        """
        Verify state change requires 3 consecutive identical states before publishing.
        Returns state to publish or None if verification not complete.
        """
        if camera not in self.state_history:
            self.state_history[camera] = {
                "current_state": None,
                "pending_state": None,
                "consecutive_count": 0,
            }

        verification = self.state_history[camera]

        if detected_state == verification["current_state"]:
            verification["pending_state"] = None
            verification["consecutive_count"] = 0
            return None

        if detected_state == verification["pending_state"]:
            verification["consecutive_count"] += 1

            if verification["consecutive_count"] >= 3:
                verification["current_state"] = detected_state
                verification["pending_state"] = None
                verification["consecutive_count"] = 0
                return detected_state
        else:
            verification["pending_state"] = detected_state
            verification["consecutive_count"] = 1
            logger.debug(
                f"New state '{detected_state}' detected for {camera}, need {3 - verification['consecutive_count']} more consecutive detections"
            )

        return None

    def process_frame(self, frame_data: dict[str, Any], frame: np.ndarray) -> None:
        if (
            not self.model_config.name
            or not self.model_config.state_config
            or not self.tensor_input_details
            or not self.tensor_output_details
        ):
            return

        if self.metrics and self.model_config.name in self.metrics.classification_cps:
            self.metrics.classification_cps[
                self.model_config.name
            ].value = self.classifications_per_second.eps()
        camera = str(frame_data.get("camera"))

        if camera not in self.model_config.state_config.cameras:
            return

        camera_config = self.model_config.state_config.cameras[camera]
        crop = [
            camera_config.crop[0] * self.config.cameras[camera].detect.width,
            camera_config.crop[1] * self.config.cameras[camera].detect.height,
            camera_config.crop[2] * self.config.cameras[camera].detect.width,
            camera_config.crop[3] * self.config.cameras[camera].detect.height,
        ]
        should_run = False

        now = datetime.datetime.now().timestamp()
        if (
            self.model_config.state_config.interval
            and now > self.last_run + self.model_config.state_config.interval
        ):
            self.last_run = now
            should_run = True

        if (
            not should_run
            and self.model_config.state_config.motion
            and any([box_overlaps(crop, mb) for mb in frame_data.get("motion", [])])
        ):
            # classification should run at most once per second
            if now > self.last_run + 1:
                self.last_run = now
                should_run = True

        # Shortcut: always run if we have a pending state verification to complete
        if (
            not should_run
            and camera in self.state_history
            and self.state_history[camera]["pending_state"] is not None
            and now > self.last_run + 0.5
        ):
            self.last_run = now
            should_run = True
            logger.debug(
                f"Running verification check for pending state: {self.state_history[camera]['pending_state']} ({self.state_history[camera]['consecutive_count']}/3)"
            )

        if not should_run:
            return

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        height, width = rgb.shape[:2]

        # Convert normalized crop coordinates to pixel values
        x1 = int(camera_config.crop[0] * width)
        y1 = int(camera_config.crop[1] * height)
        x2 = int(camera_config.crop[2] * width)
        y2 = int(camera_config.crop[3] * height)

        # Clip coordinates to frame boundaries
        x1 = max(0, min(x1, width))
        y1 = max(0, min(y1, height))
        x2 = max(0, min(x2, width))
        y2 = max(0, min(y2, height))

        if x2 <= x1 or y2 <= y1:
            logger.warning(
                f"Invalid crop coordinates for {camera}: [{x1}, {y1}, {x2}, {y2}]"
            )
            return

        cropped_frame = rgb[y1:y2, x1:x2]

        try:
            resized_frame = cv2.resize(cropped_frame, (224, 224))
        except Exception:
            logger.warning("Failed to resize image for state classification")
            return

        # Copy for training image saves on worker thread
        crop_bgr = cv2.cvtColor(cropped_frame, cv2.COLOR_RGB2BGR)

        self._enqueue_task(("classify", camera, now, resized_frame, crop_bgr))

    def _process_task(self, task: Any) -> None:
        kind = task[0]
        if kind == "classify":
            _, camera, timestamp, resized_frame, crop_bgr = task
            self._classify_state(camera, timestamp, resized_frame, crop_bgr)
        elif kind == "reload":
            self.__build_detector()

    def _classify_state(
        self,
        camera: str,
        timestamp: float,
        resized_frame: np.ndarray,
        crop_bgr: np.ndarray,
    ) -> None:
        if self.interpreter is None:
            # When interpreter is None, always save (score is 0.0, which is < 1.0)
            if self._should_save_image(camera, "unknown", 0.0):
                save_attempts = (
                    self.model_config.save_attempts
                    if self.model_config.save_attempts is not None
                    else 100
                )
                write_classification_attempt(
                    self.train_dir,
                    crop_bgr,
                    "none-none",
                    timestamp,
                    "unknown",
                    0.0,
                    max_files=save_attempts,
                )
            return

        if not self.tensor_input_details or not self.tensor_output_details:
            return

        input = np.expand_dims(resized_frame, axis=0)
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], input)
        self.interpreter.invoke()
        res: np.ndarray = self.interpreter.get_tensor(
            self.tensor_output_details[0]["index"]
        )[0]
        probs = res / res.sum(axis=0)
        logger.debug(
            f"{self.model_config.name} Ran state classification with probabilities: {probs}"
        )
        best_id = int(np.argmax(probs))
        score = round(probs[best_id], 2)
        self.__update_metrics(datetime.datetime.now().timestamp() - timestamp)

        detected_state = self.labelmap[best_id]

        if self._should_save_image(camera, detected_state, score):
            save_attempts = (
                self.model_config.save_attempts
                if self.model_config.save_attempts is not None
                else 100
            )
            write_classification_attempt(
                self.train_dir,
                crop_bgr,
                "none-none",
                timestamp,
                detected_state,
                score,
                max_files=save_attempts,
            )

        if score < self.model_config.threshold:
            logger.debug(
                f"Score {score} below threshold {self.model_config.threshold}, skipping verification"
            )
            return

        verified_state = self.verify_state_change(camera, detected_state)

        if verified_state is not None:
            self._emit_result(
                {
                    "type": "classification",
                    "processor": "state",
                    "model_name": self.model_config.name,
                    "camera": camera,
                    "state": verified_state,
                }
            )

    def handle_request(
        self, topic: str, request_data: dict[str, Any]
    ) -> dict[str, Any] | None:
        if topic == EmbeddingsRequestEnum.reload_classification_model.value:
            if request_data.get("model_name") == self.model_config.name:

                def _do_reload(data: dict[str, Any]) -> dict[str, Any]:
                    self.__build_detector()
                    logger.info(
                        f"Successfully loaded updated model for {self.model_config.name}"
                    )
                    return {
                        "success": True,
                        "message": f"Loaded {self.model_config.name} model.",
                    }

                result: dict[str, Any] = self._enqueue_request(_do_reload, request_data)
                return result
            else:
                return None
        else:
            return None

    def expire_object(self, object_id: str, camera: str) -> None:
        pass


class CustomObjectClassificationProcessor(DeferredRealtimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        model_config: CustomClassificationConfig,
        sub_label_publisher: EventMetadataPublisher,
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics, max_queue=8)
        self.model_config = model_config

        if not self.model_config.name:
            raise ValueError("Custom classification model name must be set.")

        self.model_dir = os.path.join(MODEL_CACHE_DIR, self.model_config.name)
        self.train_dir = os.path.join(CLIPS_DIR, self.model_config.name, "train")
        self.interpreter: Interpreter | None = None
        self.sub_label_publisher = sub_label_publisher
        self.requestor = requestor
        self.tensor_input_details: list[dict[str, Any]] | None = None
        self.tensor_output_details: list[dict[str, Any]] | None = None
        self.classification_history: dict[str, list[tuple[str, float, float]]] = {}
        self.labelmap: dict[int, str] = {}
        self.classifications_per_second = EventsPerSecond()

        if (
            self.metrics
            and self.model_config.name in self.metrics.classification_speeds
        ):
            self.inference_speed: InferenceSpeed | None = InferenceSpeed(
                self.metrics.classification_speeds[self.model_config.name]
            )
        else:
            self.inference_speed = None

        self.__build_detector()

    def __build_detector(self) -> None:
        model_path = os.path.join(self.model_dir, "model.tflite")
        labelmap_path = os.path.join(self.model_dir, "labelmap.txt")

        if not os.path.exists(model_path) or not os.path.exists(labelmap_path):
            self.interpreter = None
            self.tensor_input_details = None
            self.tensor_output_details = None
            self.labelmap = {}
            return

        # Suppress TFLite delegate creation messages that bypass Python logging
        with suppress_stderr_during("tflite_interpreter_init"):
            self.interpreter = Interpreter(
                model_path=model_path,
                num_threads=2,
            )
            self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
        self.labelmap = load_labels(labelmap_path, prefill=0, indexed=False)

    def __update_metrics(self, duration: float) -> None:
        self.classifications_per_second.update()
        if self.inference_speed:
            self.inference_speed.update(duration)

    def get_weighted_score(
        self,
        object_id: str,
        current_label: str,
        current_score: float,
        current_time: float,
    ) -> tuple[str | None, float]:
        """
        Determine weighted score based on history to prevent false positives/negatives.
        Requires 60% of attempts to agree on a label before publishing.
        Returns (weighted_label, weighted_score) or (None, 0.0) if no weighted score.
        """
        if object_id not in self.classification_history:
            self.classification_history[object_id] = []
            logger.debug(f"Created new classification history for {object_id}")

        self.classification_history[object_id].append(
            (current_label, current_score, current_time)
        )

        history = self.classification_history[object_id]
        logger.debug(
            f"History for {object_id}: {len(history)} entries, latest=({current_label}, {current_score})"
        )

        if len(history) < 3:
            logger.debug(
                f"History for {object_id} has {len(history)} entries, need at least 3"
            )
            return None, 0.0

        label_counts: dict[str, int] = {}
        label_scores: dict[str, list[float]] = {}
        total_attempts = len(history)

        for label, score, timestamp in history:
            if label not in label_counts:
                label_counts[label] = 0
                label_scores[label] = []

            label_counts[label] += 1
            label_scores[label].append(score)

        best_label = max(label_counts, key=lambda k: label_counts[k])
        best_count = label_counts[best_label]

        consensus_threshold = total_attempts * 0.6
        logger.debug(
            f"Consensus calc for {object_id}: label_counts={label_counts}, "
            f"best_label={best_label}, best_count={best_count}, "
            f"total={total_attempts}, threshold={consensus_threshold}"
        )

        if best_count < consensus_threshold:
            logger.debug(
                f"No consensus for {object_id}: {best_count} < {consensus_threshold}"
            )
            return None, 0.0

        avg_score = sum(label_scores[best_label]) / len(label_scores[best_label])

        if best_label == "none":
            logger.debug(f"Filtering 'none' label for {object_id}")
            return None, 0.0

        logger.debug(
            f"Consensus reached for {object_id}: {best_label} with avg_score={avg_score}"
        )
        return best_label, avg_score

    def process_frame(self, obj_data: dict[str, Any], frame: np.ndarray) -> None:
        if (
            not self.model_config.name
            or not self.model_config.object_config
            or not self.tensor_input_details
            or not self.tensor_output_details
        ):
            return

        if self.metrics and self.model_config.name in self.metrics.classification_cps:
            self.metrics.classification_cps[
                self.model_config.name
            ].value = self.classifications_per_second.eps()

        if obj_data["false_positive"]:
            return

        if obj_data["label"] not in self.model_config.object_config.objects:
            return

        if obj_data.get("end_time") is not None:
            return

        object_id = obj_data["id"]

        if (
            object_id in self.classification_history
            and len(self.classification_history[object_id])
            >= MAX_OBJECT_CLASSIFICATIONS
        ):
            return

        now = datetime.datetime.now().timestamp()
        x, y, x2, y2 = calculate_region(
            frame.shape,
            obj_data["box"][0],
            obj_data["box"][1],
            obj_data["box"][2],
            obj_data["box"][3],
            max(
                obj_data["box"][2] - obj_data["box"][0],
                obj_data["box"][3] - obj_data["box"][1],
            ),
            1.0,
        )

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        crop = rgb[y:y2, x:x2]

        try:
            resized_crop = cv2.resize(crop, (224, 224))
        except Exception:
            logger.warning("Failed to resize image for object classification")
            return

        # Copy crop for training images (will be used on worker thread)
        crop_bgr = cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)

        self._enqueue_task(
            ("classify", object_id, obj_data["camera"], now, resized_crop, crop_bgr)
        )

    def _process_task(self, task: Any) -> None:
        kind = task[0]
        if kind == "classify":
            _, object_id, camera, timestamp, resized_crop, crop_bgr = task
            self._classify_object(object_id, camera, timestamp, resized_crop, crop_bgr)
        elif kind == "expire":
            _, object_id = task
            if object_id in self.classification_history:
                self.classification_history.pop(object_id)
        elif kind == "reload":
            self.__build_detector()

    def _classify_object(
        self,
        object_id: str,
        camera: str,
        timestamp: float,
        resized_crop: np.ndarray,
        crop_bgr: np.ndarray,
    ) -> None:
        if self.interpreter is None:
            save_attempts = (
                self.model_config.save_attempts
                if self.model_config.save_attempts is not None
                else 200
            )
            write_classification_attempt(
                self.train_dir,
                crop_bgr,
                object_id,
                timestamp,
                "unknown",
                0.0,
                max_files=save_attempts,
            )

            # Still track history even when model doesn't exist to respect MAX_OBJECT_CLASSIFICATIONS
            # Add an entry with "unknown" label so the history limit is enforced
            if object_id not in self.classification_history:
                self.classification_history[object_id] = []

            self.classification_history[object_id].append(("unknown", 0.0, timestamp))
            return

        if not self.tensor_input_details or not self.tensor_output_details:
            return

        input = np.expand_dims(resized_crop, axis=0)
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], input)
        self.interpreter.invoke()
        res: np.ndarray = self.interpreter.get_tensor(
            self.tensor_output_details[0]["index"]
        )[0]
        probs = res / res.sum(axis=0)
        logger.debug(
            f"{self.model_config.name} Ran object classification with probabilities: {probs}"
        )
        best_id = int(np.argmax(probs))
        score = round(probs[best_id], 2)
        self.__update_metrics(datetime.datetime.now().timestamp() - timestamp)

        save_attempts = (
            self.model_config.save_attempts
            if self.model_config.save_attempts is not None
            else 200
        )
        write_classification_attempt(
            self.train_dir,
            crop_bgr,
            object_id,
            timestamp,
            self.labelmap[best_id],
            score,
            max_files=save_attempts,
        )

        if score < self.model_config.threshold:
            logger.debug(
                f"{self.model_config.name}: Score {score} < threshold {self.model_config.threshold} for {object_id}, skipping"
            )
            return

        sub_label = self.labelmap[best_id]

        logger.debug(
            f"{self.model_config.name}: Object {object_id} passed threshold with sub_label={sub_label}, score={score}"
        )

        consensus_label, consensus_score = self.get_weighted_score(
            object_id, sub_label, score, timestamp
        )

        logger.debug(
            f"{self.model_config.name}: get_weighted_score returned consensus_label={consensus_label}, consensus_score={consensus_score} for {object_id}"
        )

        if consensus_label is not None and self.model_config.object_config is not None:
            self._emit_result(
                {
                    "type": "classification",
                    "processor": "object",
                    "model_name": self.model_config.name,
                    "classification_type": self.model_config.object_config.classification_type,
                    "object_id": object_id,
                    "camera": camera,
                    "timestamp": timestamp,
                    "label": consensus_label,
                    "score": consensus_score,
                }
            )

    def handle_request(
        self, topic: str, request_data: dict[str, Any]
    ) -> dict[str, Any] | None:
        if topic == EmbeddingsRequestEnum.reload_classification_model.value:
            if request_data.get("model_name") == self.model_config.name:

                def _do_reload(data: dict[str, Any]) -> dict[str, Any]:
                    self.__build_detector()
                    logger.info(
                        f"Successfully loaded updated model for {self.model_config.name}"
                    )
                    return {
                        "success": True,
                        "message": f"Loaded {self.model_config.name} model.",
                    }

                result: dict[str, Any] = self._enqueue_request(_do_reload, request_data)
                return result
            else:
                return None
        else:
            return None

    def expire_object(self, object_id: str, camera: str) -> None:
        self._enqueue_task(("expire", object_id))


def write_classification_attempt(
    folder: str,
    frame: np.ndarray,
    event_id: str,
    timestamp: float,
    label: str,
    score: float,
    max_files: int = 100,
) -> None:
    if "-" in label:
        label = label.replace("-", "_")

    file = os.path.join(folder, f"{event_id}-{timestamp}-{label}-{score}.webp")
    os.makedirs(folder, exist_ok=True)
    cv2.imwrite(file, frame)

    # delete oldest face image if maximum is reached
    try:
        files = sorted(
            filter(lambda f: f.endswith(".webp"), os.listdir(folder)),
            key=lambda f: os.path.getctime(os.path.join(folder, f)),
            reverse=True,
        )

        if len(files) > max_files:
            os.unlink(os.path.join(folder, files[-1]))
    except (FileNotFoundError, OSError):
        pass
