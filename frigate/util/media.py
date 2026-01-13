"""Recordings Utilities."""

import datetime
import logging
import os
from dataclasses import dataclass, field

from peewee import DatabaseError, chunked

from frigate.const import CLIPS_DIR, EXPORT_DIR, RECORD_DIR, THUMB_DIR
from frigate.models import (
    Event,
    Export,
    Previews,
    Recordings,
    RecordingsToDelete,
    ReviewSegment,
)

logger = logging.getLogger(__name__)


# Safety threshold - abort if more than 50% of files would be deleted
SAFETY_THRESHOLD = 0.5


@dataclass
class SyncResult:
    """Result of a sync operation."""

    media_type: str
    files_checked: int = 0
    orphans_found: int = 0
    orphans_deleted: int = 0
    orphan_paths: list[str] = field(default_factory=list)
    aborted: bool = False
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "media_type": self.media_type,
            "files_checked": self.files_checked,
            "orphans_found": self.orphans_found,
            "orphans_deleted": self.orphans_deleted,
            "aborted": self.aborted,
            "error": self.error,
        }


def remove_empty_directories(directory: str) -> None:
    # list all directories recursively and sort them by path,
    # longest first
    paths = sorted(
        [x[0] for x in os.walk(directory)],
        key=lambda p: len(str(p)),
        reverse=True,
    )
    for path in paths:
        # don't delete the parent
        if path == directory:
            continue
        if len(os.listdir(path)) == 0:
            os.rmdir(path)


def sync_recordings(
    limited: bool = False, dry_run: bool = False, force: bool = False
) -> SyncResult:
    """Sync recordings between the database and disk using the SyncResult format."""

    result = SyncResult(media_type="recordings")

    try:
        logger.debug("Start sync recordings.")

        # start checking on the hour 36 hours ago
        check_point = datetime.datetime.now().replace(
            minute=0, second=0, microsecond=0
        ).astimezone(datetime.timezone.utc) - datetime.timedelta(hours=36)

        # Gather DB recordings to inspect
        if limited:
            recordings_query = Recordings.select(Recordings.id, Recordings.path).where(
                Recordings.start_time >= check_point.timestamp()
            )
        else:
            recordings_query = Recordings.select(Recordings.id, Recordings.path)

        recordings_count = recordings_query.count()
        page_size = 1000
        num_pages = (recordings_count + page_size - 1) // page_size
        recordings_to_delete: list[dict] = []

        for page in range(num_pages):
            for recording in recordings_query.paginate(page, page_size):
                if not os.path.exists(recording.path):
                    recordings_to_delete.append(
                        {"id": recording.id, "path": recording.path}
                    )

        result.files_checked += recordings_count
        result.orphans_found += len(recordings_to_delete)
        result.orphan_paths.extend(
            [
                recording["path"]
                for recording in recordings_to_delete
                if recording.get("path")
            ]
        )

        if (
            recordings_count
            and len(recordings_to_delete) / recordings_count > SAFETY_THRESHOLD
        ):
            if force:
                logger.warning(
                    f"Deleting {(len(recordings_to_delete) / max(1, recordings_count) * 100):.2f}% of recordings DB entries (force=True, bypassing safety threshold)"
                )
            else:
                logger.warning(
                    f"Deleting {(len(recordings_to_delete) / max(1, recordings_count) * 100):.2f}% of recordings DB entries, could be due to configuration error. Aborting..."
                )
                result.aborted = True
                return result

        if recordings_to_delete and not dry_run:
            logger.info(
                f"Deleting {len(recordings_to_delete)} recording DB entries with missing files"
            )

            RecordingsToDelete.create_table(temporary=True)

            max_inserts = 1000
            for batch in chunked(recordings_to_delete, max_inserts):
                RecordingsToDelete.insert_many(batch).execute()

            try:
                deleted = (
                    Recordings.delete()
                    .where(
                        Recordings.id.in_(
                            RecordingsToDelete.select(RecordingsToDelete.id)
                        )
                    )
                    .execute()
                )
                result.orphans_deleted += int(deleted)
            except DatabaseError as e:
                logger.error(f"Database error during recordings db cleanup: {e}")
                result.error = str(e)
                result.aborted = True
                return result

        if result.aborted:
            logger.warning("Recording DB sync aborted; skipping file cleanup.")
            return result

        # Only try to cleanup files if db cleanup was successful or dry_run
        if limited:
            # get recording files from last 36 hours
            hour_check = f"{RECORD_DIR}/{check_point.strftime('%Y-%m-%d/%H')}"
            files_on_disk = {
                os.path.join(root, file)
                for root, _, files in os.walk(RECORD_DIR)
                for file in files
                if root > hour_check
            }
        else:
            # get all recordings files on disk and put them in a set
            files_on_disk = {
                os.path.join(root, file)
                for root, _, files in os.walk(RECORD_DIR)
                for file in files
            }

        result.files_checked += len(files_on_disk)

        files_to_delete: list[str] = []
        for file in files_on_disk:
            if not Recordings.select().where(Recordings.path == file).exists():
                files_to_delete.append(file)

        result.orphans_found += len(files_to_delete)
        result.orphan_paths.extend(files_to_delete)

        if (
            files_on_disk
            and len(files_to_delete) / len(files_on_disk) > SAFETY_THRESHOLD
        ):
            if force:
                logger.warning(
                    f"Deleting {(len(files_to_delete) / max(1, len(files_on_disk)) * 100):.2f}% of recordings files (force=True, bypassing safety threshold)"
                )
            else:
                logger.warning(
                    f"Deleting {(len(files_to_delete) / max(1, len(files_on_disk)) * 100):.2f}% of recordings files, could be due to configuration error. Aborting..."
                )
                result.aborted = True
                return result

        if dry_run:
            logger.info(
                f"Recordings sync (dry run): Found {len(files_to_delete)} orphaned files"
            )
            return result

        # Delete orphans
        logger.info(f"Deleting {len(files_to_delete)} orphaned recordings files")
        for file in files_to_delete:
            try:
                os.unlink(file)
                result.orphans_deleted += 1
            except OSError as e:
                logger.error(f"Failed to delete {file}: {e}")

        logger.debug("End sync recordings.")

    except Exception as e:
        logger.error(f"Error syncing recordings: {e}")
        result.error = str(e)

    return result


