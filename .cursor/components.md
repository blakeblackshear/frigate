# Frigate Components Deep Dive

## Backend Components (`frigate/`)

### Core Application

#### `app.py` - FrigateApp Class

**Purpose**: Central application orchestrator
**Key Responsibilities**:

- Process lifecycle management
- Resource initialization and cleanup
- Inter-process communication setup
- Database and embeddings initialization
- Hardware accelerator management

**Key Methods**:

- `start()`: System startup sequence
- `stop()`: Graceful shutdown
- `init_*()`: Component initialization methods
- `start_*()`: Process startup methods

#### `__main__.py` - Entry Point

**Purpose**: Application entry point and CLI handling
**Features**:

- Configuration validation
- Signal handling (SIGTERM)
- Error handling and user feedback

### API Layer (`api/`)

#### `app.py` - FastAPI Application Factory

**Purpose**: Web API and authentication
**Features**:

- FastAPI application creation
- Middleware configuration
- Route registration
- Error handling

#### `auth.py` - Authentication System

**Purpose**: User authentication and authorization
**Features**:

- JWT token generation/validation
- Password hashing
- User session management
- Login/logout endpoints

#### Route Modules

- **Events API**: Event CRUD operations, search, filtering
- **Media API**: Video/image serving, thumbnails
- **Config API**: Configuration management
- **Stats API**: System statistics and metrics
- **Export API**: Video export and download

### Configuration System (`config/`)

#### `config.py` - Main Configuration

**Purpose**: Central configuration management
**Features**:

- YAML parsing and validation
- Pydantic model integration
- Configuration migration
- Runtime validation

#### Camera Configuration (`camera/`)

- **`__init__.py`**: Camera-specific settings
- **`detect.py`**: Object detection configuration
- **`record.py`**: Recording settings
- **`motion.py`**: Motion detection parameters
- **`ffmpeg.py`**: FFmpeg stream configuration

#### Component Configs

- **`auth.py`**: Authentication settings
- **`mqtt.py`**: MQTT broker configuration
- **`database.py`**: Database connection settings
- **`ui.py`**: Web interface settings

### Object Detection (`detectors/`)

#### `detection_api.py` - Detection Interface

**Purpose**: Unified detection API
**Features**:

- Model loading and initialization
- Inference execution
- Result processing
- Hardware acceleration support

#### Detector Plugins (`plugins/`)

- **`cpu_tfl.py`**: CPU TensorFlow Lite
- **`edgetpu_tfl.py`**: Coral Edge TPU
- **`openvino.py`**: Intel OpenVINO
- **`tensorrt.py`**: NVIDIA TensorRT
- **`rknn.py`**: Rockchip NPU
- **`onnx.py`**: ONNX runtime

#### `detector_config.py` - Detector Configuration

**Purpose**: Detector-specific settings
**Features**:

- Model path configuration
- Input/output tensor mapping
- Hardware-specific parameters

### Video Processing

#### `video.py` - Video Capture and Processing

**Purpose**: Camera stream management
**Functions**:

- `capture_camera()`: Camera stream capture
- `track_camera()`: Object tracking
- Frame preprocessing
- Stream health monitoring

#### Motion Detection (`motion/`)

- **`frigate_motion.py`**: Basic motion detection
- **`improved_motion.py`**: Enhanced motion algorithms

### Event System (`events/`)

#### `maintainer.py` - Event Processor

**Purpose**: Event lifecycle management
**Features**:

- Event creation and updates
- Timeline generation
- Event cleanup
- Thumbnail generation

#### `cleanup.py` - Event Cleanup

**Purpose**: Automated data retention
**Features**:

- Old event removal
- Disk space management
- Configurable retention policies

#### `audio.py` - Audio Event Processing

**Purpose**: Audio-based event detection
**Features**:

- Audio stream processing
- Sound classification
- Audio event triggers

### Recording System (`record/`)

#### `record.py` - Recording Manager

**Purpose**: Video recording coordination
**Features**:

- Segment-based recording
- Retention policy enforcement
- Storage optimization
- Recovery handling

#### `cleanup.py` - Recording Cleanup

**Purpose**: Recording maintenance
**Features**:

- Old recording removal
- Storage quota management
- File integrity checks

#### `export.py` - Video Export

**Purpose**: Video export functionality
**Features**:

- Timeline-based exports
- Format conversion
- Progress tracking

### Communication (`comms/`)

#### `dispatcher.py` - Event Dispatcher

**Purpose**: Event distribution hub
**Features**:

- Multi-protocol communication
- Event routing
- Message formatting
- Error handling

#### `mqtt.py` - MQTT Client

**Purpose**: Home Assistant integration
**Features**:

- MQTT broker connection
- Topic management
- State publishing
- Discovery messages

#### `ws.py` - WebSocket Server

**Purpose**: Real-time web communication
**Features**:

- Live feed streaming
- Event notifications
- Bidirectional communication

#### Inter-Process Communication

- **`inter_process.py`**: Process messaging
- **`config_updater.py`**: Configuration updates
- **`zmq_proxy.py`**: ZeroMQ message routing

### Database (`db/`)

#### `sqlitevecq.py` - Vector Database

**Purpose**: Vector similarity search
**Features**:

- Embedding storage
- Similarity queries
- Vector indexing
- Semantic search

### Embeddings (`embeddings/`)

#### `embeddings.py` - Embedding Manager

**Purpose**: Feature extraction and management
**Features**:

