"""Handle storage retention and usage."""

import logging
import re
import shutil
import threading
from pathlib import Path

from peewee import SQL, fn

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR, REPLAY_CAMERA_PREFIX
from frigate.models import Event, Previews, Recordings
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
            # Skip replay cameras
            if camera.startswith(REPLAY_CAMERA_PREFIX):
                continue

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
            # Skip replay cameras
            if camera.startswith(REPLAY_CAMERA_PREFIX):
                continue

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

    def calculate_camera_usages_by_root(self) -> dict[str, dict]:
        """Calculate camera storage usage grouped by recordings root."""
        root_usages: dict[str, dict] = {}

        root_camera_stats = (
            Recordings.select(
                Recordings.camera,
                Recordings.path,
                fn.SUM(Recordings.segment_size).alias("usage"),
            )
            .where(Recordings.segment_size != 0)
            .group_by(Recordings.camera, Recordings.path)
            .namedtuples()
            .iterator()
        )

        for stat in root_camera_stats:
            camera = stat.camera

            # Skip replay cameras
            if camera.startswith(REPLAY_CAMERA_PREFIX):
                continue

            root_path = self._get_recordings_root_from_path(stat.path, camera)
            if not root_path:
                continue

            camera_usage = stat.usage or 0
            camera_config = self.config.cameras.get(camera)
            camera_friendly_name = (
                getattr(camera_config, "friendly_name", None) if camera_config else None
            )

            if root_path not in root_usages:
                root_usages[root_path] = {
                    "path": root_path,
                    "is_default": root_path == RECORD_DIR,
                    "recordings_size": 0,
                    "cameras": [],
                    "configured_cameras": [],
                    "camera_usages": {},
                }

            root_usages[root_path]["recordings_size"] += camera_usage

            if camera not in root_usages[root_path]["camera_usages"]:
                root_usages[root_path]["cameras"].append(camera)
                root_usages[root_path]["camera_usages"][camera] = {
                    "usage": 0,
                    "bandwidth": self.camera_storage_stats.get(camera, {}).get(
                        "bandwidth", 0
                    ),
                    "friendly_name": camera_friendly_name,
                }

            root_usages[root_path]["camera_usages"][camera]["usage"] += camera_usage

        for root_path, root in root_usages.items():
            root["cameras"] = sorted(root["cameras"])
            root["configured_cameras"] = sorted(
                [
                    camera
                    for camera in self.config.cameras.keys()
                    if self.config.get_camera_recordings_path(camera) == root_path
                ]
            )

        return root_usages

    def _get_recordings_root_from_path(self, recording_path: str, camera: str) -> str:
        # Prefer configured recording roots when available.
        for configured_root in sorted(
            self.config.get_recordings_paths(), key=len, reverse=True
        ):
            if recording_path == configured_root or recording_path.startswith(
                f"{configured_root}/"
            ):
                return configured_root.rstrip("/") or "/"

        # Support layouts like /root/YYYY-MM-DD/HH/... and normalize to /root.
        date_hour_match = re.match(
            r"^(?P<root>.+?)/\d{4}-\d{2}-\d{2}/\d{2}(?:/|$)", recording_path
        )
        if date_hour_match:
            return date_hour_match.group("root").rstrip("/") or "/"

        camera_segment = f"/{camera}/"
        if camera_segment in recording_path:
            return recording_path.split(camera_segment, 1)[0].rstrip("/") or "/"

        # Fallback for unexpected path layouts; expected format is root/camera/date/file
        path = Path(recording_path)
        if len(path.parents) >= 3:
            return str(path.parents[2]).rstrip("/") or "/"

        return str(path.parent).rstrip("/") or "/"

    def _get_path_bandwidths(self) -> dict[str, float]:
        bandwidth_per_path: dict[str, float] = {}

        for camera, stats in self.camera_storage_stats.items():
            if camera not in self.config.cameras:
                continue
            path = self.config.get_camera_recordings_path(camera)
            bandwidth_per_path[path] = bandwidth_per_path.get(path, 0) + stats.get(
                "bandwidth", 0
            )

        return bandwidth_per_path

    def check_storage_needs_cleanup(self, recordings_root: str) -> bool:
        """Return True if the given recordings root path needs cleanup."""
        # currently runs cleanup if less than 1 hour of space is left
        # disk_usage should not spin up disks
        hourly_bandwidth = self._get_path_bandwidths().get(recordings_root, 0)
        if not hourly_bandwidth:
            return False
        try:
            remaining_storage = round(
                shutil.disk_usage(recordings_root).free / pow(2, 20), 1
            )
        except (FileNotFoundError, OSError):
            return False

        logger.debug(
            f"Storage cleanup check: {hourly_bandwidth} hourly with remaining storage: {remaining_storage} for path {recordings_root}."
        )

        return remaining_storage < hourly_bandwidth

    def reduce_storage_consumption(self, recordings_root: str) -> None:
        """Remove oldest hour of recordings."""
        logger.debug("Starting storage cleanup.")
        deleted_segments_size = 0
        hourly_bandwidth = self._get_path_bandwidths().get(recordings_root, 0)

        recordings: Recordings = (
            Recordings.select(
                Recordings.id,
                Recordings.camera,
                Recordings.start_time,
                Recordings.end_time,
                Recordings.segment_size,
                Recordings.path,
            )
            .where(Recordings.path.startswith(f"{recordings_root}/"))
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
                    deleted_segments_size += recording.segment_size
                except FileNotFoundError:
                    # File is missing from disk but the DB entry is stale; remove it
                    # without counting freed space since nothing was actually freed.
                    pass
                deleted_recordings.append(recording)

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
                .where(Recordings.path.startswith(f"{recordings_root}/"))
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
                except FileNotFoundError:
                    # File is missing from disk but the DB entry is stale; remove it
                    # without counting freed space since nothing was actually freed.
                    pass
                deleted_recordings.append(recording)
        else:
            logger.info(f"Cleaned up {deleted_segments_size} MB of recordings")

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

        # Also delete preview files that overlap with deleted recordings so they
        # don't continue to consume space on the same disk after the recordings
        # are gone (especially important for multi-path setups where preview and
        # recordings share the same disk).
        if deleted_recordings:
            deleted_previews = []
            for camera, time_range in camera_recordings.items():
                overlapping_previews = (
                    Previews.select(Previews.id, Previews.path)
                    .where(
                        Previews.camera == camera,
                        Previews.start_time < time_range["max_end"],
                        Previews.end_time > time_range["min_start"],
                    )
                    .namedtuples()
                )
                for preview in overlapping_previews:
                    clear_and_unlink(Path(preview.path), missing_ok=True)
                    deleted_previews.append(preview.id)

            logger.debug(f"Expiring {len(deleted_previews)} previews")
            for i in range(0, len(deleted_previews), max_deletes):
                Previews.delete().where(
                    Previews.id << deleted_previews[i : i + max_deletes]
                ).execute()

        deleted_recordings_list = [r.id for r in deleted_recordings]
        for i in range(0, len(deleted_recordings_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << deleted_recordings_list[i : i + max_deletes]
            ).execute()

    def run(self):
        """Check every 5 minutes if storage needs to be cleaned up."""
        self.calculate_camera_bandwidth()
        while not self.stop_event.wait(300):
            if not self.camera_storage_stats or True in [
                r["needs_refresh"] for r in self.camera_storage_stats.values()
            ]:
                self.calculate_camera_bandwidth()
                logger.debug(f"Default camera bandwidths: {self.camera_storage_stats}.")

            for recordings_root in self.config.get_recordings_paths():
                if self.check_storage_needs_cleanup(recordings_root):
                    logger.info(
                        f"Less than 1 hour of recording space left for {recordings_root}, running storage maintenance..."
                    )
                    self.reduce_storage_consumption(recordings_root)

        logger.info("Exiting storage maintainer...")