def sync_event_snapshots(dry_run: bool = False, force: bool = False) -> SyncResult:
    """Sync event snapshots - delete files not referenced by any event.

    Event snapshots are stored at: CLIPS_DIR/{camera}-{event_id}.jpg
    Also checks for clean variants: {camera}-{event_id}-clean.webp and -clean.png
    """
    result = SyncResult(media_type="event_snapshots")

    try:
        # Get all event IDs with snapshots from DB
        events_with_snapshots = set(
            f"{e.camera}-{e.id}"
            for e in Event.select(Event.id, Event.camera).where(
                Event.has_snapshot == True
            )
        )

        # Find snapshot files on disk (directly in CLIPS_DIR, not subdirectories)
        snapshot_files: list[tuple[str, str]] = []  # (full_path, base_name)
        if os.path.isdir(CLIPS_DIR):
            for file in os.listdir(CLIPS_DIR):
                file_path = os.path.join(CLIPS_DIR, file)
                if os.path.isfile(file_path) and file.endswith(
                    (".jpg", "-clean.webp", "-clean.png")
                ):
                    # Extract base name (camera-event_id) from filename
                    base_name = file
                    for suffix in ["-clean.webp", "-clean.png", ".jpg"]:
                        if file.endswith(suffix):
                            base_name = file[: -len(suffix)]
                            break
                    snapshot_files.append((file_path, base_name))

        result.files_checked = len(snapshot_files)

        # Find orphans
        orphans: list[str] = []
        for file_path, base_name in snapshot_files:
            if base_name not in events_with_snapshots:
                orphans.append(file_path)

        result.orphans_found = len(orphans)
        result.orphan_paths = orphans

        if len(orphans) == 0:
            return result

        # Safety check
        if (
            result.files_checked > 0
            and len(orphans) / result.files_checked > SAFETY_THRESHOLD
        ):
            if force:
                logger.warning(
                    f"Event snapshots sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files (force=True, bypassing safety threshold)."
                )
            else:
                logger.warning(
                    f"Event snapshots sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files. "
                    "Aborting due to safety threshold."
                )
                result.aborted = True
                return result

        if dry_run:
            logger.info(
                f"Event snapshots sync (dry run): Found {len(orphans)} orphaned files"
            )
            return result

        # Delete orphans
        logger.info(f"Deleting {len(orphans)} orphaned event snapshot files")
        for file_path in orphans:
            try:
                os.unlink(file_path)
                result.orphans_deleted += 1
            except OSError as e:
                logger.error(f"Failed to delete {file_path}: {e}")

    except Exception as e:
        logger.error(f"Error syncing event snapshots: {e}")
        result.error = str(e)

    return result


