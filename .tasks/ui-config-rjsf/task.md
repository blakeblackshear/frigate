---
task: UI Configuration using react-jsonschema-form
slug: ui-config-rjsf
created: 2026-01-21
status: planning
---

# UI Configuration using react-jsonschema-form

## Overview

Implement a comprehensive configuration UI for Frigate NVR using react-jsonschema-form (RJSF), driven by the existing Pydantic configuration schema. The UI should allow users to configure Frigate through a web interface instead of manually editing YAML files, with proper validation, reusable components, and clear visual indicators for global vs camera-level settings.

## Research Findings

### Key Components

| Component        | Location                                                                    | Purpose                                                     |
| ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| FrigateConfig    | [frigate/config/config.py](frigate/config/config.py#L297-L412)              | Root Pydantic model defining complete Frigate configuration |
| CameraConfig     | [frigate/config/camera/camera.py](frigate/config/camera/camera.py#L49-L130) | Camera-level configuration model                            |
| FrigateBaseModel | [frigate/config/base.py](frigate/config/base.py)                            | Base model with `extra="forbid"` validation                 |
| Config API       | [frigate/api/app.py](frigate/api/app.py#L367-L456)                          | PUT /config/set endpoint for saving config                  |
| Schema Endpoint  | [frigate/api/app.py](frigate/api/app.py#L73-L77)                            | GET /config/schema.json - exposes Pydantic schema           |
| Settings Page    | [web/src/pages/Settings.tsx](web/src/pages/Settings.tsx)                    | Main settings page with sidebar navigation                  |
| Form Components  | [web/src/components/ui/form.tsx](web/src/components/ui/form.tsx)            | Existing react-hook-form based form components              |

### Architecture

The Frigate configuration system is structured as follows:

1. **Pydantic Models**: All configuration is defined using Pydantic v2 models in `frigate/config/`. The `FrigateConfig` class is the root model.

2. **Schema Generation**: Pydantic automatically generates JSON Schema via `model_json_schema()`. The schema is already exposed at `/api/config/schema.json` and used by the ConfigEditor (monaco-yaml) for validation.

3. **Config API**: The `/config/set` endpoint accepts configuration updates in two formats:
   - Query string parameters (e.g., `?cameras.front.detect.enabled=True`)
   - JSON body via `config_data` field in `AppConfigSetBody`

   The JSON body is preferred.

4. **Frontend Stack**:
   - React 18 with TypeScript
   - Radix UI primitives + Tailwind CSS (shadcn/ui patterns)
   - react-hook-form + zod for form validation
   - SWR for data fetching
   - react-i18next for translations
   - axios for API calls

### Data Flow

1. **Config Loading**: `useSWR("config")` fetches current config from `/api/config`
2. **Schema Loading**: JSON Schema available at `/api/config/schema.json`
3. **Config Updates**: PUT to `/config/set` with JSON body
4. **Real-time Updates**: Some settings support `requires_restart: 0` for live updates via WebSocket pub/sub

### Reusable Config Sections (Global + Camera Level)

Based on schema analysis, these sections appear at BOTH global and camera levels using the **same** Pydantic model:

| Section         | Model                | Notes                                                               |
| --------------- | -------------------- | ------------------------------------------------------------------- |
| audio           | AudioConfig          | Full model reuse                                                    |
| detect          | DetectConfig         | Full model reuse, nested StationaryConfig                           |
| live            | CameraLiveConfig     | Full model reuse                                                    |
| motion          | MotionConfig         | Full model reuse                                                    |
| notifications   | NotificationConfig   | Full model reuse                                                    |
| objects         | ObjectConfig         | Full model reuse, nested FilterConfig, GenAIObjectConfig            |
| record          | RecordConfig         | Full model reuse, nested EventsConfig, RetainConfig                 |
| review          | ReviewConfig         | Full model reuse, nested ReviewAlertsConfig, ReviewDetectionsConfig |
| snapshots       | SnapshotsConfig      | Full model reuse, nested SnapshotsRetainConfig                      |
| timestamp_style | TimestampStyleConfig | Full model reuse, nested ColorConfig                                |

**Different models at global vs camera level** (require conditional handling):

| Section             | Global Model                  | Camera Model                        | Notes                |
| ------------------- | ----------------------------- | ----------------------------------- | -------------------- |
| audio_transcription | AudioTranscriptionConfig      | CameraAudioTranscriptionConfig      | Camera has subset    |
| birdseye            | BirdseyeConfig                | BirdseyeCameraConfig                | Different fields     |
| face_recognition    | FaceRecognitionConfig         | CameraFaceRecognitionConfig         | Camera has subset    |
| ffmpeg              | FfmpegConfig                  | CameraFfmpegConfig                  | Camera adds inputs[] |
| lpr                 | LicensePlateRecognitionConfig | CameraLicensePlateRecognitionConfig | Camera has subset    |
| semantic_search     | SemanticSearchConfig          | CameraSemanticSearchConfig          | Completely different |

### Special Field Types Requiring Custom Widgets

| Type                  | Examples                                            | Widget Needed                  |
| --------------------- | --------------------------------------------------- | ------------------------------ |
| Enums                 | BirdseyeModeEnum, RetainModeEnum, RecordQualityEnum | Select dropdown                |
| list[str]             | objects.track, zones[], required_zones              | Tag input / Multi-select       |
| Union[str, list[str]] | mask fields                                         | Text or array input            |
| dict[str, T]          | zones, objects.filters                              | Key-value editor / Nested form |
| ColorConfig           | timestamp_style.color (RGB)                         | Color picker                   |
| Coordinates/Masks     | zone.coordinates                                    | Polygon editor (existing)      |
| Password fields       | mqtt.password                                       | Password input with show/hide  |

### Current UI Patterns

1. **Settings Navigation**: [web/src/pages/Settings.tsx](web/src/pages/Settings.tsx#L68-L114) uses a sidebar with grouped sections
2. **Camera Selection**: Many views accept `selectedCamera` prop for per-camera settings
3. **Form Pattern**: Uses react-hook-form with zod schemas (see [CameraReviewSettingsView.tsx](web/src/views/settings/CameraReviewSettingsView.tsx#L113-L124))
4. **Save Pattern**: Axios PUT to `config/set?key=value` with `requires_restart` flag
5. **Translations**: All strings in `web/public/locales/{lang}/views/` JSON files

### Dependencies

**Internal**:

- Existing form components: Form, FormField, FormItem, FormLabel, FormControl, FormMessage
- UI primitives: Switch, Select, Input, Checkbox, Slider, Tabs
- Existing hooks: useSWR, useTranslation, useOptimisticState

**External (to add)**:

- @rjsf/core (react-jsonschema-form core)
- @rjsf/utils (utilities)
- @rjsf/validator-ajv8 (JSON Schema validation)

### Configuration

The `/config/set` API expects:

```typescript
interface AppConfigSetBody {
  requires_restart: number; // 0 = live update, 1 = needs restart
  update_topic?: string; // For pub/sub notification
  config_data?: Record<string, any>; // Bulk config updates
}
```

Query string format: `?key.path.to.field=value` (e.g., `?cameras.front.detect.enabled=True`)

### Tests

| Test File                                            | Coverage                              |
| ---------------------------------------------------- | ------------------------------------- |
| No existing React component tests found              | RJSF forms would benefit from testing |
| Pydantic validation tests implicit in config loading | Schema validation ensures correctness |

## Implementation Plan

### Goal

Users can configure all user-facing Frigate settings through a form-based UI with validation, clear global vs camera-level distinction, and proper handling of advanced settings.

### Current State Analysis

- Schema already exposed at `/api/config/schema.json`
- Settings page structure exists with sidebar navigation
- Form components exist (react-hook-form based)
- No react-jsonschema-form currently installed
- Config set API supports both query strings and JSON body

### What We're NOT Doing

- Replacing the raw YAML ConfigEditor (remains as advanced option)
- Changing the Pydantic models structure
- Modifying the config/set API endpoint
- Auto-generating translations (manual translation required)

### Prerequisites

- [x] Install @rjsf/core, @rjsf/utils, @rjsf/validator-ajv8
- [x] Create exclusion list and advanced settings list JSON files

---

## Phases

| #   | Phase                            | Status  | Plan | Notes                                                        |
| --- | -------------------------------- | ------- | ---- | ------------------------------------------------------------ |
| 1   | Schema Pipeline & RJSF Setup     | ✅ Done | —    | Install deps, create schema transformer, set up RJSF theme   |
| 2   | Core Reusable Section Components | ✅ Done | —    | Create shared components for detect, record, snapshots, etc. |
| 3   | Global Configuration View        | ✅ Done | —    | Build main config sections (mqtt, auth, database, etc.)      |
| 4   | Camera Configuration with Tabs   | ✅ Done | —    | Multi-camera tabs, override indicators, section reuse        |
| 5   | Advanced Settings & Exclusions   | ✅ Done | —    | Progressive disclosure, contributor-editable lists           |
| 6   | Validation & Error Handling      | ✅ Done | —    | Inline errors, save blocking, API integration                |
| 7   | Integration & Polish             | ✅ Done | —    | Settings page integration, translations, documentation       |

**Status:** ⬜ Not Started → 📋 Planned → 🔄 In Progress → ✅ Done

---

## Phase Details

### Phase 1: Schema Pipeline & RJSF Setup

**Overview**: Install react-jsonschema-form dependencies, create a schema transformation layer to convert Pydantic JSON Schema to RJSF-compatible format with UI customizations.

**Changes Required**:

1. **Install Dependencies**
   - Add to package.json: @rjsf/core, @rjsf/utils, @rjsf/validator-ajv8

2. **Create Schema Transformer**
   - File: `web/src/lib/config-schema/`
   - Transform Pydantic schema to RJSF uiSchema
   - Handle nested $defs/references
   - Apply field ordering

3. **Create Custom RJSF Theme**
   - File: `web/src/components/config-form/theme/`
   - Map RJSF templates to existing shadcn/ui components
   - Custom widgets for special types (color, coordinates, etc.)

**Success Criteria**:

- RJSF renders basic form from schema
- Existing UI component styling preserved
- Schema fetching from /api/config/schema.json works

### Phase 2: Core Reusable Section Components

**Overview**: Create composable section components for config areas that appear at both global and camera levels.

**Changes Required**:

1. **Section Component Architecture**
   - File: `web/src/components/config-form/sections/`
   - Create: DetectSection, RecordSection, SnapshotsSection, MotionSection, ObjectsSection, ReviewSection, AudioSection, NotificationsSection, LiveSection, TimestampSection

2. **Each Section Component**:
   - Accepts `level: "global" | "camera"` prop
   - Accepts `cameraName?: string` for camera context
   - Accepts `showOverrideIndicator?: boolean`
   - Uses shared RJSF form with section-specific uiSchema

3. **Override Detection Hook**
   - File: `web/src/hooks/use-config-override.ts`
   - Compare camera value vs global default
   - Return override status for visual indicators

4. **Field Ordering and Layout Customization**

**Requirement**: Field ordering and layout within each section must be easily customizable by contributors without requiring deep knowledge of RJSF internals.

**Implementation Approach**:

- Each reusable section component (DetectSection, RecordSection, etc.) should define its own field ordering and layout configuration
- This can be accomplished as a TypeScript constant within the section component file itself
- The configuration should specify:
  - Field display order
  - Field grouping (which fields appear together)
  - Layout hints (e.g., multiple fields per row, nested groupings)
  - Any section-specific uiSchema customizations

**Example Structure**:

```typescript
// In DetectSection.tsx or DetectSection.config.ts
export const detectSectionConfig = {
  fieldOrder: [
    "enabled",
    "fps",
    "width",
    "height",
    "max_disappeared",
    "stationary",
  ],
  fieldGroups: {
    resolution: ["width", "height"],
    performance: ["fps", "max_disappeared"],
  },
  // ... other layout hints
};
```

**Success Criteria**:

- Contributors can reorder fields by editing a clear configuration structure
- No need to modify RJSF internals or complex uiSchema objects directly
- Layout changes are localized to single files per section

**Success Criteria**:

- DetectSection renders identically at global and camera level
- Override indicators show when camera differs from global
- Adding new fields requires editing only section definition

### Phase 3: Global Configuration View

**Overview**: Build the global configuration form for non-camera settings.

**Changes Required**:

1. **Global Config View**
   - File: `web/src/views/settings/GlobalConfigView.tsx`
   - Sections: MQTT, Auth, Database, Telemetry, TLS, Proxy, Networking, UI, Detectors, Model, GenAI, Classification, Birdseye

2. **Per-Section Subforms**
   - Each section as collapsible card
   - Progressive disclosure for advanced fields
   - Individual save buttons per section OR unified save

3. **Translations**
   - File: `web/public/locales/en/views/settings.json`
   - Add keys for all config field labels/descriptions

**Success Criteria**:

- All global-only settings configurable
- Proper field grouping and labels
- Validation errors inline

### Phase 4: Camera Configuration with Tabs

**Overview**: Create per-camera configuration with tab navigation and override indicators.

**Changes Required**:

1. **Camera Config View**
   - File: `web/src/views/settings/CameraConfigView.tsx`
   - Tab per camera
   - Uses reusable section components

2. **Override Visual Indicators**
   - Badge/icon when field overrides global
   - "Reset to global default" action
   - Color coding (e.g., highlighted border)

3. **Camera-Specific Sections**
   - FFmpeg inputs configuration
   - Masks and Zones (link to existing editor)
   - ONVIF settings

**Success Criteria**:

- Switch between cameras via tabs
- Clear visual distinction for overridden settings
- Reset to global default works

### Phase 5: Advanced Settings & Exclusions

**Overview**: Implement progressive disclosure and maintainable exclusion lists.

**Changes Required**:

1. **Exclusion System**
   - Simple consts in the component for field names
   - Filter schema before rendering
   - Document exclusion format for contributors

2. **Advanced Fields Toggle**
   - "Show Advanced Settings" switch per section
   - Simple consts in the component for advanced field names
   - Default collapsed state

**Success Criteria**:

- Excluded fields never shown in UI
- Advanced fields hidden by default

### Phase 6: Validation & Error Handling

**Overview**: Ensure robust validation and user-friendly error messages.

**Changes Required**:

1. **Client-Side Validation**
   - ajv8 validator with Pydantic schema
   - Custom error messages for common issues
   - Real-time validation on blur

2. **Server-Side Validation**
   - Handle 400 responses from /config/set
   - Parse Pydantic validation errors
   - Map to form fields

3. **Save Blocking**
   - Disable save button when invalid
   - Show error count badge
   - Scroll to first error on submit attempt

**Success Criteria**:

- Invalid forms cannot be saved
- Errors shown inline next to fields
- Clear error messages (not technical schema errors)

### Phase 7: Integration & Polish

**Overview**: Integrate into settings page, finalize translations, and document.

**Changes Required**:

1. **Settings Page Integration**
   - Add new views to settingsGroups in Settings.tsx
   - Sidebar navigation updates
   - Route configuration

2. **Translations**
   - All field labels and descriptions
   - Error messages
   - Section headers

3. **Documentation**
   - User-facing docs for UI configuration

4. **Testing**
   - Basic render tests for form components
   - Validation behavior tests
   - Save/cancel flow tests

**Success Criteria**:

- Seamless navigation from settings page
- All strings translated
- Documentation complete

---

## Testing Strategy

### Project Maturity Level

Active Development - Frigate has extensive test infrastructure but limited frontend tests.

### Unit Tests

- Schema transformer functions
- Override detection hook
- Custom widgets
- Coverage target: 70% for new components

### Integration/Manual Tests

- Full form render with live schema
- Save/validation flow end-to-end
- Camera tab switching
- Override indicator accuracy
- Mobile responsiveness

---

## Rollback Plan

1. All changes are additive - existing ConfigEditor remains functional
2. New views can be feature-flagged if needed
3. No database migrations required
4. No backend changes required (uses existing API)

---

## Component Hierarchy

```
web/src/
├── components/
│   └── config-form/
│       ├── theme/
│       │   ├── index.ts              # RJSF theme export
│       │   ├── templates/            # Base templates (ObjectFieldTemplate, etc.)
│       │   └── widgets/              # Custom widgets (ColorWidget, TagsWidget, etc.)
│       ├── sections/
│       │   ├── DetectSection.tsx     # Reusable for global + camera
│       │   ├── RecordSection.tsx
│       │   ├── SnapshotsSection.tsx
│       │   ├── MotionSection.tsx
│       │   ├── ObjectsSection.tsx
│       │   ├── ReviewSection.tsx
│       │   ├── AudioSection.tsx
│       │   ├── NotificationsSection.tsx
│       │   ├── LiveSection.tsx
│       │   └── TimestampSection.tsx
│       └── ConfigForm.tsx            # Main form wrapper
├── lib/
│   └── config-schema/
│       ├── index.ts                  # Schema utilities
│       ├── transformer.ts            # Pydantic -> RJSF schema
├── hooks/
│   └── use-config-override.ts        # Override detection
└── views/
    └── settings/
        ├── GlobalConfigView.tsx      # Global settings form
        └── CameraConfigView.tsx      # Per-camera tabs form
```

---

## Key Design Decisions

1. **RJSF over custom forms**: Leverage schema-driven forms for maintainability and automatic updates when Pydantic models change.

2. **Reusable sections via composition**: Same component renders at global and camera level, with props controlling context and override indicators.

3. **Existing UI primitives**: Custom RJSF theme wraps existing shadcn/ui components for visual consistency.

4. **Incremental adoption**: Existing settings views remain, new RJSF views added alongside.
