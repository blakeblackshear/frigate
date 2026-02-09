---
id: storage
title: Storage Management
---

Frigate uses several background processes to manage disk storage automatically. This page explains how disk space is recovered, how the database stays in sync with files on disk, and what happens when files are added or removed outside of Frigate.

## How Disk Space Is Recovered

Frigate recovers disk space through three independent background processes, each targeting different types of data. The following table summarizes which timings are configurable and which are hardcoded:

| Timing | Value | Configurable? |
|--------|-------|---------------|
| Recording cleanup interval | 60 minutes | Yes — `record.expire_interval` |
| Retention days (continuous, motion, alerts, detections) | Varies | Yes — per-camera config |
| Snapshot retention | Varies | Yes — per-camera, per-label config |
| Storage maintainer check interval | 5 minutes | No |
| Emergency cleanup trigger | less than 1 hour of space remaining | No |
| Event cleanup interval | 5 minutes | No |
| Temp preview/clip expiration age | 1 hour | No |
| WAL truncation threshold | 10 MB | No |
| Daily sync time | 3:00 AM UTC | No |
| Daily sync window | Last 36 hours | No |
| Sync safety abort threshold | 50% of entries affected | No |

### Storage Maintainer (Emergency Cleanup)

The storage maintainer thread runs every 5 minutes and monitors available disk space on the **recordings filesystem only** (`/media/frigate/recordings`). It uses `shutil.disk_usage()` which reports free space at the OS filesystem level, so bind mounts and network shares are handled correctly — if recordings are on a separate disk, Frigate checks *that* disk's free space, not the root filesystem.

It calculates the combined recording bandwidth of all cameras (in MB/hr, averaged from the last 100 segments per camera) and triggers cleanup when less than 1 hour of recording space remains. These intervals are hardcoded.

:::note

The emergency cleanup only monitors the recordings path. If clips (`/media/frigate/clips`) or exports (`/media/frigate/exports`) are bind-mounted to a different filesystem, the storage maintainer will **not** detect that filesystem filling up. Only recordings are subject to automatic emergency deletion.

:::

When triggered, it deletes the **oldest recording segments first**, working forward in time until at least 1 hour of bandwidth has been reclaimed. Recordings that overlap with events marked `retain_indefinitely` are skipped in the first pass. If insufficient space is freed after skipping retained recordings, a second pass deletes retained recordings as well starting from the oldest.

After deleting recordings, the storage maintainer updates the `has_clip` field to `False` on any events whose time range overlapped with deleted recordings.

### Recording Cleanup (Retention-Based Expiration)

The recording cleanup thread runs every `expire_interval` minutes and enforces the configured retention policies for each camera. This is the **only configurable interval** for the cleanup processes:

```yaml
record:
  expire_interval: 60 # minutes between cleanup runs (default: 60)
```

Recordings are evaluated in this order:

1. **Continuous retention** (`record.continuous.days`): Segments older than this with no motion and no audio are candidates for deletion.
2. **Motion retention** (`record.motion.days`, must be >= continuous days): Segments older than this are candidates for deletion regardless of motion.
3. **Alert/Detection retention**: Segments that overlap with non-expired review items are kept based on the retain mode:
   - `all`: Keep all overlapping segments
   - `motion`: Keep only segments with motion, active objects, or audio
   - `active_objects`: Keep only segments with active objects

Recordings for cameras that have been **removed from the configuration** are expired using the global retention settings.

On each cleanup cycle the thread also:

- Deletes preview files and temporary clips in cache older than 1 hour (hardcoded)
- Expires review segments (alerts and detections) based on their configured retention days
- Removes empty directories from the recordings folder
- Truncates the SQLite WAL (write-ahead log) if it exceeds 10 MB (hardcoded)

### Event Cleanup

The event cleanup thread runs every 5 minutes (hardcoded) and handles event-level retention:

- Marks `has_clip = False` on events whose recording retention has expired (per camera, per severity)
- Deletes event snapshots from disk based on per-camera, per-label snapshot retention settings
- Deletes event records from the database when both `has_clip` and `has_snapshot` are `False`, along with their thumbnails, timeline entries, and embeddings

## Database and Disk Synchronization

Frigate's database (`/config/frigate.db`) tracks every recording segment with its file path. Under normal operation, the database and disk stay in sync because Frigate manages all file creation and deletion. However, if files are manually added or removed, the database and disk can drift apart.

### The `sync_recordings` Feature

Frigate provides an opt-in sync mechanism that reconciles the database with the filesystem:

```yaml
record:
  sync_recordings: True
```

When enabled:

- **On startup**: A full sync runs, checking **all** recordings in the database against files on disk and vice versa.
- **Daily at 3:00 AM UTC**: A limited sync runs, checking only the **last 36 hours** of recordings.

The sync performs two operations:

1. **Database entries without files**: Queries all recording entries (or last 36 hours for limited sync), checks if each file exists on disk, and deletes database entries for missing files.
2. **Files without database entries**: Walks the recording directory (or last 36 hours of directories for limited sync), checks each file against the database, and deletes orphan files.

#### Safety Check

Both directions of the sync include a **50% safety threshold**. If more than 50% of recordings would be affected, the sync aborts and logs a warning. This prevents catastrophic data loss from misconfiguration (e.g., a storage mount that failed to attach).

:::warning

The sync operation uses considerable CPU resources and in most cases is not needed. Only enable when necessary.

:::

### What Happens Without `sync_recordings`

If `sync_recordings` is disabled (the default):

- **Files deleted from disk externally**: The database will still have entries pointing to those files. Playback of those segments will fail. The storage maintainer handles missing files gracefully during cleanup (catches `FileNotFoundError`), but stale database entries will persist until their retention period expires naturally.
- **Files added to disk externally**: Frigate will not know about them. They will not appear in the UI, will not be played back, and will not be managed by retention. They will consume disk space indefinitely until manually removed.

### If You Delete All Media

If you delete all recording files, do **not** use `sync_recordings` to clean up. Instead:

1. Stop Frigate
2. Delete the `frigate.db` database file
3. Restart Frigate

This avoids the CPU cost of scanning an empty filesystem and avoids tripping the 50% safety threshold.

## Storage Paths

| Path | Contents | Emergency cleanup? |
|------|----------|--------------------|
| `/media/frigate/recordings/` | Recording segments organized as `YYYY-MM-DD/HH/<camera_name>/MM.SS.mp4` (UTC) | Yes |
| `/media/frigate/clips/` | Event snapshots, face thumbnails, trigger images | No |
| `/media/frigate/exports/` | User-exported video files | No |
| `/tmp/cache/` | Temporary recording segments before they are moved to permanent storage | No |

Each of these paths can be on a different filesystem via bind mounts. Frigate's System page reports disk usage independently for recordings, clips, and cache using OS-level filesystem stats, so usage will be correct even when paths are on separate mounts. However, only the recordings path is monitored for emergency cleanup — the other paths are managed solely through retention-based expiration.

## Debugging Storage Issues

Enable debug logging for the relevant modules to understand storage behavior:

```yaml
logger:
  logs:
    frigate.storage: debug
    frigate.record.cleanup: debug
    frigate.record.maintainer: debug
    frigate.events.cleanup: debug
```