def sync_event_thumbnails(dry_run: bool = False, force: bool = False) -> SyncResult:
    """Sync event thumbnails - delete files not referenced by any event.

    Event thumbnails are stored at: THUMB_DIR/{camera}/{event_id}.webp
    Only events without inline thumbnail (thumbnail field is None/empty) use files.
    """
    result = SyncResult(media_type="event_thumbnails")

    try:
        # Get all events that use file-based thumbnails
        # Events with thumbnail field populated don't need files
        events_with_file_thumbs = set(
            (e.camera, e.id)
            for e in Event.select(Event.id, Event.camera, Event.thumbnail).where(
                (Event.thumbnail.is_null(True)) | (Event.thumbnail == "")
            )
        )

        # Find thumbnail files on disk
        thumbnail_files: list[
            tuple[str, str, str]
        ] = []  # (full_path, camera, event_id)
        if os.path.isdir(THUMB_DIR):
            for camera_dir in os.listdir(THUMB_DIR):
                camera_path = os.path.join(THUMB_DIR, camera_dir)
                if not os.path.isdir(camera_path):
                    continue
                for file in os.listdir(camera_path):
                    if file.endswith(".webp"):
                        event_id = file[:-5]  # Remove .webp
                        file_path = os.path.join(camera_path, file)
                        thumbnail_files.append((file_path, camera_dir, event_id))

        result.files_checked = len(thumbnail_files)

        # Find orphans - files where event doesn't exist or event has inline thumbnail
        orphans: list[str] = []
        for file_path, camera, event_id in thumbnail_files:
            if (camera, event_id) not in events_with_file_thumbs:
                # Check if event exists with inline thumbnail
                event_exists = Event.select().where(Event.id == event_id).exists()
                if not event_exists:
                    orphans.append(file_path)
                # If event exists with inline thumbnail, the file is also orphaned
                elif event_exists:
                    event = Event.get_or_none(Event.id == event_id)
                    if event and event.thumbnail:
                        orphans.append(file_path)

        result.orphans_found = len(orphans)
        result.orphan_paths = orphans

        if len(orphans) == 0:
            return result

        # Safety check
        if (
            result.files_checked > 0
            and len(orphans) / result.files_checked > SAFETY_THRESHOLD
        ):
            if force:
                logger.warning(
                    f"Event thumbnails sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files (force=True, bypassing safety threshold)."
                )
            else:
                logger.warning(
                    f"Event thumbnails sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files. "
                    "Aborting due to safety threshold."
                )
                result.aborted = True
                return result

        if dry_run:
            logger.info(
                f"Event thumbnails sync (dry run): Found {len(orphans)} orphaned files"
            )
            return result

        # Delete orphans
        logger.info(f"Deleting {len(orphans)} orphaned event thumbnail files")
        for file_path in orphans:
            try:
                os.unlink(file_path)
                result.orphans_deleted += 1
            except OSError as e:
                logger.error(f"Failed to delete {file_path}: {e}")

    except Exception as e:
        logger.error(f"Error syncing event thumbnails: {e}")
        result.error = str(e)

    return result


def sync_review_thumbnails(dry_run: bool = False, force: bool = False) -> SyncResult:
    """Sync review segment thumbnails - delete files not referenced by any review segment.

    Review thumbnails are stored at: CLIPS_DIR/review/thumb-{camera}-{review_id}.webp
    The full path is stored in ReviewSegment.thumb_path
    """
    result = SyncResult(media_type="review_thumbnails")

    try:
        # Get all thumb paths from DB
        review_thumb_paths = set(
            r.thumb_path
            for r in ReviewSegment.select(ReviewSegment.thumb_path)
            if r.thumb_path
        )

        # Find review thumbnail files on disk
        review_dir = os.path.join(CLIPS_DIR, "review")
        thumbnail_files: list[str] = []
        if os.path.isdir(review_dir):
            for file in os.listdir(review_dir):
                if file.startswith("thumb-") and file.endswith(".webp"):
                    file_path = os.path.join(review_dir, file)
                    thumbnail_files.append(file_path)

        result.files_checked = len(thumbnail_files)

        # Find orphans
        orphans: list[str] = []
        for file_path in thumbnail_files:
            if file_path not in review_thumb_paths:
                orphans.append(file_path)

        result.orphans_found = len(orphans)
        result.orphan_paths = orphans

        if len(orphans) == 0:
            return result

        # Safety check
        if (
            result.files_checked > 0
            and len(orphans) / result.files_checked > SAFETY_THRESHOLD
        ):
            if force:
                logger.warning(
                    f"Review thumbnails sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files (force=True, bypassing safety threshold)."
                )
            else:
                logger.warning(
                    f"Review thumbnails sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files. "
                    "Aborting due to safety threshold."
                )
                result.aborted = True
                return result

        if dry_run:
            logger.info(
                f"Review thumbnails sync (dry run): Found {len(orphans)} orphaned files"
            )
            return result

        # Delete orphans
        logger.info(f"Deleting {len(orphans)} orphaned review thumbnail files")
        for file_path in orphans:
            try:
                os.unlink(file_path)
                result.orphans_deleted += 1
            except OSError as e:
                logger.error(f"Failed to delete {file_path}: {e}")

    except Exception as e:
        logger.error(f"Error syncing review thumbnails: {e}")
        result.error = str(e)

    return result


