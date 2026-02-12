/**
 * LayoutGridField - RJSF field for responsive, semantic grid layouts
 *
 * Overview:
 * - Apply a responsive grid to object properties using `ui:layoutGrid` while
 *   preserving the default `ObjectFieldTemplate` behavior (cards, nested
 *   collapsibles, add button, and i18n).
 * - Falls back to the original template when `ui:layoutGrid` is not present.
 *
 * Capabilities:
 * - 12-column grid logic. `ui:col` accepts a number (1-12) or a Tailwind class
 *   string (e.g. "col-span-12 md:col-span-4") for responsive column widths.
 * - Per-row and global class overrides:
 *   - `ui:options.layoutGrid.rowClassName` (default: "grid-cols-12") is merged
 *     with the base `grid gap-4` classes.
 *   - `ui:options.layoutGrid.advancedRowClassName` (default: "grid-cols-12")
 *     controls advanced-section rows.
 *   - Per-row `ui:className` and per-column `ui:className`/`className` are
 *     supported for fine-grained layout control.
 * - Optional `useGridForAdvanced` (via `ui:options.layoutGrid`) to toggle
 *   whether advanced fields use the grid or fall back to stacked layout.
 * - Integrates with `ui:groups` to show semantic group labels (resolved via
 *   `config/groups` i18n). If a layout row contains fields from the same group,
 *   that row shows the group label above it; leftover or ungrouped fields are
 *   rendered after the configured rows.
 * - Hidden fields (`ui:widget: "hidden"`) are ignored.
 *
 * Internationalization
 * - Advanced collapsible labels use `label.advancedSettingsCount` and
 *   `label.advancedCount` in the `common` namespace.
 * - Group labels are looked up in `config/groups` (uses `sectionI18nPrefix`
 *   when available).
 *
 * Usage examples:
 * Basic:
 * {
 *   "ui:field": "LayoutGridField",
 *   "ui:layoutGrid": [
 *     { "ui:row": ["field1", "field2"] },
 *     { "ui:row": ["field3"] }
 *   ]
 * }
 *
 * Custom columns and responsive classes:
 * {
 *   "ui:field": "LayoutGridField",
 *   "ui:options": {
 *     "layoutGrid": { "rowClassName": "grid-cols-12 md:grid-cols-6", "useGridForAdvanced": true }
 *   },
 *   "ui:layoutGrid": [
 *     {
 *       "ui:row": [
 *         { "field1": { "ui:col": "col-span-12 md:col-span-4", "ui:className": "md:col-start-2" } },
 *         { "field2": { "ui:col": 4 } }
 *       ],
 *       "ui:className": "gap-6"
 *     }
 *   ]
 * }
 *
 * Groups and rows:
 * {
 *   "ui:field": "LayoutGridField",
 *   "ui:groups": { "resolution": ["fps","width","height"], "tracking": ["min_initialized","max_disappeared"] },
 *   "ui:layoutGrid": [
 *     { "ui:row": ["enabled"] },
 *     { "ui:row": ["fps","width","height"] }
 *   ]
 * }
 *
 * Notes:
 * - `ui:layoutGrid` must be an array; non-array values are ignored and the
 *   default ObjectFieldTemplate is used instead.
 * - This implementation adheres to RJSF patterns (use `ui:options`,
 *   `ui:className`, and `ui:layoutGrid` as documented) while adding a few
 *   Frigate-specific conveniences (defaults and Tailwind-friendly class
 *   handling).
 */

import type { FieldProps, ObjectFieldTemplateProps } from "@rjsf/utils";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ConfigFormContext } from "@/types/configForm";
import {
  getDomainFromNamespace,
  hasOverrideAtPath,
  humanizeKey,
} from "../utils";
import { AddPropertyButton, AdvancedCollapsible } from "../components";

type LayoutGridColumnConfig = {
  "ui:col"?: number | string;
  "ui:className"?: string;
  className?: string;
};

type LayoutRow = {
  "ui:row": Array<string | Record<string, LayoutGridColumnConfig>>;
  "ui:className"?: string;
  className?: string;
};

type LayoutGrid = LayoutRow[];

type LayoutGridOptions = {
  rowClassName?: string;
  advancedRowClassName?: string;
  useGridForAdvanced?: boolean;
};

interface PropertyElement {
  name: string;
  content: React.ReactElement;
}

function isObjectLikeElement(item: PropertyElement) {
  const fieldSchema = item.content.props?.schema as
    | { type?: string | string[] }
    | undefined;
  return fieldSchema?.type === "object";
}

