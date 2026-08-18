"""Handle storage retention and usage."""

import logging
import shutil
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path

from peewee import SQL, Case, fn

from frigate.config import FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.const import (
    RECORD_DIR,
    REPLAY_CAMERA_PREFIX,
    STREAM_TYPE_MAIN,
    STREAM_TYPE_SUB,
)
from frigate.models import Event, Recordings
from frigate.util.builtin import clear_and_unlink

logger = logging.getLogger(__name__)
bandwidth_equation = Recordings.segment_size / (
    Recordings.end_time - Recordings.start_time
)

MAX_CALCULATED_BANDWIDTH = 10000  # 10Gb/hr
BANDWIDTH_SAMPLE_TARGET = 50


class StorageMaintainer(threading.Thread):
    """Maintain frigates recording storage."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        super().__init__(name="storage_maintainer")
        self.config = config
        self.stop_event = stop_event
        self.camera_storage_stats: dict[str, dict] = {}
        self.config_subscriber = CameraConfigUpdateSubscriber(
            self.config,
            self.config.cameras,
            [CameraConfigUpdateEnum.record],
        )

    def _recording_stream_types(self, camera: str) -> tuple[str, ...]:
        """Return the stream types the camera is currently recording."""
        camera_config = self.config.cameras.get(camera)

        if camera_config is None or not camera_config.record.enabled:
            return ()

        if camera_config.record.sub.enabled:
            return (STREAM_TYPE_MAIN, STREAM_TYPE_SUB)

        return (STREAM_TYPE_MAIN,)

    def expected_hourly_bandwidth(self) -> float:
        """Return the MB/hr the cameras are expected to write.

        Only the streams a camera currently records are counted, so toggling
        recording or sub stream recording is reflected without waiting for the
        existing segments of a stopped stream to expire.
        """
        total = 0.0

        for camera, stats in self.camera_storage_stats.items():
            stream_bandwidths = stats.get("bandwidth_by_stream", {})
            total += sum(
                stream_bandwidths.get(stream_type, 0)
                for stream_type in self._recording_stream_types(camera)
            )

        return round(total, 2)

    def _recent_stream_bandwidth(
        self, camera: str, stream_type: str, window: int
    ) -> float | None:
        """Average MB/s over a stream's most recent rows, or None if no sample.

        Zero-size rows are excluded inside the projection, not the WHERE
        clause: a segment_size predicate baits the planner into the
        (camera, segment_size) index plus a full sort of the camera's
        history instead of the time-ordered index.
        """
        recent = (
            Recordings.select(
                Case(
                    None,
                    [(Recordings.segment_size > 0, bandwidth_equation)],
                    None,
                ).alias("bw")
            )
            .where(
                Recordings.camera == camera,
                Recordings.stream_type == stream_type,
            )
            .order_by(Recordings.start_time.desc())
            .limit(window)
            .alias("recent")
        )
        avg: float | None = Recordings.select(fn.AVG(SQL("bw"))).from_(recent).scalar()
        return avg

    def _stream_sample_count(self, camera: str, stream_type: str) -> int:
        """Count a stream's non-zero segments, stopping at the sample target."""
        return (
            Recordings.select(Recordings.id)
            .where(
                Recordings.camera == camera,
                Recordings.stream_type == stream_type,
                Recordings.segment_size > 0,
            )
            .limit(BANDWIDTH_SAMPLE_TARGET)
            .count()
        )

    def _needs_refresh(self, camera: str) -> bool:
        """Return whether a stream the camera records still lacks samples.

        Counted per stream rather than per camera: a stream that starts
        recording later has no samples of its own yet, and a camera-wide count
        would report it settled on the strength of another stream's history.
        """
        return any(
            self._stream_sample_count(camera, stream_type) < BANDWIDTH_SAMPLE_TARGET
            for stream_type in self._recording_stream_types(camera)
        )

    def calculate_camera_bandwidth(self) -> None:
        """Calculate an average MB/hr for each camera."""
        for camera in self.config.cameras.keys():
            # Skip replay cameras
            if camera.startswith(REPLAY_CAMERA_PREFIX):
                continue

            if not self.camera_storage_stats.get(camera, {}).get("needs_refresh", True):
                continue

            # calculate MB/hr from the last 100 segments of each stream
            # type and sum the rates; mixing streams would average small
            # sub segments against large main segments and underestimate
            # the true write rate
            bandwidth_by_stream: dict[str, float] = {}
            for stream_type in (STREAM_TYPE_MAIN, STREAM_TYPE_SUB):
                avg_bw = self._recent_stream_bandwidth(camera, stream_type, 100)
                if avg_bw is None:
                    # the recent window can be all zero-size ingest
                    # glitches; look further back before concluding
                    # the stream writes nothing
                    avg_bw = self._recent_stream_bandwidth(camera, stream_type, 1000)
                if avg_bw is not None:
                    bandwidth_by_stream[stream_type] = round(avg_bw * 3600, 2)

            bandwidth = round(sum(bandwidth_by_stream.values()), 2)

            if bandwidth > MAX_CALCULATED_BANDWIDTH:
                logger.warning(
                    f"{camera} has a bandwidth of {bandwidth} MB/hr which exceeds the expected maximum. This typically indicates an issue with the cameras recordings."
                )
                # scale each stream so the per stream values still sum to
                # the clamped total the UI displays alongside them
                scale = MAX_CALCULATED_BANDWIDTH / bandwidth
                bandwidth_by_stream = {
                    stream_type: round(value * scale, 2)
                    for stream_type, value in bandwidth_by_stream.items()
                }
                bandwidth = MAX_CALCULATED_BANDWIDTH

            self.camera_storage_stats[camera] = {
                "needs_refresh": self._needs_refresh(camera),
                "bandwidth": bandwidth,
                "bandwidth_by_stream": bandwidth_by_stream,
            }
            logger.debug(f"{camera} has a bandwidth of {bandwidth} MiB/hr.")

    def calculate_camera_usages(self) -> dict[str, dict]:
        """Calculate the storage usage of each camera."""
        usages: dict[str, dict] = {}

        for camera in self.config.cameras.keys():
            # Skip replay cameras
            if camera.startswith(REPLAY_CAMERA_PREFIX):
                continue

            stream_usages = {
                row["stream_type"]: row["usage"] or 0
                for row in (
                    Recordings.select(
                        Recordings.stream_type,
                        fn.SUM(Recordings.segment_size).alias("usage"),
                    )
                    .where(Recordings.camera == camera, Recordings.segment_size != 0)
                    .group_by(Recordings.stream_type)
                    .dicts()
                )
            }
            stream_bandwidths = self.camera_storage_stats.get(camera, {}).get(
                "bandwidth_by_stream", {}
            )

            camera_key = (
                getattr(self.config.cameras[camera], "friendly_name", None) or camera
            )
            usages[camera_key] = {
                "usage": sum(stream_usages.values()),
                "bandwidth": self.camera_storage_stats.get(camera, {}).get(
                    "bandwidth", 0
                ),
                # only streams with segments on disk are reported, so a camera
                # keeps its sub entry until sub retention expires those segments.
                # bandwidth is null rather than 0 when the cache holds no sample
                # for the stream, since 0 would claim it writes nothing
                "streams": {
                    stream_type: {
                        "usage": stream_usages[stream_type],
                        "bandwidth": stream_bandwidths.get(stream_type),
                    }
                    for stream_type in (STREAM_TYPE_MAIN, STREAM_TYPE_SUB)
                    if stream_usages.get(stream_type)
                },
            }

        return usages

    def check_storage_needs_cleanup(self) -> bool:
        """Return if storage needs cleanup."""
        # currently runs cleanup if less than 1 hour of space is left
        # disk_usage should not spin up disks
        hourly_bandwidth = self.expected_hourly_bandwidth()
        remaining_storage = round(shutil.disk_usage(RECORD_DIR).free / pow(2, 20), 1)
        logger.debug(
            f"Storage cleanup check: {hourly_bandwidth} hourly with remaining storage: {remaining_storage}."
        )
        return remaining_storage < float(hourly_bandwidth)

    def reduce_storage_consumption(self) -> None:
        """Remove oldest hour of recordings."""
        logger.debug("Starting storage cleanup.")
        deleted_segments_size = 0
        hourly_bandwidth = self.expected_hourly_bandwidth()

        recordings = (
            Recordings.select(
                Recordings.id,
                Recordings.camera,
                Recordings.start_time,
                Recordings.end_time,
                Recordings.segment_size,
                Recordings.path,
            )
            .order_by(Recordings.start_time.asc())
            .namedtuples()
            .iterator()
        )

        retained_events = (
            Event.select(
                Event.start_time,
                Event.end_time,
            )
            .where(
                Event.retain_indefinitely == True,
                Event.has_clip,
            )
            .order_by(Event.start_time.asc())
            .namedtuples()
        )

        event_start = 0
        deleted_recordings = []
        for recording in recordings:
            # check if 1 hour of storage has been reclaimed
            if deleted_segments_size > hourly_bandwidth:
                break

            keep = False

            # Now look for a reason to keep this recording segment
            for idx in range(event_start, len(retained_events)):
                event = retained_events[idx]

                # if the event starts in the future, stop checking events
                # and let this recording segment expire
                if event.start_time > recording.end_time:
                    keep = False
                    break

                # if the event is in progress or ends after the recording starts, keep it
                # and stop looking at events
                if event.end_time is None or event.end_time >= recording.start_time:
                    keep = True
                    break

                # if the event ends before this recording segment starts, skip
                # this event and check the next event for an overlap.
                # since the events and recordings are sorted, we can skip events
                # that end before the previous recording segment started on future segments
                if event.end_time < recording.start_time:
                    event_start = idx

            # Delete recordings not retained indefinitely
            if not keep:
                try:
                    clear_and_unlink(Path(recording.path), missing_ok=False)
                    deleted_recordings.append(recording)
                    deleted_segments_size += recording.segment_size
                except FileNotFoundError:
                    # this file was not found so we must assume no space was cleaned up
                    pass

        # check if need to delete retained segments
        if deleted_segments_size < hourly_bandwidth:
            logger.error(
                f"Could not clear {hourly_bandwidth} MB, currently {deleted_segments_size:.2f} MB have been cleared. Retained recordings must be deleted."
            )
            recordings = (
                Recordings.select(
                    Recordings.id,
                    Recordings.camera,
                    Recordings.start_time,
                    Recordings.end_time,
                    Recordings.path,
                    Recordings.segment_size,
                )
                .order_by(Recordings.start_time.asc())
                .namedtuples()
                .iterator()
            )

            for recording in recordings:
                if deleted_segments_size > hourly_bandwidth:
                    break

                try:
                    clear_and_unlink(Path(recording.path), missing_ok=False)
                    deleted_segments_size += recording.segment_size
                    deleted_recordings.append(recording)
                except FileNotFoundError:
                    # this file was not found so we must assume no space was cleaned up
                    pass
        else:
            logger.info(f"Cleaned up {deleted_segments_size:.2f} MB of recordings")

        logger.debug(f"Expiring {len(deleted_recordings)} recordings")
        # delete up to 100,000 at a time
        max_deletes = 100000

        # Update has_clip for events that overlap with deleted recordings
        if deleted_recordings:
            # Group deleted recordings by camera
            camera_recordings = {}
            for recording in deleted_recordings:
                if recording.camera not in camera_recordings:
                    camera_recordings[recording.camera] = {
                        "min_start": recording.start_time,
                        "max_end": recording.end_time,
                    }
                else:
                    camera_recordings[recording.camera]["min_start"] = min(
                        camera_recordings[recording.camera]["min_start"],
                        recording.start_time,
                    )
                    camera_recordings[recording.camera]["max_end"] = max(
                        camera_recordings[recording.camera]["max_end"],
                        recording.end_time,
                    )

            # Find all events that overlap with deleted recordings time range per camera
            events_to_update = []
            for camera, time_range in camera_recordings.items():
                overlapping_events = Event.select(Event.id).where(
                    Event.camera == camera,
                    Event.has_clip == True,
                    Event.start_time < time_range["max_end"],
                    Event.end_time > time_range["min_start"],
                )

                for event in overlapping_events:
                    events_to_update.append(event.id)

            # Update has_clip to False for overlapping events
            if events_to_update:
                for i in range(0, len(events_to_update), max_deletes):
                    batch = events_to_update[i : i + max_deletes]
                    Event.update(has_clip=False).where(Event.id << batch).execute()
                logger.debug(
                    f"Updated has_clip to False for {len(events_to_update)} events"
                )

        deleted_recordings_list = [r.id for r in deleted_recordings]
        for i in range(0, len(deleted_recordings_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << deleted_recordings_list[i : i + max_deletes]
            ).execute()

    def run(self) -> None:
        """Check every 5 minutes if storage needs to be cleaned up."""
        if self.config.safe_mode:
            logger.info("Safe mode enabled, skipping storage maintenance")
            self.config_subscriber.stop()
            return

        self.calculate_camera_bandwidth()
        while not self.stop_event.wait(300):
            updated_topics = self.config_subscriber.check_for_updates()

            for camera in updated_topics.get(CameraConfigUpdateEnum.record.name, []):
                if camera in self.camera_storage_stats:
                    self.camera_storage_stats[camera]["needs_refresh"] = True

            if not self.camera_storage_stats or True in [
                r["needs_refresh"] for r in self.camera_storage_stats.values()
            ]:
                self.calculate_camera_bandwidth()
                logger.debug(f"Default camera bandwidths: {self.camera_storage_stats}.")

            if self.check_storage_needs_cleanup():
                logger.info(
                    "Less than 1 hour of recording space left, running storage maintenance..."
                )
                self.reduce_storage_consumption()

        self.config_subscriber.stop()
        logger.info("Exiting storage maintainer...")