def sync_previews(dry_run: bool = False, force: bool = False) -> SyncResult:
    """Sync preview files - delete files not referenced by any preview record.

    Previews are stored at: CLIPS_DIR/previews/{camera}/*.mp4
    The full path is stored in Previews.path
    """
    result = SyncResult(media_type="previews")

    try:
        # Get all preview paths from DB
        preview_paths = set(p.path for p in Previews.select(Previews.path) if p.path)

        # Find preview files on disk
        previews_dir = os.path.join(CLIPS_DIR, "previews")
        preview_files: list[str] = []
        if os.path.isdir(previews_dir):
            for camera_dir in os.listdir(previews_dir):
                camera_path = os.path.join(previews_dir, camera_dir)
                if not os.path.isdir(camera_path):
                    continue
                for file in os.listdir(camera_path):
                    if file.endswith(".mp4"):
                        file_path = os.path.join(camera_path, file)
                        preview_files.append(file_path)

        result.files_checked = len(preview_files)

        # Find orphans
        orphans: list[str] = []
        for file_path in preview_files:
            if file_path not in preview_paths:
                orphans.append(file_path)

        result.orphans_found = len(orphans)
        result.orphan_paths = orphans

        if len(orphans) == 0:
            return result

        # Safety check
        if (
            result.files_checked > 0
            and len(orphans) / result.files_checked > SAFETY_THRESHOLD
        ):
            if force:
                logger.warning(
                    f"Previews sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files (force=True, bypassing safety threshold)."
                )
            else:
                logger.warning(
                    f"Previews sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files. "
                    "Aborting due to safety threshold."
                )
                result.aborted = True
                return result

        if dry_run:
            logger.info(f"Previews sync (dry run): Found {len(orphans)} orphaned files")
            return result

        # Delete orphans
        logger.info(f"Deleting {len(orphans)} orphaned preview files")
        for file_path in orphans:
            try:
                os.unlink(file_path)
                result.orphans_deleted += 1
            except OSError as e:
                logger.error(f"Failed to delete {file_path}: {e}")

    except Exception as e:
        logger.error(f"Error syncing previews: {e}")
        result.error = str(e)

    return result


def sync_exports(dry_run: bool = False, force: bool = False) -> SyncResult:
    """Sync export files - delete files not referenced by any export record.

    Export videos are stored at: EXPORT_DIR/*.mp4
    Export thumbnails are stored at: CLIPS_DIR/export/*.jpg
    The paths are stored in Export.video_path and Export.thumb_path
    """
    result = SyncResult(media_type="exports")

    try:
        # Get all export paths from DB
        export_video_paths = set()
        export_thumb_paths = set()
        for e in Export.select(Export.video_path, Export.thumb_path):
            if e.video_path:
                export_video_paths.add(e.video_path)
            if e.thumb_path:
                export_thumb_paths.add(e.thumb_path)

        # Find export video files on disk
        export_files: list[str] = []
        if os.path.isdir(EXPORT_DIR):
            for file in os.listdir(EXPORT_DIR):
                if file.endswith(".mp4"):
                    file_path = os.path.join(EXPORT_DIR, file)
                    export_files.append(file_path)

        # Find export thumbnail files on disk
        export_thumb_dir = os.path.join(CLIPS_DIR, "export")
        thumb_files: list[str] = []
        if os.path.isdir(export_thumb_dir):
            for file in os.listdir(export_thumb_dir):
                if file.endswith(".jpg"):
                    file_path = os.path.join(export_thumb_dir, file)
                    thumb_files.append(file_path)

        result.files_checked = len(export_files) + len(thumb_files)

        # Find orphans
        orphans: list[str] = []
        for file_path in export_files:
            if file_path not in export_video_paths:
                orphans.append(file_path)
        for file_path in thumb_files:
            if file_path not in export_thumb_paths:
                orphans.append(file_path)

        result.orphans_found = len(orphans)
        result.orphan_paths = orphans

        if len(orphans) == 0:
            return result

        # Safety check
        if (
            result.files_checked > 0
            and len(orphans) / result.files_checked > SAFETY_THRESHOLD
        ):
            if force:
                logger.warning(
                    f"Exports sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files (force=True, bypassing safety threshold)."
                )
            else:
                logger.warning(
                    f"Exports sync: Would delete {len(orphans)}/{result.files_checked} "
                    f"({len(orphans) / result.files_checked * 100:.2f}%) files. "
                    "Aborting due to safety threshold."
                )
                result.aborted = True
                return result

        if dry_run:
            logger.info(f"Exports sync (dry run): Found {len(orphans)} orphaned files")
            return result

        # Delete orphans
        logger.info(f"Deleting {len(orphans)} orphaned export files")
        for file_path in orphans:
            try:
                os.unlink(file_path)
                result.orphans_deleted += 1
            except OSError as e:
                logger.error(f"Failed to delete {file_path}: {e}")

    except Exception as e:
        logger.error(f"Error syncing exports: {e}")
        result.error = str(e)

    return result


