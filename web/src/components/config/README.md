# Frigate GUI Configuration Editor

A comprehensive, schema-driven GUI configuration editor for Frigate NVR that provides a user-friendly alternative to editing YAML files directly.

## Overview

The GUI Configuration Editor automatically generates form interfaces based on Frigate's JSON schema, ensuring that **every configuration option** is accessible through an intuitive UI. This eliminates the need to memorize YAML syntax and reduces configuration errors.

## Architecture

### Core Components

#### 1. **GuiConfigEditor** (`GuiConfigEditor.tsx`)
The main orchestrator component that:
- Fetches the configuration schema from `/api/config/schema.json`
- Manages form state using `react-hook-form`
- Provides a tabbed interface with 17+ configuration sections
- Handles save operations and validation
- Coordinates between all section components

#### 2. **SchemaFormRenderer** (`SchemaFormRenderer.tsx`)
The schema-to-UI engine that:
- Recursively traverses JSON schema definitions
- Dynamically generates appropriate form fields based on schema types
- Handles complex nested objects and arrays
- Resolves `$ref` references in the schema
- Supports all JSON schema constructs (anyOf, oneOf, allOf, etc.)

#### 3. **Form Field Components** (`fields/`)
Reusable, type-specific input components:
- **StringField**: Text inputs with pattern validation
- **NumberField**: Number/integer inputs with min/max constraints
- **BooleanField**: Toggle switches for boolean values
- **EnumField**: Dropdown selects for enumerated values
- **ArrayField**: Dynamic lists with add/remove functionality
- **DictField**: Key-value pair editors for dictionaries
- **NestedObjectField**: Collapsible cards for nested objects

Each field includes:
- Label with required indicator
- Help tooltip with description
- Real-time validation
- Error message display
- Example values in placeholders

#### 4. **Section Components** (`sections/`)
Specialized UI for major configuration areas:
- **CamerasSection**: Comprehensive camera configuration with camera list sidebar and tabbed settings (Basic, Streams, Detect, Record, Motion, Advanced)
- **GenericSection**: Reusable component for any top-level config section

### Configuration Sections

The editor provides 17+ tabbed sections covering ALL Frigate configuration:

1. **Cameras** - Complete camera setup (streams, detection, zones, recording)
2. **Detectors** - Hardware accelerators (Coral, OpenVINO, TensorRT, etc.)
3. **Objects** - Object detection and tracking configuration
4. **Recording** - Retention policies and storage settings
5. **Snapshots** - Snapshot capture and retention
6. **Motion Detection** - Motion sensitivity and masking
7. **MQTT** - Message broker configuration
8. **Audio** - Audio detection and transcription
9. **Face Recognition** - Face recognition model and settings
10. **License Plates (LPR)** - License plate detection
11. **Semantic Search** - AI-powered search configuration
12. **Birdseye** - Multi-camera overview display
13. **Review System** - Event review and management
14. **GenAI** - Generative AI features
15. **Authentication** - User roles and permissions
16. **UI Settings** - User interface preferences
17. **Advanced** - Database, logging, telemetry, networking

## Utilities (`lib/configUtils.ts`)

Helper functions for configuration management:
- `configToYaml()` - Convert config object to YAML
- `yamlToConfig()` - Parse YAML to config object
- `validateConfig()` - Validate against JSON schema
- `getDefaultValue()` - Extract default values from schema
- `getFormFieldMeta()` - Generate field metadata from schema
- `resolveRef()` - Resolve schema references
- `deepMerge()` - Deep merge configuration objects

## Type System (`types/configSchema.ts`)

Comprehensive TypeScript definitions:
- Schema field types (StringSchema, NumberSchema, etc.)
- Configuration structure types
- Validation result types
- Form state types

## Usage

### Toggle Between YAML and GUI Modes

The ConfigEditor page includes a mode toggle:
```tsx
<ToggleGroup value={editorMode} onValueChange={setEditorMode}>
  <ToggleGroupItem value="yaml">YAML</ToggleGroupItem>
  <ToggleGroupItem value="gui">GUI</ToggleGroupItem>
</ToggleGroup>
```

### How It Works

