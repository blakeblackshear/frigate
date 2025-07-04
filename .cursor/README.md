# .cursor Directory - Frigate Development Intelligence

This directory contains comprehensive documentation and rules for understanding and working with the Frigate repository. It's designed to help both AI assistants and developers quickly understand the codebase architecture, components, and development patterns.

## 📁 Directory Contents

### `rules`

**Core development rules and guidelines**

- Coding standards and style guidelines
- Architecture principles and patterns
- Technology stack specifications
- Performance optimization rules
- Security guidelines
- File naming conventions
- Common code patterns and examples

### `architecture.md`

**Deep-dive into Frigate's system architecture**

- High-level system overview
- Component interaction diagrams
- Data flow patterns
- Database schema
- Inter-process communication
- Performance optimizations
- Security architecture
- Integration points

### `components.md`

**Detailed component mapping and responsibilities**

- Backend components (`frigate/`)
- Frontend components (`web/`)
- Infrastructure components
- Component interaction patterns
- API layer structure
- Database models
- Utility functions

### `development.md`

**Complete development guide**

- Environment setup instructions
- Development workflow
- Testing guidelines
- Code patterns and examples
- Debugging techniques
- Docker development
- Contributing guidelines
- Common development tasks

## 🎯 Purpose

This directory serves as a **knowledge base** for:

1. **AI Assistants**: Quick understanding of codebase structure, patterns, and conventions
2. **New Developers**: Comprehensive onboarding and development guide
3. **Existing Contributors**: Reference for architecture decisions and patterns
4. **Code Reviews**: Standards and patterns for consistent code quality

## 🏗️ Frigate Architecture Summary

**Frigate** is a complete local NVR (Network Video Recorder) with AI object detection:

### Core Technologies

- **Backend**: Python with FastAPI, multiprocessing, TensorFlow/OpenCV
- **Frontend**: React 18+ with TypeScript, TailwindCSS, Vite
- **Database**: SQLite with Peewee ORM, vector extensions for embeddings
- **Infrastructure**: Docker, S6 overlay, Go2RTC streaming, hardware acceleration

### Key Features

- **Real-time object detection** with multiple hardware accelerators
- **Home Assistant integration** via MQTT
- **Multi-camera support** with intelligent recording
- **Web-based interface** for monitoring and configuration
- **Semantic search** with AI-powered descriptions
- **Hardware optimization** for Edge TPU, GPU acceleration

### Architecture Highlights

- **Multiprocess design** for real-time performance
- **Shared memory** for efficient frame processing
- **Event-driven communication** via ZMQ, MQTT, WebSockets
- **Configuration-driven** with Pydantic validation
- **Container-optimized** with multi-architecture support

## 🚀 Quick Start for Contributors

1. **Read the Rules**: Start with `rules` to understand coding standards
2. **Understand Architecture**: Review `architecture.md` for system overview
3. **Explore Components**: Use `components.md` to navigate the codebase
4. **Follow Development Guide**: Use `development.md` for setup and workflow

## 🔧 Development Principles

### Code Quality

- **Type Safety**: TypeScript frontend, Python type hints
- **No Comments**: Self-documenting code with descriptive names
- **Testing**: Comprehensive test coverage for critical paths
- **Performance**: Real-time first, optimized for video processing

### Architecture Principles

- **Separation of Concerns**: Clear component boundaries
- **Scalability**: Horizontal and vertical scaling support
- **Reliability**: Graceful error handling and recovery
- **Maintainability**: Modular design with clear interfaces

### Integration Focus

- **Home Assistant**: Primary integration target
- **Hardware Acceleration**: Coral TPU, GPU support
- **Real-time Processing**: Low-latency video and detection
- **Local Processing**: Privacy-focused, no cloud dependencies

## 📚 Key Resources

### Official Documentation

- [Frigate Documentation](https://docs.frigate.video/)
- [Installation Guide](https://docs.frigate.video/frigate/installation)
- [Configuration Reference](https://docs.frigate.video/configuration/)
- [API Documentation](https://docs.frigate.video/integrations/api)

### Development Resources

- [Contributing Guide](https://github.com/blakeblackshear/frigate/blob/master/docs/docs/development/contributing.md)
- [Home Assistant Integration](https://docs.frigate.video/integrations/home-assistant)
- [Hardware Recommendations](https://docs.frigate.video/frigate/hardware)

## 🎨 Code Style Highlights

### Python (Backend)

```python
# Pydantic configuration models
class CameraConfig(FrigateBaseModel):
    enabled: bool = Field(default=True)
    detect: DetectConfig = Field(default_factory=DetectConfig)

# Multiprocessing patterns
class DetectionProcess(mp.Process):
    def run(self):
        while not self.stop_event.is_set():
            # Processing loop
            pass
```

### TypeScript (Frontend)

```typescript
// React component pattern
interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
}

const Component = ({ data, onAction }: ComponentProps) => {
  const handleSubmit = () => {
    if (!data.id) return; // Early return pattern
    onAction(data.id);
  };

  return (
    <button onClick={handleSubmit} className="tailwind-classes">
      Submit
    </button>
  );
};
```

## 🔍 Finding Your Way Around

### Backend (`frigate/`)

- **`app.py`**: Main application orchestrator
- **`api/`**: FastAPI REST endpoints
- **`config/`**: Pydantic configuration system
- **`detectors/`**: AI model integrations
- **`events/`**: Event processing and management
- **`video.py`**: Camera and video processing

### Frontend (`web/src/`)

- **`App.tsx`**: Root React component
- **`components/`**: Reusable UI components
- **`pages/`**: Route-level components
- **`hooks/`**: Custom React hooks
- **`types/`**: TypeScript type definitions

### Infrastructure

- **`docker/`**: Multi-architecture container builds
- **`migrations/`**: Database schema migrations
- **`docs/`**: Documentation and guides

This `.cursor` directory provides everything needed to understand, contribute to, and maintain the Frigate codebase effectively.