@dataclass
class MediaSyncResults:
    """Combined results from all media sync operations."""

    event_snapshots: SyncResult | None = None
    event_thumbnails: SyncResult | None = None
    review_thumbnails: SyncResult | None = None
    previews: SyncResult | None = None
    exports: SyncResult | None = None
    recordings: SyncResult | None = None

    @property
    def total_files_checked(self) -> int:
        total = 0
        for result in [
            self.event_snapshots,
            self.event_thumbnails,
            self.review_thumbnails,
            self.previews,
            self.exports,
            self.recordings,
        ]:
            if result:
                total += result.files_checked
        return total

    @property
    def total_orphans_found(self) -> int:
        total = 0
        for result in [
            self.event_snapshots,
            self.event_thumbnails,
            self.review_thumbnails,
            self.previews,
            self.exports,
            self.recordings,
        ]:
            if result:
                total += result.orphans_found
        return total

    @property
    def total_orphans_deleted(self) -> int:
        total = 0
        for result in [
            self.event_snapshots,
            self.event_thumbnails,
            self.review_thumbnails,
            self.previews,
            self.exports,
            self.recordings,
        ]:
            if result:
                total += result.orphans_deleted
        return total

    def to_dict(self) -> dict:
        """Convert results to dictionary for API response."""
        results = {}
        for name, result in [
            ("event_snapshots", self.event_snapshots),
            ("event_thumbnails", self.event_thumbnails),
            ("review_thumbnails", self.review_thumbnails),
            ("previews", self.previews),
            ("exports", self.exports),
            ("recordings", self.recordings),
        ]:
            if result:
                results[name] = {
                    "files_checked": result.files_checked,
                    "orphans_found": result.orphans_found,
                    "orphans_deleted": result.orphans_deleted,
                    "aborted": result.aborted,
                    "error": result.error,
                }
        results["totals"] = {
            "files_checked": self.total_files_checked,
            "orphans_found": self.total_orphans_found,
            "orphans_deleted": self.total_orphans_deleted,
        }
        return results


def sync_all_media(
    dry_run: bool = False, media_types: list[str] = ["all"], force: bool = False
) -> MediaSyncResults:
    """Sync specified media types with the database.

    Args:
        dry_run: If True, only report orphans without deleting them.
        media_types: List of media types to sync. Can include: 'all', 'event_snapshots',
                    'event_thumbnails', 'review_thumbnails', 'previews', 'exports', 'recordings'
        force: If True, bypass safety threshold checks.

    Returns:
        MediaSyncResults with details of each sync operation.
    """
    logger.debug(
        f"Starting media sync (dry_run={dry_run}, media_types={media_types}, force={force})"
    )

    results = MediaSyncResults()

    # Determine which media types to sync
    sync_all = "all" in media_types

    if sync_all or "event_snapshots" in media_types:
        results.event_snapshots = sync_event_snapshots(dry_run=dry_run, force=force)

    if sync_all or "event_thumbnails" in media_types:
        results.event_thumbnails = sync_event_thumbnails(dry_run=dry_run, force=force)

    if sync_all or "review_thumbnails" in media_types:
        results.review_thumbnails = sync_review_thumbnails(dry_run=dry_run, force=force)

    if sync_all or "previews" in media_types:
        results.previews = sync_previews(dry_run=dry_run, force=force)

    if sync_all or "exports" in media_types:
        results.exports = sync_exports(dry_run=dry_run, force=force)

    if sync_all or "recordings" in media_types:
        results.recordings = sync_recordings(dry_run=dry_run, force=force)

    logger.info(
        f"Media sync complete: checked {results.total_files_checked} files, "
        f"found {results.total_orphans_found} orphans, "
        f"deleted {results.total_orphans_deleted}"
    )

    return results
