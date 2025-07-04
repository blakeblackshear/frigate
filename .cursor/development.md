# Frigate Development Guide

## Development Environment Setup

### Prerequisites

- **Docker**: For containerized development
- **Python 3.11+**: Backend development
- **Node.js 20+**: Frontend development
- **Bun**: Package manager (preferred over npm)
- **Git**: Version control

### Development Container (Recommended)

The repository includes a devcontainer configuration for consistent development:

```bash
# Open in VS Code with Dev Containers extension
code .
# Select "Reopen in Container" when prompted
```

### Local Development Setup

#### Backend Setup

```bash
# Install Python dependencies
cd frigate/
pip install -r requirements-dev.txt

# Set up pre-commit hooks
pre-commit install
```

#### Frontend Setup

```bash
# Install frontend dependencies
cd web/
bun install

# Start development server
PROXY_HOST=localhost:5000 bun run dev
```

## Development Workflow

### Code Style and Quality

#### Python

- **Formatter**: Black (line length: 88)
- **Import Sorting**: isort
- **Linting**: flake8, pylint
- **Type Checking**: mypy
- **Testing**: pytest

```bash
# Format code
black frigate/
isort frigate/

# Run linting
flake8 frigate/
mypy frigate/

# Run tests
pytest frigate/test/
```

#### TypeScript/React

- **Formatter**: Prettier
- **Linting**: ESLint with TypeScript rules
- **Type Checking**: TypeScript compiler

```bash
# Format and lint
cd web/
bun run lint
bun run format

# Type checking
bun run type-check

# Run tests
bun run test
```

### Testing Guidelines

#### Backend Testing

```python
# Test file structure: frigate/test/
# Example test file: test_config.py

import pytest
from frigate.config import FrigateConfig

def test_config_validation():
    # Test configuration validation
    pass

def test_api_endpoint():
    # Test API endpoints
    pass

# Use fixtures for common setup
@pytest.fixture
def test_config():
    return FrigateConfig.load_file("test_config.yml")
```

#### Frontend Testing

```typescript
// Test file structure: web/src/**/*.test.tsx
// Example: components/Button.test.tsx

import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("renders button with text", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText("Click me")).toBeInTheDocument();
});
```

### Component Development Patterns

#### Python Process Pattern

```python
import multiprocessing as mp
from multiprocessing.synchronize import Event as MpEvent
import logging

class MyProcess(mp.Process):
    def __init__(self, config: dict, stop_event: MpEvent):
        super().__init__()
        self.config = config
        self.stop_event = stop_event
        self.logger = logging.getLogger(__name__)

    def run(self):
        """Main process loop"""
        self.logger.info("Starting process")

        while not self.stop_event.is_set():
            try:
                # Main processing logic
                self.process_frame()

            except Exception as e:
                self.logger.error(f"Error in process: {e}")

        self.logger.info("Process stopped")

    def process_frame(self):
        """Process individual frames"""
        pass
```

#### React Component Pattern

```typescript
interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
  className?: string;
}

const Component = ({ data, onAction, className }: ComponentProps) => {
  const [loading, setLoading] = useState(false);

  // Event handler with handle prefix
  const handleSubmit = async () => {
    // Early return pattern
    if (loading) return;

    setLoading(true);
    try {
      await onAction(data.id);
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("base-classes", className)}>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="button-classes"
        aria-label="Submit action"
      >
        {loading ? "Loading..." : "Submit"}
      </button>
    </div>
  );
};
```

#### Configuration Model Pattern

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class ComponentConfig(BaseModel):
    enabled: bool = Field(default=True, description="Enable component")
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    name: Optional[str] = Field(default=None)

    @field_validator('name')
    def validate_name(cls, v):
        if v is not None and len(v) < 1:
            raise ValueError("Name must not be empty")
        return v

    class Config:
        extra = "forbid"  # Prevent additional fields
```

### API Development

#### FastAPI Endpoint Pattern

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

class ResponseModel(BaseModel):
    id: str
    name: str
    status: str

@router.get("/items", response_model=List[ResponseModel])
async def get_items(
    limit: int = 10,
    current_user = Depends(get_current_user)
):
    """Get list of items"""
    try:
        items = await fetch_items(limit)
        return [ResponseModel(**item) for item in items]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/items/{item_id}/action")
async def perform_action(
    item_id: str,
    current_user = Depends(get_current_user)
):
    """Perform action on item"""
    # Implementation
    return {"status": "success"}
```

### Database Development

#### Model Definition

```python
from peewee import *
from frigate.models import Model

class NewModel(Model):
    id = AutoField()
    name = CharField(max_length=100, unique=True)
    created_at = DateTimeField(default=datetime.now)
    data = JSONField()

    class Meta:
        table_name = 'new_model'
        indexes = (
            (('name', 'created_at'), False),
        )
```

#### Migration Pattern

```python
# migrations/XXX_add_new_feature.py

def migrate(migrator, database, fake=False, **kwargs):
    """Migration logic"""
    migrator.add_column('events', 'new_field', CharField(null=True))

def rollback(migrator, database, fake=False, **kwargs):
    """Rollback logic"""
    migrator.drop_column('events', 'new_field')
```

