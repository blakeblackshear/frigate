// Object Field Template - renders nested object fields with i18n support
import type { ObjectFieldTemplateProps } from "@rjsf/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Children, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import RestartRequiredIndicator from "@/components/indicators/RestartRequiredIndicator";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getTranslatedLabel } from "@/utils/i18n";
import { requiresRestartForFieldPath } from "@/utils/configUtil";
import { ConfigFormContext } from "@/types/configForm";
import {
  buildTranslationPath,
  getDomainFromNamespace,
  getFilterObjectLabel,
  humanizeKey,
  isSubtreeModified,
} from "../utils";
import get from "lodash/get";
import { AddPropertyButton, AdvancedCollapsible } from "../components";

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
  const overrides = formContext?.overrides;
  const baselineFormData = formContext?.baselineFormData;
  const hiddenFields = formContext?.hiddenFields;
  const fieldPath = props.fieldPathId.path;
  const restartRequired = formContext?.restartRequired;
  const defaultRequiresRestart = formContext?.requiresRestart ?? true;

  // Strip fields from an object that should be excluded from modification
  // detection: fields listed in hiddenFields (stripped from baseline by
  // sanitizeSectionData) and fields with ui:widget=hidden in uiSchema
  // (managed by custom components, not the standard form).
  const stripExcludedFields = (
    data: unknown,
    path: Array<string | number>,
  ): unknown => {
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      data === null
    ) {
      return data;
    }
    const result = { ...(data as Record<string, unknown>) };
    const pathStrings = path.map(String);

    // Strip hiddenFields that match the current path prefix
    if (hiddenFields) {
      for (const hidden of hiddenFields) {
        const parts = hidden.split(".");
        if (
          parts.length === pathStrings.length + 1 &&
          pathStrings.every((s, i) => s === parts[i])
        ) {
          delete result[parts[parts.length - 1]];
        }
      }
    }

    // Strip ui:widget=hidden fields from uiSchema at this level
    if (uiSchema) {
      // Navigate to the uiSchema subtree matching the relative path
      let subUiSchema = uiSchema;
      const relativePath = path.slice(fieldPath.length);
      for (const segment of relativePath) {
        if (
          typeof segment === "string" &&
          subUiSchema &&
          typeof subUiSchema[segment] === "object"
        ) {
          subUiSchema = subUiSchema[segment] as typeof uiSchema;
        } else {
          subUiSchema = undefined as unknown as typeof uiSchema;
          break;
        }
      }
      if (subUiSchema && typeof subUiSchema === "object") {
        for (const [key, propSchema] of Object.entries(subUiSchema)) {
          if (
            !key.startsWith("ui:") &&
            typeof propSchema === "object" &&
            propSchema !== null &&
            (propSchema as Record<string, unknown>)["ui:widget"] === "hidden"
          ) {
            delete result[key];
          }
        }
      }
    }

    return result;
  };

  // Use props.formData (always up-to-date from RJSF) rather than
  // formContext.formData which can be stale in parent templates.
  const checkSubtreeModified = (path: Array<string | number>): boolean => {
    // Compute relative path from this object's fieldPath to get the
    // value from props.formData (which represents this object's data)
    const relativePath = path.slice(fieldPath.length);
    let currentValue =
      relativePath.length > 0 ? get(formData, relativePath) : formData;

    // Strip hidden/excluded fields from the RJSF data before comparing
    // against the baseline (which already has these stripped)
    currentValue = stripExcludedFields(currentValue, path);

    let baselineValue =
      path.length > 0 ? get(baselineFormData, path) : baselineFormData;
    // Also strip hidden/excluded fields from the baseline so that fields
    // managed by custom components (e.g. required_zones with ui:widget=hidden)
    // don't cause false modification detection.
    baselineValue = stripExcludedFields(baselineValue, path);

    return isSubtreeModified(
      currentValue,
      baselineValue,
      overrides,
      path,
      formContext?.formData,
    );
  };

  const hasModifiedDescendants = checkSubtreeModified(fieldPath);
  const [isOpen, setIsOpen] = useState(hasModifiedDescendants);
  const resetKey = `${formContext?.level ?? "global"}::${
    formContext?.cameraName ?? "global"
  }`;
  const lastResetKeyRef = useRef<string | null>(null);

  // Auto-expand collapsible when modifications are detected
  useEffect(() => {
    if (hasModifiedDescendants) {
      setIsOpen(true);
    }
  }, [hasModifiedDescendants]);

  const isCameraLevel = formContext?.level === "camera";
  const effectiveNamespace = isCameraLevel ? "config/cameras" : "config/global";
  const sectionI18nPrefix = formContext?.sectionI18nPrefix;

  const { t, i18n } = useTranslation([
    effectiveNamespace,
    "config/groups",
    "views/settings",
    "common",
  ]);
  const objectRequiresRestart = requiresRestartForFieldPath(
    fieldPath,
    restartRequired,
    defaultRequiresRestart,
  );

  const domain = getDomainFromNamespace(formContext?.i18nNamespace);

  const groupDefinitions =
    (uiSchema?.["ui:groups"] as Record<string, string[]> | undefined) || {};
  const disableNestedCard =
    uiSchema?.["ui:options"]?.disableNestedCard === true;

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
  const hasModifiedAdvanced = advancedProps.some((prop) =>
    checkSubtreeModified([...fieldPath, prop.name]),
  );
  const [showAdvanced, setShowAdvanced] = useState(hasModifiedAdvanced);

  // Auto-expand advanced section when modifications are detected
  useEffect(() => {
    if (hasModifiedAdvanced) {
      setShowAdvanced(true);
    }
  }, [hasModifiedAdvanced]);

  useEffect(() => {
    if (lastResetKeyRef.current !== resetKey) {
      lastResetKeyRef.current = resetKey;
      setIsOpen(hasModifiedDescendants);
      setShowAdvanced(hasModifiedAdvanced);
    }
  }, [resetKey, hasModifiedDescendants, hasModifiedAdvanced]);
  const { children } = props as ObjectFieldTemplateProps & {
    children?: ReactNode;
  };
  const hasCustomChildren = Children.count(children) > 0;

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
    translationPath = buildTranslationPath(
      path,
      sectionI18nPrefix,
      formContext,
    );
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
    title ||
    schemaTitle ||
    (propertyName ? humanizeKey(propertyName) : undefined);
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
          ? t(`${sectionI18nPrefix}.${domain}.${groupKey}`, {
              ns: "config/groups",
              defaultValue: humanizeKey(groupKey),
            })
          : t(`groups.${groupKey}`, {
              defaultValue: humanizeKey(groupKey),
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
    const isObjectLikeField = (item: (typeof properties)[number]) => {
      const fieldSchema = item.content.props.schema as
        | { type?: string | string[] }
        | undefined;
      return fieldSchema?.type === "object";
    };

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <div
            key={group.key}
            className="space-y-4 rounded-lg border border-border/70 bg-card/30 p-4"
          >
            <div className="text-md border-b border-border/60 pb-4 font-semibold text-primary-variant">
              {group.label}
            </div>
            <div className="space-y-6">
              {group.items.map((element) => (
                <div key={element.name}>{element.content}</div>
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className={cn("space-y-6", groups.length > 0 && "pt-2")}>
            {ungrouped.map((element) => (
              <div
                key={element.name}
                className={cn(
                  groups.length > 0 && !isObjectLikeField(element) && "px-4",
                )}
              >
                {element.content}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Root level renders children directly
  if (isRoot) {
    return (
      <div className="space-y-6">
        {hasCustomChildren ? (
          children
        ) : (
          <>
            {renderGroupedFields(regularProps)}
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
              {renderGroupedFields(advancedProps)}
            </AdvancedCollapsible>
          </>
        )}
      </div>
    );
  }

  if (disableNestedCard) {
    return (
      <div className="space-y-4">
        {hasCustomChildren ? (
          children
        ) : (
          <>
            {renderGroupedFields(regularProps)}
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
              {renderGroupedFields(advancedProps)}
            </AdvancedCollapsible>
          </>
        )}
      </div>
    );
  }

  // Nested objects render as collapsible cards
  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle
                  className={cn(
                    "flex items-center text-sm",
                    hasModifiedDescendants && "text-danger",
                  )}
                >
                  {inferredLabel}
                  {objectRequiresRestart && (
                    <RestartRequiredIndicator className="ml-2" />
                  )}
                </CardTitle>
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
          <CardContent className="space-y-6 p-4 pt-0">
            {hasCustomChildren ? (
              children
            ) : (
              <>
                {renderGroupedFields(regularProps)}
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
                  {renderGroupedFields(advancedProps)}
                </AdvancedCollapsible>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
