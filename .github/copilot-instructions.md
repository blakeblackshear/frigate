# Frigate AI Agent Instructions

## Project Overview

Frigate is a **local NVR with realtime AI object detection** for IP cameras. It's a multiprocess Python service that combines:

- Video capture and processing from IP cameras
- Realtime object detection (TensorFlow, ONNX models on CPU/GPU/AI accelerators)
- Recording with retention policies
- Event tracking and review UI
- REST API + MQTT integration

**Key architectural philosophy**: Minimize resource use by only running expensive detection where/when motion is detected. Heavy use of multiprocessing for FPS and scalability.

## Architecture Patterns

### Multiprocess Communication

Frigate uses **three primary IPC mechanisms** (NOT shared state):

1. **ZMQ pub/sub** (for one-way broadcasts):

   - Config changes: `frigate/comms/config_updater.py` (PUB via `ipc:///tmp/cache/config`)
   - Object detection signals: `frigate/comms/object_detector_signaler.py`
   - Detection/event updates: detector signaler, event publishers

2. **ZMQ req/rep** (request-reply):

   - `frigate/comms/inter_process.py` - processes request data and get responses via `ipc:///tmp/cache/comms`
   - Used by `InterProcessRequestor` for sync queries

3. **Multiprocessing Queues** (frame data):
   - `detection_queue`: Camera frames → object detectors
   - `tracked_objects_queue`: Detected objects → event processor
   - `timeline_queue`: Events → timeline storage

**Key pattern**: Each service publishes to ZMQ topics, others subscribe. Config changes fan out via ZMQ pub/sub to all processes without central coordination.

### Core Services (in `frigate/app.py` FrigateApp)

- **CameraMaintainer** (thread): Spawns camera capture/processing subprocess per camera
- **ObjectDetectProcess** (subprocess): Runs ML inference on queued frames
- **TrackedObjectProcessor** (thread): Receives detections, correlates into tracked objects, publishes events
- **EventProcessor** (thread): Manages event lifecycle, DB updates
- **RecordProcess** (subprocess): Manages video recording/retention
- **OutputProcess** (subprocess): Encodes/streams video
- **ReviewProcess** (subprocess): Processes review segments
- **EmbeddingProcess** (subprocess): Runs embeddings for semantic search/face/LPR

**Logging pattern**: Central `log.py` uses QueueListener to collect logs from all processes into one queue to avoid multiprocess logging chaos.

## Config System

Configuration is **Pydantic BaseModel** hierarchy:

- **Parsing**: YAML → Pydantic models with validators in `frigate/config/config.py`
- **Types**: `frigate/types.py` has shared enums (EventType, ObjectType, etc.)
- **Validation pattern**: Use `@field_validator` with `mode='before'` to transform/validate before assignment
- **Runtime values**: `RuntimeMotionConfig` applies frame shape transforms to masks
- **Key files**:
  - `config.py` - main FrigateConfig entry point
  - `camera/` - per-camera sub-configs (detect, record, snapshots, etc.)
  - `classification.py` - face/LPR/audio/semantic search configs

**When adding config**: Create Pydantic model → add to parent config → update migrations if DB schema changes.

## Data Model & Persistence

**Database**: SQLite with custom `SqliteVecQueueDatabase` (vector support for embeddings)

- **Models** in `frigate/models.py`: Event, Timeline, Recordings, User, etc. (Peewee ORM)
- **Key tables**:
  - `events` - detected objects (car, person, etc.) with retention policies
  - `timeline` - events feed (entered_zone, audio, etc.)
  - `recordings` - video segments with metadata
  - `review_segments` - flagged clips for review

**Event lifecycle**:

1. TrackedObject detected → Event created with `false_positive=False`
2. EventProcessor updates Event (score, zones, clips, snapshots)
3. On object lost, Event gets `end_time` and is finalized

**Migrations**: Use Peewee migrations in `migrations/` - run via `peewee_migrate.Router`.

## Key Workflows

### Adding a New Detector Type

1. Create detector class in `frigate/detectors/plugins/` inheriting `DetectionApi`
2. Add config class in `frigate/detectors/detector_config.py`
3. Register in detector factory in `frigate/detectors/__init__.py`
4. Update `DEFAULT_DETECTORS` constant if it's the default

### Object Detection Pipeline

```
Camera subprocess → capture frames → motion detect →
  queue frame to detection_queue →
  ObjectDetectProcess (inference) →
  TrackedObjectProcessor (correlate detections) →
  Event + tracking + DB updates
```

