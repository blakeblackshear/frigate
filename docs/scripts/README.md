# Documentation Scripts

## generate_ui_tabs.py

Automatically generates "Frigate UI" tab content for documentation files based on the YAML config examples already in the docs.

Instead of manually writing UI instructions for every YAML block, this script reads three data sources from the codebase and generates the UI tabs:

1. **JSON Schema** (from Pydantic config models) -- field names, types, defaults
2. **i18n translation files** -- the exact labels shown in the Settings UI
3. **Section mappings** (from Settings.tsx) -- config key to UI navigation path

### Prerequisites

Run from the repository root. The script imports Frigate's Python config models directly, so the `frigate` package must be importable:

```bash
# From repo root -- no extra install needed if your environment can import frigate
python3 docs/scripts/generate_ui_tabs.py --help
```

### Usage

#### Preview (default)

Shows what would be generated for each bare YAML block, without modifying any files:

```bash
# Single file
python3 docs/scripts/generate_ui_tabs.py docs/docs/configuration/record.md

# All config docs
python3 docs/scripts/generate_ui_tabs.py docs/docs/configuration/
```

#### Inject

Wraps bare YAML blocks with `<ConfigTabs>` and inserts the generated UI tab. Also adds the required imports (`ConfigTabs`, `TabItem`, `NavPath`) after the frontmatter if missing.

Already-wrapped blocks are skipped (idempotent).

```bash
python3 docs/scripts/generate_ui_tabs.py --inject docs/docs/configuration/record.md
```

#### Check

Compares existing UI tabs against what the script would generate from the current schema and i18n files. Prints a unified diff for each drifted block and exits with code 1 if any drift is found.

Use this in CI to catch stale docs after schema or i18n changes.

```bash
python3 docs/scripts/generate_ui_tabs.py --check docs/docs/configuration/
```

#### Regenerate

Replaces the UI tab content in existing `<ConfigTabs>` blocks with freshly generated content. The YAML tab is preserved exactly as-is. Only blocks that have actually changed are rewritten.

```bash
# Preview changes without writing
python3 docs/scripts/generate_ui_tabs.py --regenerate --dry-run docs/docs/configuration/

# Apply changes
python3 docs/scripts/generate_ui_tabs.py --regenerate docs/docs/configuration/
```

#### Output to directory (`--outdir`)

Write generated files to a separate directory instead of modifying the originals. The source directory structure is mirrored. Files without changes are copied as-is so the output is a complete snapshot suitable for diffing.

Works with `--inject` and `--regenerate`.

```bash
# Generate into a named directory
python3 docs/scripts/generate_ui_tabs.py --inject --outdir /tmp/generated docs/docs/configuration/

# Then diff original vs generated
diff -rq docs/docs/configuration/ /tmp/generated/

# Or let an AI agent compare them
diff -ru docs/docs/configuration/record.md /tmp/generated/record.md
```

This is useful for AI agents that need to review the generated output before applying it, or for previewing what `--inject` or `--regenerate` would do across an entire directory.

#### Verbose mode

Add `-v` to any mode for detailed diagnostics (skipped blocks, reasons, unchanged blocks):

```bash
python3 docs/scripts/generate_ui_tabs.py -v docs/docs/configuration/
```

### Typical workflow

```bash
# 1. Preview what would be generated (output to temp dir, originals untouched)
python3 docs/scripts/generate_ui_tabs.py --inject --outdir /tmp/ui-preview docs/docs/configuration/
# Compare: diff -ru docs/docs/configuration/ /tmp/ui-preview/

# 2. Apply: inject UI tabs into the actual docs
python3 docs/scripts/generate_ui_tabs.py --inject docs/docs/configuration/

# 3. Review and hand-edit where needed (the script gets you 90% there)

# 4. Later, after schema or i18n changes, check for drift
python3 docs/scripts/generate_ui_tabs.py --check docs/docs/configuration/

# 5. If drifted, preview then regenerate
python3 docs/scripts/generate_ui_tabs.py --regenerate --outdir /tmp/ui-regen docs/docs/configuration/
# Compare: diff -ru docs/docs/configuration/ /tmp/ui-regen/

# 6. Apply regeneration
python3 docs/scripts/generate_ui_tabs.py --regenerate docs/docs/configuration/
```

### How it decides what to generate

The script detects two patterns from the YAML block content:

**Pattern A -- Field table.** When the YAML has inline comments (e.g., `# <- description`), the script generates a markdown table with field names and descriptions:

```markdown
Navigate to <NavPath path="Settings > Global configuration > Recording" />.

| Field | Description |
|-------|-------------|
| **Continuous retention > Retention days** | Days to retain recordings. |
| **Motion retention > Retention days** | Days to retain recordings. |
```

**Pattern B -- Set instructions.** When the YAML has concrete values without comments, the script generates step-by-step instructions:

```markdown
Navigate to <NavPath path="Settings > Global configuration > Recording" />.

- Set **Enable recording** to on
- Set **Continuous retention > Retention days** to `3`
- Set **Alert retention > Event retention > Retention days** to `30`
- Set **Alert retention > Event retention > Retention mode** to `all`
```

**Camera-level config** is auto-detected when the YAML is nested under `cameras:`. The output uses a generic camera reference rather than the example camera name from the YAML:

```markdown
1. Navigate to <NavPath path="Settings > Camera configuration > Recording" /> and select your camera.
   - Set **Enable recording** to on
   - Set **Continuous retention > Retention days** to `5`
```

### What gets skipped

- YAML blocks already inside `<ConfigTabs>` (for `--inject`)
- YAML blocks whose top-level key is not a known config section (e.g., `go2rtc`, `docker-compose`, `scrape_configs`)
- Fields listed in `hiddenFields` in the section configs (e.g., `enabled_in_config`)

### File structure

```
docs/scripts/
├── generate_ui_tabs.py          # CLI entry point
├── README.md                    # This file
└── lib/
    ├── __init__.py
    ├── schema_loader.py         # Loads JSON schema from Pydantic models
    ├── i18n_loader.py           # Loads i18n translation JSON files
    ├── section_config_parser.py # Parses TS section configs (hiddenFields, etc.)
    ├── yaml_extractor.py        # Extracts YAML blocks and ConfigTabs from markdown
    ├── ui_generator.py          # Generates UI tab markdown content
    └── nav_map.py               # Maps config sections to Settings UI nav paths
```

### Data sources

| Source | Path | What it provides |
|--------|------|------------------|
| Pydantic models | `frigate/config/` | Field names, types, defaults, nesting |
| JSON schema | Generated from Pydantic at runtime | Full schema with `$defs` and `$ref` |
| i18n (global) | `web/public/locales/en/config/global.json` | Field labels for global settings |
| i18n (cameras) | `web/public/locales/en/config/cameras.json` | Field labels for camera settings |
| i18n (menu) | `web/public/locales/en/views/settings.json` | Sidebar menu labels |
| Section configs | `web/src/components/config-form/section-configs/*.ts` | Hidden fields, advanced fields, field order |
| Navigation map | Hardcoded from `web/src/pages/Settings.tsx` | Config section to UI path mapping |
