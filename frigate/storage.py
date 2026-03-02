"""Handle storage retention and usage."""

import datetime
import logging
import shutil
import threading
from collections import defaultdict
from datetime import timedelta
from pathlib import Path

from peewee import SQL, fn

from frigate.config import FrigateConfig, RetainPolicyEnum
from frigate.const import RECORD_DIR
from frigate.models import Event, Recordings, ReviewSegment
from frigate.util.builtin import clear_and_unlink

logger = logging.getLogger(__name__)
bandwidth_equation = Recordings.segment_size / (
    Recordings.end_time - Recordings.start_time
)

MAX_CALCULATED_BANDWIDTH = 10000  # 10Gb/hr


class StorageMaintainer(threading.Thread):
    """Maintain frigates recording storage."""

    def __init__(self, config: FrigateConfig, stop_event) -> None:
        super().__init__(name="storage_maintainer")
        self.config = config
        self.stop_event = stop_event
        self.camera_storage_stats: dict[str, dict] = {}

    def calculate_camera_bandwidth(self) -> None:
        """Calculate an average MB/hr for each camera."""
        for camera in self.config.cameras.keys():
            # cameras with < 50 segments should be refreshed to keep size accurate
            # when few segments are available
            if self.camera_storage_stats.get(camera, {}).get("needs_refresh", True):
                self.camera_storage_stats[camera] = {
                    "needs_refresh": (
                        Recordings.select(fn.COUNT("*"))
                        .where(Recordings.camera == camera, Recordings.segment_size > 0)
                        .scalar()
                        < 50
                    )
                }

                # calculate MB/hr from last 100 segments
                try:
                    # Subquery to get last 100 segments, then average their bandwidth
                    last_100 = (
                        Recordings.select(bandwidth_equation.alias("bw"))
                        .where(Recordings.camera == camera, Recordings.segment_size > 0)
                        .order_by(Recordings.start_time.desc())
                        .limit(100)
                        .alias("recent")
                    )

                    bandwidth = round(
                        Recordings.select(fn.AVG(SQL("bw"))).from_(last_100).scalar()
                        * 3600,
                        2,
                    )

                    if bandwidth > MAX_CALCULATED_BANDWIDTH:
                        logger.warning(
                            f"{camera} has a bandwidth of {bandwidth} MB/hr which exceeds the expected maximum. This typically indicates an issue with the cameras recordings."
                        )
                        bandwidth = MAX_CALCULATED_BANDWIDTH
                except TypeError:
                    bandwidth = 0

                self.camera_storage_stats[camera]["bandwidth"] = bandwidth
                logger.debug(f"{camera} has a bandwidth of {bandwidth} MiB/hr.")

    def calculate_camera_usages(self) -> dict[str, dict]:
        """Calculate the storage usage of each camera."""
        usages: dict[str, dict] = {}

        for camera in self.config.cameras.keys():
            camera_storage = (
                Recordings.select(fn.SUM(Recordings.segment_size))
                .where(Recordings.camera == camera, Recordings.segment_size != 0)
                .scalar()
            )

            camera_key = (
                getattr(self.config.cameras[camera], "friendly_name", None) or camera
            )
            usages[camera_key] = {
                "usage": camera_storage,
                "bandwidth": self.camera_storage_stats.get(camera, {}).get(
                    "bandwidth", 0
                ),
            }

        return usages

    def check_storage_needs_cleanup(self) -> bool:
        """Return if storage needs cleanup."""
        # currently runs cleanup if less than 1 hour of space is left
        # disk_usage should not spin up disks
        hourly_bandwidth = sum(
            [b["bandwidth"] for b in self.camera_storage_stats.values()]
        )
        remaining_storage = round(shutil.disk_usage(RECORD_DIR).free / pow(2, 20), 1)
        logger.debug(
            f"Storage cleanup check: {hourly_bandwidth} hourly with remaining storage: {remaining_storage}."
        )
        return remaining_storage < hourly_bandwidth

    def _finalize_deleted_recordings(self, deleted_recordings: list) -> None:
        """Delete recording DB rows and update has_clip on affected events."""
        logger.debug("Expiring %s recordings", len(deleted_recordings))
        max_deletes = 100000

        # Update has_clip for events that overlap with deleted recordings
        if deleted_recordings:
            # Group deleted recordings by camera
            camera_recordings: dict[str, dict] = {}
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
                    "Updated has_clip to False for %s events",
                    len(events_to_update),
                )

        deleted_recordings_list = [r.id for r in deleted_recordings]
        for i in range(0, len(deleted_recordings_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << deleted_recordings_list[i : i + max_deletes]
            ).execute()

    def reduce_storage_consumption(self) -> None:
        """Remove oldest hour of recordings."""
        if self.config.record.retain_policy == RetainPolicyEnum.continuous_rollover:
            return self._reduce_storage_rollover()

        logger.debug("Starting storage cleanup.")
        deleted_segments_size = 0
        hourly_bandwidth = sum(
            [b["bandwidth"] for b in self.camera_storage_stats.values()]
        )

        recordings: Recordings = (
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

        retained_events: Event = (
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
                f"Could not clear {hourly_bandwidth} MB, currently {deleted_segments_size} MB have been cleared. Retained recordings must be deleted."
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
            logger.info(f"Cleaned up {deleted_segments_size} MB of recordings")

        self._finalize_deleted_recordings(deleted_recordings)

    def _reduce_storage_rollover(self) -> None:
        """Remove recordings using smart prioritized deletion for rollover mode.

        Deletion priority:
        1. Overwritable: continuous recordings with no event/review overlap (oldest first)
        2. Event retention: recordings overlapping active review segments (oldest first)
        3. Protected: recordings overlapping retain_indefinitely events (emergency only)
        """
        logger.debug("Starting smart rollover storage cleanup.")
        hourly_bandwidth = sum(
            b["bandwidth"] for b in self.camera_storage_stats.values()
        )
        now = datetime.datetime.now().timestamp()

        # Compute retention cutoffs for review segments
        alert_cutoff = (
            now - timedelta(days=self.config.record.alerts.retain.days).total_seconds()
        )
        detection_cutoff = (
            now
            - timedelta(days=self.config.record.detections.retain.days).total_seconds()
        )

        # Query 1: All recordings, oldest first
        recordings: Recordings = (
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

        # Query 2: Protected events (retain_indefinitely), sorted
        # No camera filter — matches existing StorageMaintainer behavior
        retained_events: list = list(
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

        # Query 3: Non-expired review segments, sorted by start_time
        # Camera-scoped: only protect recordings from the same camera
        active_reviews_raw: list = list(
            ReviewSegment.select(
                ReviewSegment.camera,
                ReviewSegment.start_time,
                ReviewSegment.end_time,
            )
            .where(
                (ReviewSegment.end_time.is_null())
                | (
                    (ReviewSegment.severity == "alert")
                    & (ReviewSegment.end_time >= alert_cutoff)
                )
                | (
                    (ReviewSegment.severity == "detection")
                    & (ReviewSegment.end_time >= detection_cutoff)
                )
            )
            .order_by(ReviewSegment.start_time.asc())
            .namedtuples()
        )

        # Group reviews by camera for camera-scoped overlap checking
        reviews_by_camera: dict[str, list] = defaultdict(list)
        for review in active_reviews_raw:
            reviews_by_camera[review.camera].append(review)

        # Classification pass: single iteration through recordings
        overwritable: list = []
        event_retention: list = []
        protected: list = []

        event_start = 0
        review_start_by_camera: dict[str, int] = defaultdict(int)

        for recording in recordings:
            is_protected = False
            is_event_retention = False

            # Check if recording overlaps with any retain_indefinitely event
            for idx in range(event_start, len(retained_events)):
                event = retained_events[idx]

                if event.start_time > recording.end_time:
                    break

                if event.end_time is None or event.end_time >= recording.start_time:
                    is_protected = True
                    break

                if event.end_time < recording.start_time:
                    event_start = idx

            # If not protected, check if recording overlaps with active reviews
            if not is_protected:
                cam = recording.camera
                cam_reviews = reviews_by_camera.get(cam, [])
                cam_review_start = review_start_by_camera[cam]

                for idx in range(cam_review_start, len(cam_reviews)):
                    review = cam_reviews[idx]

                    if review.start_time > recording.end_time:
                        break

                    if (
                        review.end_time is None
                        or review.end_time >= recording.start_time
                    ):
                        is_event_retention = True
                        break

                    if review.end_time < recording.start_time:
                        review_start_by_camera[cam] = idx

            # Classify
            if is_protected:
                protected.append(recording)
            elif is_event_retention:
                event_retention.append(recording)
            else:
                overwritable.append(recording)

        logger.debug(
            "Rollover classification: %s overwritable, %s event_retention, %s protected",
            len(overwritable),
            len(event_retention),
            len(protected),
        )

        # Multi-phase deletion
        deleted_segments_size = 0.0
        deleted_recordings: list = []

        # Phase 1: Delete overwritable recordings (oldest first)
        for recording in overwritable:
            if deleted_segments_size > hourly_bandwidth:
                break
            try:
                clear_and_unlink(Path(recording.path), missing_ok=False)
                deleted_recordings.append(recording)
                deleted_segments_size += recording.segment_size
            except FileNotFoundError:
                pass

        # Phase 2: Delete event-retention recordings if still needed
        if deleted_segments_size < hourly_bandwidth:
            logger.warning(
                "Overwritable recordings insufficient (%.1f MB of %.1f MB needed). "
                "Deleting event-retention recordings.",
                deleted_segments_size,
                hourly_bandwidth,
            )
            for recording in event_retention:
                if deleted_segments_size > hourly_bandwidth:
                    break
                try:
                    clear_and_unlink(Path(recording.path), missing_ok=False)
                    deleted_recordings.append(recording)
                    deleted_segments_size += recording.segment_size
                except FileNotFoundError:
                    pass

        # Phase 3: Delete protected recordings as emergency last resort
        if deleted_segments_size < hourly_bandwidth:
            logger.error(
                "Could not clear %.1f MB, currently %.1f MB cleared. "
                "Protected retained recordings must be deleted.",
                hourly_bandwidth,
                deleted_segments_size,
            )
            for recording in protected:
                if deleted_segments_size > hourly_bandwidth:
                    break
                try:
                    clear_and_unlink(Path(recording.path), missing_ok=False)
                    deleted_recordings.append(recording)
                    deleted_segments_size += recording.segment_size
                except FileNotFoundError:
                    pass
        else:
            logger.info(
                "Cleaned up %.1f MB of recordings (rollover mode)",
                deleted_segments_size,
            )

        self._finalize_deleted_recordings(deleted_recordings)

    def run(self):
        """Check every 5 minutes if storage needs to be cleaned up."""
        self.calculate_camera_bandwidth()
        while not self.stop_event.wait(300):
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

        logger.info("Exiting storage maintainer...")