### Recording Flow

- **24/7 recording**: Segments written every frame duration
- **Retention**: Deleted if no events + retention time elapsed
- **Cleanup**: `RecordingCleanup` task deletes old segments based on retention config

### Frontend Translation Pattern

- **Rule**: NEVER hardcode strings in `.ts/.tsx` files
- **Pattern**: Store strings in `web/src/locales/en.json` → import locale function → use in code
- **See**: `.cursor/rules/frontend-always-use-translation-files.mdc`

## Common Code Patterns

### Inter-process Config Updates

```python
# In detector/processor:
self.config_subscriber = ConfigSubscriber(config, [ConfigUpdateEnum.cameras])

# In main app (FrigateApp):
publisher = ConfigPublisher()
publisher.publish("cameras", new_config)  # All subscribers notified
```

### Event Publishing

```python
from frigate.comms.events_updater import EventUpdatePublisher

publisher = EventUpdatePublisher()
publisher.publish({"camera": "cam1", "label": "person", ...})
```

### Shared Memory Frames

```python
from frigate.util.image import SharedMemoryFrameManager, UntrackedSharedMemory

frame_manager = SharedMemoryFrameManager()
shm = frame_manager.get(frame_id)  # returns np.ndarray view
```

## Testing & Debugging

**Test structure**: `frigate/test/test_*.py` using Python `unittest`

- Run tests: `make run_tests` (builds Docker, runs in container)
- Key tests: config parsing, detector inference, frame processing

**Build targets** (Makefile):

- `make local` - builds Docker image locally with version
- `make debug` - builds with debug logging enabled
- `make run` - runs container with config volume mounted

**Debugging multiprocess issues**:

- Check `log_queue` output in `frigate/log.py`
- Enable `DEBUG` logging for specific modules in config
- Use `faulthandler.enable()` (already enabled in processes) for segfaults

## Important Conventions

- **Imports**: Run Ruff with isort (`extend-select = ["I"]`) - enforces import sorting
- **GPU/Acceleration**: Hardware detection in `frigate/util/services.py` (NVIDIA, Intel VAAPI, AMD, etc.)
- **Model paths**: Stored in `/config/model_cache/` (symlinked or volume mounted)
- **Recording paths**: `/media/frigate/recordings/` (clips in `clips/`, exports in `exports/`)
- **PID locking**: Use `setproctitle()` to name processes for debugging via `ps`

## Files to Know

| File                                 | Purpose                                  |
| ------------------------------------ | ---------------------------------------- |
| `frigate/app.py`                     | Main app startup, service orchestration  |
| `frigate/camera/`                    | Camera subprocess, frame capture, motion |
| `frigate/track/object_processing.py` | Detection correlation, event publishing  |
| `frigate/events/maintainer.py`       | Event lifecycle management               |
| `frigate/config/config.py`           | Config parsing & validation              |
| `frigate/comms/`                     | IPC (ZMQ pub/sub, req/rep)               |
| `frigate/api/fastapi_app.py`         | REST API setup                           |
| `frigate/models.py`                  | Database ORM models                      |
| `frigate/const.py`                   | Global constants (paths, defaults)       |

## Gotchas & Common Mistakes

1. **Pickle compatibility**: Objects sent over multiprocess queues must be pickleable. Avoid lambdas, file handles.
2. **Config subscriptions**: Always check `mode='before'` in validators—Pydantic can be confusing.
3. **Event state confusion**: Events have transient state in `TrackedObjectProcessor` AND persistent state in DB—don't mix them.
4. **Motion masks**: Frame shape must be applied before creating `RuntimeMotionConfig`—validate in tests.
5. **ZMQ timing**: Topics must be subscribed BEFORE publisher sends; use small sleep if race condition suspected.
6. **Frontend strings**: Forgetting to use locale files breaks translations and fails linting.

## External Integration

- **MQTT**: Via `MqttClient` in `frigate/comms/mqtt.py` - publishes detections, accepts commands
- **Home Assistant**: Native integration via custom component (separate repo)
- **Frigate+**: Paid cloud sync service - `frigate/plus.py` handles API calls
- **Webhooks**: Event-triggered POST requests configured per-camera

---

**Last updated**: Branch `review-stream-tweaks` | For architecture deep-dives, start with `frigate/app.py::FrigateApp.__init__()` to see all service wiring.
