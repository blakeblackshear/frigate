import datetime
import logging
import multiprocessing as mp
import queue
import random
import signal
import string
import threading

import numpy as np
from setproctitle import setproctitle

from frigate.config import CameraConfig, AudioModelConfig
from frigate.object_detection import RemoteObjectDetector
from frigate.util import listen, SharedMemoryFrameManager


logger = logging.getLogger(__name__)


def capture_audio(
    name: str,
    model_config: AudioModelConfig,
    process_info,
):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"capture:{name}"
    setproctitle(f"frigate.capture:{name}")
    listen()

    chunk_size = int(round(model_config.duration * model_config.sample_rate * 2))

    key = f"{name}-audio"

    audio_queue = process_info["audio_queue"]
    frame_manager = SharedMemoryFrameManager()
    current_frame = mp.Value("d", 0.0)

    pipe = open(f"/tmp/{key}", "rb")

    while not stop_event.is_set():
        current_frame.value = datetime.datetime.now().timestamp()
        frame_name = f"{key}{current_frame.value}"
        frame_buffer = frame_manager.create(frame_name, chunk_size)

        try:
            frame_buffer[:] = pipe.read(chunk_size)
        except Exception as e:
            continue

        # if the queue is full, skip this frame
        if audio_queue.full():
            frame_manager.delete(frame_name)
            continue

        # close the frame
        frame_manager.close(frame_name)

        # add to the queue
        audio_queue.put(current_frame.value)


def process_audio(
    name: str,
    camera_config: CameraConfig,
    model_config: AudioModelConfig,
    labelmap,
    detection_queue: mp.Queue,
    result_connection,
    process_info,
):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"process:{name}"
    setproctitle(f"frigate.process:{name}")
    listen()

    shape = (int(round(model_config.duration * model_config.sample_rate)),)

    key = f"{name}-audio"

    audio_queue = process_info["audio_queue"]
    frame_manager = SharedMemoryFrameManager()

    detector = RemoteObjectDetector(
        key, labelmap, detection_queue, result_connection, model_config
    )

    while not stop_event.is_set():
        try:
            frame_time = audio_queue.get(True, 10)
        except queue.Empty:
            continue

        audio = frame_manager.get(f"{key}{frame_time}", shape, dtype=np.int16)

        if audio is None:
            logger.info(f"{key}: audio {frame_time} is not in memory store.")
            continue

        waveform = (audio / 32768.0).astype(np.float32)
        model_detections = detector.detect(waveform)

        for label, score, _ in model_detections:
            if label not in camera_config.objects.track:
                continue
            filters = camera_config.objects.filters.get(label)
            if filters:
                if score < filters.min_score:
                    continue
            logger.info(f"{label}: {score}")

        frame_manager.close(f"{key}{frame_time}")