1. **Schema Loading**: On mount, fetches `/api/config/schema.json`
2. **Form Generation**: SchemaFormRenderer recursively builds forms from schema
3. **User Editing**: Form fields update state via react-hook-form
4. **Validation**: Real-time validation using schema constraints
5. **Saving**: On save, converts form data to YAML and POSTs to `/api/config/save`

### Adding New Fields

**No code changes needed!** The GUI automatically adapts when new fields are added to Frigate's schema. Simply:
1. Add the field to the Frigate backend schema
2. The GUI will automatically render the appropriate input

### Extending with Custom Sections

To add a specialized section component:

```tsx
// 1. Create section component
export function MySection({ schema }: { schema: ConfigSchema }) {
  return (
    <GenericSection
      title="My Feature"
      description="Configure my feature"
      schema={schema}
      propertyName="my_feature"
    />
  );
}

// 2. Add tab in GuiConfigEditor.tsx
<TabsTrigger value="my-feature">My Feature</TabsTrigger>

// 3. Add content
<TabsContent value="my-feature">
  <MySection schema={schema} />
</TabsContent>
```

## Features

### Schema-Driven
- Automatically adapts to schema changes
- No manual form coding required
- Self-documenting via schema descriptions

### Comprehensive Coverage
- Every config option accessible
- 500+ fields across 70+ nested objects
- Camera-specific and global settings

### User-Friendly
- Tooltips on every field
- Smart defaults pre-filled
- Real-time validation
- Example values shown
- Logical organization

### Robust
- TypeScript for type safety
- Form validation with react-hook-form
- Error handling and display
- Dirty state tracking
- Unsaved changes warning

## File Structure

```
web/src/
├── components/config/
│   ├── GuiConfigEditor.tsx          # Main editor component
│   ├── SchemaFormRenderer.tsx       # Schema-to-UI engine
│   ├── fields/                      # Form field components
│   │   ├── StringField.tsx
│   │   ├── NumberField.tsx
│   │   ├── BooleanField.tsx
│   │   ├── EnumField.tsx
│   │   ├── ArrayField.tsx
│   │   ├── DictField.tsx
│   │   ├── NestedObjectField.tsx
│   │   └── index.ts
│   ├── sections/                    # Section components
│   │   ├── CamerasSection.tsx
│   │   ├── GenericSection.tsx
│   │   └── index.ts
│   ├── index.ts
│   └── README.md
├── lib/
│   └── configUtils.ts               # Utility functions
├── types/
│   └── configSchema.ts              # TypeScript types
└── pages/
    └── ConfigEditor.tsx             # Updated page with YAML/GUI toggle
```

## Development

### Prerequisites
- React 18+
- react-hook-form 7+
- zod 3+ (for validation)
- Radix UI components
- Tailwind CSS

### Building
No special build steps required. The components are part of the standard Vite build.

### Testing
To test the GUI editor:
1. Navigate to `/config` in Frigate
2. Click the "GUI" toggle button
3. Explore the tabbed interface
4. Make changes and save

## Future Enhancements

Potential improvements:
- [ ] Camera stream preview in GUI
- [ ] Zone editor with visual polygon drawing
- [ ] Motion mask editor with canvas
- [ ] Import/export individual camera configs
- [ ] Configuration templates
- [ ] Search/filter across all settings
- [ ] Configuration comparison/diff view
- [ ] Undo/redo functionality
- [ ] Configuration validation before save
- [ ] In-line documentation links

## Technical Decisions

### Why Schema-Driven?
- **Maintainability**: Schema changes automatically reflect in UI
- **Consistency**: Single source of truth for all fields
- **Completeness**: Guarantees all options are accessible
- **Documentation**: Schema descriptions provide built-in help

### Why react-hook-form?
- Performant (minimal re-renders)
- Built-in validation
- TypeScript support
- Handles complex nested forms
- Great DX

### Why Radix UI?
- Accessible by default
- Unstyled (works with Tailwind)
- Comprehensive component set
- Actively maintained

## Contributing

When adding new configuration options to Frigate:
1. Update the backend JSON schema
2. The GUI will automatically render the new fields
3. No frontend changes needed (unless custom UI is desired)

For custom section components:
1. Create component in `sections/`
2. Add tab in `GuiConfigEditor.tsx`
3. Export from `sections/index.ts`

## License

Part of Frigate NVR. See main project LICENSE.