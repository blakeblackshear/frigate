// Object Field Template - renders nested object fields with i18n support
import type { ObjectFieldTemplateProps } from "@rjsf/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Children, useState } from "react";
import type { ReactNode } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getTranslatedLabel } from "@/utils/i18n";
import { ConfigFormContext } from "@/types/configForm";
import {
  buildTranslationPath,
  getFilterObjectLabel,
  humanizeKey,
  getDomainFromNamespace,
} from "../utils/i18n";
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

  const [isOpen, setIsOpen] = useState(false);

  const isCameraLevel = formContext?.level === "camera";
  const effectiveNamespace = isCameraLevel ? "config/cameras" : "config/global";
  const sectionI18nPrefix = formContext?.sectionI18nPrefix;

  const { t, i18n } = useTranslation([
    effectiveNamespace,
    "config/groups",
    "views/settings",
    "common",
  ]);

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

  const [showAdvanced, setShowAdvanced] = useState(false);
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

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key} className="space-y-6">
            <div className="text-md font-medium text-primary">
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
              <div key={element.name}>{element.content}</div>
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
