# Frigate Architecture Deep Dive

## System Overview

Frigate is a sophisticated Network Video Recorder (NVR) with real-time AI object detection, designed specifically for Home Assistant integration. The system uses a multi-process architecture to achieve real-time performance while maintaining stability and resource efficiency.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frigate System                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web Frontend  │   Python Core   │      Infrastructure        │
│   (React/TS)    │   (FastAPI)     │      (Docker/Nginx)        │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Core Components

### 1. Python Backend (`frigate/`)

#### Main Application (`app.py`)

- **FrigateApp Class**: Central orchestrator managing all system processes
- **Process Management**: Spawns and manages detection, recording, cleanup processes
- **Resource Management**: Handles shared memory, queues, and inter-process communication
- **Service Lifecycle**: Manages startup, shutdown, and error recovery

#### API Layer (`api/`)

- **FastAPI Application**: Modern async Python web framework
- **Authentication**: JWT-based auth with user management
- **RESTful Endpoints**: Full CRUD operations for events, recordings, configuration
- **WebSocket Support**: Real-time communication for live feeds and notifications
- **OpenAPI Documentation**: Auto-generated API documentation

#### Configuration System (`config/`)

- **Pydantic Models**: Type-safe configuration with validation
- **YAML Support**: Human-readable configuration files
- **Runtime Validation**: Ensures configuration integrity
- **Hot Reloading**: Dynamic configuration updates without restart

#### Object Detection (`object_detection.py`, `detectors/`)

- **TensorFlow Integration**: Deep learning model execution
- **Hardware Acceleration**: Support for Coral TPU, NVIDIA GPU, Intel GPU
- **Multi-Model Support**: Different detectors for different use cases
- **Process Isolation**: Detection runs in separate processes for stability

#### Video Processing (`video/`, `motion/`)

- **Camera Management**: RTSP/HTTP stream handling
- **Motion Detection**: Efficient OpenCV-based motion detection
- **Frame Processing**: Shared memory frame management
- **Recording**: Segment-based video recording with retention policies

#### Event System (`events/`)

- **Event Processing**: Real-time event detection and classification
- **Timeline Management**: Chronological event organization
- **Cleanup Processes**: Automated old data removal
- **Embeddings**: Vector similarity search for event matching

#### Communication (`comms/`)

- **MQTT Integration**: Home Assistant and IoT device communication
- **WebSocket Server**: Real-time web interface updates
- **ZMQ Messaging**: Inter-process communication
- **Dispatcher Pattern**: Event distribution to multiple consumers

### 2. Web Frontend (`web/`)

#### React Application

- **Modern React 18+**: Functional components with hooks
- **TypeScript**: Full type safety throughout the frontend
- **Component Architecture**: Modular, reusable components
- **State Management**: Context providers and custom hooks

#### UI Framework

- **TailwindCSS**: Utility-first CSS framework
- **Shadcn/ui**: High-quality component library
- **Responsive Design**: Mobile-first responsive layout
- **Accessibility**: ARIA labels and keyboard navigation

#### Real-time Features

- **WebSocket Client**: Live feed streaming
- **Server-Sent Events**: Real-time notifications
- **Progressive Loading**: Efficient data fetching
- **Offline Support**: Graceful degradation

#### Key Pages

- **Live View**: Real-time camera feeds with detection overlays
- **Events**: Searchable event timeline with filtering
- **Recordings**: Video playback and export functionality
- **Settings**: Configuration management interface

### 3. Infrastructure

#### Docker Architecture

- **Multi-stage Builds**: Optimized container images
- **Multi-architecture**: Support for AMD64, ARM64, ARM32
- **Hardware-specific**: Specialized builds for Coral, NVIDIA, etc.
- **Development**: DevContainer support for consistent development

#### Process Management (S6 Overlay)

- **Service Supervision**: Automatic process restart on failure
- **Graceful Shutdown**: Proper cleanup on container stop
- **Logging**: Centralized log management
- **Health Monitoring**: Container health checks

#### Streaming (Go2RTC)