### Real-time Features

#### WebSocket Integration

```typescript
// Frontend WebSocket hook
import { useWebSocket } from "@/hooks/use-websocket";

const Component = () => {
  const { socket, connected } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    const handleEvent = (data: EventData) => {
      // Handle real-time event
    };

    socket.on("event", handleEvent);
    return () => socket.off("event", handleEvent);
  }, [socket]);

  return <div>Status: {connected ? "Connected" : "Disconnected"}</div>;
};
```

#### Python WebSocket Handler

```python
from frigate.comms.ws import WebSocket

class EventWebSocket(WebSocket):
    def on_connect(self):
        """Handle client connection"""
        self.send_json({"type": "connected"})

    def on_message(self, message):
        """Handle incoming message"""
        if message["type"] == "subscribe":
            self.subscribe_to_events()

    def send_event(self, event_data):
        """Send event to client"""
        self.send_json({
            "type": "event",
            "data": event_data
        })
```

### Performance Optimization

#### Shared Memory Usage

```python
import multiprocessing as mp
from frigate.util.image import SharedMemoryFrameManager

class FrameProcessor:
    def __init__(self):
        self.frame_manager = SharedMemoryFrameManager()

    def process_frame(self, camera_name: str, frame_data: bytes):
        # Store frame in shared memory
        frame_id = self.frame_manager.create(
            camera_name,
            frame_data.shape,
            frame_data.dtype
        )

        # Copy frame data
        shm_frame = self.frame_manager.get(frame_id)
        shm_frame[:] = frame_data

        return frame_id
```

#### Frontend Performance

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }: Props) => {
  return <div>{/* Expensive rendering */}</div>;
});

// Use useMemo for expensive calculations
const ProcessedData = ({ rawData }: Props) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(rawData);
  }, [rawData]);

  return <div>{processedData}</div>;
};

// Use useCallback for stable references
const Parent = () => {
  const handleAction = useCallback((id: string) => {
    // Handle action
  }, []);

  return <Child onAction={handleAction} />;
};
```

### Debugging

#### Python Debugging

```python
import logging
import pdb

# Set up detailed logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def debug_function():
    logger.debug("Debug information")

    # Set breakpoint for debugging
    pdb.set_trace()

    # Process continues...
```

#### Frontend Debugging

```typescript
// Use React Developer Tools
// Add debugging props in development
const DebugComponent = ({ data }: Props) => {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Component data:", data);
    }
  }, [data]);

  return <div>{/* Component content */}</div>;
};
```

### Docker Development

#### Development Dockerfile

```dockerfile
FROM frigate:dev as dev

# Install development dependencies
RUN pip install debugpy pytest-cov

# Enable development features
ENV PYTHONPATH=/workspace/frigate
ENV FRIGATE_CONFIG_FILE=/config/config.yml

# Expose debug port
EXPOSE 5678

CMD ["python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "--wait-for-client", "-m", "frigate"]
```

#### Docker Compose for Development

```yaml
version: "3.8"
services:
  frigate:
    build:
      context: .
      dockerfile: docker/main/Dockerfile
      target: devcontainer
    volumes:
      - .:/workspace/frigate
      - ./config:/config
    ports:
      - "5000:5000" # Web interface
      - "5678:5678" # Debug port
    environment:
      - PYTHONPATH=/workspace/frigate
```

### Integration Testing

#### Test Configuration

```yaml
# test_config.yml
cameras:
  test_camera:
    ffmpeg:
      inputs:
        - path: /dev/video0
          roles: [detect]
    detect:
      enabled: true

detectors:
  cpu:
    type: cpu
```

#### End-to-End Testing

```python
import pytest
from frigate.app import FrigateApp
from frigate.config import FrigateConfig

@pytest.fixture
def test_app():
    config = FrigateConfig.load_file("test_config.yml")
    app = FrigateApp(config)
    yield app
    app.stop()

def test_detection_pipeline(test_app):
    # Test full detection pipeline
    pass
```

### Contributing Guidelines

1. **Fork and Clone**: Fork the repository and clone locally
2. **Branch**: Create feature branches from master
3. **Develop**: Follow coding standards and patterns
4. **Test**: Write and run tests for new features
5. **Document**: Update documentation as needed
6. **Pull Request**: Submit PR with clear description
7. **Review**: Address review feedback promptly

### Common Development Tasks

#### Adding a New Detector

1. Create detector plugin in `frigate/detectors/plugins/`
2. Add configuration model in `frigate/detectors/detector_config.py`
3. Update detector factory in `frigate/detectors/__init__.py`
4. Add tests and documentation

#### Adding a New API Endpoint

1. Define request/response models with Pydantic
2. Create endpoint in appropriate router module
3. Add authentication/authorization if needed
4. Write tests for the endpoint
5. Update API documentation

#### Adding a New React Component

1. Create component in appropriate directory
2. Define TypeScript interfaces for props
3. Implement with proper error handling
4. Add to component exports
5. Write tests and stories (if using Storybook)

This development guide provides the foundation for contributing to Frigate while maintaining code quality and architectural consistency.
