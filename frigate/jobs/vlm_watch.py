"""VLM watch job: continuously monitors a camera and notifies when a condition is met."""

import base64
import json
import logging
import re
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Optional

import cv2

from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import UPDATE_JOB_STATE
from frigate.jobs.job import Job
from frigate.types import JobStatusTypesEnum

logger = logging.getLogger(__name__)

# Polling interval bounds (seconds)
_MIN_INTERVAL = 1
_MAX_INTERVAL = 300

# Minimum seconds between VLM iterations when woken by detections (no zone filter)
_DETECTION_COOLDOWN_WITHOUT_ZONE = 10

# Max user/assistant turn pairs to keep in conversation history
_MAX_HISTORY = 10


@dataclass
class VLMWatchJob(Job):
    """Job state for a VLM watch monitor."""

    job_type: str = "vlm_watch"
    camera: str = ""
    condition: str = ""
    max_duration_minutes: int = 60
    labels: list = field(default_factory=list)
    zones: list = field(default_factory=list)
    last_reasoning: str = ""
    notification_message: str = ""
    iteration_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class VLMWatchRunner(threading.Thread):
    """Background thread that polls a camera with the vision client until a condition is met."""

    def __init__(
        self,
        job: VLMWatchJob,
        config: FrigateConfig,
        cancel_event: threading.Event,
        frame_processor: Any,
        genai_manager: Any,
        dispatcher: Any,
    ) -> None:
        super().__init__(daemon=True, name=f"vlm_watch_{job.id}")
        self.job = job
        self.config = config
        self.cancel_event = cancel_event
        self.frame_processor = frame_processor
        self.genai_manager = genai_manager
        self.dispatcher = dispatcher
        self.requestor = InterProcessRequestor()
        self.detection_subscriber = DetectionSubscriber(DetectionTypeEnum.video.value)
        self.conversation: list[dict[str, Any]] = []

    def run(self) -> None:
        self.job.status = JobStatusTypesEnum.running
        self.job.start_time = time.time()
        self._broadcast_status()
        self.conversation = [{"role": "system", "content": self._build_system_prompt()}]

        max_end_time = self.job.start_time + self.job.max_duration_minutes * 60

        try:
            while not self.cancel_event.is_set():
                if time.time() > max_end_time:
                    logger.debug(
                        "VLM watch job %s timed out after %d minutes",
                        self.job.id,
                        self.job.max_duration_minutes,
                    )
                    self.job.status = JobStatusTypesEnum.failed
                    self.job.error_message = f"Monitor timed out after {self.job.max_duration_minutes} minutes"
                    break

                next_run_in = self._run_iteration()

                if self.job.status == JobStatusTypesEnum.success:
                    break

                self._wait_for_trigger(next_run_in)

        except Exception as e:
            logger.exception("VLM watch job %s failed: %s", self.job.id, e)
            self.job.status = JobStatusTypesEnum.failed
            self.job.error_message = str(e)

        finally:
            if self.job.status == JobStatusTypesEnum.running:
                self.job.status = JobStatusTypesEnum.cancelled
            self.job.end_time = time.time()
            self._broadcast_status()
            try:
                self.detection_subscriber.stop()
            except Exception:
                pass
            try:
                self.requestor.stop()
            except Exception:
                pass

    def _run_iteration(self) -> float:
        """Run one VLM analysis iteration. Returns seconds until next run."""
        chat_client = self.genai_manager.chat_client
        if chat_client is None or not chat_client.supports_vision:
            logger.warning(
                "VLM watch job %s: no chat client with vision support available",
                self.job.id,
            )
            return 30

        frame = self.frame_processor.get_current_frame(self.job.camera, {})
        if frame is None:
            logger.debug(
                "VLM watch job %s: frame unavailable for camera %s",
                self.job.id,
                self.job.camera,
            )
            self.job.last_reasoning = "Camera frame unavailable"
            return 10

        # Downscale frame to 480p max height
        h, w = frame.shape[:2]
        if h > 480:
            scale = 480.0 / h
            frame = cv2.resize(
                frame, (int(w * scale), 480), interpolation=cv2.INTER_AREA
            )

        _, enc = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        b64 = base64.b64encode(enc.tobytes()).decode()

        timestamp = datetime.now().strftime("%H:%M:%S")
        self.conversation.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Frame captured at {timestamp}."},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                ],
            }
        )

        response = chat_client.chat_with_tools(
            messages=self.conversation,
            tools=None,
            tool_choice=None,
        )
        response_str = response.get("content") or ""

        if not response_str:
            logger.warning(
                "VLM watch job %s: empty response from vision client", self.job.id
            )
            # Remove the user message we just added so we don't leave a dangling turn
            self.conversation.pop()
            return 30

        logger.debug("VLM watch job %s response: %s", self.job.id, response_str)

        self.conversation.append({"role": "assistant", "content": response_str})

        # Keep system prompt + last _MAX_HISTORY user/assistant pairs
        max_msgs = 1 + _MAX_HISTORY * 2
        if len(self.conversation) > max_msgs:
            self.conversation = [self.conversation[0]] + self.conversation[
                -(max_msgs - 1) :
            ]

        try:
            clean = re.sub(
                r"\n?```$", "", re.sub(r"^```[a-zA-Z0-9]*\n?", "", response_str)
            )
            parsed = json.loads(clean)
            condition_met = bool(parsed.get("condition_met", False))
            next_run_in = max(
                _MIN_INTERVAL,
                min(_MAX_INTERVAL, int(parsed.get("next_run_in", 30))),
            )
            reasoning = str(parsed.get("reasoning", ""))
            notification_message = str(parsed.get("notification_message", ""))
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            logger.warning(
                "VLM watch job %s: failed to parse VLM response: %s", self.job.id, e
            )
            return 30

        self.job.last_reasoning = reasoning
        self.job.notification_message = notification_message
        self.job.iteration_count += 1
        self._broadcast_status()

        if condition_met:
            logger.debug(
                "VLM watch job %s: condition met on camera %s — %s",
                self.job.id,
                self.job.camera,
                reasoning,
            )
            self._send_notification(notification_message or reasoning)
            self.job.status = JobStatusTypesEnum.success
            return 0

        return next_run_in

    def _wait_for_trigger(self, max_wait: float) -> None:
        """Wait up to max_wait seconds, returning early if a relevant detection fires on the target camera.

        With zones configured, a matching detection wakes immediately (events
        are already filtered).  Without zones, detections are frequent so a
        cooldown is enforced: messages are continuously drained to prevent
        queue backup, but the loop only exits once a match has been seen
        *and* the cooldown period has elapsed.
        """
        now = time.time()
        deadline = now + max_wait
        use_cooldown = not self.job.zones
        earliest_wake = now + _DETECTION_COOLDOWN_WITHOUT_ZONE if use_cooldown else 0
        triggered = False

        while not self.cancel_event.is_set():
            remaining = deadline - time.time()
            if remaining <= 0:
                break

            if triggered and time.time() >= earliest_wake:
                break

            result = self.detection_subscriber.check_for_update(
                timeout=min(1.0, remaining)
            )
            if result is None:
                continue
            topic, payload = result
            if topic is None or payload is None:
                continue
            # payload = (camera, frame_name, frame_time, tracked_objects, motion_boxes, regions)
            cam = payload[0]
            tracked_objects = payload[3]
            logger.debug(
                "VLM watch job %s: detection event cam=%s (want %s), objects=%s",
                self.job.id,
                cam,
                self.job.camera,
                [
                    {"label": o.get("label"), "zones": o.get("current_zones")}
                    for o in (tracked_objects or [])
                ],
            )
            if cam != self.job.camera or not tracked_objects:
                continue
            if self._detection_matches_filters(tracked_objects):
                if not use_cooldown:
                    logger.debug(
                        "VLM watch job %s: woken early by detection event on %s",
                        self.job.id,
                        self.job.camera,
                    )
                    break

                if not triggered:
                    logger.debug(
                        "VLM watch job %s: detection match on %s, draining for %.0fs",
                        self.job.id,
                        self.job.camera,
                        max(0, earliest_wake - time.time()),
                    )
                    triggered = True

    def _detection_matches_filters(self, tracked_objects: list) -> bool:
        """Return True if any tracked object passes the label and zone filters."""
        labels = self.job.labels
        zones = self.job.zones
        for obj in tracked_objects:
            label_ok = not labels or obj.get("label") in labels
            zone_ok = not zones or bool(set(obj.get("current_zones", [])) & set(zones))
            if label_ok and zone_ok:
                return True
        return False

    def _build_system_prompt(self) -> str:
        focus_text = ""
        if self.job.labels or self.job.zones:
            parts = []
            if self.job.labels:
                parts.append(f"object types: {', '.join(self.job.labels)}")
            if self.job.zones:
                parts.append(f"zones: {', '.join(self.job.zones)}")
            focus_text = f"\nFocus on {' and '.join(parts)}.\n"

        return (
            f'You are monitoring a security camera. Your task: determine when "{self.job.condition}" occurs.\n'
            f"{focus_text}\n"
            f"You will receive a sequence of frames over time. Use the conversation history to understand "
            f"what is stationary vs. actively changing.\n\n"
            f"For each frame respond with JSON only:\n"
            f'{{"condition_met": <true/false>, "next_run_in": <integer seconds 1-300>, "reasoning": "<brief explanation>", "notification_message": "<natural language notification>"}}\n\n'
            f"Guidelines for notification_message:\n"
            f"- Only required when condition_met is true.\n"
            f"- Write a short, natural notification a user would want to receive on their phone.\n"
            f'- Example: "Your package has been delivered to the front porch."\n\n'
            f"Guidelines for next_run_in:\n"
            f"- Scene is empty / nothing of interest visible: 60-300.\n"
            f"- Relevant object(s) visible anywhere in frame (even outside the target zone): 3-10. "
            f"They may be moving toward the zone.\n"
            f"- Condition is actively forming (object approaching zone or threshold): 1-5.\n"
            f"- Set condition_met to true only when you are confident the condition is currently met.\n"
            f"- Keep reasoning to 1-2 sentences."
        )

    def _send_notification(self, message: str) -> None:
        """Publish a camera_monitoring event so downstream handlers (web push, MQTT) can notify users."""
        payload = {
            "camera": self.job.camera,
            "condition": self.job.condition,
            "message": message,
            "reasoning": self.job.last_reasoning,
            "job_id": self.job.id,
        }

        if self.dispatcher:
            try:
                self.dispatcher.publish("camera_monitoring", json.dumps(payload))
            except Exception as e:
                logger.warning(
                    "VLM watch job %s: failed to publish alert: %s", self.job.id, e
                )

    def _broadcast_status(self) -> None:
        try:
            self.requestor.send_data(UPDATE_JOB_STATE, self.job.to_dict())
        except Exception as e:
            logger.warning(
                "VLM watch job %s: failed to broadcast status: %s", self.job.id, e
            )