- CLIP model integration
- Embedding generation
- Batch processing
- Index maintenance

#### `maintainer.py` - Embedding Maintenance

**Purpose**: Background embedding tasks
**Features**:

- Reindexing
- Cleanup
- Performance optimization

### Utilities (`util/`)

#### `image.py` - Image Processing

**Purpose**: Image manipulation utilities
**Features**:

- Shared memory frame management
- Image transformations
- Thumbnail generation
- Format conversions

#### `services.py` - System Services

**Purpose**: System integration utilities
**Features**:

- Hardware detection
- Service management
- Performance optimization

## Frontend Components (`web/src/`)

### Core Application

#### `App.tsx` - Main Application

**Purpose**: Root React component
**Features**:

- Routing configuration
- Global state management
- Error boundaries
- Theme providers

#### `index.css` - Global Styles

**Purpose**: Base styling and CSS variables
**Features**:

- TailwindCSS imports
- Theme definitions
- Global resets

### Components (`components/`)

#### Authentication (`auth/`)

- **`AuthForm.tsx`**: Login/logout forms

#### Camera Components (`camera/`)

- **`CameraImage.tsx`**: Static camera images
- **`AutoUpdatingCameraImage.tsx`**: Live camera feeds
- **`DebugCameraImage.tsx`**: Debug overlays

#### Player Components (`player/`)

- **`HlsVideoPlayer.tsx`**: HLS video playback
- **`BirdseyeLivePlayer.tsx`**: Multi-camera view
- **`GenericVideoPlayer.tsx`**: General video player

#### Event Components (`card/`)

- **`AnimatedEventCard.tsx`**: Event display cards
- **`ReviewCard.tsx`**: Review timeline cards
- **`ExportCard.tsx`**: Export status cards

#### Filter Components (`filter/`)

- **`CamerasFilterButton.tsx`**: Camera selection
- **`DatePickerContent.tsx`**: Date range picker
- **`FilterSwitch.tsx`**: Toggle filters
- **`ReviewFilterGroup.tsx`**: Review filters

#### Navigation (`navigation/`)

- **`Bottombar.tsx`**: Mobile navigation
- **`NavItem.tsx`**: Navigation items
- **`Sidebar.tsx`**: Desktop sidebar

#### UI Components (`ui/`)

- **Shadcn/ui components**: Buttons, dialogs, forms, etc.
- **Custom components**: Frigate-specific UI elements

### Pages (`pages/`)

#### `Live.tsx` - Live View

**Purpose**: Real-time camera monitoring
**Features**:

- Multi-camera grid
- Live detection overlays
- Camera controls
- Birdseye view

#### `Events.tsx` - Event Management

**Purpose**: Event browsing and management
**Features**:

- Event timeline
- Search and filtering
- Event details
- Export functionality

#### `Recordings.tsx` - Recording Playback

**Purpose**: Recorded video access
**Features**:

- Timeline scrubbing
- Multi-camera synchronization
- Export capabilities

#### `Settings.tsx` - System Configuration

**Purpose**: Configuration management
**Features**:

- Camera settings
- Detection configuration
- System preferences
- User management

### Hooks (`hooks/`)

#### API Integration

- **`use-api.ts`**: API client hooks
- **`use-websocket.ts`**: WebSocket management
- **`use-camera-activity.ts`**: Camera status

#### UI Utilities

- **`use-resize-observer.ts`**: Responsive layouts
- **`use-optimistic-state.ts`**: Optimistic updates
- **`use-intersection-observer.ts`**: Visibility detection

### Types (`types/`)

#### Core Types

- **`api.ts`**: API response types
- **`event.ts`**: Event data structures
- **`camera.ts`**: Camera configurations
- **`frigateConfig.ts`**: Configuration types

### Utilities (`utils/`)

#### Core Utilities

- **`browserUtil.ts`**: Browser compatibility
- **`colorUtil.ts`**: Color manipulation
- **`dateUtil.ts`**: Date formatting
- **`canvasUtil.ts`**: Canvas operations

## Infrastructure Components

### Docker Configuration (`docker/`)

#### Multi-Architecture Builds

- **`main/`**: Standard x86_64 build
- **`tensorrt/`**: NVIDIA GPU support
- **`rockchip/`**: ARM with NPU
- **`rpi/`**: Raspberry Pi optimized

#### Build Components

- **Base images**: Optimized runtime environments
- **Dependency installation**: Hardware-specific packages
- **Multi-stage builds**: Size optimization

### Process Management

#### S6 Overlay (`docker/main/rootfs/etc/s6-overlay/`)

- **Service definitions**: Process supervision
- **Startup scripts**: Initialization order
- **Health checks**: Process monitoring

## Component Interaction Patterns

### Data Flow Patterns

1. **Camera → Detection → Event → Storage**
2. **API Request → Validation → Processing → Response**
3. **Configuration → Validation → Distribution → Application**

### Communication Patterns

1. **Pub/Sub**: Event distribution via MQTT/WebSocket
2. **Request/Response**: API communications
3. **Shared Memory**: High-performance frame sharing
4. **Message Queues**: Asynchronous task processing

### Error Handling Patterns

1. **Circuit Breakers**: Prevent cascade failures
2. **Retry Logic**: Transient error recovery
3. **Graceful Degradation**: Partial functionality maintenance
4. **Error Boundaries**: React error isolation

This component structure enables modular development, testing, and maintenance while supporting the real-time requirements of video processing and object detection.
