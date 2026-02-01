// Object Field Template - renders nested object fields with i18n support
import { canExpand } from "@rjsf/utils";
import type { ObjectFieldTemplateProps } from "@rjsf/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LuChevronDown, LuChevronRight, LuPlus } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getTranslatedLabel } from "@/utils/i18n";
import { ConfigFormContext } from "@/types/configForm";

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names and
 * skips dynamic filter labels for per-object filter fields.
 */
function buildTranslationPath(path: Array<string | number>): string {
  const segments = path.filter(
    (segment): segment is string => typeof segment === "string",
  );

  const filtersIndex = segments.indexOf("filters");
  if (filtersIndex !== -1 && segments.length > filtersIndex + 2) {
    const normalized = [
      ...segments.slice(0, filtersIndex + 1),
      ...segments.slice(filtersIndex + 2),
    ];
    return normalized.join(".");
  }

  return segments.join(".");
}

function getFilterObjectLabel(
  pathSegments: Array<string | number>,
): string | undefined {
  const index = pathSegments.indexOf("filters");
  if (index === -1 || pathSegments.length <= index + 1) {
    return undefined;
  }
  const label = pathSegments[index + 1];
  return typeof label === "string" && label.length > 0 ? label : undefined;
}

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const {
    title,
    description,
    properties,
    uiSchema,
    registry,
    schema,
    onAddProperty,
    formData,
    disabled,
    readonly,
  } = props;
  const formContext = registry?.formContext as ConfigFormContext | undefined;

  // Check if this is a root-level object
  const isRoot = registry?.rootSchema === schema;

  const [isOpen, setIsOpen] = useState(true);

  const isCameraLevel = formContext?.level === "camera";
  const effectiveNamespace = isCameraLevel ? "config/cameras" : "config/global";
  const sectionI18nPrefix = formContext?.sectionI18nPrefix;

  const { t, i18n } = useTranslation([
    effectiveNamespace,
    "config/groups",
    "common",
  ]);

  // Extract domain from i18nNamespace (e.g., "config/audio" -> "audio")
  const getDomainFromNamespace = (ns?: string): string => {
    if (!ns || !ns.startsWith("config/")) return "";
    return ns.replace("config/", "");
  };

  const domain = getDomainFromNamespace(formContext?.i18nNamespace);

  const groupDefinitions =
    (uiSchema?.["ui:groups"] as Record<string, string[]> | undefined) || {};

  const isHiddenProp = (prop: (typeof properties)[number]) =>
    prop.content.props.uiSchema?.["ui:widget"] === "hidden";

  const visibleProps = properties.filter((prop) => !isHiddenProp(prop));

  // Check for advanced section grouping
  const advancedProps = visibleProps.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced === true,
  );
  const regularProps = visibleProps.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced !== true,
  );

  const [showAdvanced, setShowAdvanced] = useState(false);

  const toTitle = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  // Get the full translation path from the field path
  const fieldPathId = (
    props as { fieldPathId?: { path?: (string | number)[] } }
  ).fieldPathId;
  let propertyName: string | undefined;
  let translationPath: string | undefined;
  const path = fieldPathId?.path;
  const filterObjectLabel = path ? getFilterObjectLabel(path) : undefined;
  const translatedFilterLabel = filterObjectLabel
    ? getTranslatedLabel(filterObjectLabel, "object")
    : undefined;
  if (path) {
    translationPath = buildTranslationPath(path);
    // Also get the last property name for fallback label generation
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const segment = path[i];
      if (typeof segment === "string") {
        propertyName = segment;
        break;
      }
    }
  }

  // Try i18n translation, fall back to schema or original values
  const i18nNs = effectiveNamespace;

  let inferredLabel: string | undefined;
  if (i18nNs && translationPath) {
    const prefixedLabelKey =
      sectionI18nPrefix && !translationPath.startsWith(`${sectionI18nPrefix}.`)
        ? `${sectionI18nPrefix}.${translationPath}.label`
        : undefined;
    const labelKey = `${translationPath}.label`;
    if (prefixedLabelKey && i18n.exists(prefixedLabelKey, { ns: i18nNs })) {
      inferredLabel = t(prefixedLabelKey, { ns: i18nNs });
    } else if (i18n.exists(labelKey, { ns: i18nNs })) {
      inferredLabel = t(labelKey, { ns: i18nNs });
    }
  }
  if (!inferredLabel && translatedFilterLabel) {
    inferredLabel = translatedFilterLabel;
  }
  const schemaTitle = schema?.title;
  const fallbackLabel =
    title || schemaTitle || (propertyName ? toTitle(propertyName) : undefined);
  inferredLabel = inferredLabel ?? fallbackLabel;

  let inferredDescription: string | undefined;
  if (i18nNs && translationPath) {
    const prefixedDescriptionKey =
      sectionI18nPrefix && !translationPath.startsWith(`${sectionI18nPrefix}.`)
        ? `${sectionI18nPrefix}.${translationPath}.description`
        : undefined;
    const descriptionKey = `${translationPath}.description`;
    if (
      prefixedDescriptionKey &&
      i18n.exists(prefixedDescriptionKey, { ns: i18nNs })
    ) {
      inferredDescription = t(prefixedDescriptionKey, { ns: i18nNs });
    } else if (i18n.exists(descriptionKey, { ns: i18nNs })) {
      inferredDescription = t(descriptionKey, { ns: i18nNs });
    }
  }
  const schemaDescription = schema?.description;
  const fallbackDescription =
    (typeof description === "string" ? description : undefined) ||
    schemaDescription;
  inferredDescription = inferredDescription ?? fallbackDescription;

  const renderGroupedFields = (items: (typeof properties)[number][]) => {
    if (!items.length) {
      return null;
    }

    const grouped = new Set<string>();
    const groups = Object.entries(groupDefinitions)
      .map(([groupKey, fields]) => {
        const ordered = fields
          .map((field) => items.find((item) => item.name === field))
          .filter(Boolean) as (typeof properties)[number][];

        if (ordered.length === 0) {
          return null;
        }

        ordered.forEach((item) => grouped.add(item.name));

        const label = domain
          ? t(`${domain}.${groupKey}`, {
              ns: "config/global",
              defaultValue: toTitle(groupKey),
            })
          : t(`groups.${groupKey}`, {
              defaultValue: toTitle(groupKey),
            });

        return {
          key: groupKey,
          label,
          items: ordered,
        };
      })
      .filter(Boolean) as Array<{
      key: string;
      label: string;
      items: (typeof properties)[number][];
    }>;

    const ungrouped = items.filter((item) => !grouped.has(item.name));

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key} className="space-y-4">
            <div className="text-md font-medium text-primary">
              {group.label}
            </div>
            <div className="space-y-4">
              {group.items.map((element) => (
                <div key={element.name}>{element.content}</div>
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className={cn("space-y-4", groups.length > 0 && "pt-2")}>
            {ungrouped.map((element) => (
              <div key={element.name}>{element.content}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAddButton = () => {
    const canAdd =
      Boolean(onAddProperty) && canExpand(schema, uiSchema, formData);

    if (!canAdd) {
      return null;
    }

    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAddProperty}
        disabled={disabled || readonly}
        className="gap-2"
      >
        <LuPlus className="h-4 w-4" />
        {t("add", { ns: "common", defaultValue: "Add" })}
      </Button>
    );
  };

  // Root level renders children directly
  if (isRoot) {
    return (
      <div className="space-y-6">
        {renderGroupedFields(regularProps)}
        {renderAddButton()}

        {advancedProps.length > 0 && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                {showAdvanced ? (
                  <LuChevronDown className="h-4 w-4" />
                ) : (
                  <LuChevronRight className="h-4 w-4" />
                )}
                Advanced Settings ({advancedProps.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {renderGroupedFields(advancedProps)}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  }

  // Nested objects render as collapsible cards
  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{inferredLabel}</CardTitle>
                {inferredDescription && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inferredDescription}
                  </p>
                )}
              </div>
              {isOpen ? (
                <LuChevronDown className="h-4 w-4" />
              ) : (
                <LuChevronRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {renderGroupedFields(regularProps)}
            {renderAddButton()}

            {advancedProps.length > 0 && (
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    {showAdvanced ? (
                      <LuChevronDown className="h-4 w-4" />
                    ) : (
                      <LuChevronRight className="h-4 w-4" />
                    )}
                    Advanced ({advancedProps.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {renderGroupedFields(advancedProps)}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