// Custom ObjectFieldTemplate wrapper that applies grid layout
function GridLayoutObjectFieldTemplate(
  props: ObjectFieldTemplateProps,
  originalObjectFieldTemplate: React.ComponentType<ObjectFieldTemplateProps>,
) {
  const {
    uiSchema,
    properties,
    registry,
    schema,
    onAddProperty,
    formData,
    disabled,
    readonly,
  } = props;
  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const { t } = useTranslation(["common", "config/groups"]);

  // Use the original ObjectFieldTemplate passed as parameter, not from registry
  const ObjectFieldTemplate = originalObjectFieldTemplate;

  // Get layout configuration
  const layoutGrid = Array.isArray(uiSchema?.["ui:layoutGrid"])
    ? (uiSchema?.["ui:layoutGrid"] as LayoutGrid)
    : [];
  const layoutGridOptions =
    (uiSchema?.["ui:options"] as { layoutGrid?: LayoutGridOptions } | undefined)
      ?.layoutGrid ?? {};
  const baseRowClassName = layoutGridOptions.rowClassName ?? "grid-cols-12";
  const advancedRowClassName =
    layoutGridOptions.advancedRowClassName ?? "grid-cols-12";
  const useGridForAdvanced = layoutGridOptions.useGridForAdvanced ?? true;
  const groupDefinitions =
    (uiSchema?.["ui:groups"] as Record<string, string[]> | undefined) || {};
  const overrides = formContext?.overrides;
  const fieldPath = props.fieldPathId.path;

  const isPathModified = (path: Array<string | number>) =>
    hasOverrideAtPath(overrides, path, formContext?.formData);

  // Override the properties rendering with grid layout
  const isHiddenProp = (prop: (typeof properties)[number]) =>
    prop.content.props.uiSchema?.["ui:widget"] === "hidden";

  const visibleProps = properties.filter((prop) => !isHiddenProp(prop));

  // Separate regular and advanced properties
  const advancedProps = visibleProps.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced === true,
  );
  const regularProps = visibleProps.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced !== true,
  );
  const hasModifiedAdvanced = advancedProps.some((prop) =>
    isPathModified([...fieldPath, prop.name]),
  );
  const [showAdvanced, setShowAdvanced] = useState(hasModifiedAdvanced);

  // If no layout grid is defined, use the default template
  if (layoutGrid.length === 0) {
    return <ObjectFieldTemplate {...props} />;
  }

  const domain = getDomainFromNamespace(formContext?.i18nNamespace);
  const sectionI18nPrefix = formContext?.sectionI18nPrefix;

  const getGroupLabel = (groupKey: string) => {
    if (domain && sectionI18nPrefix) {
      return t(`${sectionI18nPrefix}.${domain}.${groupKey}`, {
        ns: "config/groups",
        defaultValue: humanizeKey(groupKey),
      });
    }

    return t(`groups.${groupKey}`, {
      ns: "config/groups",
      defaultValue: humanizeKey(groupKey),
    });
  };

  // Render fields using the layout grid structure
  const renderGridLayout = (items: PropertyElement[], rowClassName: string) => {
    if (!items.length) {
      return null;
    }

    // Create a map for quick lookup
    const itemMap = new Map(items.map((item) => [item.name, item]));
    const renderedFields = new Set<string>();

    return (
      <div className="space-y-4">
        {layoutGrid.map((rowDef, rowIndex) => {
          const rowItems = rowDef["ui:row"];
          const cols: React.ReactNode[] = [];

          rowItems.forEach((colDef, colIndex) => {
            let fieldName: string;
            let colSpan: number | string = 12; // Default to full width
            let colClassName: string | undefined;

            if (typeof colDef === "string") {
              fieldName = colDef;
            } else {
              // Object with field name as key and ui:col as value
              const entries = Object.entries(colDef);
              if (entries.length === 0) return;
              const [name, config] = entries[0];
              fieldName = name;
              colSpan = config["ui:col"] ?? 12;
              colClassName = config["ui:className"] ?? config.className;
            }

            const item = itemMap.get(fieldName);
            if (!item) return;

            renderedFields.add(fieldName);

            // Calculate column width class (using 12-column grid)
            const colSpanClass =
              typeof colSpan === "string" ? colSpan : `col-span-${colSpan}`;
            const colClass = cn(colSpanClass, colClassName);

            cols.push(
              <div key={`${rowIndex}-${colIndex}`} className={colClass}>
                {item.content}
              </div>,
            );
          });

          if (cols.length === 0) return null;

          const rowClass = cn(
            "grid gap-4",
            rowClassName,
            rowDef["ui:className"],
            rowDef.className,
          );

          return (
            <div key={rowIndex} className={rowClass}>
              {cols}
            </div>
          );
        })}

        {Array.from(itemMap.keys())
          .filter((name) => !renderedFields.has(name))
          .map((name) => {
            const item = itemMap.get(name);
            return item ? (
              <div key={name} className="space-y-6">
                {item.content}
              </div>
            ) : null;
          })}
      </div>
    );
  };

  const renderGroupedGridLayout = (
    items: PropertyElement[],
    rowClassName: string,
  ) => {
    if (!items.length) {
      return null;
    }

    if (Object.keys(groupDefinitions).length === 0) {
      return renderGridLayout(items, rowClassName);
    }

    const itemMap = new Map(items.map((item) => [item.name, item]));
    const renderedFields = new Set<string>();
    const renderedGroups = new Set<string>();
    const groupMap = new Map<string, string>();

    Object.entries(groupDefinitions).forEach(([groupKey, fields]) => {
      fields.forEach((field) => {
        groupMap.set(field, groupKey);
      });
    });

    const rows = layoutGrid
      .map((rowDef, rowIndex) => {
        const rowItems = rowDef["ui:row"];
        const cols: React.ReactNode[] = [];
        const rowFieldNames: string[] = [];

        rowItems.forEach((colDef, colIndex) => {
          let fieldName: string;
          let colSpan: number | string = 12;
          let colClassName: string | undefined;

          if (typeof colDef === "string") {
            fieldName = colDef;
          } else {
            const entries = Object.entries(colDef);
            if (entries.length === 0) return;
            const [name, config] = entries[0];
            fieldName = name;
            colSpan = config["ui:col"] ?? 12;
            colClassName = config["ui:className"] ?? config.className;
          }

          const item = itemMap.get(fieldName);
          if (!item) return;

          renderedFields.add(fieldName);
          rowFieldNames.push(fieldName);

          const colSpanClass =
            typeof colSpan === "string" ? colSpan : `col-span-${colSpan}`;
          const colClass = cn(colSpanClass, colClassName);

          cols.push(
            <div key={`${rowIndex}-${colIndex}`} className={colClass}>
              {item.content}
            </div>,
          );
        });

        if (cols.length === 0) return null;

        const rowClass = cn(
          "grid gap-4",
          rowClassName,
          rowDef["ui:className"],
          rowDef.className,
        );

        const rowGroupKeys = rowFieldNames
          .map((name) => groupMap.get(name))
          .filter(Boolean) as string[];
        const rowGroupKey =
          rowGroupKeys.length > 0 &&
          rowGroupKeys.length === rowFieldNames.length &&
          new Set(rowGroupKeys).size === 1
            ? rowGroupKeys[0]
            : undefined;
        const showGroupLabel = rowGroupKey && !renderedGroups.has(rowGroupKey);

        if (showGroupLabel) {
          renderedGroups.add(rowGroupKey);
        }

        return (
          <div
            key={rowIndex}
            className={cn(
              "space-y-4",
              rowGroupKey &&
                "rounded-lg border border-border/70 bg-card/30 p-4",
            )}
          >
            {showGroupLabel && (
              <div className="border-b border-border/60 pb-2 text-sm font-semibold text-primary-variant">
                {getGroupLabel(rowGroupKey)}
              </div>
            )}
            <div className={rowClass}>{cols}</div>
          </div>
        );
      })
      .filter(Boolean);

    const remainingItems = Array.from(itemMap.keys())
      .filter((name) => !renderedFields.has(name))
      .map((name) => itemMap.get(name))
      .filter(Boolean) as PropertyElement[];

    const groupedLeftovers = new Map<string, PropertyElement[]>();
    const ungroupedLeftovers: PropertyElement[] = [];

    remainingItems.forEach((item) => {
      const groupKey = groupMap.get(item.name);
      if (groupKey) {
        const existing = groupedLeftovers.get(groupKey);
        if (existing) {
          existing.push(item);
        } else {
          groupedLeftovers.set(groupKey, [item]);
        }
      } else {
        ungroupedLeftovers.push(item);
      }
    });

    const leftoverSections: React.ReactNode[] = [];

    groupedLeftovers.forEach((groupItems, groupKey) => {
      const showGroupLabel = !renderedGroups.has(groupKey);
      if (showGroupLabel) {
        renderedGroups.add(groupKey);
      }

      leftoverSections.push(
        <div
          key={groupKey}
          className="space-y-4 rounded-lg border border-border/70 bg-card/30 p-4"
        >
          {showGroupLabel && (
            <div className="border-b border-border/60 pb-2 text-sm font-semibold text-primary-variant">
              {getGroupLabel(groupKey)}
            </div>
          )}
          <div className="space-y-6">
            {groupItems.map((item) => (
              <div key={item.name}>{item.content}</div>
            ))}
          </div>
        </div>,
      );
    });

    if (ungroupedLeftovers.length > 0) {
      leftoverSections.push(
        <div
          key="ungrouped-leftovers"
          className={cn(
            "space-y-6",
            (rows.length > 0 || groupedLeftovers.size > 0) && "pt-2",
          )}
        >
          {ungroupedLeftovers.map((item) => (
            <div
              key={item.name}
              className={cn(
                groupedLeftovers.size > 0 &&
                  !isObjectLikeElement(item) &&
                  "px-4",
              )}
            >
              {item.content}
            </div>
          ))}
        </div>,
      );
    }

    return (
      <div className="space-y-6">
        {rows}
        {leftoverSections}
      </div>
    );
  };

  const renderStackedLayout = (items: PropertyElement[]) => {
    if (!items.length) {
      return null;
    }

    return (
      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.name}>{item.content}</div>
        ))}
      </div>
    );
  };

  const regularLayout = renderGroupedGridLayout(regularProps, baseRowClassName);
  const advancedLayout = useGridForAdvanced
    ? renderGroupedGridLayout(advancedProps, advancedRowClassName)
    : renderStackedLayout(advancedProps);

  // Create modified props with custom property rendering
  // Render using the original template but with our custom content
  const isRoot = registry?.rootSchema === props.schema;

  if (isRoot) {
    return (
      <div className="space-y-6">
        {regularLayout}
        <AddPropertyButton
          onAddProperty={onAddProperty}
          schema={schema}
          uiSchema={uiSchema}
          formData={formData}
          disabled={disabled}
          readonly={readonly}
        />

        <AdvancedCollapsible
          count={advancedProps.length}
          open={showAdvanced}
          onOpenChange={setShowAdvanced}
          isRoot
        >
          {advancedLayout}
        </AdvancedCollapsible>
      </div>
    );
  }

  // We need to inject our custom rendering into the template
  // Since we can't directly modify the template's internal rendering,
  // we'll render the full structure ourselves
  return (
    <ObjectFieldTemplate {...props}>
      <div className="space-y-4">
        {regularLayout}
        <AddPropertyButton
          onAddProperty={onAddProperty}
          schema={schema}
          uiSchema={uiSchema}
          formData={formData}
          disabled={disabled}
          readonly={readonly}
        />

        <AdvancedCollapsible
          count={advancedProps.length}
          open={showAdvanced}
          onOpenChange={setShowAdvanced}
        >
          {advancedLayout}
        </AdvancedCollapsible>
      </div>
    </ObjectFieldTemplate>
  );
}

export function LayoutGridField(props: FieldProps) {
  const { registry, schema, uiSchema, idSchema, formData } = props;

  // Store the original ObjectFieldTemplate before any modifications
  const originalObjectFieldTemplate = registry.templates.ObjectFieldTemplate;

  // Get the ObjectField component from the registry
  const ObjectField = registry.fields.ObjectField;

  // Create a modified registry with our custom template
  // But we'll pass the original template to it to prevent circular reference
  const gridObjectFieldTemplate = useCallback(
    (tProps: ObjectFieldTemplateProps) =>
      GridLayoutObjectFieldTemplate(tProps, originalObjectFieldTemplate),
    [originalObjectFieldTemplate],
  );

  const modifiedRegistry = useMemo(
    () => ({
      ...registry,
      templates: {
        ...registry.templates,
        ObjectFieldTemplate: gridObjectFieldTemplate,
      },
    }),
    [registry, gridObjectFieldTemplate],
  );

  // Delegate to ObjectField with the modified registry
  return (
    <ObjectField
      {...props}
      registry={modifiedRegistry}
      schema={schema}
      uiSchema={uiSchema}
      idSchema={idSchema}
      formData={formData}
    />
  );
}
