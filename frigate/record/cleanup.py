"""Cleanup recordings that are expired based on retention config."""

import datetime
import itertools
import logging
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.config import CameraConfig, FrigateConfig, RetainModeEnum
from frigate.const import CACHE_DIR, CLIPS_DIR, MAX_WAL_SIZE
from frigate.models import Previews, Recordings, ReviewSegment, UserReviewStatus
from frigate.util.builtin import clear_and_unlink
from frigate.util.media import remove_empty_directories

logger = logging.getLogger(__name__)


class RecordingCleanup(threading.Thread):
    """Cleanup existing recordings based on retention config."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        super().__init__(name="recording_cleanup")
        self.config = config
        self.stop_event = stop_event

    def clean_tmp_previews(self) -> None:
        """delete any previews in the cache that are more than 1 hour old."""
        for p in Path(CACHE_DIR).rglob("preview_*.mp4"):
            logger.debug(f"Checking preview {p}.")
            if p.stat().st_mtime < (datetime.datetime.now().timestamp() - 60 * 60):
                logger.debug("Deleting preview.")
                clear_and_unlink(p)

    def clean_tmp_clips(self) -> None:
        """delete any clips in the cache that are more than 1 hour old."""
        for p in Path(os.path.join(CLIPS_DIR, "cache")).rglob("clip_*.mp4"):
            logger.debug(f"Checking tmp clip {p}.")
            if p.stat().st_mtime < (datetime.datetime.now().timestamp() - 60 * 60):
                logger.debug("Deleting tmp clip.")
                clear_and_unlink(p)

    def truncate_wal(self) -> None:
        """check if the WAL needs to be manually truncated."""

        # by default the WAL should be check-pointed automatically
        # however, high levels of activity can prevent an opportunity
        # for the checkpoint to be finished which means the WAL will grow
        # without bound

        # with auto checkpoint most users should never hit this

        if (
            os.stat(f"{self.config.database.path}-wal").st_size / (1024 * 1024)
        ) > MAX_WAL_SIZE:
            db = SqliteExtDatabase(self.config.database.path)
            db.execute_sql("PRAGMA wal_checkpoint(TRUNCATE);")
            db.close()

    def expire_review_segments(self, config: CameraConfig, now: datetime) -> set[Path]:
        """Delete review segments that are expired"""
        alert_expire_date = (
            now - datetime.timedelta(days=config.record.alerts.retain.days)
        ).timestamp()
        detection_expire_date = (
            now - datetime.timedelta(days=config.record.detections.retain.days)
        ).timestamp()
        expired_reviews: ReviewSegment = (
            ReviewSegment.select(ReviewSegment.id, ReviewSegment.thumb_path)
            .where(ReviewSegment.camera == config.name)
            .where(
                (
                    (ReviewSegment.severity == "alert")
                    & (ReviewSegment.end_time < alert_expire_date)
                )
                | (
                    (ReviewSegment.severity == "detection")
                    & (ReviewSegment.end_time < detection_expire_date)
                )
            )
            .namedtuples()
        )

        maybe_empty_dirs = set()
        thumbs_to_delete = list(map(lambda x: x[1], expired_reviews))
        for thumb_path in thumbs_to_delete:
            thumb_path = Path(thumb_path)
            thumb_path.unlink(missing_ok=True)
            maybe_empty_dirs.add(thumb_path.parent)

        max_deletes = 100000
        deleted_reviews_list = list(map(lambda x: x[0], expired_reviews))
        for i in range(0, len(deleted_reviews_list), max_deletes):
            ReviewSegment.delete().where(
                ReviewSegment.id << deleted_reviews_list[i : i + max_deletes]
            ).execute()
            UserReviewStatus.delete().where(
                UserReviewStatus.review_segment
                << deleted_reviews_list[i : i + max_deletes]
            ).execute()

        return maybe_empty_dirs

    def expire_existing_camera_recordings(
        self,
        continuous_expire_date: float,
        motion_expire_date: float,
        config: CameraConfig,
        reviews: ReviewSegment,
    ) -> set[Path]:
        """Delete recordings for existing camera based on retention config."""
        # Get the timestamp for cutoff of retained days

        # Get recordings to check for expiration
        recordings: Recordings = (
            Recordings.select(
                Recordings.id,
                Recordings.start_time,
                Recordings.end_time,
                Recordings.path,
                Recordings.objects,
                Recordings.motion,
                Recordings.dBFS,
            )
            .where(
                (Recordings.camera == config.name)
                & (
                    (
                        (Recordings.end_time < continuous_expire_date)
                        & (Recordings.motion == 0)
                        & (Recordings.dBFS == 0)
                    )
                    | (Recordings.end_time < motion_expire_date)
                )
            )
            .order_by(Recordings.start_time)
            .namedtuples()
            .iterator()
        )

        maybe_empty_dirs = set()

        # loop over recordings and see if they overlap with any non-expired reviews
        # TODO: expire segments based on segment stats according to config
        review_start = 0
        deleted_recordings = set()
        kept_recordings: list[tuple[float, float]] = []
        recording: Recordings
        for recording in recordings:
            keep = False
            mode = None
            # Now look for a reason to keep this recording segment
            for idx in range(review_start, len(reviews)):
                review: ReviewSegment = reviews[idx]
                severity = review.severity
                pre_capture = config.record.get_review_pre_capture(severity)
                post_capture = config.record.get_review_post_capture(severity)

                # if the review starts in the future, stop checking reviews
                # and let this recording segment expire
                if review.start_time - pre_capture > recording.end_time:
                    keep = False
                    break

                # if the review is in progress or ends after the recording starts, keep it
                # and stop looking at reviews
                if (
                    review.end_time is None
                    or review.end_time + post_capture >= recording.start_time
                ):
                    keep = True
                    mode = (
                        config.record.alerts.retain.mode
                        if review.severity == "alert"
                        else config.record.detections.retain.mode
                    )
                    break

                # if the review ends before this recording segment starts, skip
                # this review and check the next review for an overlap.
                # since the review and recordings are sorted, we can skip review
                # that end before the previous recording segment started on future segments
                if review.end_time + post_capture < recording.start_time:
                    review_start = idx

            # Delete recordings outside of the retention window or based on the retention mode
            if (
                not keep
                or (
                    mode == RetainModeEnum.motion
                    and recording.motion == 0
                    and recording.objects == 0
                    and recording.dBFS == 0
                )
                or (mode == RetainModeEnum.active_objects and recording.objects == 0)
            ):
                recording_path = Path(recording.path)
                recording_path.unlink(missing_ok=True)
                deleted_recordings.add(recording.id)
                maybe_empty_dirs.add(recording_path.parent)
            else:
                kept_recordings.append((recording.start_time, recording.end_time))

        # expire recordings
        logger.debug(f"Expiring {len(deleted_recordings)} recordings")
        # delete up to 100,000 at a time
        max_deletes = 100000
        deleted_recordings_list = list(deleted_recordings)
        for i in range(0, len(deleted_recordings_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << deleted_recordings_list[i : i + max_deletes]
            ).execute()

        previews: list[Previews] = (
            Previews.select(
                Previews.id,
                Previews.start_time,
                Previews.end_time,
                Previews.path,
            )
            .where(
                (Previews.camera == config.name)
                & (Previews.end_time < continuous_expire_date)
                & (Previews.end_time < motion_expire_date)
            )
            .order_by(Previews.start_time)
            .namedtuples()
            .iterator()
        )

        # expire previews
        recording_start = 0
        deleted_previews = set()
        for preview in previews:
            keep = False
            # look for a reason to keep this preview
            for idx in range(recording_start, len(kept_recordings)):
                start_time, end_time = kept_recordings[idx]

                # if the recording starts in the future, stop checking recordings
                # and let this preview expire
                if start_time > preview.end_time:
                    keep = False
                    break

                # if the recording ends after the preview starts, keep it
                # and stop looking at recordings
                if end_time >= preview.start_time:
                    keep = True
                    break

                # if the recording ends before this preview starts, skip
                # this recording and check the next recording for an overlap.
                # since the kept recordings and previews are sorted, we can skip recordings
                # that end before the current preview started
                if end_time < preview.start_time:
                    recording_start = idx

            # Delete previews without any relevant recordings
            if not keep:
                preview_path = Path(preview.path)
                preview_path.unlink(missing_ok=True)
                deleted_previews.add(preview.id)
                maybe_empty_dirs.add(preview_path.parent)

        # expire previews
        logger.debug(f"Expiring {len(deleted_previews)} previews")
        # delete up to 100,000 at a time
        max_deletes = 100000
        deleted_previews_list = list(deleted_previews)
        for i in range(0, len(deleted_previews_list), max_deletes):
            Previews.delete().where(
                Previews.id << deleted_previews_list[i : i + max_deletes]
            ).execute()

        return maybe_empty_dirs

    def expire_recordings(self) -> set[Path]:
        """Delete recordings based on retention config."""
        logger.debug("Start expire recordings.")
        logger.debug("Start deleted cameras.")

        # Handle deleted cameras
        expire_days = max(
            self.config.record.continuous.days, self.config.record.motion.days
        )
        expire_before = (
            datetime.datetime.now() - datetime.timedelta(days=expire_days)
        ).timestamp()
        no_camera_recordings: Recordings = (
            Recordings.select(
                Recordings.id,
                Recordings.path,
            )
            .where(
                Recordings.camera.not_in(list(self.config.cameras.keys())),
                Recordings.end_time < expire_before,
            )
            .namedtuples()
            .iterator()
        )

        maybe_empty_dirs = set()

        deleted_recordings = set()
        for recording in no_camera_recordings:
            recording_path = Path(recording.path)
            recording_path.unlink(missing_ok=True)
            deleted_recordings.add(recording.id)
            maybe_empty_dirs.add(recording_path.parent)

        logger.debug(f"Expiring {len(deleted_recordings)} recordings")
        # delete up to 100,000 at a time
        max_deletes = 100000
        deleted_recordings_list = list(deleted_recordings)
        for i in range(0, len(deleted_recordings_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << deleted_recordings_list[i : i + max_deletes]
            ).execute()
        logger.debug("End deleted cameras.")

        logger.debug("Start all cameras.")
        for camera, config in self.config.cameras.items():
            logger.debug(f"Start camera: {camera}.")
            now = datetime.datetime.now()

            maybe_empty_dirs |= self.expire_review_segments(config, now)
            continuous_expire_date = (
                now - datetime.timedelta(days=config.record.continuous.days)
            ).timestamp()
            motion_expire_date = (
                now
                - datetime.timedelta(
                    days=max(
                        config.record.motion.days, config.record.continuous.days
                    )  # can't keep motion for less than continuous
                )
            ).timestamp()

            # Get all the reviews to check against
            reviews: ReviewSegment = (
                ReviewSegment.select(
                    ReviewSegment.start_time,
                    ReviewSegment.end_time,
                    ReviewSegment.severity,
                )
                .where(
                    ReviewSegment.camera == camera,
                    # need to ensure segments for all reviews starting
                    # before the expire date are included
                    ReviewSegment.start_time < motion_expire_date,
                )
                .order_by(ReviewSegment.start_time)
                .namedtuples()
            )

            maybe_empty_dirs |= self.expire_existing_camera_recordings(
                continuous_expire_date, motion_expire_date, config, reviews
            )
            logger.debug(f"End camera: {camera}.")

        logger.debug("End all cameras.")
        logger.debug("End expire recordings.")

        return maybe_empty_dirs

    def run(self) -> None:
        # Expire tmp clips every minute, recordings and clean directories every hour.
        for counter in itertools.cycle(range(self.config.record.expire_interval)):
            if self.stop_event.wait(60):
                logger.info("Exiting recording cleanup...")
                break

            self.clean_tmp_previews()

            if counter == 0:
                self.clean_tmp_clips()
                maybe_empty_dirs = self.expire_recordings()
                remove_empty_directories(maybe_empty_dirs)
                self.truncate_wal()