# Module-level singleton (only one watch job at a time)
_current_job: Optional[VLMWatchJob] = None
_cancel_event: Optional[threading.Event] = None
_job_lock = threading.Lock()


def start_vlm_watch_job(
    camera: str,
    condition: str,
    max_duration_minutes: int,
    config: FrigateConfig,
    frame_processor: Any,
    genai_manager: Any,
    dispatcher: Any,
    labels: list[str] | None = None,
    zones: list[str] | None = None,
) -> str:
    """Start a new VLM watch job. Returns the job ID.

    Raises RuntimeError if a job is already running.
    """
    global _current_job, _cancel_event

    with _job_lock:
        if _current_job is not None and _current_job.status in (
            JobStatusTypesEnum.queued,
            JobStatusTypesEnum.running,
        ):
            raise RuntimeError(
                f"A VLM watch job is already running (id={_current_job.id}). "
                "Cancel it before starting a new one."
            )

        job = VLMWatchJob(
            camera=camera,
            condition=condition,
            max_duration_minutes=max_duration_minutes,
            labels=labels or [],
            zones=zones or [],
        )
        cancel_ev = threading.Event()
        _current_job = job
        _cancel_event = cancel_ev

    runner = VLMWatchRunner(
        job=job,
        config=config,
        cancel_event=cancel_ev,
        frame_processor=frame_processor,
        genai_manager=genai_manager,
        dispatcher=dispatcher,
    )
    runner.start()

    logger.debug(
        "Started VLM watch job %s: camera=%s, condition=%r, max_duration=%dm",
        job.id,
        camera,
        condition,
        max_duration_minutes,
    )
    return job.id


def stop_vlm_watch_job() -> bool:
    """Cancel the current VLM watch job. Returns True if a job was cancelled."""
    global _current_job, _cancel_event

    with _job_lock:
        if _current_job is None or _current_job.status not in (
            JobStatusTypesEnum.queued,
            JobStatusTypesEnum.running,
        ):
            return False

        if _cancel_event:
            _cancel_event.set()

        _current_job.status = JobStatusTypesEnum.cancelled
        logger.debug("Cancelled VLM watch job %s", _current_job.id)
        return True


def get_vlm_watch_job() -> Optional[VLMWatchJob]:
    """Return the current (or most recent) VLM watch job."""
    return _current_job