- **RTSP Server**: Re-streaming to reduce camera connections
- **WebRTC Support**: Low-latency browser streaming
- **Protocol Conversion**: Multiple streaming protocol support
- **Transcoding**: Hardware-accelerated video processing

## Data Flow

### Video Processing Pipeline

```
Camera → Go2RTC → Motion Detection → Object Detection → Event Creation → Storage
                                ↓
                           Live Stream → WebSocket → Frontend
```

### Event Processing Flow

```
Detection → Event Processor → Timeline → Database
                           ↓
                        MQTT/WebSocket → Home Assistant/Frontend
```

### Configuration Flow

```
YAML Config → Pydantic Validation → Runtime Config → Process Distribution
```

## Database Schema

### Core Tables

- **Events**: Object detection events with metadata
- **Recordings**: Video recording segments
- **ReviewSegment**: Motion-based review segments
- **Timeline**: Chronological event timeline
- **Previews**: Thumbnail previews for recordings

### Vector Database

- **Embeddings**: Semantic search capabilities
- **Similarity**: Find similar events/objects
- **Reindexing**: Background embedding updates

## Inter-Process Communication

### Message Queues

- **Detection Queue**: Frame processing requests
- **Event Queue**: Event notifications
- **Config Updates**: Runtime configuration changes

### Shared Memory

- **Frame Buffers**: Raw video frame data
- **Detection Results**: Object detection outputs
- **Statistics**: Real-time performance metrics

### ZeroMQ Patterns

- **Publisher/Subscriber**: Event distribution
- **Request/Reply**: Configuration queries
- **Push/Pull**: Work distribution

## Performance Optimizations

### CPU Optimization

- **Multiprocessing**: Separate processes for I/O vs CPU tasks
- **Process Affinity**: CPU core assignment for critical processes
- **Queue Management**: Efficient message passing
- **Memory Pools**: Reduced allocation overhead

### Hardware Acceleration

- **Coral TPU**: Edge TPU inference acceleration
- **NVIDIA GPU**: CUDA-based processing
- **Intel GPU**: Intel GPU acceleration
- **Hardware Decoding**: GPU-accelerated video decoding

### Memory Management

- **Shared Memory**: Zero-copy frame passing
- **Object Pools**: Reused detection objects
- **Garbage Collection**: Efficient memory cleanup
- **Memory Mapping**: Direct file access

## Security Architecture

### Authentication

- **JWT Tokens**: Stateless authentication
- **User Management**: Role-based access control
- **Session Management**: Secure session handling
- **API Security**: Endpoint protection

### Data Protection

- **Input Validation**: Pydantic model validation
- **SQL Injection Prevention**: ORM-based queries
- **File Path Sanitization**: Secure file access
- **CORS Configuration**: Cross-origin protection

## Monitoring and Observability

### Metrics Collection

- **System Stats**: CPU, memory, disk usage
- **Camera Stats**: FPS, detection rates
- **Process Health**: Process status monitoring
- **Performance Metrics**: Latency, throughput

### Logging

- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Configurable verbosity
- **Log Rotation**: Automatic log management
- **Error Tracking**: Exception monitoring

## Scalability Considerations

### Horizontal Scaling

- **Process Distribution**: Multiple detection processes
- **Camera Distribution**: Cameras across processes
- **Load Balancing**: Request distribution

### Vertical Scaling

- **Multi-threading**: Thread-safe operations
- **Resource Allocation**: Dynamic resource assignment
- **Queue Sizing**: Configurable queue depths

## Integration Points

### Home Assistant

- **MQTT Discovery**: Automatic entity creation
- **State Updates**: Real-time state synchronization
- **Service Calls**: Action integration
- **Notification System**: Event notifications

### External APIs

- **Frigate+**: Cloud-based model training
- **GenAI Integration**: AI-powered descriptions
- **Webhooks**: External event notifications
- **Third-party Integrations**: Plugin architecture

This architecture prioritizes real-time performance, reliability, and ease of integration while maintaining modularity and extensibility for future enhancements.
